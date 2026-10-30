import type { GameState } from "./contracts";
import type { Point } from "./operations-types";

/** A filtered receipt of an actual simulation event, never another simulation tick. */
export interface TurnEvent {
  kind: "move" | "contact" | "work" | "radio" | "status";
  text: string;
  unitId?: string;
  path?: Point[];
  position?: Point;
  source?: Point;
  strength?: number;
  incomingFire?: boolean;
  returningFire?: boolean;
}

export const eventDuration = (event: TurnEvent) => event.kind === "move" ? 2600 : event.kind === "contact" ? 2400 : 1800;

/** All interpolation follows the recorded cells, including corners. */
export function pointOnRoute(path: Point[], progress: number): Point | undefined {
  if (!path.length) return;
  const step = Math.max(0, Math.min(1, progress)) * (path.length - 1);
  const index = Math.min(path.length - 1, Math.floor(step));
  const from = path[index], to = path[Math.min(index + 1, path.length - 1)];
  return { x: from.x + (to.x - from.x) * (step - index), y: from.y + (to.y - from.y) * (step - index) };
}

/** A disposable visual snapshot. The saved state is already committed by the reducer. */
export function applyVisualEvent(state: GameState, event: TurnEvent) {
  const unit = state.operation?.units.find(u => u.id === event.unitId);
  if (!unit) return;
  if (event.path?.length) Object.assign(unit, event.path[event.path.length - 1]);
  if (event.strength !== undefined) unit.strength = event.strength;
}
