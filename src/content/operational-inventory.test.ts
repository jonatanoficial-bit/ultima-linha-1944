import { describe, expect, it } from "vitest";
import { getMission } from "./missions";
import { createInitialState } from "../core/engine";
import { aircraftInventory } from "./operational-inventory";

describe("operational inventory", () => {
  it("shows the six A01 airframes without inventing a model", () => {
    const mission = getMission("airfield_last_wing_1944");
    if (!mission) throw new Error("Missing A01 mission");
    const inventory = aircraftInventory(createInitialState(mission, "air-inventory"));
    expect(inventory).toHaveLength(6);
    expect(inventory.filter((asset) => asset.condition === "ready")).toHaveLength(2);
    expect(inventory.filter((asset) => asset.condition === "repairable")).toHaveLength(2);
    expect(inventory.filter((asset) => asset.condition === "lost")).toHaveLength(2);
    expect(inventory.some((asset) => /P-51|B-17|Mustang/.test(asset.label))).toBe(false);
  });
});
