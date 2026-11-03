import type { GameState } from "../core/contracts";

export type AssetCondition = "ready" | "repairable" | "lost";
export interface OperationalAsset {
  id: string;
  label: string;
  condition: AssetCondition;
  note: string;
}

/**
 * A01 deliberately exposes state, not an invented aircraft make or serial.
 * The Bible defines six airframes: two usable, two repairable and two lost.
 */
export function aircraftInventory(state: GameState): OperationalAsset[] {
  if (state.campaignId !== "air") return [];
  const systems = state.operation?.systems ?? {};
  const ready = Math.max(0, Math.min(6, Math.floor(systems.aircraft ?? 0)));
  const repairable = Math.max(0, Math.min(6 - ready, Math.floor(systems.repairable ?? 0)));
  const lost = Math.max(0, 6 - ready - repairable);
  return [
    ...Array.from({ length: ready }, (_, index) => ({
      id: `ready-${index + 1}`,
      label: `AERONAVE APTA ${String(index + 1).padStart(2, "0")}`,
      condition: "ready" as const,
      note: "Disponível para a janela de missão.",
    })),
    ...Array.from({ length: repairable }, (_, index) => ({
      id: `repair-${index + 1}`,
      label: `CÉLULA EM REPARO ${String(index + 1).padStart(2, "0")}`,
      condition: "repairable" as const,
      note: "Exige peças, equipe e tempo de recuperação.",
    })),
    ...Array.from({ length: lost }, (_, index) => ({
      id: `lost-${index + 1}`,
      label: `PERDA REGISTRADA ${String(index + 1).padStart(2, "0")}`,
      condition: "lost" as const,
      note: "Fora da disponibilidade desta operação.",
    })),
  ];
}
