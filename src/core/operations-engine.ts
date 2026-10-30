import type {
  GameState,
  Outcome,
  Resources,
  Stats,
  Transition,
} from "./contracts";
import type {
  Effects,
  OperationCommand,
  OperationDefinition,
  OperationState,
  Point,
  Terrain,
} from "./operations-types";
import { nextRandom } from "./rng";
import type { TurnEvent } from "./turn-events";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
export const createOperation = (d: OperationDefinition): OperationState => ({
  definition: structuredClone(d),
  units: structuredClone(d.units),
  enemies: structuredClone(d.enemies).map((e) => ({
    ...e,
    ammunition: e.strength * 4,
  })),
  systems: { ...d.systems },
  trust: 38,
  decisions: [],
  flags: [],
  transmissions: [],
  tasks: [],
  reserve: { ...d.reserve },
  reports: [],
  objectiveTurns: 0,
});
const log = (s: GameState, text: string) => {
  s.log.push({ turn: s.currentTurn, category: "command", text });
  s.log = s.log.slice(-160);
};
const random = (s: GameState) => {
  const r = nextRandom(s.rngState);
  s.rngState = r.state;
  return r.value;
};
const effect = (s: GameState, e: Effects) => {
  if (!s.operation) return;
  for (const [k, v] of Object.entries(e.stats ?? {}))
    s.stats[k as keyof Stats] = clamp(s.stats[k as keyof Stats] + v!);
  for (const [k, v] of Object.entries(e.resources ?? {}))
    s.resources[k as keyof Resources] = Math.max(
      0,
      s.resources[k as keyof Resources] + v!,
    );
  for (const [k, v] of Object.entries(e.systems ?? {})) {
    const max = ["hull", "propulsion", "flooding", "runway", "wire"].includes(k)
      ? 100
      : 999;
    s.operation.systems[k] = Math.max(
      0,
      Math.min(max, (s.operation.systems[k] ?? 0) + v),
    );
  }
  s.operation.trust = clamp(s.operation.trust + (e.trust ?? 0));
  if (e.flag && !s.operation.flags.includes(e.flag))
    s.operation.flags.push(e.flag);
};
export const terrainAt = (
  d: OperationDefinition,
  p: Point,
): Terrain | undefined => d.terrain[p.y * d.columns + p.x];
const passable = (d: OperationDefinition, p: Point, naval: boolean) =>
  p.x >= 0 &&
  p.y >= 0 &&
  p.x < d.columns &&
  p.y < d.rows &&
  (naval ? terrainAt(d, p) === "water" : terrainAt(d, p) !== "water");
export const pathTo = (
  d: OperationDefinition,
  from: Point,
  to: Point,
  naval = false,
): Point[] => {
  if (
    !Number.isInteger(to.x) ||
    !Number.isInteger(to.y) ||
    !passable(d, to, naval)
  )
    return [];
  const key = (p: Point) => p.y * d.columns + p.x;
  const queue: Point[] = [from];
  const parent = new Map<number, Point>();
  parent.set(key(from), from);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (key(p) === key(to)) {
      const path: Point[] = [];
      let cur = p;
      while (key(cur) !== key(from)) {
        path.unshift(cur);
        cur = parent.get(key(cur))!;
      }
      return path;
    }
    for (const [x, y] of [
      [p.x + 1, p.y],
      [p.x - 1, p.y],
      [p.x, p.y + 1],
      [p.x, p.y - 1],
    ]) {
      const next = { x, y };
      if (passable(d, next, naval) && !parent.has(key(next))) {
        parent.set(key(next), p);
        queue.push(next);
      }
    }
  }
  return [];
};
export const pendingEvent = (s: GameState) =>
  s.operation?.definition.events.find(
    (e) => e.turn <= s.currentTurn && !s.operation!.decisions.includes(e.id),
  );
export const observedEnemies = (s: GameState) =>
  s.operation?.enemies.filter(
    (e) =>
      e.strength > 0 &&
      s.operation!.units.some(
        (u) =>
          u.strength > 0 &&
          Math.hypot(u.x - e.x, u.y - e.y) <=
            4 + s.stats.intelligence / 16 + (u.order === "recon" ? 3 : 0),
      ),
  ) ?? [];
