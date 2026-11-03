import type { CommandProfile, SupportId } from "./contracts";
import { createCommandProfile, PROFILE_SCHEMA } from "./progression";

export const PROFILE_KEY = "ultima-linha-1944/command-profile/v1";

const SUPPORT_IDS: SupportId[] = [
  "army_sherman", "army_jeep", "army_artillery",
  "air_mustang", "air_fortress", "air_skytrain",
  "navy_destroyer", "navy_carrier", "navy_submarine",
];

const isSupportId = (value: unknown): value is SupportId =>
  typeof value === "string" && SUPPORT_IDS.includes(value as SupportId);

/** Invalid local data falls back safely; it never blocks a campaign from starting. */
export function decodeCommandProfile(raw: string | null): CommandProfile {
  if (!raw) return createCommandProfile();
  try {
    const candidate = JSON.parse(raw) as Partial<CommandProfile>;
    if (
      candidate.schemaVersion !== PROFILE_SCHEMA ||
      !Number.isFinite(candidate.reputation) ||
      !Number.isFinite(candidate.xp) ||
      !Array.isArray(candidate.unlockedSupportIds) ||
      !candidate.unlockedSupportIds.every(isSupportId) ||
      !candidate.deployedSupportByBranch ||
      !Array.isArray(candidate.settledSeeds)
    ) return createCommandProfile();
    const deployed = candidate.deployedSupportByBranch;
    const branches = ["army", "air", "navy"] as const;
    if (!branches.every((branch) => deployed[branch] === undefined || isSupportId(deployed[branch])))
      return createCommandProfile();
    return {
      schemaVersion: PROFILE_SCHEMA,
      reputation: Math.max(0, Math.floor(candidate.reputation ?? 0)),
      xp: Math.max(0, Math.floor(candidate.xp ?? 0)),
      unlockedSupportIds: [...new Set(candidate.unlockedSupportIds)],
      deployedSupportByBranch: { ...deployed },
      settledSeeds: candidate.settledSeeds.filter((seed) => typeof seed === "string").slice(-60),
    };
  } catch {
    return createCommandProfile();
  }
}

export const encodeCommandProfile = (profile: CommandProfile) =>
  JSON.stringify(profile);
