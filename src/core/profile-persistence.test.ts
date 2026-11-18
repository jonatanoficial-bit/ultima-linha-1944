import { describe, expect, it } from "vitest";
import { createCommandProfile, deploySupport } from "./progression";
import { decodeCommandProfile, encodeCommandProfile } from "./profile-persistence";
import { supportById } from "../content/supports";

describe("command profile persistence", () => {
  it("round-trips a requisition selected for its campaign", () => {
    const support = supportById("army_sherman");
    if (!support) throw new Error("Expected Sherman support");
    const profile = deploySupport({
      ...createCommandProfile(),
      unlockedSupportIds: [support.id],
    }, support);
    expect(decodeCommandProfile(encodeCommandProfile(profile))).toEqual(profile);
  });

  it("rejects foreign or malformed stored profiles safely", () => {
    expect(decodeCommandProfile('{"schemaVersion":"1.0.0","reputation":-2}')).toEqual(createCommandProfile());
    expect(decodeCommandProfile("{not json")).toEqual(createCommandProfile());
  });

  it("migrates a v1.1 career into isolated branch memory", () => {
    const legacy = {
      schemaVersion: "1.1.0",
      reputation: 67,
      xp: 122,
      unlockedSupportIds: [],
      deployedSupportByBranch: {},
      settledSeeds: ["legacy-seed"],
      campaigns: {
        army: {
          completedMissionIds: ["bastogne_east_cedar_1944"],
          history: [{
            missionId: "bastogne_east_cedar_1944",
            outcomeId: "hold",
            outcomeTitle: "Linha preservada",
            capable: 66,
            wounded: 19,
            missing: 0,
            dead: 0,
            decisions: 12,
            objectivesCompleted: 3,
            objectivesTotal: 3,
          }],
          totalDecisions: 12,
          losses: 0,
        },
      },
    };
    const migrated = decodeCommandProfile(JSON.stringify(legacy));
    expect(migrated.schemaVersion).toBe("1.2.0");
    expect(migrated.campaigns.army?.memory).toMatchObject({
      xp: 122,
      reputationCommand: 67,
    });
    expect(migrated.campaigns.air?.memory).toBeUndefined();
  });
});