export const objectiveSecured = (s: GameState): boolean => {
  const o = s.operation;
  if (!o) return false;
  const near = (u: Point, radius: number) =>
    Math.hypot(
      u.x - o.definition.objective.x,
      u.y - o.definition.objective.y,
    ) <= radius;
  const friendly = o.units
    .filter((u) => near(u, 6))
    .reduce((n, u) => n + u.strength, 0);
  const hostile = o.enemies
    .filter((u) => near(u, 4))
    .reduce((n, u) => n + u.strength, 0);
  return friendly > 0 && friendly > hostile;
};
export const operationalCommand = (
  state: GameState,
  c: OperationCommand,
): Transition => {
  if (!state.operation)
    return {
      accepted: false,
      state,
      reason:
        "Reabra esta operação pelo menu para carregar o novo posto de comando.",
    };
  const s = structuredClone(state);
  const o = s.operation!;
  const d = o.definition;
  const reject = (reason: string): Transition => ({
    accepted: false,
    state,
    reason,
  });
  if (c.type === "DECIDE") {
    const e = pendingEvent(s);
    if (!e || e.id !== c.eventId)
      return reject("Esta comunicação já foi respondida ou ainda não chegou.");
    const option = e.choices.find((x) => x.id === c.choiceId);
    if (!option) return reject("Resposta inválida.");
    if (
      Object.entries(option.effects.resources ?? {}).some(
        ([k, v]) => s.resources[k as keyof Resources] + v! < 0,
      ) ||
      Object.entries(option.effects.systems ?? {}).some(
        ([k, v]) => (o.systems[k] ?? 0) + v < 0,
      )
    )
      return reject("Faltam recursos para cumprir esta resposta.");
    effect(s, option.effects);
    o.decisions.push(e.id);
    (o.decisionRecords ??= []).push({eventId:e.id,choiceId:option.id,turn:s.currentTurn});
    log(s, `${e.from}: ${option.label}. ${option.consequence}`);
  } else {
    if (pendingEvent(s))
      return reject(
        "Responda à comunicação prioritária antes de emitir outra ordem.",
      );
    if (c.type === "ORDER") {
      const u = o.units.find((x) => x.id === c.unitId);
      if (!u || u.strength <= 0) return reject("Formação indisponível.");
      if (u.orderedTurn === s.currentTurn)
        return reject("Esta formação já recebeu sua ordem neste turno.");
      if (s.commandAP < 1) return reject("Sem pontos de comando.");
      if (c.order === "move") {
        if (o.flags.includes("port"))
          return reject(
            "Retorno concluído. O navio permanece no porto durante a reorganização.",
          );
        if (
          !c.target ||
          !pathTo(d, u, c.target, s.campaignId === "navy").length
        )
          return reject(
            "Destino inacessível. Selecione uma rota válida no mapa.",
          );
        if (
          s.campaignId === "navy" &&
          (o.systems.propulsion < 20 || o.systems.fuel < 1)
        )
          return reject("A navegação requer propulsão ≥20% e combustível.");
        u.target = { ...c.target };
      } else u.target = undefined;
      u.order = c.order;
      u.orderedTurn = s.currentTurn;
      s.commandAP--;
      log(
        s,
        `${u.name}: ${c.order === "move" ? `mover para ${c.target!.x},${c.target!.y}` : c.order === "cover" ? "cobrir setor" : c.order === "recon" ? "observar e reconhecer" : "manter posição"}. Execução ao resolver o turno.`,
      );
    } else if (c.type === "CONTACT") {
      const contact = d.contacts.find((x) => x.id === c.contactId);
      if (!contact) return reject("Contato fora desta cadeia de comando.");
      if (s.commandAP < 1) return reject("Sem pontos de comando.");
      if (
        o.transmissions.some(
          (m) =>
            m.contactId === c.contactId &&
            m.topic === c.topic &&
            (m.status === "pending" ||
              m.status === "transit" ||
              m.created === s.currentTurn),
        )
      )
        return reject(
          "Já existe uma solicitação deste tipo para este contato.",
        );
      s.commandAP--;
      o.transmissions.push({
        id: `${s.seed}-msg-${o.transmissions.length}`,
        contactId: c.contactId,
        topic: c.topic,
        status: "pending",
        created: s.currentTurn,
        eta:
          s.currentTurn +
          (contact.channel === "local" ? 1 : 1 + Math.floor(random(s) * 2)),
        text: "Transmitida. Aguardando confirmação; autorização não garante entrega.",
      });
      log(
        s,
        `Chamando ${contact.name}: ${c.topic === "advice" ? "relatório e orientação" : c.topic === "medical" ? "prioridade médica" : "suprimentos"}.`,
      );
    } else if (c.type === "TASK") {
      const a = d.actions.find((x) => x.id === c.actionId);
      if (!a) return reject("Ordem indisponível nesta carreira.");
      if (s.currentTurn + a.duration > s.maxTurns + 1)
        return reject("Não há tempo nesta janela para concluir este trabalho.");
      if (o.tasks.some((t) => t.actionId === a.id))
        return reject("Esta tarefa já está em andamento.");
      if (o.tasks.length >= 2)
        return reject("As duas equipes de serviço estão ocupadas.");
      if (s.commandAP < a.ap) return reject("Pontos de comando insuficientes.");
      if (
        Object.entries(a.cost).some(
          ([k, v]) => s.resources[k as keyof Resources] < v!,
        ) ||
        Object.entries(a.systemsCost ?? {}).some(
          ([k, v]) => (o.systems[k] ?? 0) < v,
        ) ||
        Object.entries(a.requires ?? {}).some(
          ([k, v]) => (o.systems[k] ?? 0) < v,
        )
      )
        return reject(
          "Condições ou recursos insuficientes. Confira os requisitos da ordem.",
        );
      s.commandAP -= a.ap;
      effect(s, {
        resources: Object.fromEntries(
          Object.entries(a.cost).map(([k, v]) => [k, -v!]),
        ),
        systems: Object.fromEntries(
          Object.entries(a.systemsCost ?? {}).map(([k, v]) => [k, -v]),
        ),
      });
      o.tasks.push({
        id: `${s.seed}-${a.id}-${s.currentTurn}`,
        actionId: a.id,
        eta: s.currentTurn + a.duration,
      });
      log(
        s,
        `${a.label}: equipe comprometida, término previsto T${s.currentTurn + a.duration}.`,
      );
    }
  }
  return { accepted: true, state: s };
};

