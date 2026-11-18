import type { MissionPack } from "../core/contracts";
import type { NarrativePlan } from "../core/narrative";

/** Runtime subset of the immutable public manifest. The complete approval
 * manifest stays in public/assets for archival verification; Vite must not
 * import files from public/ as source modules during local development. */
export const CINEMATICS = [
  { id: "CIN02", missionId: "bastogne_east_cedar_1944", sequenceInCampaign: 1, title: "A notícia que muda tudo", runtimePath: "assets/missions/bastogne_east_cedar_1944/scenes/CIN02_command_ruins.png", description: "Daniel Mercer recebe de Thomas Bell a notícia da morte de Hayes; cadeira vazia ao fundo." },
  { id: "CIN03", missionId: "bastogne_east_cedar_1944", sequenceInCampaign: 2, title: "Posto médico improvisado", runtimePath: "assets/missions/bastogne_east_cedar_1944/scenes/CIN03_aid_station.png", description: "Helen Ward atende soldado ferido e consciente; Mercer observa. A decisão médica ainda não foi tomada." },
  { id: "CIN04", missionId: "bastogne_east_cedar_1944", sequenceInCampaign: 3, title: "A ordem que chega pela metade", runtimePath: "assets/missions/bastogne_east_cedar_1944/scenes/CIN04_radio_corner.png", description: "Cabo Isaac Turner opera rádio de campanha enquanto Mercer aguarda uma mensagem incompleta." },
  { id: "AIR_CIN01", missionId: "airfield_last_wing_1944", sequenceInCampaign: 1, title: "Sobreviver à queda", runtimePath: "assets/missions/airfield_last_wing_1944/scenes/AIR_CIN01_crash_survivor.png", description: "Thomas E. Walker ajoelhado diante dos destroços, antes de buscar ajuda." },
  { id: "AIR_CIN02", missionId: "airfield_last_wing_1944", sequenceInCampaign: 2, title: "A base devastada", runtimePath: "assets/missions/airfield_last_wing_1944/scenes/AIR_CIN02_ruined_airfield.png", description: "Walker retorna ao aeródromo avariado e vê pista, hangares e aeronaves danificadas." },
  { id: "AIR_CIN03", missionId: "airfield_last_wing_1944", sequenceInCampaign: 3, title: "Um esquadrão nas suas mãos", runtimePath: "assets/missions/airfield_last_wing_1944/scenes/AIR_CIN03_interim_command.png", description: "Oficial superior comunica a Walker comando interino, numa sala de operações danificada." },
  { id: "NAV_CIN01", missionId: "pacific_broken_watch_1944", sequenceInCampaign: 1, title: "A ponte sem comando", runtimePath: "assets/missions/pacific_broken_watch_1944/scenes/NAV_CIN01_broken_bridge.png", description: "Robert J. Sullivan enfrenta a vacância do comando na ponte avariada do contratorpedeiro." },
  { id: "NAV_CIN02", missionId: "pacific_broken_watch_1944", sequenceInCampaign: 2, title: "Homens e máquinas precisam de você", runtimePath: "assets/missions/pacific_broken_watch_1944/scenes/NAV_CIN02_crew_in_peril.png", description: "Tripulantes escolhem entre prioridades concorrentes: socorro de um ferido ou serviço de avarias." },
  { id: "NAV_CIN03", missionId: "pacific_broken_watch_1944", sequenceInCampaign: 3, title: "Definir um rumo sem ter certeza", runtimePath: "assets/missions/pacific_broken_watch_1944/scenes/NAV_CIN03_course_and_radio.png", description: "Sullivan examina carta náutica enquanto operador tenta contato por rádio; rota ainda não escolhida." },
] as const;
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
