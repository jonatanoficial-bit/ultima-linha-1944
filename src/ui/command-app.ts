import { COMMAND_CHARACTERS, portraitForSender } from "../content/characters";
import { rememberedDecisions, situationConsequences, relationshipWith } from "../core/command-memory";
import { sameCommunicationIdentity } from "../content/characters";
import type {
  ActionId,
  Command,
  CommandProfile,
  GameState,
  Resources,
  SupportPackage,
} from "../core/contracts";
import type { Effects, Point, UnitOrder } from "../core/operations-types";
import { ACTIONS, createInitialState, reduce } from "../core/engine";
import {
  observedEnemies,
  objectiveStatuses,
  pendingEvent,
  pathTo,
  terrainAt,
} from "../core/operations-engine";
import { decodeSave, encodeSave, SAVE_PREFIX } from "../core/persistence";
import { MISSIONS } from "../content/missions";
import { APPROVED_ASSETS, approvedAsset, assetUrl } from "../content/assets";
import { CommandMap } from "../game/tactical-map";
import { advanceNarrative, newNarrative, readingTime, type NarrativeAction } from "../core/narrative";
import { cinematicFor, cinematicUrl, CINEMATICS, narrativePlan, narrativeQuestion } from "../content/cinematics";
import { CinematicStage } from "./cinematic-stage";
import { GameAudio } from "./game-audio";
import "./cinematic.css";
import { stations, sceneUrl, communicationScene, communicationRole } from "../content/stations";
import { TurnDirector } from "./turn-director";
import type { TurnEvent } from "../core/turn-events";
import "./immersion.css";
import {
  cancelOrder,
  chooseDestination,
  createMapCommandFlow,
  pendingCommand,
  selectFormation,
  startOrder,
  type MapCommandFlow,
  type MapCommandStage,
} from "./map-command-flow";
import { unitCardAssetUrl, visualForUnit } from "../content/unit-visuals";
import { topDownSpriteUrl } from "../content/unit-visuals";
import { aircraftInventory } from "../content/operational-inventory";
import { supportById, supportsForBranch } from "../content/supports";
import { deploySupport, purchaseSupport, rankForXp, settleMission } from "../core/progression";
import { decodeCommandProfile, encodeCommandProfile, PROFILE_KEY } from "../core/profile-persistence";

const app = document.querySelector<HTMLElement>("#app")!;
const missions = MISSIONS.filter((m) => m.campaignId !== "lab");
let mission = missions[0],
  game: GameState | undefined,
  screen: "menu" | "prologue" | "game" = "menu";
let story = newNarrative(),
  storyAuto = false,
  storyReady = false,
  storyHidden = false,
  fieldFocus = true,
  stationView = true,
  drawerOpen = false,
  selected = "hq",
  target: Point | undefined,
  commandStage: MapCommandStage = "explore",
  pendingOrder: UnitOrder | undefined,
  panel = "orders",
  notice = "",
  sound = false;
let commandProfile: CommandProfile = loadCommandProfile();
let modalAction: (() => void) | undefined,
  modalKind = "",
  lastFocus: HTMLElement | null = null;
let storyTimer: number | undefined;
const cinema = new CinematicStage();
const gameAudio = new GameAudio();
let director: TurnDirector | undefined;
let lastPlayback: { before: GameState; events: TurnEvent[] } | undefined;
let playbackCue = -1;
const clearStoryTimer = () => { window.clearTimeout(storyTimer); storyTimer = undefined; };
function scheduleStory() {
  clearStoryTimer();
  if (screen !== "prologue" || !storyAuto || !storyReady || document.hidden || document.querySelector("dialog") || story.stage !== "scene") return;
  storyTimer = window.setTimeout(() => moveStory({ type: "next" }), readingTime(mission.operation!.prologue[story.index].text));
}
function moveStory(action: NarrativeAction) {
  story = advanceNarrative(story, action, narrativePlan(mission));
  storyHidden = false;
  if (story.stage === "complete" && story.choice) start(story.choice);
  else render();
}
document.addEventListener("visibilitychange", () => { scheduleStory(); gameAudio.visibility(); });
const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const branchName = {
  army: "EXÉRCITO",
  air: "USAAF",
  navy: "MARINHA",
  lab: "EXERCÍCIO",
};
const resourceLabels: Record<keyof Resources, string> = {
  ammo: "Munição",
  medKits: "Kits médicos",
  materials: "Materiais",
  batteries: "Baterias",
  food: "Rações",
};
function objectiveValue(status: ReturnType<typeof objectiveStatuses>[number]) {
  if (status.complete) return "CUMPRIDO";
  if (status.source === "flag" || status.source === "objective") return "AGUARDA DECISÃO";
  if (status.current === undefined || status.target === undefined) return "EM AVALIAÇÃO";
  return `${status.current} / ${status.target}${status.source === "objectiveTurns" ? " períodos" : ""}`;
}
function objectiveMetric(status: ReturnType<typeof objectiveStatuses>[number]) {
  if (!game || !status.key) return "Estado operacional";
  const d = game.operation!.definition;
  if (status.source === "system") return d.systemLabels[status.key] ?? status.key;
  if (status.source === "stat") return statLabels[status.key] ?? status.key;
  if (status.source === "personnel") return resourceLabels[status.key as keyof Resources] ?? ({ capable: "Pessoas capazes", wounded: "Feridos", missing: "Desaparecidos", dead: "Mortos" }[status.key] ?? status.key);
  if (status.source === "objectiveTurns") return "Cobertura do objetivo";
  return "Registro de comando";
}
function missionBoard(compact = false) {
  if (!game) return "";
  const objectives = objectiveStatuses(game);
  const done = objectives.filter((objective) => objective.complete).length;
  return `<section class="mission-board ${compact ? "objective-strip" : ""}" aria-label="Objetivos da missão"><header><span class="eyebrow">${compact ? "SITUAÇÃO DA MISSÃO" : "QUADRO DA MISSÃO"}</span><strong>${done}/${objectives.length} objetivos</strong></header><div class="mission-objectives">${objectives.map((objective) => `<article class="mission-objective ${objective.complete ? "complete" : ""}"><span class="objective-state">${objective.complete ? "◆" : "◇"}</span><div><strong>${esc(objective.label)}</strong>${compact ? `<small>${esc(objectiveMetric(objective))} · ${esc(objectiveValue(objective))}</small>` : `<p>${esc(objective.briefing)}</p><small>${esc(objectiveMetric(objective))} · <b>${esc(objectiveValue(objective))}</b></small>`}</div></article>`).join("")}</div></section>`;
}
function loadCommandProfile() {
  try { return decodeCommandProfile(localStorage.getItem(PROFILE_KEY)); }
  catch { return decodeCommandProfile(null); }
}
function saveCommandProfile() {
  try { localStorage.setItem(PROFILE_KEY, encodeCommandProfile(commandProfile)); }
  catch { notice = "O navegador não permitiu salvar o registro de requisições."; }
}
function activeSupportFor(branch = mission.campaignId): SupportPackage | undefined {
  return branch === "lab" ? undefined : supportById(commandProfile.deployedSupportByBranch[branch]);
}
function activeMissionSupport(): SupportPackage | undefined {
  return game ? supportById(game.deployedSupportId) : undefined;
}
const statLabels: Record<string, string> = {
  morale: "Moral",
  readiness: "Prontidão",
  intelligence: "Informação",
  radio: "Rádio",
  defense: "Defesa",
  fatigue: "Fadiga",
  legitimacy: "Legitimidade",
  trust: "Confiança",
};
const orderLabels: Record<UnitOrder, string> = {
  hold: "Manter posição",
  move: "Deslocar",
  recon: "Observar setor",
  cover: "Cobrir posição",
};
const btn = (action: string, text: string, cls = "", extra = "") =>
  `<button type="button" data-action="${action}" class="${cls}" ${extra}>${text}</button>`;
const currentMapFlow = () => ({ selected, stage: commandStage, order: pendingOrder, target });
const applyMapFlow = (flow: MapCommandFlow) => {
  selected = flow.selected;
  commandStage = flow.stage;
  pendingOrder = flow.order;
  target = flow.target;
};
const clearMapFlow = () => applyMapFlow(createMapCommandFlow(selected));
const map = new CommandMap((p, id) => {
  if (director) return;
  if (id) {
    applyMapFlow(selectFormation(currentMapFlow(), id));
    const unit = game?.operation?.units.find((entry) => entry.id === id);
    notice = `${unit?.name ?? "Formação"} selecionada. Escolha uma ação no cartão de campo.`;
  } else {
    const previous = commandStage;
    applyMapFlow(chooseDestination(currentMapFlow(), p));
    notice = commandStage === "preview" && previous === "destination"
      ? `Destino ${p.x}, ${p.y} marcado. Revise e confirme a ordem.`
      : "Selecione Deslocar antes de marcar um destino no mapa.";
  }
  panel = "orders";
  drawerOpen = false;
  render();
});
const cost = (values: Record<string, number | undefined>, systems = false) =>
  Object.entries(values)
    .map(
      ([k, v]) =>
        `${v} ${esc(systems ? (mission.operation!.systemLabels[k] ?? k) : (resourceLabels[k as keyof Resources] ?? k))}`,
    )
    .join(" · ") || "Sem consumo de estoque";
