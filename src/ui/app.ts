import type { ActionId, CommandProfile, GameState, MissionPack, SaveFile, SupportPackage } from "../core/contracts";
import { ACTIONS, createInitialState, reduce } from "../core/engine";
import { getMission, MISSIONS } from "../content/missions";
import { AIR_ASSETS, APPROVED_ASSETS, NAVAL_ASSETS, PERSONNEL_ASSETS, VEHICLE_ASSETS, approvedAsset, assetUrl } from "../content/assets";
import { HQ_SUPPORTS, supportById, supportsForBranch } from "../content/supports";
import { createCommandProfile, deploySupport, purchaseSupport, rankForXp, settleMission } from "../core/progression";
import { mountField, renderField } from "../game/field";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Application root not found");

const SAVE_KEY = "ultima-linha-1944/autosave/v1";
const PROFILE_KEY = "ultima-linha-1944/command-profile/v1";
let selectedMission: MissionPack | undefined;
let game: GameState | undefined;
let notice = "";
let galleryOpen = false;
let hqOpen = false;
let keyboardBound = false;

const ACTION_HOTKEYS: Record<ActionId, string> = {
  rally: "1",
  triage: "2",
  recon: "3",
  fortify: "4",
  radio: "5",
  rest: "6",
};

const loadProfile = (): CommandProfile => {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "") as Partial<CommandProfile>;
    if (saved.schemaVersion !== "1.0.0" || typeof saved.reputation !== "number" || typeof saved.xp !== "number") return createCommandProfile();
    return {
      schemaVersion: "1.0.0",
      reputation: Math.max(0, saved.reputation),
      xp: Math.max(0, saved.xp),
      unlockedSupportIds: Array.isArray(saved.unlockedSupportIds) ? saved.unlockedSupportIds : [],
      deployedSupportByBranch: saved.deployedSupportByBranch ?? {},
      settledSeeds: Array.isArray(saved.settledSeeds) ? saved.settledSeeds : [],
    };
  } catch {
    return createCommandProfile();
  }
};

let profile = loadProfile();
const saveProfile = (): void => localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

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
const backdropUrl = (mission: MissionPack): string => `${import.meta.env.BASE_URL}assets/${mission.visuals.backdrop.file}`;
const backdropStyle = (mission: MissionPack): string => `style="--campaign-backdrop: url('${backdropUrl(mission)}')"`;
const deployedSupport = (mission: MissionPack): SupportPackage | undefined =>
  mission.campaignId === "lab" ? undefined : supportById(profile.deployedSupportByBranch[mission.campaignId]);
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

const art = (assetId: string, className = ""): string => {
  const asset = approvedAsset(assetId);
  return `<figure class="approved-art ${className}"><img src="${assetUrl(asset)}" alt="${asset.title}: ${asset.description}" loading="lazy"/><figcaption><span>${asset.id}</span>${asset.title}</figcaption></figure>`;
};

const effectsLabel = (support: SupportPackage): string => {
  const stats = Object.entries(support.effects.stats ?? {}).map(([stat, value]) => `${statLabel[stat] ?? stat} +${value}`);
  const resources = Object.entries(support.effects.resources ?? {}).map(([resource, value]) => `${resource} +${value}`);
  const pressure = support.effects.pressureDelta ? [`Pressão ${support.effects.pressureDelta}`] : [];
  return [...stats, ...resources, ...pressure].join(" · ");
};

const commandDesk = (): string => {
  const rank = rankForXp(profile.xp);
  return `<section class="command-desk" aria-label="Progressão de comando">
    <div><p class="eyebrow">QUARTEL-GENERAL LOCAL</p><h2>${rank.title}</h2><p>Reputação abre requisições; XP registra campanhas concluídas. Sem microtransações e sem conexão obrigatória.</p></div>
    <div class="command-metrics"><span>REPUTAÇÃO<strong>${profile.reputation}</strong></span><span>XP<strong>${profile.xp}</strong></span><span>PRÓXIMA PATENTE<strong>${rank.nextAt ? `${Math.max(0, rank.nextAt - profile.xp)} XP` : "Máxima"}</strong></span></div>
    <button class="primary" data-hq>Abrir QG e requisições</button>
  </section>`;
};

