import type {
  ActionId,
  Command,
  EventLogEntry,
  GameState,
  IntroChoice,
  MissionPack,
  Outcome,
  Personnel,
  Resources,
  Stats,
  SupportPackage,
  Transition,
} from "./contracts";
import { hashSeed, nextRandom } from "./rng";
import {
  createOperation,
  operationalCommand,
  operationOutcome,
  pendingEvent,
  tickOperation,
} from "./operations-engine";

export interface ActionDefinition {
  id: ActionId;
  label: string;
  description: string;
  apCost: number;
  cost: Partial<Resources>;
}

export const ACTIONS: ActionDefinition[] = [
  {
    id: "rally",
    label: "Reunir lideranças",
    description: "Restaura coesão de comando, mas ocupa o tempo da unidade.",
    apCost: 1,
    cost: {},
  },
  {
    id: "triage",
    label: "Priorizar triagem",
    description:
      "Converte parte dos feridos em capazes, consumindo um kit médico.",
    apCost: 1,
    cost: { medKits: 1 },
  },
  {
    id: "recon",
    label: "Reconhecimento curto",
    description:
      "Melhora informação observável com desgaste e exposição controlada.",
    apCost: 1,
    cost: {},
  },
  {
    id: "fortify",
    label: "Fortificar posição",
    description: "Converte material e tempo em proteção mensurável.",
    apCost: 2,
    cost: { materials: 2 },
  },
  {
    id: "radio",
    label: "Tentar contato por rádio",
    description: "Usa uma bateria para recuperar comunicações e inteligência.",
    apCost: 1,
    cost: { batteries: 1 },
  },
  {
    id: "rest",
    label: "Distribuir abrigo e ração",
    description: "Reduz fadiga da formação e consome alimento.",
    apCost: 1,
    cost: { food: 3 },
  },
];

const byId = (id: ActionId): ActionDefinition => {
  const action = ACTIONS.find((item) => item.id === id);
  if (!action) throw new Error(`Unknown action: ${id}`);
  return action;
};

const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, Math.round(value)));
const copyResources = (resources: Resources): Resources => ({ ...resources });
const copyPersonnel = (personnel: Personnel): Personnel => ({ ...personnel });
const copyStats = (stats: Stats): Stats => ({ ...stats });

const append = (state: GameState, entry: EventLogEntry): GameState => ({
  ...state,
  log: [...state.log.slice(-159), entry],
});

const addLog = (
  state: GameState,
  category: EventLogEntry["category"],
  text: string,
): GameState => append(state, { turn: state.currentTurn, category, text });

const preservePersonnel = (personnel: Personnel): Personnel => ({
  ...personnel,
  capable: Math.max(0, personnel.capable),
  wounded: Math.max(0, personnel.wounded),
  missing: Math.max(0, personnel.missing),
  dead: Math.max(0, personnel.dead),
});

export const assertState = (state: GameState): void => {
  const people = state.personnel;
  if (
    people.capable +
      people.wounded +
      people.missing +
      people.dead +
      (people.unavailable ?? 0) !==
    people.total
  ) {
    throw new Error("Personnel invariant violated");
  }
  if (
    [
      ...Object.values(state.resources),
      ...Object.values(people),
      ...Object.values(state.stats),
    ].some((quantity) => !Number.isFinite(quantity) || quantity < 0)
  ) {
    throw new Error("Resource invariant violated");
  }
  if (state.commandAP < 0) throw new Error("Command AP invariant violated");
};

const applyChoice = (stats: Stats, choice?: IntroChoice): Stats => {
  const adjusted = copyStats(stats);
  for (const [key, change] of Object.entries(choice?.adjustments ?? {})) {
    const stat = key as keyof Stats;
    adjusted[stat] = clamp(adjusted[stat] + (change ?? 0));
  }
  return adjusted;
};

const applyStatModifiers = (
  stats: Stats,
  modifiers: Partial<Stats> = {},
): Stats => {
  const adjusted = copyStats(stats);
  for (const [key, change] of Object.entries(modifiers)) {
    const stat = key as keyof Stats;
    adjusted[stat] = clamp(adjusted[stat] + (change ?? 0));
  }
  return adjusted;
};

const applyResourceModifiers = (
  resources: Resources,
  modifiers: Partial<Resources> = {},
): Resources => {
  const adjusted = copyResources(resources);
  for (const [key, change] of Object.entries(modifiers)) {
    const resource = key as keyof Resources;
    adjusted[resource] = Math.max(0, adjusted[resource] + (change ?? 0));
  }
  return adjusted;
};

