import type {
  OperationCommand,
  OperationDefinition,
  OperationState,
} from "./operations-types";
export type BranchId = "army" | "air" | "navy" | "lab";
export type GamePhase = "playing" | "ended";
export type ActionId =
  | "rally"
  | "triage"
  | "recon"
  | "fortify"
  | "radio"
  | "rest";
export type SupportId =
  | "army_sherman"
  | "army_jeep"
  | "army_artillery"
  | "air_mustang"
  | "air_fortress"
  | "air_skytrain"
  | "navy_destroyer"
  | "navy_carrier"
  | "navy_submarine";

export interface Personnel {
  unavailable?: number;
  capable: number;
  wounded: number;
  missing: number;
  dead: number;
  total: number;
}

export interface Resources {
  ammo: number;
  medKits: number;
  materials: number;
  batteries: number;
  food: number;
}

export interface MissionMap {
  columns: number;
  rows: number;
  theme: "snow" | "airfield" | "ocean" | "outpost";
}

export interface MissionVisuals {
  heroAssetId: string;
  catalogueAssetIds: string[];
  backdrop: {
    file: string;
    title: string;
    description: string;
  };
}

export interface SupportEffects {
  stats?: Partial<Stats>;
  resources?: Partial<Resources>;
  pressureDelta?: number;
}

/** A requisition is selected before a mission and applied by the deterministic engine. */
export interface SupportPackage {
  id: SupportId;
  branch: Exclude<BranchId, "lab">;
  assetId: string;
  title: string;
  description: string;
  requestCost: number;
  effects: SupportEffects;
}

/** Persistent, browser-local commander progression. No account or network is required. */
export interface CommandProfile {
  schemaVersion: "1.0.0";
  reputation: number;
  xp: number;
  unlockedSupportIds: SupportId[];
  deployedSupportByBranch: Partial<Record<Exclude<BranchId, "lab">, SupportId>>;
  settledSeeds: string[];
}

export interface IntroChoice {
  id: string;
  label: string;
  description: string;
  adjustments: Partial<
    Pick<Stats, "morale" | "readiness" | "intelligence" | "legitimacy">
  >;
}

export interface MissionPack {
  operation?: OperationDefinition;
  id: string;
  contentVersion: string;
  campaignId: BranchId;
  title: string;
  subtitle: string;
  historicalNotice: string;
  turnLabel: string;
  maxTurns: number;
  map: MissionMap;
  visuals: MissionVisuals;
  operationalGoal: string;
  threatBrief: string;
  personnel: Personnel;
  resources: Resources;
  stats: Stats;
  introChoices: IntroChoice[];
}

export interface Stats {
  morale: number;
  readiness: number;
  intelligence: number;
  radio: number;
  defense: number;
  fatigue: number;
  legitimacy: number;
}

export interface EventLogEntry {
  turn: number;
  category: "command" | "enemy" | "system" | "outcome";
  text: string;
}

export interface Outcome {
  id:
    | "hold"
    | "costly-hold"
    | "withdrawal"
    | "collapse"
    | "surrender"
    | "survival";
  title: string;
  description: string;
}

export interface GameState {
  operation?: OperationState;
  gameVersion: string;
  contentVersion: string;
  missionId: string;
  campaignId: BranchId;
  seed: string;
  rngState: number;
  phase: GamePhase;
  currentTurn: number;
  maxTurns: number;
  commandAP: number;
  usedActions: ActionId[];
  enemyPressure: number;
  personnel: Personnel;
  resources: Resources;
  stats: Stats;
  prologueChoiceId: string;
  deployedSupportId?: SupportId;
  log: EventLogEntry[];
  outcome?: Outcome;
}

export type Command =
  | OperationCommand
  | { type: "ACT"; actionId: ActionId }
  | { type: "END_TURN" };

export interface Transition {
  accepted: boolean;
  state: GameState;
  reason?: string;
  events?: import("./turn-events").TurnEvent[];
}

export interface SaveFile {
  schemaVersion: "1.0.0";
  savedAt: string;
  state: GameState;
}
