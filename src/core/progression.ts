import type {
  BranchCareerMemory,
  CampaignRecord,
  CommandProfile,
  GameState,
  SupportPackage,
} from "./contracts";
import { objectiveStatuses } from "./operations-engine";

export const PROFILE_SCHEMA = "1.2.0" as const;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const branchAppointment = (state: GameState): string =>
  state.operation?.definition.title ?? "Comando em avaliação";

export const emptyCareerMemory = (): BranchCareerMemory => ({
  xp: 0,
  reputationCommand: 24,
  reputationHumanity: 50,
  reputationStaff: 50,
  rank: "Patente preservada · sem promoção automática",
  appointedCommand: "Aguardando capítulo concluído",
  unitRoster: [],
  lossLedger: { capable: 0, wounded: 0, missing: 0, dead: 0 },
  relationships: { commandTrust: 50, contacts: [] },
  scars: [],
  medals: [],
  decisionFlags: [],
  timeline: [],
  nextMissionStatus: "awaiting-production",
});

export const careerMemoryFor = (
  profile: CommandProfile,
  branch: Exclude<GameState["campaignId"], "lab">,
): BranchCareerMemory => profile.campaigns[branch]?.memory ?? emptyCareerMemory();

export const createCommandProfile = (): CommandProfile => ({
  schemaVersion: PROFILE_SCHEMA,
  unlockedSupportIds: [],
  deployedSupportByBranch: {},
  settledSeeds: [],
  campaigns: {},
});

/** Competence is an internal assessment, never a historical promotion. */
export const competenceForXp = (xp: number): { title: string; nextAt?: number } => {
  if (xp >= 700) return { title: "Avaliação: comando de força-tarefa" };
  if (xp >= 360) return { title: "Avaliação: oficial de campanha", nextAt: 700 };
  if (xp >= 160) return { title: "Avaliação: líder de seção", nextAt: 360 };
  return { title: "Avaliação: oficial em desenvolvimento", nextAt: 160 };
};

const outcomeScore = (state: GameState, objectives: number) => {
  const base = {
    hold: 82,
    "costly-hold": 66,
    withdrawal: 50,
    survival: 38,
    surrender: 18,
    collapse: 10,
  }[state.outcome?.id ?? "collapse"];
  const people = state.personnel.total
    ? state.personnel.capable / state.personnel.total
    : 0;
  return Math.max(0, Math.min(100, Math.round(base + objectives * 4 + people * 10 - state.personnel.dead * 0.45)));
};

/** The Bible's bounded M01-style formula, reusable by data-driven chapters. */
export const rewardForOutcome = (state: GameState): { reputation: number; xp: number; score: number } => {
  const statuses = objectiveStatuses(state);
  const complete = statuses.filter((status) => status.complete).length;
  const score = outcomeScore(state, complete);
  const bonuses = Math.min(20, complete * 5 + Math.max(0, 3 - state.personnel.dead));
  return {
    score,
    xp: Math.min(140, 40 + Math.round(score * 0.8) + bonuses),
    reputation: Math.max(0, Math.round((score - 35) / 4)),
  };
};

const scarsFor = (state: GameState): string[] => {
  const scars: string[] = [];
  if (state.personnel.dead) scars.push(`${state.personnel.dead} perda(s) definitiva(s) registrada(s)`);
  if (state.personnel.missing) scars.push(`${state.personnel.missing} pessoa(s) desaparecida(s) aguardando confirmação`);
  if (state.personnel.wounded) scars.push(`${state.personnel.wounded} pessoa(s) ferida(s) ou limitada(s) após a operação`);
  return scars;
};

