import { describe, it, expect } from "vitest";
import { MISSIONS } from "../content/missions";
import type { GameState, Command } from "./contracts";
import { createInitialState, reduce, assertState } from "./engine";
import {
  pendingEvent,
  observedEnemies,
  pathTo,
  terrainAt,
  tickOperation,
  objectiveSecured,
} from "./operations-engine";
import { decodeSave, encodeSave } from "./persistence";

const settle = (state: GameState): GameState => {
  let s = state,
    event = pendingEvent(s);
  while (event) {
    const options = event.choices.map((c) =>
      reduce(s, { type: "DECIDE", eventId: event!.id, choiceId: c.id }),
    );
    const accepted = options.find((t) => t.accepted);
    expect(
      accepted,
      "Every mandatory event has an affordable response",
    ).toBeDefined();
    s = accepted!.state;
    event = pendingEvent(s);
  }
  return s;
};
const ready = (branch: string, seed = "test") =>
  settle(
    createInitialState(MISSIONS.find((m) => m.campaignId === branch)!, seed),
  );
const command = (s: GameState, c: Command) => {
  const result = reduce(s, c);
  expect(result.accepted, result.reason).toBe(true);
  return result.state;
};

describe("persistent operations", () => {
  it("does not count an enemy-controlled road as secured", () => {
    const s = ready("army");
    s.operation!.units.forEach((u) => {
      u.x = 1;
      u.y = 1;
    });
    Object.assign(s.operation!.units[0], { x: 19, y: 14 });
    Object.assign(s.operation!.enemies[0], { x: 19, y: 14 });
    expect(objectiveSecured(s)).toBe(false);
    Object.assign(s.operation!.units[1], { x: 19, y: 15 });
    expect(objectiveSecured(s)).toBe(true);
  });
  it("gates time and orders on an unanswered event, and applies a decision once", () => {
    const s = createInitialState(MISSIONS[0], "gate"),
      event = pendingEvent(s)!;
    expect(reduce(s, { type: "END_TURN" }).accepted).toBe(false);
    const next = command(s, {
      type: "DECIDE",
      eventId: event.id,
      choiceId: event.choices[0].id,
    });
    expect(next.operation!.trust).toBe(s.operation!.trust + 8);
    expect(
      reduce(next, {
        type: "DECIDE",
        eventId: event.id,
        choiceId: event.choices[0].id,
      }).accepted,
    ).toBe(false);
    expect(s.operation!.decisions).toEqual([]);
  });
  it("retains authored terrain and crosses the stream only on a bridge", () => {
    const s = ready("army"),
      d = s.operation!.definition;
    const route = pathTo(d, { x: 28, y: 9 }, { x: 35, y: 9 });
    expect(route.length).toBeGreaterThan(7);
    expect(route.every((p) => terrainAt(d, p) !== "water")).toBe(true);
    expect(pathTo(d, { x: 28, y: 9 }, { x: -1, y: 9 })).toEqual([]);
    expect(
      command(s, { type: "END_TURN" }).operation!.definition.terrain,
    ).toEqual(d.terrain);
    expect(ready("army", "different").operation!.definition.terrain).toEqual(
      d.terrain,
    );
  });
  it("queues a movement, executes a bounded distance, and rejects duplicate orders", () => {
    const s = ready("army");
    const initial = { ...s.operation!.units[0] };
    const ordered = command(s, {
      type: "ORDER",
      unitId: initial.id,
      order: "move",
      target: { x: 19, y: 14 },
    });
    expect(ordered.operation!.units[0].x).toBe(initial.x);
    expect(
      reduce(ordered, { type: "ORDER", unitId: initial.id, order: "recon" })
        .accepted,
    ).toBe(false);
    const next = command(ordered, { type: "END_TURN" }),
      u = next.operation!.units[0];
    expect(
      Math.abs(u.x - initial.x) + Math.abs(u.y - initial.y),
    ).toBeGreaterThan(0);
    expect(
      Math.abs(u.x - initial.x) + Math.abs(u.y - initial.y),
    ).toBeLessThanOrEqual(4);
    expect(u.x).not.toBe(19);
    expect(s.operation!.units[0]).toEqual(initial);
  });
  it("hides enemies outside observation and never respawns defeated formations", () => {
    const s = ready("army");
    expect(observedEnemies(s)).toHaveLength(0);
    s.operation!.enemies[0].x = 20;
    s.operation!.enemies[0].y = 10;
    expect(observedEnemies(s).map((e) => e.id)).toContain("e1");
    s.operation!.enemies[0].strength = 0;
    expect(tickOperation(s).operation!.enemies[0].strength).toBe(0);
  });
  it("preserves total people and formation counts after triage and contact", () => {
    let s = ready("army");
    s = command(s, { type: "ACT", actionId: "triage" });
    expect(s.operation!.units.reduce((n, u) => n + u.strength, 0)).toBe(
      s.personnel.capable,
    );
    s.currentTurn = 9;
    s.operation!.decisions = s
      .operation!.definition.events.filter((e) => e.turn <= 9)
      .map((e) => e.id);
    s.operation!.enemies.forEach((e) => {
      e.x = 19;
      e.y = 10;
    });
    s = command(s, { type: "END_TURN" });
    assertState(s);
    expect(s.operation!.units.reduce((n, u) => n + u.strength, 0)).toBe(
      s.personnel.capable,
    );
  });
  it("reserves a finite shipment, rejects duplicates, and credits delivery exactly once", () => {
    let s = ready("army");
    s.operation!.systems.wire = 100;
    s.operation!.trust = 100;
    s = command(s, {
      type: "CONTACT",
      contactId: "logistics",
      topic: "supplies",
    });
    expect(
      reduce(s, { type: "CONTACT", contactId: "logistics", topic: "supplies" })
        .accepted,
    ).toBe(false);
    // Seeded authorization may deny. A known in-transit record exercises the delivery boundary.
    const m = s.operation!.transmissions[0];
    m.status = "transit";
    m.eta = 2;
    m.cargo = { ammo: 8 };
    s.operation!.reserve.ammo! -= 8;
    const stock = s.resources.ammo;
    s = command(s, { type: "END_TURN" });
    expect(s.resources.ammo).toBe(stock + 8);
    expect(s.operation!.reserve.ammo).toBe(8);
    s = command(s, { type: "END_TURN" });
    expect(s.resources.ammo).toBe(stock + 8);
    expect(s.operation!.transmissions[0].status).toBe("delivered");
  });
  it("defers delivery if the army route has no friendly cover", () => {
    const s = ready("army");
    s.operation!.units.forEach((u) => {
      u.x = 1;
      u.y = 1;
    });
    s.operation!.transmissions.push({
      id: "delivery",
      contactId: "logistics",
      topic: "supplies",
      status: "transit",
      created: 1,
      eta: 2,
      text: "",
      cargo: { ammo: 8 },
    });
    const next = tickOperation(s);
    expect(next.resources.ammo).toBe(s.resources.ammo);
    expect(next.operation!.transmissions[0].eta).toBe(3);
  });
  it("requires a repaired runway and commits aircraft/fuel until sortie resolution", () => {
    let s = ready("air");
    expect(reduce(s, { type: "TASK", actionId: "sortie" }).accepted).toBe(
      false,
    );
    s = command(s, { type: "TASK", actionId: "runway" });
    expect(s.operation!.systems.parts).toBe(10);
    expect(reduce(s, { type: "TASK", actionId: "runway" }).accepted).toBe(
      false,
    );
    s = command(s, { type: "END_TURN" });
    expect(s.operation!.systems.runway).toBe(46);
    s = settle(command(s, { type: "END_TURN" }));
    expect(s.operation!.systems.runway).toBe(68);
    s = command(s, { type: "TASK", actionId: "sortie" });
    expect(s.operation!.systems.aircraft).toBe(1);
    expect(s.operation!.systems.fuel).toBe(14);
    s = command(s, { type: "END_TURN" });
    s = command(s, { type: "END_TURN" });
    expect(s.operation!.systems.sorties).toBe(1);
    expect(s.operation!.systems.aircraft).toBeLessThanOrEqual(2);
  });
  it("offers an affordable response when the hangar event finds empty stores", () => {
    const s = ready("air");
    s.currentTurn = 5;
    s.operation!.decisions.push("air-lost");
    s.resources.materials = 0;
    s.operation!.systems.parts = 0;
    const next = settle(s);
    expect(next.operation!.flags).toContain("hangar-closed");
  });
  it("does not move a powerless ship, and does not turn a sinking into a port return", () => {
    let s = ready("navy");
    s.operation!.systems.propulsion = 0;
    expect(
      reduce(s, {
        type: "ORDER",
        unitId: "ship",
        order: "move",
        target: { x: 14, y: 23 },
      }).accepted,
    ).toBe(false);
    s.currentTurn = 8;
    s.operation!.decisions = s
      .operation!.definition.events.filter((e) => e.turn <= 8)
      .map((e) => e.id);
    s.operation!.systems.hull = 1;
    s.operation!.systems.flooding = 100;
    s.operation!.units[0].x = 14;
    s.operation!.units[0].y = 23;
    s = command(s, { type: "END_TURN" });
    expect(s.phase).toBe("ended");
    expect(s.outcome!.id).toBe("collapse");
    expect(s.operation!.flags).not.toContain("port");
  });
  it("transitions a surviving returning ship to port and stops ocean damage", () => {
    let s = ready("navy");
    s.currentTurn = 7;
    s.operation!.decisions = s
      .operation!.definition.events.filter((e) => e.turn <= 7)
      .map((e) => e.id);
    s.operation!.units[0].x = 14;
    s.operation!.units[0].y = 23;
    s = command(s, { type: "END_TURN" });
    expect(s.operation!.flags).toContain("port");
    const hull = s.operation!.systems.hull;
    s = command(s, { type: "END_TURN" });
    expect(s.operation!.systems.hull).toBe(hull);
    expect(
      reduce(s, {
        type: "ORDER",
        unitId: "ship",
        order: "move",
        target: { x: 20, y: 23 },
      }).accepted,
    ).toBe(false);
  });
  for (const branch of ["army", "air", "navy"])
    it(`replays a complete ${branch} mission and round-trips every saved turn`, () => {
      const mission = MISSIONS.find((m) => m.campaignId === branch)!;
      const run = () => {
        let s = ready(branch, "campaign-replay");
        let count = 0;
        while (s.phase !== "ended" && count++ < 20) {
          s = settle(s);
          const rally = reduce(s, { type: "ACT", actionId: "rally" });
          if (rally.accepted) s = rally.state;
          s = command(s, { type: "END_TURN" });
          assertState(s);
          expect(decodeSave(encodeSave(s), mission)).toEqual(s);
        }
        return s;
      };
      const first = run();
      expect(first.phase).toBe("ended");
      expect(run()).toEqual(first);
      expect(first.operation!.enemies.length).toBe(
        mission.operation!.enemies.length,
      );
    });
  it("rejects corrupt saves, foreign definitions and incomplete ledgers", () => {
    const s = ready("air"),
      raw = JSON.parse(encodeSave(s));
    raw.state.resources.ammo = -1;
    expect(() => decodeSave(JSON.stringify(raw), MISSIONS[1])).toThrow();
    delete raw.state.resources.ammo;
    expect(() => decodeSave(JSON.stringify(raw), MISSIONS[1])).toThrow();
    expect(() => decodeSave(encodeSave(s), MISSIONS[0])).toThrow();
    const changed = JSON.parse(encodeSave(s));
    changed.state.operation.definition.title = "FOREIGN";
    expect(
      decodeSave(JSON.stringify(changed), MISSIONS[1]).operation!.definition
        .title,
    ).toBe(MISSIONS[1].operation!.title);
  });
});
