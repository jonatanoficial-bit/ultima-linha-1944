import type { Outcome, Resources, Stats } from "./contracts";

export type Point = { x: number; y: number };
export type Terrain =
  | "field"
  | "forest"
  | "road"
  | "village"
  | "water"
  | "runway"
  | "rubble";
export type UnitOrder = "hold" | "move" | "recon" | "cover";
export interface Formation extends Point {
  id: string;
  name: string;
  role: string;
  strength: number;
  order: UnitOrder;
  target?: Point;
  orderedTurn?: number;
  ammunition?: number;
}
export interface Contact {
  id: string;
  name: string;
  role: string;
  channel: "radio" | "local";
}
export interface Effects {
  stats?: Partial<Stats>;
  resources?: Partial<Resources>;
  systems?: Record<string, number>;
  trust?: number;
  flag?: string;
}
export interface Decision {
  id: string;
  label: string;
  consequence: string;
  effects: Effects;
}
export interface RadioEvent {
  id: string;
  turn: number;
  from: string;
  title: string;
  text: string;
  choices: Decision[];
}
export interface DomainAction {
  id: string;
  label: string;
  description: string;
  ap: number;
  duration: number;
  cost: Partial<Resources>;
  systemsCost?: Record<string, number>;
  effects: Effects;
  requires?: Record<string, number>;
}

/** A data-only condition evaluated by the shared operations engine. */
export interface ObjectiveRule {
  source: "system" | "stat" | "personnel" | "flag" | "objectiveTurns" | "objective";
  key?: string;
  operator: "gte" | "lte" | "equals" | "present";
  value?: number;
}

/**
 * Mission goals are content, not UI decoration. Their state is derived from the
 * same resources, systems and decisions that resolve a turn.
 */
export interface OperationObjective {
  id: string;
  label: string;
  briefing: string;
  requires: ObjectiveRule[];
  /** Alternative fully-valid paths, such as sortie OR deliberate preservation. */
  anyOf?: ObjectiveRule[][];
}

/** Ordered from best to fallback; terminal endings may close a mission early. */
export interface OperationEnding {
  id: Outcome["id"];
  title: string;
  description: string;
  requires?: ObjectiveRule[];
  terminal?: boolean;
}
export interface OperationDefinition {
  title: string;
  commander: string;
  rank: string;
  start: string;
  minutes: number;
  weather: string;
  columns: number;
  rows: number;
  terrain: Terrain[];
  places: ({ name: string } & Point)[];
  units: Formation[];
  enemies: Formation[];
  contacts: Contact[];
  events: RadioEvent[];
  prologue: { speaker: string; text: string }[];
  systems: Record<string, number>;
  systemLabels: Record<string, string>;
  actions: DomainAction[];
  reserve: Partial<Resources>;
  objective: Point;
  objectives: OperationObjective[];
  endings: OperationEnding[];
  mapNote: string;
}
export interface Transmission {
  id: string;
  contactId: string;
  topic: "advice" | "supplies" | "medical";
  status: "pending" | "failed" | "denied" | "transit" | "delivered";
  created: number;
  eta: number;
  text: string;
  cargo?: Partial<Resources>;
}
export interface OperationState {
  decisionRecords?: { eventId: string; choiceId: string; turn: number }[];
  damageSites?: (Point & { turn: number })[];
  definition: OperationDefinition;
  units: Formation[];
  enemies: Formation[];
  systems: Record<string, number>;
  trust: number;
  decisions: string[];
  flags: string[];
  transmissions: Transmission[];
  tasks: { id: string; actionId: string; eta: number }[];
  reserve: Partial<Resources>;
  reports: string[];
  objectiveTurns: number;
}

export interface ObjectiveStatus {
  id: string;
  label: string;
  briefing: string;
  complete: boolean;
  /** The first declared criterion gives the HUD an honest current/target readout. */
  current?: number;
  target?: number;
  operator?: ObjectiveRule["operator"];
  source?: ObjectiveRule["source"];
  key?: string;
}
export type OperationCommand =
  | { type: "ORDER"; unitId: string; order: UnitOrder; target?: Point }
  | { type: "CONTACT"; contactId: string; topic: Transmission["topic"] }
  | { type: "DECIDE"; eventId: string; choiceId: string }
  | { type: "TASK"; actionId: string };
