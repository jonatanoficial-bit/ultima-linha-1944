import type { MissionPack } from "../core/contracts";
import { OPERATIONS } from "./operations";

const mission = (pack: MissionPack): MissionPack => ({
  ...pack,
  contentVersion: "0.3.0",
  operation: OPERATIONS[pack.campaignId],
});

export const MISSIONS: MissionPack[] = [
  mission({
    id: "bastogne_east_cedar_1944",
    contentVersion: "0.2.0",
    campaignId: "army",
    title: "M01 · Setor Cedar",
    subtitle: "Bastogne, 20–22 de dezembro de 1944 · 18 turnos",
    historicalNotice:
      "Cenário fictício baseado em acontecimentos reais. Personagens e ações locais são dramatização.",
    turnLabel: "2 horas",
    maxTurns: 18,
    map: { columns: 40, rows: 30, theme: "snow" },
    visuals: {
      heroAssetId: "P001",
      catalogueAssetIds: ["P001", "U002", "U004", "U005", "V006"],
      backdrop: {
        file: "backgrounds/army-cedar-v2.png",
        title: "Estrada para Cedar",
        description:
          "Fundo cinematográfico original · coluna avançando sob neve, fumaça e luz de inverno",
      },
    },
    operationalGoal:
      "Sustentar o corredor Cedar até a próxima janela de evacuação, sem quebrar a cadeia de comando.",
    threatBrief:
      "Pressão terrestre crescente, visibilidade irregular e comunicações frágeis.",
    personnel: { capable: 66, wounded: 19, missing: 14, dead: 19, total: 118 },
    resources: {
      ammo: 180,
      medKits: 8,
      materials: 19,
      batteries: 3,
      food: 125,
    },
    stats: {
      morale: 27,
      readiness: 31,
      intelligence: 20,
      radio: 42,
      defense: 18,
      fatigue: 68,
      legitimacy: 35,
    },
    introChoices: [
      {
        id: "leaders",
        label: "Reunir os sargentos",
        description:
          "O comando começa com chefias alinhadas, mas sem novas informações.",
        adjustments: { morale: 5, legitimacy: 6 },
      },
      {
        id: "medical",
        label: "Priorizar triagem",
        description:
          "A formação inicia com foco humano e capacidade médica organizada.",
        adjustments: { morale: 4, readiness: 3 },
      },
      {
        id: "scout",
        label: "Enviar reconhecimento",
        description:
          "A primeira decisão privilegia olhos no terreno, com desgaste inicial.",
        adjustments: { intelligence: 14, morale: -2 },
      },
    ],
  }),
  mission({
    id: "airfield_last_wing_1944",
    contentVersion: "0.2.0",
    campaignId: "air",
    title: "A01 · A última ala",
    subtitle: "Base USAAF fictícia · 14 turnos de 60 minutos",
    historicalNotice:
      "Drama aéreo ficcional. A USAAF de 1944 não é tratada como a USAF independente posterior.",
    turnLabel: "60 minutos",
    maxTurns: 14,
    map: { columns: 48, rows: 36, theme: "airfield" },
    visuals: {
      heroAssetId: "U003",
      catalogueAssetIds: ["U003", "A001", "A002", "A005", "A006"],
      backdrop: {
        file: "backgrounds/air-last-wing-v2.png",
        title: "A última ala",
        description:
          "Fundo cinematográfico original · formação atravessando nuvens, fogo antiaéreo e o Canal",
      },
    },
    operationalGoal:
      "Manter a ala capaz de cumprir sua janela de missão, preservando comunicações e tripulação.",
    threatBrief:
      "Tempo variável, desgaste de equipamentos e cobertura inimiga imprevisível.",
    personnel: {
      capable: 18,
      wounded: 10,
      missing: 3,
      dead: 0,
      unavailable: 5,
      total: 36,
    },
    resources: { ammo: 72, medKits: 4, materials: 12, batteries: 5, food: 74 },
    stats: {
      morale: 32,
      readiness: 41,
      intelligence: 32,
      radio: 57,
      defense: 24,
      fatigue: 52,
      legitimacy: 48,
    },
    introChoices: [
      {
        id: "treat",
        label: "Tratar a ferida",
        description:
          "Walker se apresenta à base com a equipe mais estável, porém atrasada.",
        adjustments: { morale: 6, readiness: -3 },
      },
      {
        id: "operator",
        label: "Buscar o operador",
        description: "O retorno prioriza comunicações e leitura do cenário.",
        adjustments: { intelligence: 11, legitimacy: 3 },
      },
      {
        id: "distress",
        label: "Transmitir socorro",
        description:
          "A base recebe aviso cedo, consumindo esforço de uma equipe exausta.",
        adjustments: { readiness: 5, morale: -2 },
      },
    ],
  }),
  mission({
    id: "pacific_broken_watch_1944",
    contentVersion: "0.2.0",
    campaignId: "navy",
    title: "N01 · Vigia quebrada",
    subtitle: "Pacífico fictício · 14 turnos de 60 minutos",
    historicalNotice:
      "Ação marítima ficcional. O jogo não atribui esta embarcação a uma classe ou navio histórico documentado.",
    turnLabel: "60 minutos",
    maxTurns: 14,
    map: { columns: 60, rows: 40, theme: "ocean" },
    visuals: {
      heroAssetId: "N007",
      catalogueAssetIds: ["U008", "N001", "N004", "N007", "N008"],
      backdrop: {
        file: "backgrounds/navy-broken-watch-v2.png",
        title: "Vigia no Pacífico",
        description:
          "Fundo cinematográfico original · convés molhado, mar pesado e força-tarefa sob a lua",
      },
    },
    operationalGoal:
      "Conter as avarias, preservar a tripulação e alcançar a zona de retorno para reorganizar o navio no porto.",
    threatBrief:
      "Mar pesado, contatos incertos e risco de aproximação silenciosa no setor.",
    personnel: { capable: 48, wounded: 17, missing: 9, dead: 8, total: 82 },
    resources: { ammo: 95, medKits: 6, materials: 16, batteries: 4, food: 88 },
    stats: {
      morale: 27,
      readiness: 37,
      intelligence: 28,
      radio: 29,
      defense: 31,
      fatigue: 59,
      legitimacy: 44,
    },
    introChoices: [
      {
        id: "stabilize",
        label: "Estabilizar o navio",
        description:
          "A cadeia de danos é contida antes de qualquer avaliação pessoal.",
        adjustments: { readiness: 9, morale: -2 },
      },
      {
        id: "medic",
        label: "Socorrer a tripulação",
        description:
          "Sullivan preserva a tripulação antes de recuperar o ritmo da navegação.",
        adjustments: { morale: 7, readiness: 2 },
      },
      {
        id: "course",
        label: "Confirmar rumo",
        description:
          "A decisão prioriza posição, contato e capacidade de pedir escolta.",
        adjustments: { intelligence: 10, legitimacy: 3 },
      },
    ],
  }),
  mission({
    id: "engine_validation_outpost",
    contentVersion: "0.2.0",
    campaignId: "lab",
    title: "M00 · Posto de validação",
    subtitle: "Laboratório sintético · 3 turnos",
    historicalNotice:
      "Pacote de teste fictício para provar o loader. Não é uma batalha histórica.",
    turnLabel: "30 minutos",
    maxTurns: 3,
    map: { columns: 12, rows: 10, theme: "outpost" },
    visuals: {
      heroAssetId: "U005",
      catalogueAssetIds: ["U005", "U004", "V006"],
      backdrop: {
        file: "backgrounds/army-normandy-dawn.png",
        title: "Posto de validação",
        description:
          "Usa o cenário terrestre apenas para testar o loader local",
      },
    },
    operationalGoal:
      "Validar o fluxo de decisões, recursos e relatório determinístico em três turnos.",
    threatBrief: "Ambiente sintético de teste; nenhum evento é histórico.",
    personnel: { capable: 8, wounded: 0, missing: 0, dead: 0, total: 8 },
    resources: { ammo: 12, medKits: 1, materials: 4, batteries: 1, food: 12 },
    stats: {
      morale: 60,
      readiness: 58,
      intelligence: 40,
      radio: 55,
      defense: 25,
      fatigue: 18,
      legitimacy: 60,
    },
    introChoices: [
      {
        id: "baseline",
        label: "Estado base",
        description: "Carrega o cenário de validação sem modificadores.",
        adjustments: {},
      },
      {
        id: "intel",
        label: "Telemetria local",
        description: "Troca parte da confiança por informação de teste.",
        adjustments: { intelligence: 12, morale: -2 },
      },
      {
        id: "shelter",
        label: "Abrigo inicial",
        description:
          "Troca velocidade de reconhecimento por preparo da equipe.",
        adjustments: { readiness: 6, intelligence: -3 },
      },
    ],
  }),
];

export const getMission = (id: string): MissionPack | undefined =>
  MISSIONS.find((missionPack) => missionPack.id === id);
