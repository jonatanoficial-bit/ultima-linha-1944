import type {
  BranchCareerMemory,
  CampaignRecord,
  CommandProfile,
  SupportId,
} from "./contracts";
import { createCommandProfile, emptyCareerMemory, PROFILE_SCHEMA } from "./progression";

export const PROFILE_KEY = "ultima-linha-1944/command-profile/v1";

const SUPPORT_IDS: SupportId[] = [
  "army_sherman", "army_jeep", "army_artillery",
  "air_mustang", "air_fortress", "air_skytrain",
  "navy_destroyer", "navy_carrier", "navy_submarine",
];
const branches = ["army", "air", "navy"] as const;

const isSupportId = (value: unknown): value is SupportId =>
  typeof value === "string" && SUPPORT_IDS.includes(value as SupportId);

const isHistory = (value: unknown): value is CampaignRecord["history"][number] => {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.missionId === "string" &&
    typeof entry.outcomeId === "string" &&
    typeof entry.outcomeTitle === "string" &&
    ["capable", "wounded", "missing", "dead", "decisions", "objectivesCompleted", "objectivesTotal"].every((key) => Number.isFinite(entry[key]));
};

const isCampaignRecord = (value: unknown): value is CampaignRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CampaignRecord>;
  return Array.isArray(record.completedMissionIds) &&
    record.completedMissionIds.every((id) => typeof id === "string") &&
    Array.isArray(record.history) && record.history.every(isHistory) &&
    Number.isFinite(record.totalDecisions) && Number.isFinite(record.losses);
};

const isMemory = (value: unknown): value is BranchCareerMemory => {
  if (!value || typeof value !== "object") return false;
  const memory = value as Partial<BranchCareerMemory>;
  const reputation = [memory.reputationCommand, memory.reputationHumanity, memory.reputationStaff]
    .every(Number.isFinite);
  return Number.isFinite(memory.xp) && reputation &&
    typeof memory.rank === "string" && typeof memory.appointedCommand === "string" &&
    memory.lossLedger !== undefined && Object.values(memory.lossLedger).every(Number.isFinite) &&
    memory.relationships !== undefined && Number.isFinite(memory.relationships.commandTrust) && Array.isArray(memory.relationships.contacts) &&
    Array.isArray(memory.unitRoster) && Array.isArray(memory.scars) && Array.isArray(memory.medals) &&
    Array.isArray(memory.decisionFlags) && Array.isArray(memory.timeline) &&
    memory.nextMissionStatus === "awaiting-production";
};

const legacyMemory = (
  record: CampaignRecord,
  legacyXp: number,
  legacyReputation: number,
): BranchCareerMemory => {
  const memory = emptyCareerMemory();
  const latest = record.history.at(-1);
  return {
    ...memory,
    xp: Math.max(0, Math.floor(legacyXp)),
    reputationCommand: Math.max(0, Math.min(100, Math.floor(legacyReputation))),
    lossLedger: latest
      ? { capable: latest.capable, wounded: latest.wounded, missing: latest.missing, dead: latest.dead }
      : memory.lossLedger,
    scars: latest?.dead ? [`${latest.dead} perda(s) definitiva(s) registrada(s)`] : [],
    timeline: record.history.map((entry) => ({
      missionId: entry.missionId,
      outcomeTitle: entry.outcomeTitle,
      startedAt: "Registro migrado da edição 0.11",
      turns: 0,
      decisions: entry.decisions,
    })).slice(-12),
  };
};

/** Invalid local data falls back safely; it never blocks a campaign from starting. */
export function decodeCommandProfile(raw: string | null): CommandProfile {
  if (!raw) return createCommandProfile();
  try {
    const candidate = JSON.parse(raw) as Partial<CommandProfile> & { reputation?: unknown; xp?: unknown };
    if (
      !["1.0.0", "1.1.0", PROFILE_SCHEMA].includes(candidate.schemaVersion as string) ||
      !Array.isArray(candidate.unlockedSupportIds) ||
      !candidate.unlockedSupportIds.every(isSupportId) ||
      !candidate.deployedSupportByBranch ||
      !Array.isArray(candidate.settledSeeds)
    ) return createCommandProfile();
    const deployed = candidate.deployedSupportByBranch;
    if (!branches.every((branch) => deployed[branch] === undefined || isSupportId(deployed[branch])))
      return createCommandProfile();
    const validEntries = branches
      .filter((branch) => isCampaignRecord(candidate.campaigns?.[branch]))
      .map((branch) => [branch, candidate.campaigns![branch] as CampaignRecord] as const);
    const legacyXp = Number.isFinite(candidate.xp) ? Number(candidate.xp) : 0;
    const legacyReputation = Number.isFinite(candidate.reputation) ? Number(candidate.reputation) : 24;
    const campaigns = Object.fromEntries(validEntries.map(([branch, record], index) => {
      const migratedMemory = isMemory(record.memory)
        ? record.memory
        // v1.1 stored rewards globally. Assign them only when there was one
        // completed branch, avoiding false transfer between protagonists.
        : legacyMemory(record, validEntries.length === 1 && index === 0 ? legacyXp : 0, validEntries.length === 1 && index === 0 ? legacyReputation : 24);
      return [branch, { ...record, memory: migratedMemory }];
    }));
    return {
      schemaVersion: PROFILE_SCHEMA,
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
