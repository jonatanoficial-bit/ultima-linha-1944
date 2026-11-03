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
});