export const tickOperation = (state: GameState, events: TurnEvent[] = []): GameState => {
  const s = structuredClone(state);
  const o = s.operation!;
  const d = o.definition;
  const nextTurn = s.currentTurn + 1;
  o.reports = [];
  const report = (t: string, kind: TurnEvent["kind"] = "status") => {
    o.reports.push(t);
    log(s, t);
    events.push({ kind, text: t });
  };
  for (const task of o.tasks.filter((t) => t.eta <= nextTurn)) {
    const a = d.actions.find((x) => x.id === task.actionId)!;
    if (
      a.id === "sortie" &&
      random(s) < Math.max(0.08, 0.3 - s.stats.readiness / 400)
    ) {
      effect(s, { stats: { morale: -6 }, systems: { sorties: 1 } });
      report(
        "Reconhecimento concluído; uma aeronave não retornou. A célula foi retirada da disponibilidade.", "work",
      );
    } else {
      effect(s, a.effects);
      report(`${a.label}: concluído. ${a.description}`, "work");
    }
  }
  o.tasks = o.tasks.filter((t) => t.eta > nextTurn);
  for (const msg of o.transmissions.filter(
    (m) =>
      (m.status === "pending" || m.status === "transit") && m.eta <= nextTurn,
  )) {
    const contact = d.contacts.find((c) => c.id === msg.contactId)!;
    if (msg.status === "transit") {
      if (s.campaignId === "army" && !objectiveSecured(s)) {
        msg.eta++;
        msg.text =
          "Portador retido: acesso sem cobertura. A entrega aguarda uma rota protegida.";
        report(msg.text, "radio");
        continue;
      }
      effect(s, { resources: msg.cargo });
      msg.status = "delivered";
      msg.text = "Portador chegou. Material entregue e registrado no estoque.";
      report(`${contact.name}: ${msg.text}`, "radio");
      continue;
    }
    const reliable =
      contact.channel === "local" ||
      o.systems.wire === 100 ||
      random(s) < 0.35 + s.stats.radio / 160;
    if (!reliable) {
      msg.status = "failed";
      msg.text =
        "Transmissão perdida. Repare o rádio ou retransmita em outro turno.";
      report(`${contact.name}: ${msg.text}`, "radio");
      continue;
    }
    if (msg.topic === "advice") {
      msg.status = "delivered";
      msg.text =
        "Relatório recebido. Preserve a capacidade, mantenha observação e confirme contatos antes de agir.";
      effect(s, { stats: { intelligence: 8 }, trust: 3 });
    } else if (
      contact.channel === "local" ||
      random(s) > 0.45 + o.trust / 180
    ) {
      msg.status = "denied";
      msg.text =
        "Pedido recebido, mas não há autorização de transporte neste canal/janela. Nenhum material foi enviado.";
    } else {
      const cargo: Partial<Resources> = {};
      const keys: (keyof Resources)[] =
        msg.topic === "medical" ? ["medKits"] : ["ammo", "food", "materials"];
      for (const k of keys) {
        const amount = Math.min(
          o.reserve[k] ?? 0,
          k === "medKits" ? 2 : k === "ammo" ? 8 : 3,
        );
        if (amount) {
          cargo[k] = amount;
          o.reserve[k] = (o.reserve[k] ?? 0) - amount;
        }
      }
      if (!Object.keys(cargo).length) {
        msg.status = "denied";
        msg.text = "Reserva esgotada. O escalão não dispõe do material pedido.";
      } else {
        msg.status = "transit";
        msg.cargo = cargo;
        msg.eta = nextTurn + 2;
        msg.text = `Autorização parcial. Portador previsto T${msg.eta}; material ainda não recebido.`;
      }
    }
    report(`${contact.name}: ${msg.text}`, "radio");
  }
  for (const u of o.units) {
    if (u.strength <= 0) continue;
    if (u.order === "move" && u.target) {
      const naval = s.campaignId === "navy";
      if (naval && (o.systems.propulsion < 20 || o.systems.fuel < 1)) {
        report("Navegação interrompida: falta propulsão ou combustível.");
        continue;
      }
      const path = pathTo(d, u, u.target, naval);
      const speed = naval
        ? Math.max(2, Math.floor(o.systems.propulsion / 10))
        : 4;
      let steps = 0,
        budget = speed;
      const travelled: Point[] = [{ x: u.x, y: u.y }];
      for (const p of path) {
        const cost = terrainAt(d, p) === "forest" ? 2 : 1;
        if (budget < cost) break;
        u.x = p.x;
        u.y = p.y;
        travelled.push({ ...p });
        budget -= cost;
        steps++;
      }
      if (steps) {
        report(
          `${u.name}: avançou ${steps} quadrícula(s), posição ${u.x},${u.y}.`,
        );
        Object.assign(events[events.length - 1], { kind: "move", unitId: u.id, path: travelled });
      }
      if (naval && steps)
        o.systems.fuel = Math.max(
          0,
          o.systems.fuel - (o.flags.includes("economy") ? 1 : 2),
        );
      if (u.x === u.target.x && u.y === u.target.y) {
        u.order = "hold";
        u.target = undefined;
        report(`${u.name} alcançou a posição ordenada.`);
      }
    } else if (u.order === "recon")
      s.stats.intelligence = clamp(s.stats.intelligence + 3);
  }
  // Enemy formations use their last observed target only. They cannot inspect hidden friendly positions.
  for (const enemy of o.enemies.filter(
    (e) => e.strength > 0 && !o.flags.includes("port"),
  )) {
    const seen = o.units.filter(
      (u) => u.strength > 0 && Math.hypot(u.x - enemy.x, u.y - enemy.y) <= 7,
    );
    const target = seen.sort(
      (a, b) =>
        Math.hypot(a.x - enemy.x, a.y - enemy.y) -
        Math.hypot(b.x - enemy.x, b.y - enemy.y),
    )[0];
    if (target && s.currentTurn >= 3) {
      const distance = Math.hypot(target.x - enemy.x, target.y - enemy.y);
      if (distance <= 5) {
        const sourceVisible = observedEnemies(s).some(e => e.id === enemy.id);
        const incomingFire = (enemy.ammunition ?? 0) > 0;
        const cover =
          terrainAt(d, target) === "forest" ||
          terrainAt(d, target) === "village" ||
          target.order === "cover";
        const shot = random(s);
        const hit =
          (enemy.ammunition ?? 0) > 0 &&
          shot > Math.min(0.95, (cover ? 0.7 : 0.48) + s.stats.defense / 400);
        enemy.ammunition = Math.max(0, (enemy.ammunition ?? 0) - 1);
        const loss = hit ? Math.min(target.strength, 1) : 0;
        target.strength -= loss;
        if (loss) { const sites=o.damageSites ??= []; if (!sites.some(p=>p.x===target.x&&p.y===target.y)) sites.push({x:target.x,y:target.y,turn:s.currentTurn}); o.damageSites=sites.slice(-80); }
        s.personnel.capable -= loss;
        s.personnel.wounded += loss;
        if (hit && s.campaignId === "navy") {
          o.systems.hull = clamp(o.systems.hull - 3);
          o.systems.flooding = clamp(o.systems.flooding + 2);
        }
        const spend = Math.min(
          s.resources.ammo,
          Math.max(1, Math.ceil(target.strength / 8)),
        );
        s.resources.ammo -= spend;
        if (
          spend &&
          random(s) < 0.35 + s.stats.readiness / 250 - s.stats.fatigue / 1000
        ) {
          enemy.strength = Math.max(0, enemy.strength - 1);
        }
        if (loss)
          report(
            `${target.name}: contato, 1 ferido; cobertura ${cover ? "efetiva" : "insuficiente"}.`,
          );
        // Hidden attackers never expose their coordinates through the presentation channel.
        const contactText = `${target.name}: ${incomingFire ? "sob fogo" : spend ? "fogo de resposta" : "contato sem disparos"}${loss ? "; 1 ferido" : "; sem novos feridos"}.`;
        if (!loss) report(contactText);
        events.pop(); // Replace the generic report card with its spatial receipt.
        events.push({ kind: "contact", text: contactText, unitId: target.id, position: { x: target.x, y: target.y }, source: sourceVisible ? { x: enemy.x, y: enemy.y } : undefined, strength: target.strength, incomingFire, returningFire: spend > 0 });
      } else enemy.target = { x: target.x, y: target.y };
    }
    if (s.currentTurn >= 3) {
      const targetPoint = enemy.target ?? d.objective;
      const p = pathTo(d, enemy, targetPoint, s.campaignId === "navy");
      const step = p[Math.min(p.length, 2) - 1];
      if (step) {
        enemy.x = step.x;
        enemy.y = step.y;
      }
    }
  }
  if (s.campaignId === "navy" && !o.flags.includes("port")) {
    o.systems.flooding = clamp(o.systems.flooding + 3);
    o.systems.hull = clamp(
      o.systems.hull - Math.max(1, Math.floor(o.systems.flooding / 15)),
    );
    if (
      Math.hypot(o.units[0].x - d.objective.x, o.units[0].y - d.objective.y) <
        3 &&
      o.systems.hull > 0 &&
      s.currentTurn >= 7
    ) {
      if (!o.flags.includes("port"))
        report(
          "Zona de retorno alcançada. Recepção em porto autorizada; a tripulação passa à reorganização.",
        );
      o.flags.push(...(o.flags.includes("port") ? [] : ["port"]));
      o.systems.flooding = 0;
      o.units[0].order = "hold";
      o.units[0].target = undefined;
    }
  }
  const held = objectiveSecured(s);
  if (held) o.objectiveTurns++;
  const food = Math.min(s.resources.food, Math.ceil(s.personnel.capable / 12));
  s.resources.food -= food;
  s.stats.fatigue = clamp(s.stats.fatigue + 2 + o.tasks.length);
  s.stats.morale = clamp(s.stats.morale - (food ? 1 : 3));
  s.enemyPressure = clamp(
    15 +
      o.enemies
        .filter((e) => e.strength > 0)
        .reduce((n, e) => n + e.strength, 0) *
        0.7,
  );
  if (state.operation!.systems.hull !== o.systems.hull && s.campaignId === "navy")
    events.push({ kind: "status", text: `Casco ${o.systems.hull}% · alagamento ${o.systems.flooding}%.`, position: { x: o.units[0].x, y: o.units[0].y } });
  if (held) events.push({ kind: "status", text: `Objetivo protegido neste período · ${o.objectiveTurns} período(s) acumulados.`, position: { ...d.objective } });
  if (!o.reports.length)
    report(
      "Vigias completaram o período. Ordens mantidas, consumo e observação atualizados.",
    );
  return s;
};
export const operationOutcome = (s: GameState): Outcome | undefined => {
  const o = s.operation;
  if (!o) return;
  if (
    (s.stats.morale <= 4 || s.personnel.capable <= 4) &&
    !(s.campaignId === "navy" && o.systems.hull <= 0)
  )
    return {
      id: "collapse",
      title: "Comando sem capacidade operacional",
      description:
        "A coesão ou o efetivo disponível se esgotou. A missão foi interrompida e as perdas permanecem no registro.",
    };
  if (s.campaignId === "army") {
    const held = objectiveSecured(s);
    if (held && o.objectiveTurns >= 12)
      return {
        id: s.personnel.capable >= 50 ? "hold" : "costly-hold",
        title:
          s.personnel.capable >= 50
            ? "A estrada continua aberta"
            : "Cedar resiste a custo alto",
        description: `O acesso permaneceu coberto durante ${o.objectiveTurns} períodos. Efetivos e consumo determinam o custo desta defesa.`,
      };
    if (o.flags.includes("withdrawal-plan"))
      return {
        id: "withdrawal",
        title: "Retirada preparada",
        description:
          "A linha não foi sustentada por tempo suficiente; o plano alternativo foi registrado e a formação preservada será avaliada pelo batalhão.",
      };
    return {
      id: "survival",
      title: "Homens preservados, acesso comprometido",
      description:
        "A companhia atravessou a janela, mas não manteve cobertura suficiente sobre a estrada.",
    };
  }
  if (s.campaignId === "navy")
    return o.systems.hull <= 0
      ? {
          id: "collapse",
          title: o.flags.includes("rescue-plan")
            ? "Resgate parcial · navio perdido"
            : "Navio perdido",
          description:
            "A integridade do casco se esgotou. O retorno ao porto não aconteceu.",
        }
      : o.flags.includes("port")
        ? {
            id: "hold",
            title: "Navio e homens de volta",
            description:
              "A rota de retorno foi completada. A conduta permanece sujeita à avaliação do grupo-tarefa.",
          }
        : {
            id: "survival",
            title: "Ainda no mar",
            description:
              "A tripulação preservou o navio, mas não alcançou a zona de retorno dentro da janela.",
          };
  if (s.campaignId === "air")
    return o.systems.sorties > 0 && o.systems.aircraft > 0
      ? {
          id: "hold",
          title: "A ala volta a operar",
          description:
            "A pista recuperada permitiu uma saída. Perdas e consumo foram registrados.",
        }
      : o.flags.includes("preserve-air")
        ? {
            id: "withdrawal",
            title: "Base salva, missão adiada",
            description:
              "A preservação deliberada da ala será apresentada ao grupo aéreo.",
          }
        : {
            id: "survival",
            title: "Ala em recuperação",
            description:
              "A janela encerrou sem missão aérea concluída. A base exige continuidade de recuperação.",
          };
  return;
};