const supportReadiness = (mission: MissionPack): string => {
  const support = deployedSupport(mission);
  if (!support) return `<section class="support-readiness"><p class="eyebrow">APOIO DE QG</p><strong>Nenhuma requisição ativa</strong><p>Você pode conquistar reputação e solicitar aeronaves, navios ou veículos antes de iniciar.</p><button data-hq>Abrir QG</button></section>`;
  return `<section class="support-readiness"><p class="eyebrow">REQUISIÇÃO CONFIRMADA</p><strong>${support.title}</strong><p>${support.description}</p><small>${effectsLabel(support)}</small><button data-hq>Alterar apoio no QG</button></section>`;
};

const operationReading = (mission: MissionPack, state: GameState): string => {
  const exposure = Math.max(0, state.enemyPressure - state.stats.defense - Math.round(state.stats.intelligence / 3));
  const posture = exposure >= 30 ? "Crítica" : exposure >= 15 ? "Contestada" : "Controlada";
  return `<section class="operation-reading"><div><p class="eyebrow">OBJETIVO PRIMÁRIO</p><strong>${mission.operationalGoal}</strong></div><div><p class="eyebrow">LEITURA OPERACIONAL</p><strong>${posture}</strong><p>${mission.threatBrief}</p></div><div><p class="eyebrow">EXPOSIÇÃO</p><strong>${exposure}</strong><p>Pressão menos defesa e informação disponível.</p></div></section>`;
};

const campaignCards = (): string =>
  MISSIONS.map(
    (mission) => `
      <article class="campaign-card ${mission.campaignId}" ${backdropStyle(mission)}>
        <div class="campaign-backdrop" aria-hidden="true"></div>
        ${art(mission.visuals.heroAssetId, "campaign-art")}
        <p class="eyebrow">${mission.campaignId === "lab" ? "LABORATÓRIO" : "CAMPANHA"} · ${mission.visuals.backdrop.title}</p>
        <h2>${mission.title}</h2>
        <p>${mission.subtitle}</p>
        <p class="notice">${mission.historicalNotice}</p>
        <button class="primary" data-mission="${mission.id}">Preparar missão</button>
      </article>`,
  ).join("");

const chooseMissionScreen = (mission: MissionPack): string => `
  <section class="immersive-shell campaign-${mission.campaignId}" ${backdropStyle(mission)}>
  <div class="immersive-content landing">
    <a class="back" href="#" data-back>← Voltar ao catálogo</a>
    <div class="backdrop-caption"><span>CENÁRIO CINEMATOGRÁFICO ORIGINAL</span>${mission.visuals.backdrop.description}</div>
    <div class="immersion-meter" aria-label="Leitura de ambientação"><span><i></i> AMBIENTE ATIVO</span><span>LUZ · ${mission.campaignId === "navy" ? "LUA / TEMPESTADE" : mission.campaignId === "air" ? "AURORA / NUVENS" : "ALVORECER / NEVE"}</span><span>CAMADA · CINEMÁTICA</span></div>
    <div class="mission-cinema">
      <div><p class="eyebrow">PRÓLOGO · ESCOLHA PERSISTENTE</p><h1>${mission.title}</h1><p class="lead">${mission.historicalNotice}</p></div>
      ${art(mission.visuals.heroAssetId, "mission-hero")}
    </div>
    <div class="mission-asset-strip">${mission.visuals.catalogueAssetIds.map((assetId) => art(assetId, "strip-art")).join("")}</div>
    ${supportReadiness(mission)}
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
  </div></section>`;

const titleBar = (mission: MissionPack, state: GameState): string => `
  <header class="game-header">
    <div><p class="eyebrow">ÚLTIMA LINHA — 1944</p><h1>${mission.title}</h1></div>
    <div class="turn-display"><span>TURNO</span><strong>${state.currentTurn}/${state.maxTurns}</strong><small>${mission.turnLabel} por turno</small></div>
  </header>`;

