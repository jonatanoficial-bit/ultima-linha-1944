import type { GameState, MissionPack } from "./contracts";
import { assertState } from "./engine";

export const SAVE_PREFIX = "ultima-linha-1944/command-save/v3/";
/** Reject partial or foreign payloads. Definitions always come from the installed mission pack. */
export function decodeSave(raw: string, mission: MissionPack): GameState {
  const payload = JSON.parse(raw);
  const s = payload.state as GameState;
  if (
    payload.version !== 3 ||
    !s ||
    s.gameVersion !== "0.3.0" ||
    s.missionId !== mission.id ||
    s.campaignId !== mission.campaignId ||
    !s.operation ||
    !mission.operation
  )
    throw new Error("Este arquivo não pertence a esta versão da operação.");
  if (
    !["playing", "ended"].includes(s.phase) ||
    !Number.isInteger(s.currentTurn) ||
    s.currentTurn < 1 ||
    s.currentTurn > mission.maxTurns + 1 ||
    s.maxTurns !== mission.maxTurns ||
    !Number.isInteger(s.commandAP) ||
    s.commandAP < 0 ||
    s.commandAP > 3 ||
    !Number.isFinite(s.rngState) ||
    typeof s.seed !== "string"
  )
    throw new Error("Estado de comando inválido.");
  for (const group of ["personnel", "resources", "stats"] as const)
    for (const key of Object.keys(mission[group]))
      if (
        !Number.isFinite((s[group] as unknown as Record<string, number>)[key])
      )
        throw new Error("Efetivos ou recursos incompletos.");
  assertState(s);
  if (
    s.phase === "ended" &&
    (!s.outcome ||
      typeof s.outcome.title !== "string" ||
      typeof s.outcome.description !== "string" ||
      ![
        "hold",
        "costly-hold",
        "withdrawal",
        "collapse",
        "surrender",
        "survival",
      ].includes(s.outcome.id))
  )
    throw new Error("Relatório final ausente ou inválido.");
  const o = s.operation,
    d = mission.operation;
  const point = (p: { x: number; y: number }) =>
    p &&
    Number.isInteger(p.x) &&
    Number.isInteger(p.y) &&
    p.x >= 0 &&
    p.y >= 0 &&
    p.x < d.columns &&
    p.y < d.rows;
  for (const name of ["units", "enemies"] as const) {
    if (!Array.isArray(o[name]) || o[name].length !== d[name].length)
      throw new Error("Registro de formações inválido.");
    const ids = new Set<string>();
    for (const u of o[name]) {
      if (
        ids.has(u.id) ||
        !d[name].some((x) => x.id === u.id) ||
        !point(u) ||
        !Number.isInteger(u.strength) ||
        u.strength < 0 ||
        !["hold", "move", "recon", "cover"].includes(u.order) ||
        (u.target && !point(u.target))
      )
        throw new Error("Posição ou efetivo inválido.");
      ids.add(u.id);
    }
  }
  if (o.units.reduce((n, u) => n + u.strength, 0) !== s.personnel.capable)
    throw new Error("Efetivos divergentes.");
  for (const key of Object.keys(d.systems))
    if (!Number.isFinite(o.systems[key]) || o.systems[key] < 0)
      throw new Error("Sistema operacional inválido.");
  if (
    !Array.isArray(s.log) ||
    !s.log.every(
      (e) => typeof e.text === "string" && Number.isInteger(e.turn),
    ) ||
    !Array.isArray(s.usedActions) ||
    !s.usedActions.every((a) =>
      ["rally", "triage", "recon", "fortify", "radio", "rest"].includes(a),
    )
  )
    throw new Error("Diário inválido.");
  if (
    !Array.isArray(o.decisions) ||
    !o.decisions.every((id) => d.events.some((e) => e.id === id)) ||
    !Array.isArray(o.flags) ||
    !o.flags.every((f) => typeof f === "string")
  )
    throw new Error("Decisões inválidas.");
  if (
    !Array.isArray(o.tasks) ||
    !o.tasks.every(
      (t) =>
        d.actions.some((a) => a.id === t.actionId) &&
        Number.isInteger(t.eta) &&
        t.eta > s.currentTurn,
    ) ||
    new Set(o.tasks.map((t) => t.actionId)).size !== o.tasks.length ||
    o.tasks.length > 2
  )
    throw new Error("Tarefas inválidas.");
  if (
    !Array.isArray(o.transmissions) ||
    !o.transmissions.every(
      (m) =>
        d.contacts.some((c) => c.id === m.contactId) &&
        ["advice", "supplies", "medical"].includes(m.topic) &&
        ["pending", "failed", "denied", "transit", "delivered"].includes(
          m.status,
        ) &&
        Number.isInteger(m.eta) &&
        typeof m.text === "string" &&
        (!m.cargo ||
          Object.entries(m.cargo).every(
            ([k, v]) => k in mission.resources && Number.isFinite(v) && v >= 0,
          )),
    )
  )
    throw new Error("Comunicações inválidas.");
  if (
    !Number.isFinite(o.trust) ||
    !Number.isFinite(o.objectiveTurns) ||
    !o.reserve ||
    Object.entries(o.reserve).some(
      ([k, v]) =>
        !Number.isFinite(v) ||
        v! < 0 ||
        v! > (d.reserve[k as keyof typeof d.reserve] ?? 0),
    )
  )
    throw new Error("Reservas inválidas.");
  o.definition = structuredClone(d);
  // Names and labels from saves are never authoritative content.
  o.units.forEach((u) => {
    const base = d.units.find((b) => b.id === u.id)!;
    u.name = base.name;
    u.role = base.role;
  });
  o.reports = Array.isArray(o.reports)
    ? o.reports.filter((r) => typeof r === "string")
    : [];
  return s;
}
export const encodeSave = (state: GameState) =>
  JSON.stringify(
    { version: 3, savedAt: new Date().toISOString(), state },
    null,
    2,
  );
