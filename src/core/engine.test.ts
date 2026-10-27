import { describe, expect, it } from "vitest";
import { getMission } from "../content/missions";
import { supportById } from "../content/supports";
import { createInitialState, reduce } from "./engine";
import { createCommandProfile, settleMission } from "./progression";
import { pendingEvent } from "./operations-engine";

const mission = getMission("bastogne_east_cedar_1944");
if (!mission) throw new Error("Expected M01 package");
const ready = (seed: string, choice: string) => {
  const state = createInitialState(mission, seed, choice);
  const event = pendingEvent(state)!;
  return reduce(state, {
    type: "DECIDE",
    eventId: event.id,
    choiceId: event.choices[0].id,
  }).state;
};

describe("mission engine", () => {
  it("conserves the canonical M01 population", () => {
    const state = createInitialState(mission, "population-seed", "leaders");
    expect(
      state.personnel.capable +
        state.personnel.wounded +
        state.personnel.missing +
        state.personnel.dead,
    ).toBe(118);
  });

  it("applies triage as a real resource and personnel change", () => {
    const state = ready("triage-seed", "medical");
    const next = reduce(state, { type: "ACT", actionId: "triage" });
    expect(next.accepted).toBe(true);
    expect(next.state.resources.medKits).toBe(state.resources.medKits - 1);
    expect(next.state.personnel.capable).toBe(state.personnel.capable + 2);
    expect(next.state.personnel.wounded).toBe(state.personnel.wounded - 2);
  });

  it("refuses an action that has already occupied this turn", () => {
    const state = ready("duplicate-seed", "leaders");
    const first = reduce(state, { type: "ACT", actionId: "rally" });
    const second = reduce(first.state, { type: "ACT", actionId: "rally" });
    expect(second.accepted).toBe(false);
    expect(second.reason).toMatch(/já foi usada/);
  });

  it("replays the same end-turn result for the same seed and command list", () => {
    const a = reduce(ready("replay-seed", "scout"), { type: "END_TURN" });
    const b = reduce(ready("replay-seed", "scout"), { type: "END_TURN" });
    expect(a.accepted).toBe(true);
    expect(a.state).toEqual(b.state);
  });

  it("applies a quartermaster requisition as real starting state", () => {
    const support = supportById("army_sherman");
    if (!support) throw new Error("Expected Sherman support");
    const state = createInitialState(
      mission,
      "support-seed",
      "leaders",
      support,
    );
    expect(state.deployedSupportId).toBe("army_sherman");
    expect(state.stats.defense).toBe(mission.stats.defense + 9);
    expect(state.resources.ammo).toBe(mission.resources.ammo + 16);
    expect(state.enemyPressure).toBe(25);
  });

  it("settles an ended mission only once for reputation and XP", () => {
    const closed = {
      ...createInitialState(mission, "reward-seed", "leaders"),
      phase: "ended" as const,
      outcome: {
        id: "hold" as const,
        title: "Linha preservada",
        description: "Teste",
      },
    };
    const first = settleMission(createCommandProfile(), closed);
    expect(first.reward?.reputation).toBeGreaterThan(0);
    expect(first.profile.xp).toBeGreaterThan(0);
    const second = settleMission(first.profile, closed);
    expect(second.reward).toBeUndefined();
    expect(second.profile).toEqual(first.profile);
  });
});