const createMemory = (
  state: GameState,
  previous: BranchCareerMemory,
  reward: { reputation: number; xp: number },
): BranchCareerMemory => {
  const operation = state.operation!;
  const objectiveCount = objectiveStatuses(state).filter((status) => status.complete).length;
  const contacts = [...new Set(operation.definition.contacts.map((contact) => contact.name))];
  return {
    xp: previous.xp + reward.xp,
    reputationCommand: clamp(previous.reputationCommand + reward.reputation + objectiveCount * 2 - state.personnel.dead),
    reputationHumanity: clamp(previous.reputationHumanity + (state.stats.morale - 50) / 8 - state.personnel.dead / 2),
    reputationStaff: clamp(previous.reputationStaff + (operation.trust - 50) / 10 + (state.stats.radio - 50) / 16),
    rank: operation.definition.rank,
    appointedCommand: branchAppointment(state),
    unitRoster: operation.units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      role: unit.role,
      capable: unit.strength,
      status: unit.strength <= 0 ? "lost" : unit.strength < 4 ? "reduced" : "operational",
    })),
    lossLedger: {
      capable: state.personnel.capable,
      wounded: state.personnel.wounded,
      missing: state.personnel.missing,
      dead: state.personnel.dead,
    },
    relationships: { commandTrust: operation.trust, contacts },
    scars: scarsFor(state),
    // Awards require a dedicated, historically plausible event.
    medals: previous.medals,
    decisionFlags: [...new Set([...previous.decisionFlags, ...operation.flags])].slice(-40),
    timeline: [
      ...previous.timeline,
      {
        missionId: state.missionId,
        outcomeTitle: state.outcome!.title,
        startedAt: operation.definition.start,
        turns: Math.min(state.currentTurn, state.maxTurns),
        decisions: operation.decisions.length,
      },
    ].slice(-12),
    nextMissionStatus: "awaiting-production",
  };
};

export const settleMission = (profile: CommandProfile, state: GameState): { profile: CommandProfile; reward?: { reputation: number; xp: number; score: number } } => {
  // A standalone mission is a safe place to rehearse the systems, never a way
  // to farm reputation or rewrite a commander's career record.
  if (!state.outcome || state.runMode === "single" || profile.settledSeeds.includes(state.seed)) return { profile };
  const branch = state.campaignId === "lab" ? undefined : state.campaignId;
  const previous = branch ? profile.campaigns[branch] : undefined;
  // Replaying an already published chapter inside the same career is allowed,
  // but is not a second historical result and cannot farm XP or authority.
  if (previous?.completedMissionIds.includes(state.missionId)) return { profile };
  const reward = rewardForOutcome(state);
  const status = objectiveStatuses(state);
  const record: CampaignRecord | undefined = branch ? {
    completedMissionIds: [...new Set([...(previous?.completedMissionIds ?? []), state.missionId])],
    history: [
      ...(previous?.history ?? []),
      {
        missionId: state.missionId,
        outcomeId: state.outcome.id,
        outcomeTitle: state.outcome.title,
        capable: state.personnel.capable,
        wounded: state.personnel.wounded,
        missing: state.personnel.missing,
        dead: state.personnel.dead,
        decisions: state.operation?.decisions.length ?? 0,
        objectivesCompleted: status.filter((objective) => objective.complete).length,
        objectivesTotal: status.length,
      },
    ].slice(-8),
    totalDecisions: (previous?.totalDecisions ?? 0) + (state.operation?.decisions.length ?? 0),
    losses: (previous?.losses ?? 0) + state.personnel.dead,
    memory: createMemory(state, previous?.memory ?? emptyCareerMemory(), reward),
  } : undefined;
  return {
    reward,
    profile: {
      ...profile,
      settledSeeds: [...profile.settledSeeds.slice(-59), state.seed],
      campaigns: branch && record
        ? { ...profile.campaigns, [branch]: record }
        : profile.campaigns,
    },
  };
};

export const purchaseSupport = (profile: CommandProfile, support: SupportPackage): CommandProfile | undefined => {
  if (profile.unlockedSupportIds.includes(support.id)) return profile;
  // Authority unlocks a requisition; it is not a fictional currency to spend.
  if (careerMemoryFor(profile, support.branch).reputationCommand < support.requestCost) return undefined;
  return {
    ...profile,
    unlockedSupportIds: [...profile.unlockedSupportIds, support.id],
  };
};

export const deploySupport = (profile: CommandProfile, support: SupportPackage): CommandProfile => ({
  ...profile,
  deployedSupportByBranch: { ...profile.deployedSupportByBranch, [support.branch]: support.id },
});
