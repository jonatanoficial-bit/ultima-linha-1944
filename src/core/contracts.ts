export type BranchId = "army" | "air" | "navy" | "lab";
export type GamePhase = "playing" | "ended";
export type ActionId = "rally" | "triage" | "recon" | "fortify" | "radio" | "rest";

export interface Personnel {
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
}

export interface IntroChoice {
  id: string;
  label: string;
  description: string;
  adjustments: Partial<Pick<Stats, "morale" | "readiness" | "intelligence" | "legitimacy">>;
}

export interface MissionPack {
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
  id: "hold" | "costly-hold" | "withdrawal" | "collapse" | "surrender" | "survival";
  title: string;
  description: string;
}

export interface GameState {
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
  log: EventLogEntry[];
  outcome?: Outcome;
}

export type Command =
  | { type: "ACT"; actionId: ActionId }
  | { type: "END_TURN" };

export interface Transition {
  accepted: boolean;
  state: GameState;
  reason?: string;
}

export interface SaveFile {
  schemaVersion: "1.0.0";
  savedAt: string;
  state: GameState;
}
