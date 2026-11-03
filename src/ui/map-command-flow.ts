import type { Point, UnitOrder } from "../core/operations-types";

/**
 * Deliberately small UI state machine for the tactical map. It keeps map
 * touches from becoming orders until the player selects an action and reviews it.
 */
export type MapCommandStage = "explore" | "destination" | "preview";

export interface MapCommandFlow {
  selected: string;
  stage: MapCommandStage;
  order?: UnitOrder;
  target?: Point;
}

export const createMapCommandFlow = (selected: string): MapCommandFlow => ({
  selected,
  stage: "explore",
});

export const selectFormation = (
  flow: MapCommandFlow,
  selected: string,
): MapCommandFlow => ({ selected, stage: "explore" });

export const startOrder = (
  flow: MapCommandFlow,
  order: UnitOrder,
): MapCommandFlow => ({
  selected: flow.selected,
  order,
  stage: order === "move" ? "destination" : "preview",
});

/** A coordinate has meaning only after a displacement was explicitly chosen. */
export const chooseDestination = (
  flow: MapCommandFlow,
  target: Point,
): MapCommandFlow =>
  flow.stage === "destination" && flow.order === "move"
    ? { ...flow, target, stage: "preview" }
    : flow;

export const cancelOrder = (flow: MapCommandFlow): MapCommandFlow =>
  createMapCommandFlow(flow.selected);

export const pendingCommand = (flow: MapCommandFlow) =>
  flow.stage === "preview" && flow.order
    ? {
        unitId: flow.selected,
        order: flow.order,
        ...(flow.order === "move" && flow.target
          ? { target: { ...flow.target } }
          : {}),
      }
    : undefined;