const gameScreen = (mission: MissionPack, state: GameState): string => {
  const support = supportById(state.deployedSupportId);
  const activeArt = support ? art(support.assetId, "active-portrait") : art(mission.visuals.heroAssetId, "active-portrait");
  const supportText = support
    ? `<span>REQUISIÇÃO EM CAMPO · ${support.title}</span>${support.description}<small>${effectsLabel(support)}</small>`
    : `<span>ESTADO SEM APOIO EXTERNO</span>Decisões, recursos e o mapa continuam separados da arte e são executados pelo motor local.`;
  return `
  <section class="immersive-shell campaign-${mission.campaignId}" ${backdropStyle(mission)}>
  <div class="immersive-content game-content">
  ${titleBar(mission, state)}
  <p class="mission-notice">${mission.historicalNotice}</p>
  <div class="backdrop-caption"><span>CENÁRIO CINEMATOGRÁFICO ORIGINAL</span>${mission.visuals.backdrop.description}</div>
  <div class="immersion-meter" aria-label="Leitura de ambientação"><span><i></i> AMBIENTE ATIVO</span><span>TEATRO · ${mission.campaignId === "navy" ? "PACÍFICO" : mission.campaignId === "air" ? "CANAL" : "ARDENAS"}</span><span>FOCO · ${state.stats.intelligence >= 45 ? "CONTATO CONFIRMADO" : "INFORMAÇÃO IMPERFEITA"}</span></div>
  ${operationReading(mission, state)}
  <section class="active-cinema"><div>${activeArt}</div><p>${supportText}</p></section>
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
      <div class="action-grid" aria-label="Ordens disponíveis">
        ${ACTIONS.map(
          (action) => `
            <button class="action ${available(action.id) ? "" : "disabled"}" data-action="${action.id}" title="Atalho ${ACTION_HOTKEYS[action.id]}" ${available(action.id) ? "" : "disabled"}>
              <strong><kbd>${ACTION_HOTKEYS[action.id]}</kbd>${action.label}</strong><span>${action.description}</span><small>${actionCost(action.id)}</small>
            </button>`,
        ).join("")}
      </div>
      <button class="end-turn" data-end ${state.phase === "ended" ? "disabled" : ""}>${state.phase === "ended" ? "Missão encerrada" : "Encerrar turno"}</button>
      <p class="notice" id="notice" aria-live="polite">${notice || "Sem decisões automáticas: encerrar turno resolve o plano inimigo local."}</p>
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
  ${state.outcome ? `<section class="outcome"><p class="eyebrow">RELATÓRIO PÓS-AÇÃO</p><h2>${state.outcome.title}</h2><p>${state.outcome.description}</p><p class="reward-note">${profile.settledSeeds.includes(state.seed) ? "Recompensa de reputação e XP já creditada no QG local." : "A recompensa será creditada ao encerrar a missão."}</p><button class="primary" data-catalog>Voltar ao catálogo</button></section>` : ""}
  </div></section>`;
};

const gallerySection = (title: string, assets: typeof APPROVED_ASSETS): string => `
  <section class="archive-section"><div><p class="eyebrow">ACERVO APROVADO</p><h2>${title}</h2></div><div class="archive-grid">${assets.map((asset) => art(asset.id, "archive-art")).join("")}</div></section>`;

const galleryScreen = (): string => `
  <section class="landing archive">
    <a class="back" href="#" data-close-gallery>← Voltar ao catálogo</a>
    <p class="eyebrow">BÍBLIA MESTRE · CATÁLOGO 27/28</p>
    <h1>ACERVO<br/><em>CANÔNICO</em></h1>
    <p class="lead">45 artes aprovadas foram importadas diretamente do documento mestre. São stills cinematográficos: não representam sprites, fotografia documental ou especificação técnica definitiva.</p>
    ${gallerySection("Personagens e arquétipos", PERSONNEL_ASSETS)}
    ${gallerySection("Veículos", VEHICLE_ASSETS)}
    ${gallerySection("Aviação", AIR_ASSETS)}
    ${gallerySection("Marinha", NAVAL_ASSETS)}
  </section>`;

