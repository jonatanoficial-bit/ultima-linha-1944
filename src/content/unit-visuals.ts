import type { BranchId } from "../core/contracts";
import type { Formation } from "../core/operations-types";
import { approvedAsset, assetUrl } from "./assets";

/** Presentation stills stay in the UI; only these orthographic derivatives enter the map. */
export type TacticalSprite = "command" | "infantry" | "support" | "destroyer" | "aircraft";

const spriteFile: Record<TacticalSprite, string> = {
  command: "sprites/command-post-topdown.png",
  infantry: "sprites/infantry-squad-topdown.png",
  support: "sprites/support-team-topdown.png",
  destroyer: "sprites/destroyer-topdown.png",
  aircraft: "sprites/aircraft-generic-topdown.png",
};

export interface UnitVisual {
  assetId: string;
  sprite: TacticalSprite;
  classification: string;
}

export function visualForUnit(branch: BranchId, unit: Formation): UnitVisual {
  if (branch === "navy")
    return { assetId: "N007", sprite: "destroyer", classification: "Contratorpedeiro de escolta · arte de referência" };
  if (/comando/i.test(unit.role))
    return { assetId: "U005", sprite: "command", classification: "Posto de comando · presença de campo" };
  if (/apoio|manuten|servi/i.test(unit.role))
    return { assetId: branch === "air" ? "U004" : "U007", sprite: "support", classification: "Equipe de apoio · presença de campo" };
  return {
    assetId: branch === "air" ? "U004" : "U001",
    sprite: "infantry",
    classification: branch === "air" ? "Equipe de solo · presença de campo" : "Infantaria · presença de campo",
  };
}

export const topDownSpriteUrl = (sprite: TacticalSprite) => assetUrl({ file: spriteFile[sprite] });
export const unitCardAssetUrl = (branch: BranchId, unit: Formation) => assetUrl(approvedAsset(visualForUnit(branch, unit).assetId));
