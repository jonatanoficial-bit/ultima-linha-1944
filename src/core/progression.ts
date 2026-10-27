import type { CommandProfile, GameState, SupportPackage } from "./contracts";

export const PROFILE_SCHEMA = "1.0.0" as const;

export const createCommandProfile = (): CommandProfile => ({
  schemaVersion: PROFILE_SCHEMA,
  reputation: 24,
  xp: 0,
  unlockedSupportIds: [],
  deployedSupportByBranch: {},
  settledSeeds: [],
});

export const rankForXp = (xp: number): { title: string; nextAt?: number } => {
  if (xp >= 700) return { title: "Comando de força-tarefa" };
  if (xp >= 360) return { title: "Oficial de campanha", nextAt: 700 };
  if (xp >= 160) return { title: "Líder de seção", nextAt: 360 };
  return { title: "Oficial em avaliação", nextAt: 160 };
};

export const rewardForOutcome = (state: GameState): { reputation: number; xp: number } => {
  const base = {
    hold: { reputation: 32, xp: 90 },
    "costly-hold": { reputation: 22, xp: 64 },
    withdrawal: { reputation: 14, xp: 42 },
    survival: { reputation: 9, xp: 28 },
    surrender: { reputation: 4, xp: 15 },
    collapse: { reputation: 0, xp: 8 },
  };
  const reward = base[state.outcome?.id ?? "collapse"];
  const efficiency = Math.max(0, Math.min(10, state.maxTurns - state.currentTurn + 2));
  return { reputation: reward.reputation + efficiency, xp: reward.xp + efficiency * 3 };
};

export const settleMission = (profile: CommandProfile, state: GameState): { profile: CommandProfile; reward?: { reputation: number; xp: number } } => {
  if (!state.outcome || profile.settledSeeds.includes(state.seed)) return { profile };
  const reward = rewardForOutcome(state);
  return {
    reward,
    profile: {
      ...profile,
      reputation: profile.reputation + reward.reputation,
      xp: profile.xp + reward.xp,
      settledSeeds: [...profile.settledSeeds.slice(-59), state.seed],
    },
  };
};

export const purchaseSupport = (profile: CommandProfile, support: SupportPackage): CommandProfile | undefined => {
  if (profile.unlockedSupportIds.includes(support.id)) return profile;
  if (profile.reputation < support.requestCost) return undefined;
  return {
    ...profile,
    reputation: profile.reputation - support.requestCost,
    unlockedSupportIds: [...profile.unlockedSupportIds, support.id],
  };
};

export const deploySupport = (profile: CommandProfile, support: SupportPackage): CommandProfile => ({
  ...profile,
  deployedSupportByBranch: { ...profile.deployedSupportByBranch, [support.branch]: support.id },
});