const branchTitle: Record<"army" | "air" | "navy", string> = {
  army: "Exército · logística terrestre",
  air: "USAAF · prontidão aérea",
  navy: "Marinha · grupo de escolta",
};

const requisitionCard = (support: SupportPackage): string => {
  const unlocked = profile.unlockedSupportIds.includes(support.id);
  const deployed = profile.deployedSupportByBranch[support.branch] === support.id;
  return `<article class="requisition-card ${deployed ? "deployed" : ""}">
    ${art(support.assetId, "requisition-art")}
    <div class="requisition-copy"><p class="eyebrow">${support.branch.toUpperCase()} · ${unlocked ? "APROVADO" : "REQUER REPUTAÇÃO"}</p><h3>${support.title}</h3><p>${support.description}</p><p class="support-effects">${effectsLabel(support)}</p>
    ${unlocked
      ? `<button class="${deployed ? "selected-support" : "primary"}" data-deploy="${support.id}">${deployed ? "Requisição em campo" : "Preparar para próxima missão"}</button>`
      : `<button data-request="${support.id}" ${profile.reputation < support.requestCost ? "disabled" : ""}>Solicitar ao QG · ${support.requestCost} REP</button>`}
    </div>
  </article>`;
};

const hqScreen = (): string => {
  const rank = rankForXp(profile.xp);
  return `<section class="immersive-shell hq-shell">
    <div class="immersive-content landing hq-content">
      <a class="back" href="#" data-close-hq>← Voltar ao catálogo</a>
      <header class="hq-header"><div><p class="eyebrow">COMANDO DE TEATRO · QUARTEL-GENERAL</p><h1>REQUISIÇÕES<br/><em>E PROGRESSÃO</em></h1><p class="lead">Use reputação conquistada em missões para solicitar meios de apoio. Uma requisição fica disponível na próxima missão da respectiva carreira e seus efeitos entram no motor de jogo.</p></div><div class="hq-rank"><span>PATENTE ATUAL</span><strong>${rank.title}</strong><small>${profile.xp} XP acumulado</small><b>${profile.reputation} REP disponível</b></div></header>
      <div class="hq-rules"><span>MISSÕES CONCLUÍDAS → REPUTAÇÃO + XP</span><span>REQUISIÇÃO → BÔNUS REAL NO ESTADO INICIAL</span><span>PROGRESSÃO SALVA SOMENTE NESTE NAVEGADOR</span></div>
      ${(["army", "air", "navy"] as const).map((branch) => `<section class="hq-branch"><div><p class="eyebrow">ESTOQUE DISPONÍVEL</p><h2>${branchTitle[branch]}</h2></div><div class="requisition-grid">${supportsForBranch(branch).map(requisitionCard).join("")}</div></section>`).join("")}
    </div>
  </section>`;
};

const render = (): void => {
  if (hqOpen) {
    app.innerHTML = hqScreen();
    bindHQ();
    return;
  }
  if (galleryOpen) {
    app.innerHTML = galleryScreen();
    bindGallery();
    return;
  }
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
    : `<section class="landing"><div class="home-cinema"><div><p class="eyebrow">VALE GAMES · ESTRATÉGIA LOCAL</p><h1>ÚLTIMA<br/>LINHA <em>— 1944</em></h1><p class="lead">Comando, sobrevivência e informação imperfeita em três carreiras independentes. Construa reputação, solicite apoio e decida sob pressão.</p></div>${art("P001", "home-portrait")}</div>${commandDesk()}<div class="legend"><span>HISTÓRIA COMPROVADA</span><span>DRAMATIZAÇÃO</span><span>HISTÓRIA ALTERNATIVA</span><button data-gallery>Ver acervo aprovado · 45 assets</button></div><div class="campaign-grid">${campaignCards()}</div></section>`;
  bindLanding();
};

