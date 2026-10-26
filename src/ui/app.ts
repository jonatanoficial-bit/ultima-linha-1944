import type { ActionId, GameState, MissionPack, SaveFile } from "../core/contracts";
import { ACTIONS, createInitialState, reduce } from "../core/engine";
import { getMission, MISSIONS } from "../content/missions";
import { mountField, renderField } from "../game/field";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Application root not found");

const SAVE_KEY = "ultima-linha-1944/autosave/v1";
let selectedMission: MissionPack | undefined;
let game: GameState | undefined;
let notice = "";

const statLabel: Record<string, string> = {
  morale: "Moral",
  readiness: "Prontidão",
  intelligence: "Informação",
  radio: "Rádio",
  defense: "Defesa",
  fatigue: "Fadiga",
  legitimacy: "Legitimidade",
};

const missionByGame = (): MissionPack | undefined => (game ? getMission(game.missionId) : undefined);
const available = (actionId: ActionId): boolean => {
  const state = game;
  if (!state) return false;
  const action = ACTIONS.find((item) => item.id === actionId);
  if (!action || state.usedActions.includes(actionId) || state.commandAP < action.apCost) return false;
  if (actionId === "triage" && state.personnel.wounded === 0) return false;
  return Object.entries(action.cost).every(([key, value]) => state.resources[key as keyof typeof state.resources] >= (value ?? 0));
};

const actionCost = (actionId: ActionId): string => {
  const action = ACTIONS.find((item) => item.id === actionId);
  if (!action) return "";
  const resources = Object.entries(action.cost).map(([key, value]) => `${value} ${key}`);
  return [`${action.apCost} PC`, ...resources].join(" · ");
};

const formatLog = (state: GameState): string =>
  state.log
    .slice()
    .reverse()
    .map((entry) => `<li><span>T${entry.turn}</span>${entry.text}</li>`)
    .join("");

const campaignCards = (): string =>
  MISSIONS.map(
    (mission) => `
      <article class="campaign-card ${mission.campaignId}">
        <p class="eyebrow">${mission.campaignId === "lab" ? "LABORATÓRIO" : "CAMPANHA"}</p>
        <h2>${mission.title}</h2>
        <p>${mission.subtitle}</p>
        <p class="notice">${mission.historicalNotice}</p>
        <button class="primary" data-mission="${mission.id}">Preparar missão</button>
      </article>`,
  ).join("");

const chooseMissionScreen = (mission: MissionPack): string => `
  <section class="landing">
    <a class="back" href="#" data-back>← Voltar ao catálogo</a>
    <p class="eyebrow">PRÓLOGO · ESCOLHA PERSISTENTE</p>
    <h1>${mission.title}</h1>
    <p class="lead">${mission.historicalNotice}</p>
    <div class="choice-grid">
      ${mission.introChoices
        .map(
          (choice) => `
          <article class="choice-card">
            <h2>${choice.label}</h2>
            <p>${choice.description}</p>
            <p class="impact">${Object.entries(choice.adjustments)
              .map(([stat, value]) => `${statLabel[stat]} ${Number(value) > 0 ? "+" : ""}${value}`)
              .join(" · ") || "Sem modificadores"}</p>
            <button class="primary" data-start="${choice.id}">Confirmar decisão</button>
          </article>`,
        )
        .join("")}
    </div>
  </section>`;

const titleBar = (mission: MissionPack, state: GameState): string => `
  <header class="game-header">
    <div><p class="eyebrow">ÚLTIMA LINHA — 1944</p><h1>${mission.title}</h1></div>
    <div class="turn-display"><span>TURNO</span><strong>${state.currentTurn}/${state.maxTurns}</strong><small>${mission.turnLabel} por turno</small></div>
  </header>`;

