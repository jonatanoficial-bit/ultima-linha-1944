import type { MissionPack } from "../core/contracts";

const mission = (pack: MissionPack): MissionPack => pack;

export const MISSIONS: MissionPack[] = [
  mission({
    id: "bastogne_east_cedar_1944",
    contentVersion: "0.1.0",
    campaignId: "army",
    title: "M01 · Setor Cedar",
    subtitle: "Bastogne, 20–22 de dezembro de 1944 · 18 turnos",
    historicalNotice: "Cenário fictício baseado em acontecimentos reais. Personagens e ações locais são dramatização.",
    turnLabel: "2 horas",
    maxTurns: 18,
    map: { columns: 40, rows: 30, theme: "snow" },
    personnel: { capable: 66, wounded: 19, missing: 14, dead: 19, total: 118 },
    resources: { ammo: 180, medKits: 8, materials: 19, batteries: 3, food: 125 },
    stats: { morale: 27, readiness: 31, intelligence: 20, radio: 42, defense: 18, fatigue: 68, legitimacy: 35 },
    introChoices: [
      { id: "leaders", label: "Reunir os sargentos", description: "O comando começa com chefias alinhadas, mas sem novas informações.", adjustments: { morale: 5, legitimacy: 6 } },
      { id: "medical", label: "Priorizar triagem", description: "A formação inicia com foco humano e capacidade médica organizada.", adjustments: { morale: 4, readiness: 3 } },
      { id: "scout", label: "Enviar reconhecimento", description: "A primeira decisão privilegia olhos no terreno, com desgaste inicial.", adjustments: { intelligence: 14, morale: -2 } },
    ],
  }),
  mission({
    id: "airfield_last_wing_1944",
    contentVersion: "0.1.0",
    campaignId: "air",
    title: "A01 · A última ala",
    subtitle: "Base USAAF fictícia · 14 turnos",
    historicalNotice: "Drama aéreo ficcional. A USAAF de 1944 não é tratada como a USAF independente posterior.",
    turnLabel: "90 minutos",
    maxTurns: 14,
    map: { columns: 32, rows: 22, theme: "airfield" },
    personnel: { capable: 28, wounded: 6, missing: 4, dead: 8, total: 46 },
    resources: { ammo: 72, medKits: 5, materials: 12, batteries: 5, food: 74 },
    stats: { morale: 38, readiness: 41, intelligence: 32, radio: 57, defense: 24, fatigue: 52, legitimacy: 48 },
    introChoices: [
      { id: "treat", label: "Tratar a ferida", description: "Walker se apresenta à base com a equipe mais estável, porém atrasada.", adjustments: { morale: 6, readiness: -3 } },
      { id: "operator", label: "Buscar o operador", description: "O retorno prioriza comunicações e leitura do cenário.", adjustments: { intelligence: 11, legitimacy: 3 } },
      { id: "distress", label: "Transmitir socorro", description: "A base recebe aviso cedo, consumindo esforço de uma equipe exausta.", adjustments: { readiness: 5, morale: -2 } },
    ],
  }),
  mission({
    id: "pacific_broken_watch_1944",
    contentVersion: "0.1.0",
    campaignId: "navy",
    title: "N01 · Vigia quebrada",
    subtitle: "Pacífico fictício · 14 turnos",
    historicalNotice: "Ação marítima ficcional. O jogo não atribui esta embarcação a uma classe ou navio histórico documentado.",
    turnLabel: "90 minutos",
    maxTurns: 14,
    map: { columns: 30, rows: 20, theme: "ocean" },
    personnel: { capable: 42, wounded: 9, missing: 4, dead: 6, total: 61 },
    resources: { ammo: 95, medKits: 6, materials: 16, batteries: 4, food: 88 },
    stats: { morale: 35, readiness: 37, intelligence: 28, radio: 51, defense: 31, fatigue: 59, legitimacy: 44 },
    introChoices: [
      { id: "stabilize", label: "Estabilizar o navio", description: "A cadeia de danos é contida antes de qualquer avaliação pessoal.", adjustments: { readiness: 9, morale: -2 } },
      { id: "medic", label: "Socorrer a tripulação", description: "Sullivan preserva a tripulação antes de recuperar o ritmo da navegação.", adjustments: { morale: 7, readiness: 2 } },
      { id: "course", label: "Confirmar rumo", description: "A decisão prioriza posição, contato e capacidade de pedir escolta.", adjustments: { intelligence: 10, legitimacy: 3 } },
    ],
  }),
  mission({
    id: "engine_validation_outpost",
    contentVersion: "0.1.0",
    campaignId: "lab",
    title: "M00 · Posto de validação",
    subtitle: "Laboratório sintético · 3 turnos",
    historicalNotice: "Pacote de teste fictício para provar o loader. Não é uma batalha histórica.",
    turnLabel: "30 minutos",
    maxTurns: 3,
    map: { columns: 12, rows: 10, theme: "outpost" },
    personnel: { capable: 8, wounded: 0, missing: 0, dead: 0, total: 8 },
    resources: { ammo: 12, medKits: 1, materials: 4, batteries: 1, food: 12 },
    stats: { morale: 60, readiness: 58, intelligence: 40, radio: 55, defense: 25, fatigue: 18, legitimacy: 60 },
    introChoices: [
      { id: "baseline", label: "Estado base", description: "Carrega o cenário de validação sem modificadores.", adjustments: {} },
      { id: "intel", label: "Telemetria local", description: "Troca parte da confiança por informação de teste.", adjustments: { intelligence: 12, morale: -2 } },
      { id: "shelter", label: "Abrigo inicial", description: "Troca velocidade de reconhecimento por preparo da equipe.", adjustments: { readiness: 6, intelligence: -3 } },
    ],
  }),
];

export const getMission = (id: string): MissionPack | undefined => MISSIONS.find((missionPack) => missionPack.id === id);
