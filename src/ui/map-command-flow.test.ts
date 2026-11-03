import { describe, expect, it } from "vitest";
import {
  cancelOrder,
  chooseDestination,
  createMapCommandFlow,
  pendingCommand,
  selectFormation,
  startOrder,
} from "./map-command-flow";

describe("map command flow", () => {
  it("does not make an unexplained map touch into an order", () => {
    const flow = createMapCommandFlow("able");
    expect(chooseDestination(flow, { x: 12, y: 8 })).toEqual(flow);
  });

  it("requires a movement order before accepting a destination", () => {
    const flow = chooseDestination(
      startOrder(createMapCommandFlow("able"), "move"),
      { x: 12, y: 8 },
    );
    expect(flow).toMatchObject({
      selected: "able",
      order: "move",
      target: { x: 12, y: 8 },
      stage: "preview",
    });
  });

  it("previews stationary orders without a fictitious destination", () => {
    const flow = startOrder(createMapCommandFlow("baker"), "cover");
    expect(pendingCommand(flow)).toEqual({ unitId: "baker", order: "cover" });
  });

  it("clears a pending command when another formation is selected", () => {
    const flow = selectFormation(
      startOrder(createMapCommandFlow("able"), "move"),
      "charlie",
    );
    expect(flow).toEqual({ selected: "charlie", stage: "explore" });
  });

  it("allows a preview to be cancelled without changing selection", () => {
    const flow = cancelOrder(startOrder(createMapCommandFlow("hq"), "recon"));
    expect(flow).toEqual({ selected: "hq", stage: "explore" });
  });
});