const gameScreen = (mission: MissionPack, state: GameState): string => `
  ${titleBar(mission, state)}
  <p class="mission-notice">${mission.historicalNotice}</p>
  <div class="battlefield" id="battlefield" aria-label="Mapa operacional. Os controles estão abaixo do mapa."></div>
  <section class="status-strip" aria-label="Estado da missão">
    <div><span>Capazes</span><strong>${state.personnel.capable}</strong></div>
    <div><span>Feridos</span><strong>${state.personnel.wounded}</strong></div>
    <div><span>Ausentes</span><strong>${state.personnel.missing}</strong></div>
    <div><span>Mortos</span><strong>${state.personnel.dead}</strong></div>
    <div><span>Pressão</span><strong>${state.enemyPressure}</strong></div>
    <div><span>PC</span><strong>${state.commandAP}/3</strong></div>
  </section>
  <div class="game-layout">
    <section class="panel command-panel" aria-labelledby="command-title">
      <div class="section-title"><div><p class="eyebrow">ORDENS</p><h2 id="command-title">Decisões do turno</h2></div><p>Custos e efeitos são aplicados pelo motor local.</p></div>
      <div class="action-grid">
        ${ACTIONS.map(
          (action) => `
            <button class="action ${available(action.id) ? "" : "disabled"}" data-action="${action.id}" ${available(action.id) ? "" : "disabled"}>
              <strong>${action.label}</strong><span>${action.description}</span><small>${actionCost(action.id)}</small>
            </button>`,
        ).join("")}
      </div>
      <button class="end-turn" data-end ${state.phase === "ended" ? "disabled" : ""}>${state.phase === "ended" ? "Missão encerrada" : "Encerrar turno"}</button>
      <p class="notice" id="notice">${notice || "Sem decisões automáticas: encerrar turno resolve o plano inimigo local."}</p>
    </section>
    <aside class="side-column">
      <section class="panel"><p class="eyebrow">CAPACIDADE</p><div class="stat-list">${Object.entries(state.stats)
        .map(([stat, value]) => `<div><span>${statLabel[stat]}</span><progress value="${value}" max="100">${value}</progress><strong>${value}</strong></div>`)
        .join("")}</div></section>
      <section class="panel"><p class="eyebrow">ESTOQUE</p><div class="resources">${Object.entries(state.resources)
        .map(([name, value]) => `<span>${name}<strong>${value}</strong></span>`)
        .join("")}</div></section>
      <section class="panel saves"><p class="eyebrow">SAVE LOCAL</p><button data-save>Salvar</button><button data-load>Carregar</button><button data-export>Exportar</button><label class="file-label">Importar<input id="import-save" type="file" accept="application/json" /></label></section>
    </aside>
  </div>
  <section class="panel log-panel"><p class="eyebrow">REGISTRO VERIFICÁVEL</p><ul>${formatLog(state)}</ul></section>
  ${state.outcome ? `<section class="outcome"><p class="eyebrow">RELATÓRIO PÓS-AÇÃO</p><h2>${state.outcome.title}</h2><p>${state.outcome.description}</p><button class="primary" data-catalog>Voltar ao catálogo</button></section>` : ""}`;

const render = (): void => {
  if (game) {
    const mission = missionByGame();
    if (!mission) throw new Error("Mission package is unavailable for this save.");
    app.innerHTML = gameScreen(mission, game);
    const mapElement = document.querySelector<HTMLElement>("#battlefield");
    if (mapElement) {
      mountField(mapElement);
      renderField(game, mission.map);
    }
    bindGame();
    return;
  }
  app.innerHTML = selectedMission
    ? chooseMissionScreen(selectedMission)
    : `<section class="landing"><p class="eyebrow">VALE GAMES · FUNDAÇÃO JOGÁVEL</p><h1>ÚLTIMA<br/>LINHA <em>— 1944</em></h1><p class="lead">Comando, sobrevivência e informação imperfeita em três carreiras independentes. Tudo roda localmente no navegador.</p><div class="legend"><span>HISTÓRIA COMPROVADA</span><span>DRAMATIZAÇÃO</span><span>HISTÓRIA ALTERNATIVA</span></div><div class="campaign-grid">${campaignCards()}</div></section>`;
  bindLanding();
};

