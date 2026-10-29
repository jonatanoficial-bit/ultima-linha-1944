import manifest from "../../public/assets/cinematic-scenes.manifest.json";
import type { MissionPack } from "../core/contracts";
import type { NarrativePlan } from "../core/narrative";

export const CINEMATICS = manifest.assets;
const sequence: Record<string, string[]> = {
  army: ["CIN02", "CIN02", "CIN02", "CIN03", "CIN04"],
  air: ["AIR_CIN01", "AIR_CIN02", "AIR_CIN03"],
  navy: ["NAV_CIN01", "NAV_CIN02", "NAV_CIN02", "NAV_CIN03"],
};
export function cinematicFor(mission: MissionPack, index: number) {
  const ids = sequence[mission.campaignId];
  const id = ids?.[Math.max(0, Math.min(index, ids.length - 1))];
  return CINEMATICS.find(a => a.id === id && a.missionId === mission.id);
}
export const cinematicUrl = (asset: typeof CINEMATICS[number]) => `${import.meta.env.BASE_URL}${asset.runtimePath}`;
export const narrativePlan = (mission: MissionPack): NarrativePlan => ({
  length: mission.operation!.prologue.length,
  decisionAfter: mission.campaignId === "air" ? 0 : mission.operation!.prologue.length - 1,
  choices: mission.introChoices.map(c => c.id),
});
export const narrativeQuestion: Record<string, string> = {
  army: "Todos esperam sua primeira ordem.",
  air: "Você sobreviveu. O que faz antes de tentar voltar?",
  navy: "O navio ainda responde. O que vem primeiro?",
};
