import type { CampaignRecord, CommandProfile, SupportId } from "./contracts";
import { createCommandProfile, PROFILE_SCHEMA } from "./progression";

export const PROFILE_KEY = "ultima-linha-1944/command-profile/v1";

const SUPPORT_IDS: SupportId[] = [
  "army_sherman", "army_jeep", "army_artillery",
  "air_mustang", "air_fortress", "air_skytrain",
  "navy_destroyer", "navy_carrier", "navy_submarine",
];

const isSupportId = (value: unknown): value is SupportId =>
  typeof value === "string" && SUPPORT_IDS.includes(value as SupportId);

const isCampaignRecord = (value: unknown): value is CampaignRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CampaignRecord>;
  return Array.isArray(record.completedMissionIds) &&
    record.completedMissionIds.every((id) => typeof id === "string") &&
    Array.isArray(record.history) &&
    record.history.every((entry) => entry && typeof entry.missionId === "string" && typeof entry.outcomeId === "string" && typeof entry.outcomeTitle === "string" && ["capable", "wounded", "missing", "dead", "decisions", "objectivesCompleted", "objectivesTotal"].every((key) => Number.isFinite(entry[key as keyof typeof entry]))) &&
    Number.isFinite(record.totalDecisions) && Number.isFinite(record.losses);
};

/** Invalid local data falls back safely; it never blocks a campaign from starting. */
export function decodeCommandProfile(raw: string | null): CommandProfile {
  if (!raw) return createCommandProfile();
  try {
    const candidate = JSON.parse(raw) as Partial<CommandProfile>;
    if (
      !["1.0.0", PROFILE_SCHEMA].includes(candidate.schemaVersion as string) ||
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
    const campaigns = candidate.campaigns && typeof candidate.campaigns === "object"
      ? Object.fromEntries(
        branches.filter((branch) => isCampaignRecord(candidate.campaigns![branch])).map((branch) => [branch, candidate.campaigns![branch] as CampaignRecord]),
      )
      : {};
    return {
      schemaVersion: PROFILE_SCHEMA,
      reputation: Math.max(0, Math.floor(candidate.reputation ?? 0)),
      xp: Math.max(0, Math.floor(candidate.xp ?? 0)),
      unlockedSupportIds: [...new Set(candidate.unlockedSupportIds)],
      deployedSupportByBranch: { ...deployed },
      settledSeeds: candidate.settledSeeds.filter((seed) => typeof seed === "string").slice(-60),
      campaigns,
    };
  } catch {
    return createCommandProfile();
  }
}

export const encodeCommandProfile = (profile: CommandProfile) =>
  JSON.stringify(profile);
