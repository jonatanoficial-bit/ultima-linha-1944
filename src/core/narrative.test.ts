import { describe, it, expect } from "vitest";
import { advanceNarrative, newNarrative, readingTime } from "./narrative";
import { cinematicFor, CINEMATICS, narrativePlan } from "../content/cinematics";
import { MISSIONS } from "../content/missions";
import { createInitialState } from "./engine";
import { decodeSave, encodeSave } from "./persistence";

describe("cinematic narrative and simulation boundary", () => {
  for (const mission of MISSIONS.filter(m => m.campaignId !== "lab")) {
    it(`${mission.campaignId}: uses all three approved scenes and starts once, after an explicit choice`, () => {
      const plan = narrativePlan(mission);
      const assets = mission.operation!.prologue.map((_, i) => cinematicFor(mission, i));
      expect(assets.every(a => a?.missionId === mission.id)).toBe(true);
      expect(new Set(assets.map(a => a!.id)).size).toBe(3);
      let s = newNarrative();
      for (let i = 0; i < plan.length + 4 && s.stage !== "complete"; i++) {
        if (s.stage === "choice") {
          expect(advanceNarrative(s, { type: "next" }, plan)).toEqual(s);
          expect(advanceNarrative(s, { type: "choose", id: "invalid" }, plan)).toEqual(s);
          s = advanceNarrative(s, { type: "choose", id: plan.choices[0] }, plan);
        } else s = advanceNarrative(s, { type: "next" }, plan);
      }
      expect(s.stage).toBe("complete");
      expect(s.choice).toBe(plan.choices[0]);
      expect(advanceNarrative(s, { type: "choose", id: plan.choices[1] }, plan)).toEqual(s);
      const game = createInitialState(mission, "cinema", s.choice);
      expect(game.currentTurn).toBe(1);
      expect(decodeSave(encodeSave(game), mission).stats).toEqual(game.stats);
    });
    it(`${mission.campaignId}: skip explains the story and never invents a choice`, () => {
      const plan = narrativePlan(mission);
      let s = advanceNarrative(newNarrative(), { type: "skip" }, plan);
      expect(s.stage).toBe("summary");
      s = advanceNarrative(s, { type: "next" }, plan);
      expect(s.stage).toBe("choice");
      expect(s.index).toBe(plan.decisionAfter);
      expect(s.choice).toBeUndefined();
      s = advanceNarrative(s, { type: "choose", id: plan.choices[1] }, plan);
      expect(s.stage).toBe("complete");
    });
  }
  it("air: the crash choice precedes the return and cannot be applied twice or reversed", () => {
    const plan = narrativePlan(MISSIONS.find(m => m.campaignId === "air")!);
    let s = advanceNarrative(newNarrative(), { type: "next" }, plan);
    expect(s.index).toBe(0);
    expect(s.stage).toBe("choice");
    s = advanceNarrative(s, { type: "choose", id: plan.choices[0] }, plan);
    expect(s.index).toBe(1);
    expect(advanceNarrative(s, { type: "back" }, plan)).toEqual(s);
    s = advanceNarrative(s, { type: "skip" }, plan);
    s = advanceNarrative(s, { type: "next" }, plan);
    expect(s.stage).toBe("complete");
    expect(s.choice).toBe(plan.choices[0]);
  });
  it("loads version 0.3 saves without changing turns, choices or resources", () => {
    const mission = MISSIONS[0];
    const current = createInitialState(mission, "legacy-cinema", "medical");
    current.gameVersion = "0.3.0";
    current.contentVersion = "0.3.0";
    const restored = decodeSave(encodeSave(current), mission);
    expect(restored.currentTurn).toBe(current.currentTurn);
    expect(restored.resources).toEqual(current.resources);
    expect(restored.stats).toEqual(current.stats);
    expect(restored.prologueChoiceId).toBe("medical");
    expect(restored.operation!.decisions).toEqual(current.operation!.decisions);
  });
  it("manifest has nine unique local image URLs and a readable auto interval", () => {
    expect(new Set(CINEMATICS.map(a => a.runtimePath)).size).toBe(9);
    expect(CINEMATICS.every(a => a.runtimePath.startsWith("assets/missions/") && !a.runtimePath.includes(".."))).toBe(true);
    expect(readingTime("Uma ordem curta.")).toBe(7000);
    expect(readingTime(Array(60).fill("palavra").join(" "))).toBe(24000);
  });
});
