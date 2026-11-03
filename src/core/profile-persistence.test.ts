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
    expect(decodeCommandProfile('{not json')).toEqual(createCommandProfile());
  });

  it("migrates a valid v1 profile without losing requisitions", () => {
    const current = createCommandProfile();
    const legacy = { ...current, schemaVersion: "1.0.0" } as Record<string, unknown>;
    delete legacy.campaigns;
    const migrated = decodeCommandProfile(JSON.stringify(legacy));
    expect(migrated.schemaVersion).toBe("1.1.0");
    expect(migrated.reputation).toBe(current.reputation);
    expect(migrated.campaigns).toEqual({});
  });
});