const startMission = (choiceId: string): void => {
  if (!selectedMission) return;
  const seed = `${selectedMission.id}-${Date.now().toString(36)}`;
  game = createInitialState(selectedMission, seed, choiceId);
  notice = "Missão inicializada; o seed foi gravado no log.";
  render();
};

const dispatch = (actionId: ActionId): void => {
  if (!game) return;
  const transition = reduce(game, { type: "ACT", actionId });
  game = transition.state;
  notice = transition.accepted ? "Ordem executada e registrada." : transition.reason ?? "Ordem recusada.";
  saveAutosave();
  render();
};

const endTurn = (): void => {
  if (!game || !window.confirm("Encerrar o turno resolve o plano inimigo. Continuar?")) return;
  const transition = reduce(game, { type: "END_TURN" });
  game = transition.state;
  notice = transition.state.phase === "ended" ? "Missão encerrada. O relatório permanece no registro." : "Turno resolvido pelo planejador inimigo local.";
  saveAutosave();
  render();
};

const saveAutosave = (): void => {
  if (!game) return;
  const save: SaveFile = { schemaVersion: "1.0.0", savedAt: new Date().toISOString(), state: game };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
};

const applySave = (payload: unknown): boolean => {
  const candidate = payload as Partial<SaveFile>;
  if (candidate.schemaVersion !== "1.0.0" || !candidate.state || !getMission(candidate.state.missionId ?? "")) return false;
  game = candidate.state;
  selectedMission = undefined;
  return true;
};

const downloadSave = (): void => {
  if (!game) return;
  const save: SaveFile = { schemaVersion: "1.0.0", savedAt: new Date().toISOString(), state: game };
  const href = URL.createObjectURL(new Blob([JSON.stringify(save, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = `${game.missionId}-${game.seed}.json`;
  link.click();
  URL.revokeObjectURL(href);
  notice = "Save exportado.";
};

const bindLanding = (): void => {
  document.querySelectorAll<HTMLButtonElement>("[data-mission]").forEach((button) => {
    button.addEventListener("click", () => { selectedMission = getMission(button.dataset.mission ?? ""); render(); });
  });
  document.querySelector("[data-back]")?.addEventListener("click", (event) => { event.preventDefault(); selectedMission = undefined; render(); });
  document.querySelectorAll<HTMLButtonElement>("[data-start]").forEach((button) => button.addEventListener("click", () => startMission(button.dataset.start ?? "")));
};

const bindGame = (): void => {
  document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => button.addEventListener("click", () => dispatch(button.dataset.action as ActionId)));
  document.querySelector<HTMLButtonElement>("[data-end]")?.addEventListener("click", endTurn);
  document.querySelector<HTMLButtonElement>("[data-save]")?.addEventListener("click", () => { saveAutosave(); notice = "Save local atualizado."; render(); });
  document.querySelector<HTMLButtonElement>("[data-load]")?.addEventListener("click", () => { const raw = localStorage.getItem(SAVE_KEY); if (!raw || !applySave(JSON.parse(raw))) notice = "Nenhum save compatível encontrado."; else notice = "Save local restaurado."; render(); });
  document.querySelector<HTMLButtonElement>("[data-export]")?.addEventListener("click", () => { downloadSave(); render(); });
  document.querySelector<HTMLInputElement>("#import-save")?.addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try { notice = applySave(JSON.parse(await file.text())) ? "Save importado." : "Arquivo de save incompatível."; } catch { notice = "Não foi possível ler este arquivo de save."; }
    render();
  });
  document.querySelector<HTMLButtonElement>("[data-catalog]")?.addEventListener("click", () => { game = undefined; selectedMission = undefined; notice = ""; render(); });
};

render();
