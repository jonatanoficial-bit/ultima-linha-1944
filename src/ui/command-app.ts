import type {
  ActionId,
  Command,
  GameState,
  Resources,
} from "../core/contracts";
import type { Effects, Point, UnitOrder } from "../core/operations-types";
import { ACTIONS, createInitialState, reduce } from "../core/engine";
import {
  observedEnemies,
  pendingEvent,
  pathTo,
} from "../core/operations-engine";
import { decodeSave, encodeSave, SAVE_PREFIX } from "../core/persistence";
import { MISSIONS } from "../content/missions";
import { APPROVED_ASSETS, approvedAsset, assetUrl } from "../content/assets";
import { CommandMap } from "../game/tactical-map";

const app = document.querySelector<HTMLElement>("#app")!;
const missions = MISSIONS.filter((m) => m.campaignId !== "lab");
let mission = missions[0],
  game: GameState | undefined,
  screen: "menu" | "prologue" | "game" = "menu";
let scene = 0,
  selected = "hq",
  target: Point | undefined,
  panel = "orders",
  notice = "",
  sound = false;
let audio: AudioContext | undefined,
  modalAction: (() => void) | undefined,
  modalKind = "",
  lastFocus: HTMLElement | null = null;
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
const map = new CommandMap((p, id) => {
  if (id) {
    selected = id;
    target = undefined;
  } else target = p;
  panel = "orders";
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
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = 630;
    gain.gain.setValueAtTime(0.035, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.17);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.18);
  } catch {
    sound = false;
  }
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
  (el.querySelector("footer button") as HTMLElement)?.focus();
}
function closeModal() {
  document.querySelector("#command-dialog")?.remove();
  modalKind = "";
  modalAction = undefined;
  lastFocus?.focus();
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
    `<div class="radio-stamp">● CHAMADA PRIORITÁRIA · T${e.turn}</div><p class="speaker">${esc(e.from)}</p><p class="dialogue">${esc(e.text)}</p><div class="decision-list">${e.choices.map((c) => btn("decision", `<strong>${esc(c.label)}</strong><span>${esc(c.consequence)}</span><small>${esc(effectText(c.effects))}</small>`, "decision", `data-id="${c.id}"`)).join("")}</div>`,
    btn("close", "Consultar o mapa"),
    "incoming",
  );
}
function execute(command: Command) {
  if (!game) return;
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
  render();
  if (game.phase === "ended") {
    showOutcome();
    return;
  }
  if (command.type === "END_TURN") {
    modal(
      "Relatório do período",
      `<p class="eyebrow">${dateLabel()}</p><ul class="report-list">${game.operation!.reports.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`,
      btn(
        "report-next",
        pendingEvent(game) ? "Atender comunicação" : "Voltar ao comando",
        "primary",
      ),
      "report",
    );
  } else incoming();
}
function showOutcome() {
  modal(
    game!.outcome!.title,
    `<p class="dialogue">${esc(game!.outcome!.description)}</p><p>${game!.personnel.capable} capazes · ${game!.personnel.wounded} feridos · ${game!.personnel.missing} desaparecidos · ${game!.personnel.dead} mortos</p><p>${game!.operation!.decisions.length} decisões registradas. O diário e os estoques permanecem disponíveis.</p>`,
    btn("export", "Exportar registro") +
      btn("close", "Examinar o campo", "primary"),
    "outcome",
  );
}
function start(choice: string) {
  game = createInitialState(
    mission,
    `${mission.campaignId}-${Date.now()}`,
    choice,
  );
  selected = game.operation!.units[0].id;
  target = undefined;
  screen = "game";
  panel = "orders";
  notice =
    "Selecione uma formação, indique um destino e emita sua ordem. O tempo só passa ao resolver o turno.";
  save();
  render();
  incoming();
}
function render() {
  closeModal();
  app.className = `war-room branch-${mission.campaignId} screen-${screen}`;
  app.style.setProperty(
    "--theatre",
    `url("${new URL(assetUrl(mission.visuals.backdrop), document.baseURI).href}")`,
  );
  if (screen === "menu") {
    app.innerHTML = `<main class="title-screen"><div class="brandline">VALE GAMES <span>DRAMA TÁTICO · 1944</span></div><section class="title-content"><p class="eyebrow">QUANDO O COMANDO CAI, A RESPONSABILIDADE FICA.</p><h1>ÚLTIMA<br>LINHA<span>1944</span></h1><nav class="branch-picker" aria-label="Carreira">${missions.map((m) => btn("branch", branchName[m.campaignId], m.id === mission.id ? "active" : "", `data-id="${m.id}" aria-pressed="${m.id === mission.id}"`)).join("")}</nav><p class="campaign-title">${mission.operation!.title}</p><p class="campaign-summary">${esc(mission.operationalGoal)}</p><div class="title-actions">${hasSave() ? btn("continue", "Continuar operação", "primary") : ""}${btn("new", hasSave() ? "Nova operação" : "Assumir o comando", hasSave() ? "" : "primary")}${btn("archive", "Arquivo de guerra")}${btn("guide", "Como comandar")}</div></section><aside class="mission-stamp"><span class="eyebrow">ORDENS SELADAS · ${mission.id.split("_")[0].toUpperCase()}</span><strong>${esc(mission.operation!.commander)}</strong><span>${esc(mission.operation!.rank)}</span><p>${esc(mission.subtitle)}</p></aside><footer class="title-footer"><span>Campanhas locais · progresso salvo neste navegador</span><span>EDIÇÃO 0.3 / POSTO DE COMANDO</span></footer>${notice ? `<div class="toast" role="status">${esc(notice)}</div>` : ""}</main>`;
    app
      .querySelector(".title-actions")!
      .insertAdjacentHTML(
        "beforeend",
        btn("import", "Carregar arquivo") +
          (legacySave()
            ? btn("export-legacy", "Exportar registro da edição anterior")
            : ""),
      );
    return;
  }
  if (screen === "prologue") {
    const d = mission.operation!,
      part = d.prologue[scene];
    const portrait =
      mission.campaignId === "army" ? approvedAsset("P001") : undefined;
    app.innerHTML = `<main class="prologue"><div class="brandline">${branchName[mission.campaignId]} / ${d.title} ${btn("menu", "Voltar", "quiet")}</div><section class="story-frame">${portrait ? `<img class="story-portrait" src="${assetUrl(portrait)}" alt="Daniel Mercer, retrato ficcional aprovado">` : ""}<div class="story-copy"><span class="eyebrow">${scene < d.prologue.length ? `PRÓLOGO · ${scene + 1} / ${d.prologue.length}` : "SUA PRIMEIRA DECISÃO"}</span><h2>${esc(part?.speaker ?? d.commander)}</h2>${
      part
        ? `<p class="story-text">${esc(part.text)}</p>${btn("story-next", "Continuar →", "primary")} ${btn("story-skip", "Ir à primeira decisão", "quiet")}`
        : `<p class="story-text">O comando agora depende de você. Por onde começar?</p><div class="decision-list">${mission.introChoices
            .map((c) =>
              btn(
                "begin",
                `<strong>${esc(c.label)}</strong><span>${esc(c.description)}</span><small>${esc(
                  Object.entries(c.adjustments)
                    .map(([k, v]) => `${statLabels[k]} ${v > 0 ? "+" : ""}${v}`)
                    .join(" · "),
                )}</small>`,
                "decision",
                `data-id="${c.id}"`,
              ),
            )
            .join("")}</div>`
    }</div></section><p class="historical-note">${esc(mission.historicalNotice)}</p></main>`;
    return;
  }
  const s = game!,
    o = s.operation!,
    d = o.definition,
    event = pendingEvent(s),
    unit = o.units.find((u) => u.id === selected) ?? o.units[0];
  selected = unit.id;
  app.innerHTML = `<header class="command-bar"><div class="operation-name"><span class="eyebrow">${branchName[s.campaignId]} / ${s.phase === "ended" ? "ENCERRADA" : "EM OPERAÇÃO"}</span><strong>${d.title}</strong></div><div class="clock"><strong>${dateLabel()}</strong><span>TURNO ${Math.min(s.currentTurn, s.maxTurns)} / ${s.maxTurns} · ${d.weather}</span></div><div class="bar-actions">${btn("sound", sound ? "♪ Som ligado" : "♪ Som desligado", "quiet", `aria-pressed="${sound}"`)}${btn("fullscreen", "⛶", "icon", 'aria-label="Alternar tela cheia"')}${btn("pause", "II", "icon", 'aria-label="Pausar e abrir menu"')}</div></header>
  <main class="command-layout"><aside class="roster"><div class="section-label">SEU COMANDO</div><p class="commander-name">${esc(d.commander)}<small>${esc(d.rank)}</small></p><div class="formation-list">${o.units.map((u) => btn("unit", `<span class="unit-symbol">${s.campaignId === "navy" ? "≋" : "⊠"}</span><span><strong>${esc(u.name)}</strong><small>${u.strength} capazes · ${u.x},${u.y}</small><small>${orderLabels[u.order]}${u.target ? ` → ${u.target.x},${u.target.y}` : ""}</small></span>`, u.id === selected ? "formation active" : "formation", `data-id="${u.id}" aria-pressed="${u.id === selected}"`)).join("")}</div><div class="roster-bottom"><span class="eyebrow">OBJETIVO</span><p>${esc(mission.operationalGoal)}</p><span class="coords">REFERÊNCIA ${d.objective.x} / ${d.objective.y}</span></div></aside>
  <section class="map-column" aria-label="Teatro de operações"><div class="map-toolbar"><span>◈ CARTA TÁTICA <small>${observedEnemies(s).length} contatos observados</small></span><div>${btn("zoom-out", "−", "icon", 'aria-label="Reduzir mapa"')}${btn("zoom-in", "+", "icon", 'aria-label="Ampliar mapa"')}${btn("recenter", "⌖", "icon", 'aria-label="Recentrar mapa"')}${btn("history", "Arquivo", "quiet")}</div></div><div id="tactical-map" class="tactical-map"></div><div class="map-caption"><span>▨ FORMAÇÕES · <b>□ OBJETIVO</b> · SOMBRA: SEM OBSERVAÇÃO</span><span>Arraste para navegar</span></div>${event ? `<button class="incoming-banner" data-action="incoming"><span class="signal-dot"></span><span><strong>Comunicação aguardando resposta</strong><small>${esc(event.from)} — ${esc(event.title)}</small></span><b>ATENDER →</b></button>` : ""}<div class="field-notice" role="status">${esc(notice || "Aguardando suas ordens.")}</div></section>
  <aside class="orders-panel"><nav class="panel-tabs" aria-label="Painéis de comando">${[
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
  map.mount(
    document.querySelector<HTMLElement>("#tactical-map")!,
    s,
    selected,
    target,
  );
}
function panelContent() {
  const s = game!,
    o = s.operation!,
    d = o.definition,
    u = o.units.find((x) => x.id === selected)!;
  if (panel === "orders")
    return `<div class="section-label">${esc(u.name)} / ORDENS</div><p class="panel-lead">${target ? `Destino ${target.x}, ${target.y} selecionado.` : "Toque em um ponto do mapa para traçar a rota."}</p><form id="coordinates" class="coordinates"><label>X <input name="x" type="number" min="0" max="${d.columns - 1}" value="${target?.x ?? u.x}" required></label><label>Y <input name="y" type="number" min="0" max="${d.rows - 1}" value="${target?.y ?? u.y}" required></label><button type="submit">Marcar</button></form><div class="order-grid">${(["move", "cover", "recon", "hold"] as UnitOrder[]).map((id) => btn("order", `${orderLabels[id]}<small>1 PC</small>`, "order", `data-id="${id}" ${s.phase === "ended" || s.commandAP < 1 || u.orderedTurn === s.currentTurn || (id === "move" && !target) ? "disabled" : ""}`)).join("")}</div><p class="micro">${u.orderedTurn === s.currentTurn ? "Ordem comprometida neste turno." : "Cada formação recebe uma ordem por turno. Deslocamentos seguem a rota ao resolver o período."}</p><div class="section-label">${s.campaignId === "air" ? "RECUPERAÇÃO DA ALA" : s.campaignId === "navy" ? "CONTROLE DE AVARIAS" : "TRABALHOS DE CAMPANHA"}</div>${d.actions
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
    return `<div class="section-label">CADEIA DE COMANDO</div><p class="micro">Uma chamada ocupa 1 PC. Respostas e portadores levam turnos. O estoque externo é limitado.</p>${d.contacts.map((c) => `<div class="contact"><strong>${esc(c.name)}</strong><span>${esc(c.role)} · ${c.channel === "local" ? "Local" : "Rádio"}</span><div>${btn("contact", "Relatar", "quiet", `data-id="${c.id}" data-topic="advice"`)}${c.channel === "radio" ? btn("contact", "Suprimentos", "quiet", `data-id="${c.id}" data-topic="supplies"`) + btn("contact", "Médico", "quiet", `data-id="${c.id}" data-topic="medical"`) : ""}</div></div>`).join("")}<div class="section-label">TRÁFEGO / SOLICITAÇÕES</div>${
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
    return `<div class="section-label">CONDIÇÃO OPERACIONAL</div>${Object.entries(
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
      .join("")}<p class="micro">${esc(d.mapNote)}</p>`;
  return `<div class="section-label">DIÁRIO DE OPERAÇÕES</div>${s.log
    .slice()
    .reverse()
    .map(
      (e) =>
        `<article class="journal-entry"><span>T${String(e.turn).padStart(2, "0")}</span><p>${esc(e.text)}</p></article>`,
    )
    .join("")}`;
}
function guide() {
  modal(
    "Seu primeiro turno",
    `<ol class="report-list"><li>Atenda a comunicação prioritária e examine as consequências antes de responder.</li><li>Selecione uma formação à esquerda. Marque um destino no mapa ou pelas coordenadas do painel.</li><li>Distribua até três pontos de comando entre ordens, trabalhos, cuidados e chamadas.</li><li>Resolva o turno para executar deslocamentos, contatos e tarefas. Leia o relatório e decida novamente.</li></ol><p>A rota dourada é uma previsão. Bosques atrasam o movimento; terreno e cobertura afetam contatos. Inimigos fora da observação não aparecem. A partida nunca avança sozinha.</p><p><kbd>Esc</kbd> pausa · <kbd>R</kbd> rádio · <kbd>O</kbd> ordens · <kbd>J</kbd> diário · <kbd>Enter</kbd> abre a confirmação do próximo turno.</p>`,
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
    `<p>45 imagens do catálogo da Bíblia. As ilustrações são arte ficcional de apresentação. Walker e Sullivan ainda não têm retratos canônicos aprovados.</p><div class="archive-grid">${APPROVED_ASSETS.map((a) => `<figure><img loading="lazy" src="${assetUrl(a)}" alt="${esc(a.title)}"><figcaption>${a.id} · ${esc(a.title)}</figcaption></figure>`).join("")}</div>`,
  );
}
function pause() {
  modal(
    "Comando em espera",
    `<p>O tempo avança apenas quando você resolve o turno. Seu progresso é salvo após cada decisão.</p><div class="pause-actions">${btn("guide", "Como comandar")}${btn("export", "Exportar partida")}${btn("import", "Importar partida")}${btn("archive", "Arquivo de guerra")}${btn("menu", "Menu principal")}</div>`,
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
app.addEventListener("submit", (e) => {
  if ((e.target as HTMLElement).id !== "coordinates") return;
  e.preventDefault();
  const data = new FormData(e.target as HTMLFormElement);
  target = { x: Number(data.get("x")), y: Number(data.get("y")) };
  render();
});
app.addEventListener("click", async (e) => {
  const el = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-action]",
  );
  if (!el || el.disabled) return;
  const action = el.dataset.action,
    id = el.dataset.id;
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
    notice = "";
    render();
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
      scene = 0;
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
      selected = game.operation!.units[0].id;
      target = undefined;
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
  if (action === "story-next" || action === "story-skip") {
    scene =
      action === "story-skip" ? mission.operation!.prologue.length : scene + 1;
    render();
    return;
  }
  if (action === "begin") {
    const c = mission.introChoices.find((c) => c.id === id)!;
    confirm(
      c.label,
      `<p>${esc(c.description)}</p><p>${esc(
        Object.entries(c.adjustments)
          .map(([k, v]) => `${statLabels[k]} ${v > 0 ? "+" : ""}${v}`)
          .join(" · "),
      )}</p>`,
      () => start(c.id),
    );
    return;
  }
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
            game = loaded;
            screen = "game";
            selected = game.operation!.units[0].id;
            target = undefined;
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
    panel = id!;
    render();
    return;
  }
  if (action === "unit") {
    selected = id!;
    target = undefined;
    panel = "orders";
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
  if (action === "recenter") {
    map.reset();
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
  if (action === "order") {
    const u = game.operation!.units.find((u) => u.id === selected)!,
      order = id as UnitOrder;
    const destination = target ? { ...target } : undefined;
    const path = destination
      ? pathTo(
          game.operation!.definition,
          u,
          destination,
          game.campaignId === "navy",
        )
      : [];
    confirm(
      `${orderLabels[order]} · ${u.name}`,
      `<p>${order === "move" ? `Destino ${destination?.x},${destination?.y}. ${path.length} quadrículas na rota. O deslocamento pode durar vários turnos.` : order === "cover" ? "A formação mantém a posição e reduz sua exposição no contato." : order === "recon" ? "Vigias ampliam o alcance de observação e a informação a cada período." : "A formação permanece nesta posição."}</p><p class="effect-preview">1 ponto de comando · execução ao resolver o turno.</p>`,
      () =>
        execute({ type: "ORDER", unitId: u.id, order, target: destination }),
    );
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
      `<p>Avançar ${mission.turnLabel}. Deslocamentos, contatos inimigos, consumo, reparos e comunicações serão resolvidos.</p><p class="effect-preview">${game.commandAP} PC não utilizados serão descartados. ${game.operation!.tasks.length} trabalho(s) em andamento.</p>`,
      () => execute({ type: "END_TURN" }),
    );
  }
});
document.addEventListener("keydown", (e) => {
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
    panel = { r: "radio", o: "orders", j: "journal" }[e.key.toLowerCase()]!;
    render();
  } else if (e.key === "Enter") {
    e.preventDefault();
    document.querySelector<HTMLButtonElement>('[data-action="end"]')?.click();
  }
});
render();