function effectText(e: Effects) {
  return [
    ...Object.entries(e.stats ?? {}).map(
      ([k, v]) => `${statLabels[k]} ${v! > 0 ? "+" : ""}${v}`,
    ),
    ...Object.entries(e.resources ?? {}).map(
      ([k, v]) =>
        `${resourceLabels[k as keyof Resources]} ${v! > 0 ? "+" : ""}${v}`,
    ),
    ...Object.entries(e.systems ?? {}).map(
      ([k, v]) =>
        `${mission.operation!.systemLabels[k] ?? k} ${v > 0 ? "+" : ""}${v}`,
    ),
    ...(e.trust ? [`Confiança ${e.trust > 0 ? "+" : ""}${e.trust}`] : []),
  ].join(" · ");
}
function beep() {
  gameAudio.signal();
}
function save() {
  if (!game) return;
  try {
    localStorage.setItem(SAVE_PREFIX + mission.id, encodeSave(game));
  } catch {
    notice =
      "O navegador não permitiu salvar. Exporte o registro pelo menu de pausa.";
  }
}
function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_PREFIX + mission.id);
  } catch {
    return false;
  }
}
function legacySave() {
  try {
    return localStorage.getItem("ultima-linha-1944/autosave/v1");
  } catch {
    return null;
  }
}
function dateLabel() {
  const d = game!.operation!.definition;
  const date = new Date(
    new Date(d.start).getTime() +
      Math.min(game!.currentTurn - 1, game!.maxTurns) * d.minutes * 60000,
  );
  return (
    date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }) +
    " · " +
    date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    })
  );
}
function modal(title: string, body: string, footer = "", kind = "info") {
  clearStoryTimer();
  document.querySelector("#command-dialog")?.remove();
  modalKind = kind;
  lastFocus = document.activeElement as HTMLElement;
  const el = document.createElement("dialog");
  el.id = "command-dialog";
  el.className = "command-dialog";
  el.setAttribute("aria-labelledby", "dialog-title");
  el.innerHTML = `<div class="dialog-top"><span class="eyebrow">ÚLTIMA LINHA / COMANDO</span>${btn("close", "×", "icon", 'aria-label="Fechar janela"')}</div><h2 id="dialog-title">${esc(title)}</h2><div class="dialog-body">${body}</div><footer>${footer || btn("close", "Entendido", "primary")}</footer>`;
  app.append(el);
  el.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeModal();
  });
  el.showModal();
  (el.querySelector("footer button") as HTMLElement)?.focus({ preventScroll: true });
  if (kind === "incoming" || kind === "info") {
    const heading = el.querySelector<HTMLElement>("h2")!;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    el.scrollTop = 0;
  }
}
function closeModal() {
  document.querySelector("#command-dialog")?.remove();
  modalKind = "";
  modalAction = undefined;
  lastFocus?.focus();
  scheduleStory();
}
function confirm(title: string, body: string, action: () => void) {
  modal(
    title,
    body,
    btn("close", "Voltar") + btn("confirm", "Confirmar ordem", "primary"),
    "confirm",
  );
  modalAction = action;
}
function incoming() {
  if (!game || game.phase === "ended" || document.querySelector("dialog"))
    return;
  const e = pendingEvent(game);
  if (!e) return;
  beep();
  modal(
    e.title,
    `${portraitForSender(e.from) ? `<img class="call-portrait" src="${portraitForSender(e.from)}" alt="${esc(e.from)}">` : ""}<div class="call-scene"><img src="${sceneUrl(communicationScene(game.campaignId, e.from))}" alt="Ambiente da comunicação"><div><span class="radio-stamp">● COMUNICAÇÃO PRIORITÁRIA · T${e.turn}</span><p class="speaker">${esc(e.from)}</p><span>${esc(communicationRole(e.from))}</span></div></div><p class="memory-reaction">${esc(relationshipWith(game,e.from).reaction)}</p><div class="call-signal" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><p class="dialogue">${esc(e.text)}</p>${rememberedDecisions(game,e.from).length ? `<p class="memory-reaction">Este interlocutor já recebeu ${rememberedDecisions(game,e.from).length} decisão(ões) sua(s). Consulte o registro antes de responder.</p>` : ""}<p class="memory-reaction">${esc(situationConsequences(game)[0] ?? "")}</p><details class="call-memory"><summary>Registro e confiança do comando · ${game.operation!.trust}%</summary><p>Registro compartilhado da companhia.</p>${game.log.filter(l => game!.operation!.definition.events.some(previous => sameCommunicationIdentity(previous.from, e.from) && game!.operation!.decisions.includes(previous.id) && l.text.startsWith(previous.from + ":"))).slice(-3).map(l => `<p>T${l.turn} · ${esc(l.text)}</p>`).join("") || "<p>Sem decisões anteriores registradas neste canal.</p>"}</details><div class="decision-list">${e.choices.map((c) => btn("decision", `<strong>${esc(c.label)}</strong><span>${esc(c.consequence)}</span><small>${esc(effectText(c.effects))}</small>`, "decision", `data-id="${c.id}"`)).join("")}</div>`,
    btn("to-field", "Consultar o mapa"),
    "incoming",
  );
}
function execute(command: Command) {
  if (!game || director) return;
  const before = game;
  const transition = reduce(game, command);
  if (!transition.accepted) {
    notice = transition.reason ?? "Ordem recusada.";
    render();
    return;
  }
  game = transition.state;
  notice = "Ordem registrada.";
  save();
  beep();
  if (command.type === "END_TURN") {
    lastPlayback = { before, events: transition.events ?? [] };
    playTurn();
    return;
  }
  render();
  if (game.phase === "ended") {
    showOutcome();
    return;
  }
  if (command.type === "DECIDE") {
    const event = before.operation!.definition.events.find(e => e.id === command.eventId)!;
    const choice = event.choices.find(c => c.id === command.choiceId)!;
    modal("Sua decisão foi transmitida", `<p class="eyebrow">${esc(event.from)}</p><p class="dialogue">${esc(choice.label)}</p><p>${esc(choice.consequence)}</p><p class="effect-preview">${esc(effectText(choice.effects))}</p><p>Confiança no comando: ${before.operation!.trust}% → ${game.operation!.trust}%</p>`, btn("to-field", "Examinar o campo", "primary") + btn("to-station", "Voltar ao posto"));
  } else incoming();
}
function showReport() {
  if (game!.phase === "ended") { showOutcome(); return; }
  const before = lastPlayback?.before;
  const deltas = before ? `Capazes ${before.personnel.capable} → ${game!.personnel.capable} · Feridos ${before.personnel.wounded} → ${game!.personnel.wounded} · Munição ${before.resources.ammo} → ${game!.resources.ammo}` : "";
  modal("O que aconteceu no campo", `<p class="eyebrow">${dateLabel()}</p><p class="effect-preview">${deltas}</p><ul class="report-list">${game!.operation!.reports.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`, (lastPlayback ? btn("replay", "Rever execução") : "") + btn("report-next", pendingEvent(game!) ? "Atender comunicação" : "Voltar ao comando", "primary"), "report");
}
function playTurn() {
  if (!game || !lastPlayback || director) return;
  stationView = false; fieldFocus = true; drawerOpen = false; playbackCue = -1;
  director = new TurnDirector(lastPlayback.before, lastPlayback.events,
    (state, event, progress) => {
      map.frame(state, event, progress);
      const meter = app.querySelector<HTMLProgressElement>(".execution-progress");
      if (meter) meter.value = progress;
    },
    (event, index) => {
      const label = app.querySelector<HTMLElement>(".execution-copy");
      if (label) label.innerHTML = `<span class="eyebrow">EXECUÇÃO DO TURNO ${lastPlayback!.before.currentTurn} · ${index+1}/${lastPlayback!.events.length} · ${director?.paused ? "PAUSADA" : "EM CURSO"}</span><p>${esc(event.text)}</p>`;
      const pause = app.querySelector('[data-action="play-pause"]');
      if (pause) pause.textContent = director?.paused ? "▶ Continuar" : "Ⅱ Pausar";
      const speed = app.querySelector('[data-action="play-speed"]');
      if (speed) speed.textContent = `${director?.speed ?? 1}×`;
      if (index !== playbackCue) { playbackCue = index; gameAudio.event(event); }
    },
    () => { director = undefined; map.endPlayback(); render(); showReport(); });
  render();
  map.beginPlayback();
  director.start();
}
function stationMarkup() {
  const s = game!, station = stations[s.campaignId], event = pendingEvent(s);
  const key = s.campaignId === "navy" ? "hull" : s.campaignId === "air" ? "runway" : "wire";
  const condition = s.operation!.systems[key];
  return `<section class="station-stage" aria-label="${station.title}"><img class="station-backdrop" src="${sceneUrl(station.scene)}" alt="${station.title}"><div class="station-shade"></div><div class="station-location"><span class="eyebrow">${station.location}</span><h1>${station.title}</h1><p>${esc(s.operation!.definition.commander)} · ${esc(s.operation!.definition.rank)}</p></div><div class="station-brief"><span class="eyebrow">SUA RESPONSABILIDADE</span><p>${esc(mission.operationalGoal)}</p><span class="station-condition">${esc(s.operation!.definition.systemLabels[key] ?? key)} ${condition}${key === "wire" ? "/100" : "%"} · ${s.personnel.capable} capazes · ${s.personnel.wounded} feridos</span></div><nav class="station-actions" aria-label="Estações do posto">${btn("to-field", `<small>01 / OPERAÇÕES</small><strong>${station.desk} →</strong>`, "station-action primary")}${btn(event ? "incoming" : "station-radio", `<small>02 / COMUNICAÇÕES ${event ? "· CHAMADA" : ""}</small><strong>${event ? esc(event.from) : "Abrir a rede de rádio"}</strong>`, `station-action ${event ? "calling" : ""}`)}${btn("station-state", '<small>03 / COMPANHIA E MATERIAL</small><strong>Examinar a situação</strong>', 'station-action')}</nav></section>`;
}
function showOutcome() {
  const settlement = settleMission(commandProfile, game!);
  commandProfile = settlement.profile;
  saveCommandProfile();
  modal(
    game!.outcome!.title,
    `<p class="dialogue">${esc(game!.outcome!.description)}</p><p>${game!.personnel.capable} capazes · ${game!.personnel.wounded} feridos · ${game!.personnel.missing} desaparecidos · ${game!.personnel.dead} mortos</p>${missionBoard()}<p>${game!.operation!.decisions.length} decisões registradas. O diário e os estoques permanecem disponíveis.</p>${settlement.reward ? `<p class="effect-preview">RECOMPENSA REGISTRADA · +${settlement.reward.reputation} reputação · +${settlement.reward.xp} experiência</p>` : ""}`,
    btn("export", "Exportar registro") +
      btn("close", "Examinar o campo", "primary"),
    "outcome",
  );
}
function start(choice: string) {
  const support = activeSupportFor();
  game = createInitialState(
    mission,
    `${mission.campaignId}-${Date.now()}`,
    choice,
    support,
  );
  selected = game.operation!.units[0].id;
  clearMapFlow();
  screen = "game";
  panel = "orders";
  drawerOpen = false;
  stationView = true;
  lastPlayback = undefined;
  if (story.skipped) game.log.push({ turn: 0, category: "command", text: "Prólogo abreviado com resumo; decisão inicial escolhida explicitamente pelo jogador." });
  notice =
    "Selecione uma formação, indique um destino e emita sua ordem. O tempo só passa ao resolver o turno.";
  save();
  render();
  incoming();
}
function introEffect(adjustments: Record<string, number | undefined>) {
  return Object.entries(adjustments).map(([key, value]) => `${esc(statLabels[key] ?? key)} ${value! > 0 ? "+" : ""}${value}`).join(" · ");
}
function storyTranscript(all: boolean) {
  const parts = mission.operation!.prologue.slice(0, all ? undefined : story.index + 1);
  const choice = mission.introChoices.find(c => c.id === story.choice);
  return `<ol class="story-transcript">${parts.map(part => `<li><strong>${esc(part.speaker)}</strong><p>${esc(part.text)}</p></li>`).join("")}</ol>${choice ? `<p class="effect-preview">Sua decisão: ${esc(choice.label)}. ${introEffect(choice.adjustments)}</p>` : ""}`;
}
function renderCinematic() {
  const d = mission.operation!;
  const art = cinematicFor(mission, story.index)!;
  const part = d.prologue[story.index];
  const choosing = story.stage === "choice";
  const summary = story.stage === "summary";
  const seenChoice = mission.introChoices.find(c => c.id === story.choice);
  const canBack = story.stage === "scene" && story.index > 0 && (!story.choice || story.index > narrativePlan(mission).decisionAfter + 1);
  app.innerHTML = `<main class="cinema ${choosing ? "cinema-choice" : ""} ${summary ? "cinema-summary" : ""} ${storyHidden ? "cinema-clean" : ""}">
    <div class="cinema-vignette" aria-hidden="true"></div>
    <header class="cinema-top"><div><span class="eyebrow">${branchName[mission.campaignId]} · PRÓLOGO</span><h1>${esc(d.title)}</h1></div><nav aria-label="Controles da cena">${btn("sound", sound ? "♪ Som ligado" : "♪ Som", "quiet", `aria-pressed="${sound}"`)}${btn("story-history", "Histórico", "quiet")}${btn("fullscreen", "⛶", "quiet", 'aria-label="Alternar tela cheia"')}${btn("menu", "Sair", "quiet")}</nav></header>
    <div class="cinema-loading" role="status">Preparando cena…</div>
    <section class="cinema-caption" aria-label="Narrativa">
      <div class="scene-chapter"><span>${String(art.sequenceInCampaign).padStart(2, "0")} / 03</span><span>${esc(art.title)}</span></div>
      ${summary ? `<h2>Antes de assumir o comando</h2><div class="cinema-recap">${storyTranscript(true)}</div>` : choosing ? `<span class="eyebrow">DECISÃO DE COMANDO · SEM LIMITE DE TEMPO</span><h2>${esc(narrativeQuestion[mission.campaignId])}</h2><div class="cinema-decisions">${mission.introChoices.map((c,i) => btn("begin", `<span class="choice-number">0${i+1}</span><span><strong>${esc(c.label)}</strong><span>${esc(c.description)}</span><small>${introEffect(c.adjustments)}</small></span>`, "decision", `data-id="${c.id}"`)).join("")}</div>` : `<p class="cinema-speaker">${esc(part.speaker)}</p><p class="cinema-dialogue" aria-live="polite">${esc(part.text)}</p>${seenChoice ? `<p class="cinema-choice-receipt">◆ ${esc(seenChoice.label)} · decisão registrada</p>` : ""}`}
    </section>
    <footer class="cinema-controls"><div>${btn("story-back", "← Anterior", "quiet", canBack ? "" : "disabled")}${!choosing && !summary ? btn("story-auto", storyAuto ? "Ⅱ Pausar leitura" : "▷ Auto", "quiet", `aria-pressed="${storyAuto}"`) + btn("story-skip", "Pular com resumo", "quiet") : ""}${!choosing && !summary ? btn("story-hide", storyHidden ? "Mostrar legendas" : "Ver cena", "quiet", `aria-pressed="${storyHidden}"`) : ""}</div><div class="cinema-progress" aria-label="Passagem ${story.index + 1} de ${d.prologue.length}">${d.prologue.map((_,i) => `<i class="${i <= story.index ? "seen" : ""}"></i>`).join("")}</div>${!choosing ? btn("story-next", summary ? (story.choice ? "Assumir o comando →" : "Tomar minha decisão →") : (story.index === d.prologue.length - 1 ? (story.choice ? "Assumir o comando →" : "Decidir →") : "Continuar →"), "cinema-next primary") : `<span class="cinema-hint">Escolha uma ordem para prosseguir</span>`}</footer>
  </main>`;
  app.querySelector(".cinema")!.prepend(cinema.element);
  storyReady = false;
  cinema.show(cinematicUrl(art), art.description, ok => {
    if (screen !== "prologue") return;
    storyReady = ok;
    const status = app.querySelector<HTMLElement>(".cinema-loading");
    if (status) { status.hidden = ok; status.innerHTML = ok ? "" : `Cena indisponível. Você pode continuar a narrativa. ${btn("story-retry", "Tentar carregar", "quiet")}`; }
    scheduleStory();
  });
  const nextArt = cinematicFor(mission, story.index + 1);
  if (nextArt) cinema.prefetch(cinematicUrl(nextArt));
}
function render() {
  closeModal();
  clearStoryTimer();
  if (screen !== "prologue") cinema.leave();
  app.className = `war-room branch-${mission.campaignId} screen-${screen}${fieldFocus ? " field-focus" : ""}${drawerOpen ? " drawer-open" : ""}${stationView ? " station-view" : ""}${director ? " executing" : ""}`;
  app.style.setProperty(
    "--theatre",
    `url("${new URL(assetUrl(mission.visuals.backdrop), document.baseURI).href}")`,
  );
  if (screen === "menu") {
    app.innerHTML = `<main class="title-screen"><div class="brandline">VALE GAMES <span>DRAMA TÁTICO · 1944</span></div><section class="title-content"><p class="eyebrow">QUANDO O COMANDO CAI, A RESPONSABILIDADE FICA.</p><h1>ÚLTIMA<br>LINHA<span>1944</span></h1><nav class="branch-picker" aria-label="Carreira">${missions.map((m) => btn("branch", branchName[m.campaignId], m.id === mission.id ? "active" : "", `data-id="${m.id}" aria-pressed="${m.id === mission.id}"`)).join("")}</nav><p class="campaign-title">${mission.operation!.title}</p><p class="campaign-summary">${esc(mission.operationalGoal)}</p><div class="title-actions">${hasSave() ? btn("continue", "Continuar operação", "primary") : ""}${btn("new", hasSave() ? "Nova operação" : "Assumir o comando", hasSave() ? "" : "primary")}${btn("dossier", "Dossiê de carreira")}${btn("quartermaster", "Apoio do QG")}${btn("archive", "Arquivo de guerra")}${btn("guide", "Como comandar")}</div></section><aside class="mission-stamp"><span class="eyebrow">ORDENS SELADAS · ${mission.id.split("_")[0].toUpperCase()}</span><strong>${esc(mission.operation!.commander)}</strong><span>${esc(mission.operation!.rank)}</span><p>${esc(mission.subtitle)}</p>${activeSupportFor() ? `<p class="assigned-support">QG designado · ${esc(activeSupportFor()!.title)}</p>` : ""}</aside><footer class="title-footer"><span>Campanhas locais · progresso salvo neste navegador</span><span>EDIÇÃO 0.10 / CAMPANHA E COMBATE</span></footer>${notice ? `<div class="toast" role="status">${esc(notice)}</div>` : ""}</main>`;
    app
      .querySelector(".title-actions")!
      .insertAdjacentHTML(
        "beforeend",
        btn("import", "Carregar arquivo") + btn("sound", sound ? "♪ Ambiente ligado" : "♪ Ativar ambiente", "quiet", `aria-pressed="${sound}"`) +
          (legacySave()
            ? btn("export-legacy", "Exportar registro da edição anterior")
            : ""),
      );
    return;
  }
  if (screen === "prologue") { renderCinematic(); return; }
  const s = game!,
    o = s.operation!,
    d = o.definition,
    event = pendingEvent(s),
    unit = o.units.find((u) => u.id === selected) ?? o.units[0];
  if (selected !== unit.id) {
    selected = unit.id;
    clearMapFlow();
  }
  app.innerHTML = `<header class="command-bar"><div class="operation-name"><span class="eyebrow">${branchName[s.campaignId]} / ${s.phase === "ended" ? "ENCERRADA" : "EM OPERAÇÃO"} · T${Math.min(s.currentTurn,s.maxTurns)}</span><strong>${d.title}</strong></div><div class="clock"><strong>${dateLabel()}</strong><span>TURNO ${Math.min(s.currentTurn, s.maxTurns)} / ${s.maxTurns} · ${d.weather}</span></div><div class="bar-actions">${btn("sound", sound ? "♪ Som ligado" : "♪ Som desligado", "quiet", `aria-pressed="${sound}"`)}${btn("fullscreen", "⛶", "icon", 'aria-label="Alternar tela cheia"')}${btn("pause", "II", "icon", 'aria-label="Pausar e abrir menu"')}</div></header>
  <main class="command-layout"><aside class="roster"><div class="section-label">SEU COMANDO</div><p class="commander-name">${esc(d.commander)}<small>${esc(d.rank)}</small></p><div class="formation-list">${o.units.map((u) => btn("unit", `<span class="unit-symbol">${s.campaignId === "navy" ? "≋" : "⊠"}</span><span><strong>${esc(u.name)}</strong><small>${u.strength} capazes · ${u.x},${u.y}</small><small>${orderLabels[u.order]}${u.target ? ` → ${u.target.x},${u.target.y}` : ""}</small></span>`, u.id === selected ? "formation active" : "formation", `data-id="${u.id}" aria-pressed="${u.id === selected}"`)).join("")}</div><div class="roster-bottom"><span class="eyebrow">OBJETIVO</span><p>${esc(mission.operationalGoal)}</p><span class="coords">REFERÊNCIA ${d.objective.x} / ${d.objective.y}</span></div></aside>
  <section class="map-column" aria-label="Teatro de operações"><div class="map-toolbar"><span>◈ CARTA TÁTICA <small>${observedEnemies(s).length} contatos observados</small></span><div>${btn("zoom-out", "−", "icon", 'aria-label="Reduzir mapa"')}${btn("zoom-in", "+", "icon", 'aria-label="Ampliar mapa"')}${btn("overview", "⌖", "icon", 'aria-label="Visão geral da operação"')}${btn("focus-unit", "◎", "icon", 'aria-label="Centralizar na formação selecionada"')}${btn("history", "Arquivo", "quiet")}${btn("field-focus", fieldFocus ? "HUD" : "Foco", "quiet focus-toggle", `aria-pressed="${fieldFocus}" aria-label="Alternar foco no mapa"`)}${btn("drawer", drawerOpen ? "Fechar ordens" : "Posto", "quiet drawer-controls", `aria-expanded="${drawerOpen}"`)}</div></div>${missionBoard(true)}${supportReceipt()}<div id="tactical-map" class="tactical-map"></div>${commandDeck(unit)}<div class="map-caption"><span>◈ MARCADOR DE LOCAL · <b>◇ OBJETIVO</b> · SOMBRA: SEM OBSERVAÇÃO</span><span>ARRASTE · PINÇA PARA AMPLIAR</span></div>${event ? `<button class="incoming-banner" data-action="incoming"><span class="signal-dot"></span><span><strong>Comunicação aguardando resposta</strong><small>${esc(event.from)} — ${esc(event.title)}</small></span><b>ATENDER →</b></button>` : ""}<div class="field-notice" role="status">${esc(notice || "Aguardando suas ordens.")}</div></section>
  <aside class="orders-panel"><div class="drawer-heading"><span>POSTO DE COMANDO</span>${btn("drawer", "×", "quiet", 'aria-label="Fechar painel de comando"')}</div><nav class="panel-tabs" aria-label="Painéis de comando">${[
    ["mission", "Missão"],
    ["orders", "Ordens"],
    ["radio", "Rádio"],
    ["state", "Situação"],
    ["journal", "Diário"],
  ]
    .map(([id, label]) =>
      btn(
        "panel",
        label,
        panel === id ? "active" : "",
        `data-id="${id}" aria-pressed="${panel === id}"`,
      ),
    )
    .join(
      "",
    )}</nav><div class="panel-content">${panelContent()}</div></aside></main>
  <footer class="turn-bar"><div class="resource-strip">${Object.entries(
    s.resources,
  )
    .map(
      ([k, v]) =>
        `<span><small>${resourceLabels[k as keyof Resources]}</small><b>${v}</b></span>`,
    )
    .join(
      "",
    )}</div><div class="turn-control"><div class="command-points" aria-label="${s.commandAP} pontos de comando"><span>COMANDO</span><b>${"◆".repeat(s.commandAP)}${"◇".repeat(3 - s.commandAP)}</b></div>${btn(s.phase === "ended" ? "outcome" : "end", s.phase === "ended" ? "Relatório final" : `Resolver turno <span>+${mission.turnLabel} →</span>`, "primary end-turn")}</div></footer>`;
  app.querySelector('.bar-actions')?.insertAdjacentHTML('afterbegin', btn('people', 'Pessoas', 'quiet'));
  app.querySelector('.bar-actions')?.insertAdjacentHTML('afterbegin', btn("station", stationView ? "Mapa" : "Posto", "quiet station-toggle"));
  app.querySelector('.map-toolbar > div')?.insertAdjacentHTML('afterbegin', btn("formations", "Formações", "quiet"));
  if (stationView) app.insertAdjacentHTML("beforeend", stationMarkup());
  if (director) {
    app.insertAdjacentHTML("beforeend", `<section class="execution-hud" aria-label="Execução das ordens"><div class="execution-copy" aria-live="polite"></div><progress class="execution-progress" value="0" max="1" aria-label="Progresso do acontecimento"></progress><nav aria-label="Controles de execução">${btn("play-pause", "Ⅱ Pausar")}${btn("play-next", "Próximo")}${btn("play-speed", "1×", "quiet", 'aria-label="Velocidade da execução"')}${btn("play-skip", "Ir ao relatório →", "primary")}</nav><small>A execução apresenta o turno já resolvido. Pular não altera o resultado.</small></section>`);
    app.querySelectorAll<HTMLButtonElement>('button').forEach(b => { if (!b.dataset.action?.startsWith('play-')) b.disabled = true; });
  }
  map.mount(
    document.querySelector<HTMLElement>("#tactical-map")!,
    director && lastPlayback ? lastPlayback.before : s,
    selected,
    target,
  );
}
function orderSummary(order: UnitOrder, unitName: string, destination?: Point) {
  if (order === "move") return `${unitName} seguirá para ${destination?.x}, ${destination?.y}. A rota é uma previsão; o campo pode atrasar o deslocamento.`;
  if (order === "cover") return `${unitName} permanece e prepara cobertura para reduzir sua exposição.`;
  if (order === "recon") return `${unitName} amplia a observação do setor durante a resolução do turno.`;
  return `${unitName} mantém posição e preserva sua organização.`;
}
function commandDeck(unit: NonNullable<GameState["operation"]>["units"][number]) {
  const s = game!, visual = visualForUnit(s.campaignId, unit);
  const orderButtons = (["move", "cover", "recon", "hold"] as UnitOrder[])
    .map((order) => btn("start-order", orderLabels[order], "field-order", `data-id="${order}"`))
    .join("");
  const status = commandStage === "destination"
    ? `<div class="command-instruction"><strong>MARQUE O DESTINO</strong><span>Toque numa quadrícula vazia do mapa ou informe as coordenadas no Posto de Comando.</span>${btn("cancel-order", "Cancelar", "quiet")}</div>`
    : commandStage === "preview" && pendingOrder
      ? `<div class="command-instruction preview"><strong>PRÉVIA · ${orderLabels[pendingOrder]}</strong><span>${esc(orderSummary(pendingOrder, unit.name, target))}</span><div>${btn("cancel-order", "Voltar", "quiet")}${btn("confirm-order", "Confirmar ordem →", "primary")}</div></div>`
      : `<div class="field-order-list" aria-label="Ações para ${esc(unit.name)}">${orderButtons}</div>`;
  return `<section class="unit-command-deck" aria-label="Comando de ${esc(unit.name)}"><img src="${unitCardAssetUrl(s.campaignId, unit)}" alt="Arte de referência: ${esc(visual.classification)}"><div class="unit-command-copy"><span class="eyebrow">${esc(visual.classification)}</span><strong>${esc(unit.name)} · ${unit.strength} capazes</strong><small>${esc(unit.role)} · ${unit.x}, ${unit.y}</small></div>${status}</section>`;
}
function supportEffects(support: SupportPackage) {
  const effects = effectText({ stats: support.effects.stats, resources: support.effects.resources });
  return `${effects || "Sem alteração de estoque"}${support.effects.pressureDelta ? ` · Pressão ${support.effects.pressureDelta}` : ""}`;
}
function supportCard(support: SupportPackage) {
  const unlocked = commandProfile.unlockedSupportIds.includes(support.id);
  const deployed = activeSupportFor()?.id === support.id;
  const action = unlocked
    ? btn("deploy-support", deployed ? "Designado para a próxima operação" : "Designar para a próxima operação", deployed ? "quiet" : "primary", `data-id="${support.id}" ${deployed ? "disabled" : ""}`)
    : btn("purchase-support", `Autorizar · ${support.requestCost} reputação`, "primary", `data-id="${support.id}" ${commandProfile.reputation < support.requestCost ? "disabled" : ""}`);
  return `<article class="support-card ${deployed ? "assigned" : ""}"><img src="${assetUrl(approvedAsset(support.assetId))}" alt="Arte de referência: ${esc(support.title)}"><div><span class="eyebrow">${deployed ? "DESIGNADO" : unlocked ? "DISPONÍVEL" : "REQUISIÇÃO"}</span><h3>${esc(support.title)}</h3><p>${esc(support.description)}</p><small>${esc(supportEffects(support))}</small></div><div class="support-card-action">${action}</div></article>`;
}
function quartermaster() {
  const branch = mission.campaignId;
  if (branch === "lab") return;
  const active = activeSupportFor();
  const rank = rankForXp(commandProfile.xp);
  modal(
    `Requisições do QG · ${branchName[branch]}`,
    `<p class="quartermaster-lead">Apoios são confirmados antes do prólogo e seus efeitos entram no estado inicial da missão. Eles <strong>não</strong> criam uma unidade física no mapa sem dados próprios da operação.</p><div class="profile-strip"><span>REPUTAÇÃO <b>${commandProfile.reputation}</b></span><span>EXPERIÊNCIA <b>${commandProfile.xp}</b></span><span>${esc(rank.title)}</span></div><div class="support-cards">${supportsForBranch(branch).map(supportCard).join("")}</div>${active ? `<div class="support-clear"><span>Designado: <strong>${esc(active.title)}</strong></span>${btn("withdraw-support", "Retirar designação", "quiet")}</div>` : ""}`,
    btn("close", "Voltar", "primary"),
    "quartermaster",
  );
}
function supportReceipt() {
  const support = activeMissionSupport();
  return support
    ? `<button class="support-receipt" data-action="support-manifest"><img src="${assetUrl(approvedAsset(support.assetId))}" alt=""><span><small>APOIO DO QG · CONFIRMADO</small><strong>${esc(support.title)}</strong><em>Efeito operacional já aplicado · não é entidade de campo</em></span></button>`
    : "";
}
function aircraftManifest(state: GameState) {
  const inventory = aircraftInventory(state);
  if (!inventory.length) return "";
  return `<div class="section-label">REGISTRO DA ALA · 6 CÉLULAS</div><p class="micro">Modelos e números de série não foram definidos para A01. O registro mostra apenas a disponibilidade confirmada.</p><div class="aircraft-inventory">${inventory.map((asset) => `<article class="${asset.condition}">${asset.condition === "lost" ? "<span class=asset-loss>×</span>" : `<img src="${topDownSpriteUrl("aircraft")}" alt="">`}<div><strong>${asset.label}</strong><small>${asset.note}</small></div></article>`).join("")}</div>`;
}
function panelContent() {
  const s = game!,
    o = s.operation!,
    d = o.definition,
    u = o.units.find((x) => x.id === selected)!;
  if (panel === "mission")
    return `${missionBoard()}<div class="section-label">RESULTADOS POSSÍVEIS</div><p class="micro">O desfecho é calculado pelo estado acima, pelas decisões registradas e pela capacidade restante — não por uma escolha final de texto.</p><div class="ending-list">${d.endings.filter((ending) => !ending.terminal).map((ending) => `<article><strong>${esc(ending.title)}</strong><p>${esc(ending.description)}</p></article>`).join("")}</div>`;
  if (panel === "orders")
    return `<div class="section-label">${esc(u.name)} / ORDENS</div><p class="panel-lead">${commandStage === "destination" ? "Etapa 2 de 3: marque o destino na carta tática." : commandStage === "preview" && pendingOrder ? `Etapa 3 de 3: revise ${orderLabels[pendingOrder].toLowerCase()} antes de confirmar.` : "Etapa 1 de 3: escolha uma ação; o mapa só recebe destino após Deslocar."}</p>${commandStage === "destination" ? `<form id="coordinates" class="coordinates"><label>X <input name="x" type="number" min="0" max="${d.columns - 1}" value="${target?.x ?? u.x}" required></label><label>Y <input name="y" type="number" min="0" max="${d.rows - 1}" value="${target?.y ?? u.y}" required></label><button type="submit">Marcar</button></form>` : ""}${routeReadout()}${commandStage === "preview" && pendingOrder ? `<div class="panel-order-preview"><p>${esc(orderSummary(pendingOrder, u.name, target))}</p><div>${btn("cancel-order", "Voltar", "quiet")}${btn("confirm-order", "Confirmar ordem →", "primary")}</div></div>` : `<div class="order-grid">${(["move", "cover", "recon", "hold"] as UnitOrder[]).map((id) => { const check = reduce(s, { type: "ORDER", unitId: u.id, order: id === "move" && !target ? "hold" : id, ...(id === "move" && target ? { target } : {}) }); return btn("start-order", `${orderLabels[id]}<small>1 PC</small>`, "order", `data-id="${id}" ${!check.accepted ? "disabled" : ""}`); }).join("")}</div>`}<p class="micro">${u.orderedTurn === s.currentTurn ? "Ordem comprometida neste turno." : "Cada formação recebe uma ordem por turno. Deslocamentos só são emitidos depois da prévia de rota."}</p><div class="section-label">${s.campaignId === "air" ? "RECUPERAÇÃO DA ALA" : s.campaignId === "navy" ? "CONTROLE DE AVARIAS" : "TRABALHOS DE CAMPANHA"}</div>${d.actions
      .map((a) => {
        const task = o.tasks.find((t) => t.actionId === a.id);
        const available = reduce(s, { type: "TASK", actionId: a.id });
        return btn(
          "task",
          `<strong>${a.label}</strong><span>${task ? `EM EXECUÇÃO · TÉRMINO T${task.eta}` : `${a.ap} PC · ${a.duration} turno(s)`}</span>${!task && !available.accepted ? `<small>${esc(available.reason)}</small>` : ""}`,
          "task",
          `data-id="${a.id}" ${!available.accepted ? "disabled" : ""}`,
        );
      })
      .join(
        "",
      )}<div class="section-label">CUIDADO E COMANDO</div><div class="utility-actions">${ACTIONS.filter(
      (a) => a.id !== "fortify" && a.id !== "recon",
    )
      .map((a) =>
        btn(
          "act",
          a.id === "radio" ? "Substituir bateria do rádio" : a.label,
          "utility",
          `data-id="${a.id}" ${s.phase === "ended" || s.usedActions.includes(a.id) || s.commandAP < a.apCost ? "disabled" : ""}`,
        ),
      )
      .join("")}</div>`;
  if (panel === "radio")
    return `${s.campaignId === "army" ? `<div class="radio-operator"><img src="${portraitForSender("Isaac Turner")}" alt="Isaac Turner"><div><strong>Cpl. Isaac Turner</strong><p>Operador da companhia · preparando seu contato com a rede.</p></div></div>` : ""}<div class="section-label">CADEIA DE COMANDO</div><p class="micro">Uma chamada ocupa 1 PC. Respostas e portadores levam turnos. O estoque externo é limitado.</p>${d.contacts.map((c) => `<div class="contact"><strong>${esc(c.name)}</strong><span>${esc(c.role)} · ${c.channel === "local" ? "Local" : "Rádio"}</span><div>${btn("contact", "Relatar", "quiet", `data-id="${c.id}" data-topic="advice"`)}${c.channel === "radio" ? btn("contact", "Suprimentos", "quiet", `data-id="${c.id}" data-topic="supplies"`) + btn("contact", "Médico", "quiet", `data-id="${c.id}" data-topic="medical"`) : ""}</div></div>`).join("")}<div class="section-label">TRÁFEGO / SOLICITAÇÕES</div>${
      o.transmissions
        .slice()
        .reverse()
        .map(
          (m) =>
            `<article class="transmission"><span class="eyebrow">${{ pending: "AGUARDANDO", transit: "EM TRÂNSITO", delivered: "CONFIRMADO", failed: "SEM RESPOSTA", denied: "NEGADO" }[m.status]} · T${m.eta}</span><strong>${esc(d.contacts.find((c) => c.id === m.contactId)?.name)}</strong><p>${esc(m.text)}</p></article>`,
        )
        .join("") || '<p class="micro">Nenhuma transmissão enviada.</p>'
    }`;
  if (panel === "state")
    return `${activeMissionSupport() ? `<div class="support-state">${supportReceipt()}</div>` : ""}<div class="section-label">CONDIÇÃO OPERACIONAL</div>${Object.entries(
      o.systems,
    )
      .map(
        ([k, v]) =>
          `<div class="system-row"><span>${d.systemLabels[k]}</span><strong>${v}</strong></div>`,
      )
      .join(
        "",
      )}<div class="section-label">PESSOAL / ${s.personnel.total} NO REGISTRO</div>${Object.entries(
      s.personnel,
    )
      .filter(([k]) => k !== "total")
      .map(
        ([k, v]) =>
          `<div class="system-row"><span>${{ capable: "Capazes", wounded: "Feridos / limitados", missing: "Desaparecidos", dead: "Mortos", unavailable: "Indisponíveis" }[k]}</span><strong>${v}</strong></div>`,
      )
      .join("")}<div class="section-label">COESÃO</div>${Object.entries(s.stats)
      .map(
        ([k, v]) =>
          `<label class="stat-meter">${statLabels[k]} <b>${v}%</b><meter min="0" max="100" value="${v}">${v}%</meter></label>`,
      )
      .join("")}${aircraftManifest(s)}<p class="micro">${esc(d.mapNote)}</p>`;
  return `<div class="section-label">DIÁRIO DE OPERAÇÕES</div>${s.log
    .slice()
    .reverse()
    .map(
      (e) =>
        `<article class="journal-entry"><span>T${String(e.turn).padStart(2, "0")}</span><p>${esc(e.text)}</p></article>`,
    )
    .join("")}`;
}
function routeReadout() {
  if (!game || !target || pendingOrder !== "move" || commandStage !== "preview") return "";
  const o = game.operation!, unit = o.units.find(u => u.id === selected)!;
  const preview = reduce(game, { type: "ORDER", unitId: unit.id, order: "move", target });
  if (!preview.accepted) return `<p class="route-readout blocked">${esc(preview.reason)}</p>`;
  const path = pathTo(o.definition, unit, target, game.campaignId === "navy");
  const speed = game.campaignId === "navy" ? Math.max(2, Math.floor(o.systems.propulsion / 10)) : 4;
  let turns = 1, budget = speed;
  for (const point of path) {
    const step = terrainAt(o.definition, point) === "forest" ? 2 : 1;
    if (step > budget) { turns++; budget = speed; }
    budget -= step;
  }
  return `<p class="route-readout">ROTA · ${path.length} quadrículas · estimativa ${turns} turno(s)<br>1 PC · sujeita a contato e condições da formação.</p>`;
}
function turnPlan() {
  if (!game) return "";
  const o = game.operation!;
  return `<div class="section-label">PLANO EM EXECUÇÃO</div><ul class="report-list">${o.units.filter(u => u.strength > 0).map(u => `<li><strong>${esc(u.name)}</strong> · ${orderLabels[u.order]}${u.target ? ` → ${u.target.x},${u.target.y}` : ""}${u.orderedTurn === game!.currentTurn ? " · nova ordem" : " · mantida"}</li>`).join("")}${o.tasks.map(t => `<li>${esc(o.definition.actions.find(a => a.id === t.actionId)?.label)} · conclusão prevista T${t.eta}</li>`).join("")}</ul>`;
}
function guide() {
  modal(
    "Seu primeiro turno",
    `<ol class="report-list"><li>Atenda a comunicação prioritária e examine as consequências antes de responder.</li><li>Selecione uma formação à esquerda. Marque um destino no mapa ou pelas coordenadas do painel.</li><li>Distribua até três pontos de comando entre ordens, trabalhos, cuidados e chamadas.</li><li>Resolva o turno para executar deslocamentos, contatos e tarefas. Leia o relatório e decida novamente.</li></ol><p>A rota dourada é uma previsão. Bosques atrasam o movimento; terreno e cobertura afetam contatos. Inimigos fora da observação não aparecem. A partida nunca avança sozinha.</p><p><kbd>Esc</kbd> pausa · <kbd>R</kbd> rádio · <kbd>O</kbd> ordens · <kbd>J</kbd> diário · <kbd>Enter</kbd> abre a confirmação do próximo turno. <kbd>F</kbd> amplia o campo; <kbd>1–5</kbd> selecionam formações. No mapa, use as setas para marcar um destino.</p>`,
  );
}
function history() {
  modal(
    "Carta e contexto histórico",
    `${mission.campaignId === "army" ? `<p>Registro regional de situação de <strong>20 de dezembro de 1944</strong>, preservado pelos Arquivos Nacionais dos Estados Unidos. O mapa tático Cedar é a dramatização ficcional definida na Bíblia, com posições persistentes.</p><a href="${assetUrl({ file: "maps/bastogne-20-dec-1944.jpg" })}" target="_blank" rel="noopener"><img class="historical-map" src="${assetUrl({ file: "maps/bastogne-20-dec-1944.jpg" })}" alt="Carta histórica regional de Bastogne, 20 de dezembro de 1944. Abrir em resolução completa."></a><a href="https://catalog.archives.gov/id/152951359" target="_blank" rel="noopener">Consultar registro original · NARA</a>` : `<p>${esc(mission.operation!.mapNote)}</p><p>A Bíblia situa esta missão em 1944, mas não define uma base ou porto histórico real. A carta jogável preserva essa distinção.</p>`}<p class="micro">${esc(mission.historicalNotice)}</p>`,
  );
}
function archive() {
  modal(
    "Arquivo de guerra",
    `<p>45 artes do catálogo e 9 cenas narrativas fornecidas para os prólogos. Ilustrações de ficção histórica; cenas aprovadas não equivalem a retratos individuais novos.</p><div class="archive-grid">${CINEMATICS.map(a => `<figure><img loading="lazy" src="${cinematicUrl(a)}" alt="${esc(a.description)}"><figcaption>${a.id} · ${esc(a.title)}</figcaption></figure>`).join("")}${APPROVED_ASSETS.map((a) => `<figure><img loading="lazy" src="${assetUrl(a)}" alt="${esc(a.title)}"><figcaption>${a.id} · ${esc(a.title)}</figcaption></figure>`).join("")}</div>`,
  );
}
function dossier() {
  const branch = mission.campaignId;
  if (branch === "lab") return;
  const record = commandProfile.campaigns[branch];
  const history = record?.history ?? [];
  const completed = record?.completedMissionIds.includes(mission.id);
  modal(
    `Dossiê de carreira · ${branchName[branch]}`,
    `<p class="quartermaster-lead">A carreira guarda apenas consequências realmente concluídas: resultado, efetivo, decisões e objetivos. O próximo capítulo só será liberado quando existir um pacote jogável completo.</p><div class="profile-strip"><span>CAPÍTULOS CONCLUÍDOS <b>${record?.completedMissionIds.length ?? 0}</b></span><span>DECISÕES DE COMANDO <b>${record?.totalDecisions ?? 0}</b></span><span>PERDAS REGISTRADAS <b>${record?.losses ?? 0}</b></span></div><div class="campaign-dossier"><article class="dossier-chapter ${completed ? "complete" : ""}"><span class="eyebrow">${completed ? "ARQUIVADO" : "EM OPERAÇÃO"}</span><h3>${esc(mission.title)}</h3><p>${esc(mission.subtitle)}</p><small>${completed ? "Resultado consolidado no diário de carreira." : "Capítulo publicado e disponível."}</small></article><article class="dossier-chapter future"><span class="eyebrow">EM PRODUÇÃO</span><h3>Próximo capítulo</h3><p>A campanha não anuncia uma missão vazia. Novas operações entrarão somente com dados, eventos, objetivos e QA completos.</p></article></div>${history.length ? `<div class="section-label">REGISTRO DE DESFECHOS</div><div class="campaign-history">${history.slice().reverse().map((entry) => `<article><span class="eyebrow">${esc(entry.missionId)}</span><strong>${esc(entry.outcomeTitle)}</strong><p>${entry.capable} capazes · ${entry.wounded} feridos · ${entry.dead} mortos</p><small>${entry.decisions} decisões · ${entry.objectivesCompleted}/${entry.objectivesTotal} objetivos cumpridos</small></article>`).join("")}</div>` : `<p class="micro">Nenhum capítulo concluído nesta carreira. Os dados aparecerão após o relatório final.</p>`}`,
    btn("close", "Voltar", "primary"),
    "dossier",
  );
}
function pause() {
  modal(
    "Comando em espera",
    `<p>O tempo avança apenas quando você resolve o turno. Seu progresso é salvo após cada decisão.</p><label>Volume do ambiente e efeitos <input id="audio-level" type="range" min="0" max="100" value="${Math.round(gameAudio.getVolume()*100)}" aria-label="Volume do áudio"></label><div class="pause-actions">${btn("guide", "Como comandar")}${btn("sound", sound ? "Desligar ambiente" : "Ligar ambiente", "quiet", `aria-pressed="${sound}"`)}${btn("export", "Exportar partida")}${btn("import", "Importar partida")}${btn("archive", "Arquivo de guerra")}${btn("menu", "Menu principal")}</div>`,
    btn("close", "Retomar operação", "primary"),
    "pause",
  );
}
function download() {
  if (!game) return;
  const url = URL.createObjectURL(
    new Blob([encodeSave(game)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `ultima-linha-${mission.campaignId}-T${game.currentTurn}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
app.addEventListener('input', e => { const input=e.target as HTMLInputElement; if(input.id==='audio-level') gameAudio.setVolume(Number(input.value)/100); });
app.addEventListener("submit", (e) => {
  if (director) { e.preventDefault(); return; }
  if ((e.target as HTMLElement).id !== "coordinates") return;
  e.preventDefault();
  const data = new FormData(e.target as HTMLFormElement);
  applyMapFlow(chooseDestination(currentMapFlow(), {
    x: Number(data.get("x")),
    y: Number(data.get("y")),
  }));
  if (commandStage !== "preview") notice = "Escolha Deslocar antes de marcar uma coordenada.";
  render();
});
app.addEventListener("click", async (e) => {
  const el = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-action]",
  );
  if (!el || el.disabled) return;
  const action = el.dataset.action,
    id = el.dataset.id;
  if (director) {
    if (action === "play-pause") director.togglePause();
    if (action === "play-speed") director.toggleSpeed();
    if (action === "play-next") director.next();
    if (action === "play-skip") director.skip();
    return;
  }
  if (action === "people" && game) {
    const senders = [...new Set([...game.operation!.definition.events.map(event => event.from), ...COMMAND_CHARACTERS.filter(c=>c.branch===game!.campaignId).map(c=>c.name)])].filter((name,index,all) => all.findIndex(other => sameCommunicationIdentity(name,other)) === index);
    modal("Pessoas e consequências", '<p>Seu registro de decisões e a situação atual da operação.</p><div class="people-record">'+senders.map(sender => {
      const memory=rememberedDecisions(game!,sender);
      return '<article>'+(portraitForSender(sender) ? '<img class=person-portrait src="'+portraitForSender(sender)+'" alt="'+esc(sender)+'">' : '')+'<h3>'+esc(sender)+'</h3><p>'+esc(communicationRole(sender))+'</p><p>Confiança neste canal: '+relationshipWith(game!,sender).trust+'/100 · '+esc(relationshipWith(game!,sender).reaction)+'</p>'+ (memory.length ? memory.map(item=>'<p><strong>T'+item.turn+' · '+esc(item.title)+'</strong><br>'+esc(item.choice ?? 'Decisão registrada; texto da resposta não consta mais no diário.')+(item.consequence ? '<br>'+esc(item.consequence) : '')+'</p>').join('') : '<p>Nenhuma decisão anterior registrada com este interlocutor.</p>')+'</article>';
    }).join('')+'</div><h3>Consequências no presente</h3><ul>'+situationConsequences(game).map(text=>'<li>'+esc(text)+'</li>').join('')+'</ul>'); return;
  }
  if (action === "station") { stationView = !stationView; drawerOpen = false; render(); return; }
  if (action === "to-station") { stationView = true; drawerOpen = false; render(); return; }
  if (action === "to-field") { stationView = false; drawerOpen = false; render(); return; }
  if (action === "station-radio" || action === "station-state") {
    stationView = false; drawerOpen = true; panel = action === "station-radio" ? "radio" : "state"; render(); return;
  }
  if (action === "formations") {
    modal("Formações sob seu comando", `<div class="formation-picker">${game!.operation!.units.map(u => btn("unit", `<strong>${esc(u.name)}</strong><span>${esc(u.role)} · ${u.strength} capazes · posição ${u.x},${u.y}</span><small>${orderLabels[u.order]}</small>`, "decision", `data-id="${u.id}" ${u.strength <= 0 ? "disabled" : ""}`)).join("")}</div>`); return;
  }
  if (action === "replay") { closeModal(); playTurn(); return; }
  if (action === "close") {
    closeModal();
    return;
  }
  if (action === "confirm") {
    const run = modalAction;
    closeModal();
    run?.();
    return;
  }
  if (action === "branch") {
    mission = missions.find((m) => m.id === id)!;
    gameAudio.setBranch(mission.campaignId);
    notice = "";
    render();
    return;
  }
  if (action === "quartermaster") {
    quartermaster();
    return;
  }
  if (action === "dossier") {
    dossier();
    return;
  }
  if (action === "purchase-support") {
    const support = supportById(id);
    if (!support || support.branch !== mission.campaignId) return;
    confirm(
      `Autorizar ${support.title}?`,
      `<p>${esc(support.description)}</p><p class="effect-preview">Custo: ${support.requestCost} reputação<br>${esc(supportEffects(support))}</p><p>O apoio será designado somente para a próxima operação desta carreira. Não adiciona uma unidade ao mapa sem dados de missão.</p>`,
      () => {
        const purchased = purchaseSupport(commandProfile, support);
        if (!purchased) {
          notice = "Reputação insuficiente para autorizar este apoio.";
        } else {
          commandProfile = deploySupport(purchased, support);
          saveCommandProfile();
          notice = `${support.title} autorizado e designado para a próxima operação.`;
        }
        render();
      },
    );
    return;
  }
  if (action === "deploy-support") {
    const support = supportById(id);
    if (!support || support.branch !== mission.campaignId || !commandProfile.unlockedSupportIds.includes(support.id)) return;
    commandProfile = deploySupport(commandProfile, support);
    saveCommandProfile();
    notice = `${support.title} designado para a próxima operação.`;
    render();
    return;
  }
  if (action === "withdraw-support") {
    const branch = mission.campaignId;
    if (branch === "lab") return;
    const { [branch]: _withdrawn, ...remaining } = commandProfile.deployedSupportByBranch;
    commandProfile = { ...commandProfile, deployedSupportByBranch: remaining };
    saveCommandProfile();
    notice = "Apoio retirado da próxima operação.";
    render();
    return;
  }
  if (action === "support-manifest" && game) {
    const support = activeMissionSupport();
    if (!support) return;
    modal(
      `Apoio do QG · ${support.title}`,
      `<img class="support-manifest-art" src="${assetUrl(approvedAsset(support.assetId))}" alt="Arte de referência: ${esc(support.title)}"><p>${esc(support.description)}</p><p class="effect-preview">${esc(supportEffects(support))}</p><p>Este é um apoio confirmado no estado inicial. A missão não declara uma coordenada ou formação própria para ele; portanto, não aparece como unidade física na carta tática.</p>`,
      btn("close", "Voltar ao comando", "primary"),
      "support-manifest",
    );
    return;
  }
  if (action === "menu") {
    screen = "menu";
    notice = "";
    render();
    return;
  }
  if (action === "new") {
    const run = () => {
      screen = "prologue";
      story = newNarrative();
      storyAuto = false;
      storyHidden = false;
      notice = "";
      render();
    };
    if (hasSave())
      confirm(
        "Iniciar outra operação?",
        `<p>O registro atual desta carreira será substituído quando você escolher sua primeira decisão. Você pode exportá-lo no menu de pausa antes de continuar.</p>`,
        run,
      );
    else run();
    return;
  }
  if (action === "continue") {
    try {
      game = decodeSave(
        localStorage.getItem(SAVE_PREFIX + mission.id)!,
        mission,
      );
      screen = "game";
      stationView = true;
      lastPlayback = undefined;
      selected = game.operation!.units[0].id;
      drawerOpen = false;
      clearMapFlow();
      notice = "Operação retomada.";
      render();
      incoming();
    } catch {
      notice =
        "Não foi possível ler esta partida. O arquivo original foi preservado.";
      render();
    }
    return;
  }
  if (action === "story-next" || action === "story-skip" || action === "story-back") {
    moveStory({ type: action === "story-next" ? "next" : action === "story-back" ? "back" : "skip" });
    return;
  }
  if (action === "story-auto") { storyAuto = !storyAuto; render(); return; }
  if (action === "story-hide") { storyHidden = !storyHidden; render(); return; }
  if (action === "story-retry") { render(); return; }
  if (action === "story-history") {
    modal("Registro do prólogo", storyTranscript(false), "", "story-history");
    return;
  }
  if (action === "begin") {
    const c = mission.introChoices.find(c => c.id === id);
    if (!c || story.stage !== "choice") return;
    confirm(c.label, '<p>'+esc(c.description)+'</p><p class="effect-preview">'+introEffect(c.adjustments)+'</p>', () => moveStory({ type: "choose", id: c.id }));
    return;
  }
  if (action === "field-focus") { fieldFocus = !fieldFocus; drawerOpen = false; render(); return; }
  if (action === "drawer") { drawerOpen = !drawerOpen; render(); return; }
  if (action === "archive") {
    archive();
    return;
  }
  if (action === "guide") {
    guide();
    return;
  }
  if (action === "history") {
    history();
    return;
  }
  if (action === "sound") {
    sound = !sound;
    try { await gameAudio.setEnabled(sound, mission.campaignId); }
    catch { sound = false; notice = "Áudio indisponível neste navegador."; }
    beep();
    render();
    return;
  }
  if (action === "fullscreen") {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      notice = "Tela cheia indisponível neste navegador.";
      render();
    }
    return;
  }
  if (action === "pause") {
    pause();
    return;
  }
  if (action === "export") {
    download();
    return;
  }
  if (action === "import") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 2_000_000) throw new Error("Arquivo muito grande.");
        const loaded = decodeSave(await file.text(), mission);
        confirm(
          "Substituir a partida local?",
          `<p>Importar ${esc(mission.title)}, turno ${loaded.currentTurn}. A partida atual desta carreira será substituída.</p>`,
          () => {
            lastPlayback = undefined;
            stationView = true;
            game = loaded;
            screen = "game";
            selected = game.operation!.units[0].id;
            clearMapFlow();
            save();
            render();
            incoming();
          },
        );
      } catch (err) {
        modal("Importação recusada", `<p>${esc((err as Error).message)}</p>`);
      }
    };
    input.click();
    return;
  }
  if (action === "export-legacy") {
    const raw = legacySave();
    if (raw) {
      const url = URL.createObjectURL(
        new Blob([raw], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "ultima-linha-registro-edicao-anterior.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return;
  }
  if (!game) return;
  if (action === "panel") {
    drawerOpen = true;
    panel = id!;
    render();
    return;
  }
  if (action === "unit") {
    stationView = false;
    applyMapFlow(selectFormation(currentMapFlow(), id!));
    drawerOpen = false;
    panel = "orders";
    notice = `${game.operation!.units.find((unit) => unit.id === id)?.name ?? "Formação"} selecionada. Escolha uma ação no cartão de campo.`;
    render();
    return;
  }
  if (action === "zoom-in") {
    map.adjustZoom(0.25);
    return;
  }
  if (action === "zoom-out") {
    map.adjustZoom(-0.25);
    return;
  }
  if (action === "overview") {
    map.reset();
    notice = "Visão geral restaurada. Use ◎ para voltar à formação selecionada.";
    app.querySelector<HTMLElement>(".field-notice")!.textContent = notice;
    return;
  }
  if (action === "focus-unit") {
    map.focusSelection();
    notice = "Câmera centralizada na formação selecionada.";
    app.querySelector<HTMLElement>(".field-notice")!.textContent = notice;
    return;
  }
  if (action === "incoming") {
    incoming();
    return;
  }
  if (action === "report-next") {
    closeModal();
    incoming();
    return;
  }
  if (action === "outcome") {
    showOutcome();
    return;
  }
  if (action === "decision") {
    const ev = pendingEvent(game)!,
      choice = ev.choices.find((c) => c.id === id)!;
    confirm(
      choice.label,
      `<p>${esc(choice.consequence)}</p><p class="effect-preview">${esc(effectText(choice.effects))}</p>`,
      () => execute({ type: "DECIDE", eventId: ev.id, choiceId: choice.id }),
    );
    return;
  }
  if (action === "start-order" || action === "order") {
    const order = id as UnitOrder,
      u = game.operation!.units.find((unit) => unit.id === selected)!;
    const check = reduce(game, {
      type: "ORDER",
      unitId: u.id,
      order: order === "move" && !target ? "hold" : order,
      ...(order === "move" && target ? { target } : {}),
    });
    if (!check.accepted) {
      notice = check.reason ?? "Esta formação não pode receber outra ordem agora.";
      render();
      return;
    }
    applyMapFlow(startOrder(currentMapFlow(), order));
    drawerOpen = false;
    notice = order === "move"
      ? "Etapa 2 de 3: marque no mapa onde a formação deve terminar a rota."
      : "Etapa 2 de 2: revise a ordem no cartão de campo e confirme quando estiver pronto.";
    render();
    return;
  }
  if (action === "cancel-order") {
    clearMapFlow();
    notice = "Prévia cancelada. Nenhum ponto de comando foi gasto.";
    render();
    return;
  }
  if (action === "confirm-order") {
    const command = pendingCommand(currentMapFlow());
    if (!command) {
      notice = "Escolha uma ação antes de confirmar.";
      render();
      return;
    }
    if (command.order === "move" && !command.target) {
      notice = "Marque um destino para concluir a ordem de deslocamento.";
      render();
      return;
    }
    clearMapFlow();
    execute({ type: "ORDER", ...command });
    return;
  }
  if (action === "task") {
    const a = game.operation!.definition.actions.find((a) => a.id === id)!;
    confirm(
      a.label,
      `<p>${esc(a.description)}</p><p class="effect-preview">${a.ap} PC · ${a.duration} turno(s)<br>${esc(cost(a.cost))}${a.systemsCost ? `<br>${esc(cost(a.systemsCost, true))}` : ""}${a.requires ? `<br>Requer: ${esc(cost(a.requires, true))}` : ""}</p><p>A equipe ocupa uma das duas frentes de serviço. Os recursos são comprometidos imediatamente.</p>`,
      () => execute({ type: "TASK", actionId: a.id }),
    );
    return;
  }
  if (action === "act") {
    const a = ACTIONS.find((a) => a.id === id)!;
    confirm(
      a.id === "radio" ? "Substituir bateria do rádio" : a.label,
      `<p>${esc(a.description)}</p><p class="effect-preview">${a.apCost} PC · ${esc(cost(a.cost))}</p>`,
      () => execute({ type: "ACT", actionId: a.id as ActionId }),
    );
    return;
  }
  if (action === "contact") {
    const c = game.operation!.definition.contacts.find((c) => c.id === id)!;
    const topic = el.dataset.topic as "advice" | "supplies" | "medical";
    confirm(
      `Chamar ${c.name}`,
      `<p>${topic === "advice" ? "Transmitir situação e solicitar orientação." : topic === "medical" ? "Pedir kits médicos ao escalão." : "Pedir munição, ração e material disponível ao escalão."}</p><p class="effect-preview">1 PC · resposta em 1–2 turnos · entrega posterior sujeita a autorização e rota.</p>`,
      () => {
        panel = "radio";
        execute({ type: "CONTACT", contactId: c.id, topic });
      },
    );
    return;
  }
  if (action === "end") {
    const ev = pendingEvent(game);
    if (ev) {
      incoming();
      return;
    }
    confirm(
      "Executar as ordens deste turno?",
      `<p>Avançar ${mission.turnLabel}. Deslocamentos, contatos inimigos, consumo, reparos e comunicações serão resolvidos.</p><p class="effect-preview">${game.commandAP} PC não utilizados serão descartados. ${game.operation!.tasks.length} trabalho(s) em andamento.</p>${turnPlan()}`,
      () => execute({ type: "END_TURN" }),
    );
  }
});
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.repeat) return;
  if (director) {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); director.togglePause(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); director.next(); }
    return;
  }
  if (screen === "prologue" && !document.querySelector("dialog") && !(e.target as HTMLElement).closest("button,input,textarea,select")) {
    if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); moveStory({ type: "next" }); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); moveStory({ type: "back" }); }
    else if (e.key === "Escape") { storyAuto = false; render(); }
    return;
  }
  if (
    screen !== "game" ||
    document.querySelector("dialog") ||
    (e.target as HTMLElement).closest("input,textarea,select,button")
  )
    return;
  if (e.key === "Escape") {
    e.preventDefault();
    pause();
  } else if (["r", "o", "j"].includes(e.key.toLowerCase())) {
    stationView = false;
    drawerOpen = true;
    panel = { r: "radio", o: "orders", j: "journal" }[e.key.toLowerCase()]!;
    render();
  } else if (e.key.toLowerCase() === "f") {
    stationView = false;
    fieldFocus = !fieldFocus;
    drawerOpen = false;
    render();
  } else if (/^[1-5]$/.test(e.key)) {
    const unit = game?.operation?.units[Number(e.key) - 1];
    if (unit) {
      stationView = false;
      applyMapFlow(selectFormation(currentMapFlow(), unit.id));
      drawerOpen = false;
      notice = `${unit.name} selecionada. Escolha uma ação no cartão de campo.`;
      render();
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    document.querySelector<HTMLButtonElement>('[data-action="end"]')?.click();
  }
});
render();
