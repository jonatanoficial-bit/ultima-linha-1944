import { describe, expect, it } from "vitest";
import { getMission } from "../content/missions";
import { createInitialState, reduce } from "./engine";

const mission = getMission("bastogne_east_cedar_1944");
if (!mission) throw new Error("Expected M01 package");

describe("mission engine", () => {
  it("conserves the canonical M01 population", () => {
    const state = createInitialState(mission, "population-seed", "leaders");
    expect(state.personnel.capable + state.personnel.wounded + state.personnel.missing + state.personnel.dead).toBe(118);
  });

  it("applies triage as a real resource and personnel change", () => {
    const state = createInitialState(mission, "triage-seed", "medical");
    const next = reduce(state, { type: "ACT", actionId: "triage" });
    expect(next.accepted).toBe(true);
    expect(next.state.resources.medKits).toBe(state.resources.medKits - 1);
    expect(next.state.personnel.capable).toBe(state.personnel.capable + 2);
    expect(next.state.personnel.wounded).toBe(state.personnel.wounded - 2);
  });

  it("refuses an action that has already occupied this turn", () => {
    const state = createInitialState(mission, "duplicate-seed", "leaders");
    const first = reduce(state, { type: "ACT", actionId: "rally" });
    const second = reduce(first.state, { type: "ACT", actionId: "rally" });
    expect(second.accepted).toBe(false);
    expect(second.reason).toMatch(/já foi usada/);
  });

  it("replays the same end-turn result for the same seed and command list", () => {
    const a = reduce(createInitialState(mission, "replay-seed", "scout"), { type: "END_TURN" });
    const b = reduce(createInitialState(mission, "replay-seed", "scout"), { type: "END_TURN" });
    expect(a.state).toEqual(b.state);
  });
});
