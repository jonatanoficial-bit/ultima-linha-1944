import type { SupportPackage } from "../core/contracts";

/**
 * Quartermaster inventory. Each entry references an approved catalogue asset
 * and has a concrete deterministic effect when requisitioned for its branch.
 */
export const HQ_SUPPORTS: SupportPackage[] = [
  { id: "army_sherman", branch: "army", assetId: "V001", title: "Seção Sherman", description: "Blindagem de apoio e munição de reserva para segurar o setor.", requestCost: 22, effects: { stats: { defense: 9, readiness: 4 }, resources: { ammo: 16 }, pressureDelta: -3 } },
  { id: "army_jeep", branch: "army", assetId: "V006", title: "Willys de ligação", description: "Recupera mensagens de linha e melhora a leitura do terreno.", requestCost: 14, effects: { stats: { intelligence: 9, radio: 5 }, resources: { batteries: 1 }, pressureDelta: -1 } },
  { id: "army_artillery", branch: "army", assetId: "V008", title: "Bateria de 105 mm", description: "Preparo de fogo limitado para reduzir a pressão inicial.", requestCost: 28, effects: { stats: { defense: 6, intelligence: 6 }, resources: { ammo: 28 }, pressureDelta: -4 } },
  { id: "air_mustang", branch: "air", assetId: "A001", title: "Escolta P-51", description: "Caças de escolta abrem uma janela mais segura para a ala.", requestCost: 22, effects: { stats: { intelligence: 12, readiness: 3 }, pressureDelta: -4 } },
  { id: "air_fortress", branch: "air", assetId: "A005", title: "Célula B-17", description: "Planejamento de bombardeio acrescenta capacidade e reserva de munição.", requestCost: 32, effects: { stats: { intelligence: 8, defense: 5 }, resources: { ammo: 30 }, pressureDelta: -2 } },
  { id: "air_skytrain", branch: "air", assetId: "A006", title: "Lançamento C-47", description: "Reabastecimento aéreo para manter pessoal e comunicações operantes.", requestCost: 18, effects: { stats: { morale: 5, radio: 5 }, resources: { food: 14, medKits: 2, batteries: 1 } } },
  { id: "navy_destroyer", branch: "navy", assetId: "N007", title: "Tela de contratorpedeiro", description: "Escolta antissubmarino reforça vigia, rádio e defesa do grupo.", requestCost: 20, effects: { stats: { defense: 9, radio: 8 }, pressureDelta: -3 } },
  { id: "navy_carrier", branch: "navy", assetId: "N004", title: "Sortie de porta-aviões", description: "Reconhecimento aéreo de frota aumenta prontidão e alcance de informação.", requestCost: 32, effects: { stats: { readiness: 8, intelligence: 9 }, resources: { ammo: 24 }, pressureDelta: -2 } },
  { id: "navy_submarine", branch: "navy", assetId: "N008", title: "Observação submarina", description: "Contato discreto estende a busca e antecipa ameaças no oceano.", requestCost: 18, effects: { stats: { intelligence: 13, radio: 5 }, pressureDelta: -2 } },
];

export const supportById = (id?: string): SupportPackage | undefined => HQ_SUPPORTS.find((support) => support.id === id);
export const supportsForBranch = (branch: SupportPackage["branch"]): SupportPackage[] => HQ_SUPPORTS.filter((support) => support.branch === branch);