export const createInitialState = (
  mission: MissionPack,
  seed: string,
  choiceId?: string,
  support?: SupportPackage,
): GameState => {
  const choice =
    mission.introChoices.find((item) => item.id === choiceId) ??
    mission.introChoices[0];
  if (support && support.branch !== mission.campaignId) {
    throw new Error("Support package does not belong to this campaign branch");
  }
  const initialLog: EventLogEntry[] = [
    {
      turn: 0,
      category: "system",
      text: `Seed ${seed} · estado inicial carregado localmente.`,
    },
    {
      turn: 0,
      category: "command",
      text: `Prólogo: ${choice.label}. ${choice.description}`,
    },
  ];
  if (support) {
    initialLog.push({
      turn: 0,
      category: "command",
      text: `QG confirmou requisição: ${support.title}. Seus efeitos já estão no estado operacional.`,
    });
  }
  const initial: GameState = {
    gameVersion: "0.5.0",
    operation: mission.operation
      ? createOperation(mission.operation)
      : undefined,
    contentVersion: mission.contentVersion,
    missionId: mission.id,
    campaignId: mission.campaignId,
    seed,
    rngState: hashSeed(seed),
    phase: "playing",
    currentTurn: 1,
    maxTurns: mission.maxTurns,
    commandAP: 3,
    usedActions: [],
    enemyPressure: clamp(28 + (support?.effects.pressureDelta ?? 0)),
    personnel: copyPersonnel(mission.personnel),
    resources: applyResourceModifiers(
      mission.resources,
      support?.effects.resources,
    ),
    stats: applyStatModifiers(
      applyChoice(mission.stats, choice),
      support?.effects.stats,
    ),
    prologueChoiceId: choice.id,
    deployedSupportId: support?.id,
    log: initialLog,
  };
  assertState(initial);
  return initial;
};

const canPay = (resources: Resources, cost: Partial<Resources>): boolean =>
  Object.entries(cost).every(
    ([key, amount]) => resources[key as keyof Resources] >= (amount ?? 0),
  );

const pay = (resources: Resources, cost: Partial<Resources>): Resources => {
  const next = copyResources(resources);
  for (const [key, amount] of Object.entries(cost)) {
    const resource = key as keyof Resources;
    next[resource] -= amount ?? 0;
  }
  return next;
};

const applyAction = (state: GameState, actionId: ActionId): GameState => {
  const stats = copyStats(state.stats);
  const personnel = copyPersonnel(state.personnel);
  let next: GameState = {
    ...state,
    operation: state.operation ? structuredClone(state.operation) : undefined,
    stats,
    personnel,
    resources: pay(state.resources, byId(actionId).cost),
  };

  switch (actionId) {
    case "rally":
      stats.morale = clamp(stats.morale + 7);
      stats.legitimacy = clamp(stats.legitimacy + 3);
      stats.fatigue = clamp(stats.fatigue + 1);
      next = addLog(
        next,
        "command",
        "Lideranças reunidas: moral e legitimidade aumentaram; a formação perdeu tempo útil.",
      );
      break;
    case "triage": {
      const recovered = Math.min(2, personnel.wounded);
      if (recovered === 0)
        return addLog(
          state,
          "system",
          "Triagem recusada: não há feridos a estabilizar.",
        );
      personnel.wounded -= recovered;
      personnel.capable += recovered;
      if (next.operation) next.operation.units[0].strength += recovered;
      stats.morale = clamp(stats.morale + 2);
      next = addLog(
        next,
        "command",
        `Triagem concluída: ${recovered} pessoa(s) retornaram à condição capaz.`,
      );
      break;
    }
    case "recon":
      stats.intelligence = clamp(stats.intelligence + 16);
      stats.fatigue = clamp(stats.fatigue + 3);
      next = addLog(
        next,
        "command",
        "Patrulha retornou: informação observável foi ampliada, com fadiga adicional.",
      );
      break;
    case "fortify":
      stats.defense = clamp(stats.defense + 11);
      stats.readiness = clamp(stats.readiness + 3);
      next = addLog(
        next,
        "command",
        "Posições reforçadas: material foi convertido em defesa mensurável.",
      );
      break;
    case "radio":
      stats.radio = clamp(stats.radio + 17);
      stats.intelligence = clamp(stats.intelligence + 6);
      next = addLog(
        next,
        "command",
        "Rádio reaberto: uma bateria foi consumida e a informação melhorou.",
      );
      break;
    case "rest":
      stats.fatigue = clamp(stats.fatigue - 12);
      stats.morale = clamp(stats.morale + 3);
      next = addLog(
        next,
        "command",
        "Abrigo e ração distribuídos: fadiga reduziu às custas do estoque de alimento.",
      );
      break;
  }

  return {
    ...next,
    commandAP: state.commandAP - byId(actionId).apCost,
    usedActions: [...state.usedActions, actionId],
  };
};