const startMission = (choiceId: string): void => {
  if (!selectedMission) return;
  const seed = `${selectedMission.id}-${Date.now().toString(36)}`;
  const support = deployedSupport(selectedMission);
  game = createInitialState(selectedMission, seed, choiceId, support);
  notice = support ? `${support.title} confirmado pelo QG; os bônus foram aplicados ao estado inicial.` : "Missão inicializada; o seed foi gravado no log.";
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
  if (transition.state.phase === "ended") {
    const settlement = settleMission(profile, transition.state);
    profile = settlement.profile;
    saveProfile();
    notice = settlement.reward
      ? `Missão encerrada. QG creditou +${settlement.reward.reputation} reputação e +${settlement.reward.xp} XP.`
      : "Missão encerrada. O relatório permanece no registro.";
  } else {
    notice = "Turno resolvido pelo planejador inimigo local.";
  }
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
  document.querySelector<HTMLButtonElement>("[data-gallery]")?.addEventListener("click", () => { galleryOpen = true; render(); });
  document.querySelectorAll<HTMLButtonElement>("[data-hq]").forEach((button) => button.addEventListener("click", () => { hqOpen = true; render(); }));
};

const bindGallery = (): void => {
  document.querySelector("[data-close-gallery]")?.addEventListener("click", (event) => { event.preventDefault(); galleryOpen = false; render(); });
};

const bindHQ = (): void => {
  document.querySelector("[data-close-hq]")?.addEventListener("click", (event) => { event.preventDefault(); hqOpen = false; render(); });
  document.querySelectorAll<HTMLButtonElement>("[data-request]").forEach((button) => button.addEventListener("click", () => {
    const support = supportById(button.dataset.request);
    if (!support) return;
    const purchased = purchaseSupport(profile, support);
    if (!purchased) { notice = "Reputação insuficiente para esta requisição."; return; }
    profile = purchased;
    saveProfile();
    notice = `${support.title} foi aprovado pelo QG. Prepare-o para a próxima missão.`;
    render();
  }));
  document.querySelectorAll<HTMLButtonElement>("[data-deploy]").forEach((button) => button.addEventListener("click", () => {
    const support = supportById(button.dataset.deploy);
    if (!support || !profile.unlockedSupportIds.includes(support.id)) return;
    profile = deploySupport(profile, support);
    saveProfile();
    notice = `${support.title} está pronto para a próxima operação de ${branchTitle[support.branch]}.`;
    render();
  }));
};

const bindGame = (): void => {
  document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => button.addEventListener("click", () => dispatch(button.dataset.action as ActionId)));
  document.querySelector<HTMLButtonElement>("[data-end]")?.addEventListener("click", endTurn);
  document.querySelector<HTMLButtonElement>("[data-save]")?.addEventListener("click", () => { saveAutosave(); notice = "Save local atualizado."; render(); });
  document.querySelector<HTMLButtonElement>("[data-load]")?.addEventListener("click", () => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw || !applySave(JSON.parse(raw))) notice = "Nenhum save compatível encontrado.";
    else {
      const settlement = game ? settleMission(profile, game) : undefined;
      if (settlement) {
        profile = settlement.profile;
        saveProfile();
      }
      notice = settlement?.reward ? `Save restaurado e recompensa creditada: +${settlement.reward.reputation} REP / +${settlement.reward.xp} XP.` : "Save local restaurado.";
    }
    render();
  });
  document.querySelector<HTMLButtonElement>("[data-export]")?.addEventListener("click", () => { downloadSave(); render(); });
  document.querySelector<HTMLInputElement>("#import-save")?.addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try { notice = applySave(JSON.parse(await file.text())) ? "Save importado." : "Arquivo de save incompatível."; } catch { notice = "Não foi possível ler este arquivo de save."; }
    render();
  });
  document.querySelector<HTMLButtonElement>("[data-catalog]")?.addEventListener("click", () => { game = undefined; selectedMission = undefined; notice = ""; render(); });
  if (!keyboardBound) {
    document.addEventListener("keydown", (event) => {
      if (!game || game.phase === "ended") return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      const actionId = (Object.keys(ACTION_HOTKEYS) as ActionId[]).find((id) => ACTION_HOTKEYS[id] === event.key);
      if (actionId) {
        event.preventDefault();
        dispatch(actionId);
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        endTurn();
      }
    });
    keyboardBound = true;
  }
};

render();