const outcomeFor = (state: GameState): Outcome => {
  const domain = operationOutcome(state);
  if (domain) return domain;
  if (state.personnel.capable <= 4 || state.stats.morale <= 4) {
    return {
      id: "collapse",
      title: "Colapso do setor",
      description:
        "A formação perdeu capacidade de sustentar a missão; as perdas e o recuo ficam registrados.",
    };
  }
  if (state.stats.readiness >= 70 && state.stats.defense >= 55) {
    return {
      id: "hold",
      title: "Linha preservada",
      description:
        "A unidade sustentou sua função sob pressão e preservou capacidade operacional.",
    };
  }
  if (state.stats.readiness >= 48 || state.stats.morale >= 48) {
    return {
      id: "costly-hold",
      title: "Resistência a custo alto",
      description:
        "A missão foi sustentada, mas recursos e pessoas exigirão recuperação na próxima etapa.",
    };
  }
  if (state.stats.radio >= 45 && state.personnel.capable >= 12) {
    return {
      id: "withdrawal",
      title: "Retirada disciplinada",
      description:
        "A cadeia de comando conservou sobreviventes e registrou uma retirada sob pressão.",
    };
  }
  if (state.personnel.capable <= 8) {
    return {
      id: "surrender",
      title: "Rendição para preservar vidas",
      description:
        "Sem capacidade material de continuar, a unidade interrompe o combate para evitar perdas adicionais.",
    };
  }
  return {
    id: "survival",
    title: "Sobrevivência incerta",
    description:
      "A unidade atravessou a janela operacional, mas a situação segue crítica e persistente.",
  };
};

const resolveEnemyTurn = (state: GameState): GameState => {
  const roll = nextRandom(state.rngState);
  const mitigation =
    state.stats.defense * 0.22 +
    state.stats.intelligence * 0.12 +
    state.stats.radio * 0.06 +
    state.stats.readiness * 0.16;
  const attack = Math.max(
    3,
    Math.round(
      10 + roll.value * 18 + state.enemyPressure * 0.18 - mitigation * 0.2,
    ),
  );
  const stats = copyStats(state.stats);
  const personnel = copyPersonnel(state.personnel);
  const casualties =
    attack >= 17
      ? Math.min(personnel.capable, 1 + Math.floor(roll.value * 2))
      : 0;
  personnel.capable -= casualties;
  personnel.wounded += casualties;
  stats.morale = clamp(stats.morale - Math.ceil(attack / 5));
  stats.readiness = clamp(stats.readiness - Math.ceil(attack / 6));
  stats.fatigue = clamp(stats.fatigue + 5);
  const pressure = clamp(state.enemyPressure + 3 + Math.floor(roll.value * 6));
  let next = {
    ...state,
    rngState: roll.state,
    stats,
    personnel: preservePersonnel(personnel),
    enemyPressure: pressure,
  };
  next = addLog(
    next,
    "enemy",
    `Contato inimigo local: pressão ${attack}; ${casualties} nova(s) baixa(s) de condição.`,
  );
  return next;
};

export const reduce = (state: GameState, command: Command): Transition => {
  if (state.phase === "ended")
    return { accepted: false, state, reason: "A missão já foi encerrada." };
  if (command.type !== "ACT" && command.type !== "END_TURN") {
    const transition = operationalCommand(state, command);
    assertState(transition.state);
    return transition;
  }
  if (pendingEvent(state))
    return {
      accepted: false,
      state,
      reason: "Uma comunicação prioritária aguarda sua decisão.",
    };

  if (command.type === "ACT") {
    const action = byId(command.actionId);
    if (state.usedActions.includes(action.id))
      return {
        accepted: false,
        state,
        reason: "Esta ação já foi usada neste turno.",
      };
    if (state.commandAP < action.apCost)
      return {
        accepted: false,
        state,
        reason: "Pontos de comando insuficientes.",
      };
    if (!canPay(state.resources, action.cost))
      return {
        accepted: false,
        state,
        reason: "Recursos insuficientes para esta ação.",
      };
    if (command.actionId === "triage" && state.personnel.wounded === 0)
      return {
        accepted: false,
        state,
        reason: "Não há feridos para a triagem.",
      };
    const next = applyAction(state, command.actionId);
    assertState(next);
    return { accepted: true, state: next };
  }

  const events: import("./turn-events").TurnEvent[] = [];
  const resolved = state.operation
    ? tickOperation(state, events)
    : resolveEnemyTurn(state);
  const afterTurn = {
    ...resolved,
    currentTurn: state.currentTurn + 1,
    commandAP: 3,
    usedActions: [],
  };
  const shouldEnd =
    afterTurn.currentTurn > afterTurn.maxTurns ||
    afterTurn.stats.morale <= 4 ||
    afterTurn.personnel.capable <= 4 ||
    (afterTurn.campaignId === "navy" &&
      afterTurn.operation?.systems.hull === 0);
  const finished = shouldEnd
    ? addLog(
        { ...afterTurn, phase: "ended", outcome: outcomeFor(afterTurn) },
        "outcome",
        outcomeFor(afterTurn).title,
      )
    : addLog(
        afterTurn,
        "system",
        `Turno ${afterTurn.currentTurn} iniciado. Pontos de comando restaurados.`,
      );
  assertState(finished);
  return { accepted: true, state: finished, events };
};
