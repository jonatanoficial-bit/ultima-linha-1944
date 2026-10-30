import { drawFormation, drawAircraft } from "./world-figures";
import type { GameState } from "../core/contracts";
import type { Point, Terrain } from "../core/operations-types";
import { observedEnemies, pathTo, terrainAt } from "../core/operations-engine";
import { pointOnRoute, type TurnEvent } from "../core/turn-events";

/** One persistent canvas: camera and terrain survive HUD updates. */
export class CommandMap {
  readonly canvas = document.createElement("canvas");
  private ctx = this.canvas.getContext("2d")!;
  private observer: ResizeObserver;
  private state?: GameState;
  private selected = "";
  private target?: Point;
  private zoom = 1;
  private pan = { x: 0, y: 0 };
  private width = 800;
  private height = 600;
  private down?: { x: number; y: number; px: number; py: number };
  private moved = false;
  private event?: TurnEvent;
  private progress = 0;
  private reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private savedCamera?: { zoom: number; pan: Point };
  beginPlayback() {
    this.savedCamera = { zoom: this.zoom, pan: { ...this.pan } };
    this.zoom = Math.max(1.8, this.zoom);
  }
  endPlayback() {
    if (this.savedCamera) { this.zoom = this.savedCamera.zoom; this.pan = this.savedCamera.pan; }
    this.savedCamera = undefined;
    this.event = undefined;
  }
  frame(state: GameState, event?: TurnEvent, progress = 0) {
    this.state = state;
    if (event && this.event !== event && this.savedCamera && state.operation) {
      const point = event.position ?? pointOnRoute(event.path ?? [], .5);
      if (point) {
        const d = state.operation.definition, t = this.geometry().t;
        this.pan = { x: (d.columns / 2 - point.x - .5) * t, y: (d.rows / 2 - point.y - .5) * t };
        this.boundPan();
      }
    }
    this.event = event;
    this.progress = progress;
    this.draw();
  }
  constructor(private onSelect: (p: Point, unitId?: string) => void) {
    this.canvas.setAttribute(
      "aria-label",
      "Mapa tático. Arraste para deslocar; use os botões para ampliar. Seleção por coordenadas disponível no painel de ordens.",
    );
    this.canvas.setAttribute("role", "img");
    this.canvas.tabIndex = 0;
    this.canvas.addEventListener("keydown", e => {
      const d = this.state?.operation?.definition;
      const unit = this.state?.operation?.units.find(u => u.id === this.selected);
      const delta: Record<string, Point> = { ArrowLeft: {x:-1,y:0}, ArrowRight: {x:1,y:0}, ArrowUp: {x:0,y:-1}, ArrowDown: {x:0,y:1} };
      if (!d || !unit || !delta[e.key]) return;
      e.preventDefault();
      const from = this.target ?? unit, direction = delta[e.key];
      this.onSelect({ x: Math.max(0,Math.min(d.columns-1,from.x+direction.x)), y: Math.max(0,Math.min(d.rows-1,from.y+direction.y)) });
      this.canvas.focus({ preventScroll: true });
    });
    this.observer = new ResizeObserver(() => this.resize());
    this.canvas.addEventListener("pointerdown", (e) => {
      this.down = {
        x: e.clientX,
        y: e.clientY,
        px: this.pan.x,
        py: this.pan.y,
      };
      this.moved = false;
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.down) return;
      const dx = e.clientX - this.down.x,
        dy = e.clientY - this.down.y;
      if (Math.hypot(dx, dy) > 5) this.moved = true;
      if (this.moved) {
        this.pan = { x: this.down.px + dx, y: this.down.py + dy };
        this.boundPan();
        this.draw();
      }
    });
    this.canvas.addEventListener("pointerup", (e) => {
      if (!this.moved && this.state?.operation) {
        const r = this.canvas.getBoundingClientRect(),
          g = this.geometry(),
          d = this.state.operation.definition;
        const p = {
          x: Math.floor((e.clientX - r.left - g.x) / g.t),
          y: Math.floor((e.clientY - r.top - g.y) / g.t),
        };
        if (p.x >= 0 && p.y >= 0 && p.x < d.columns && p.y < d.rows) {
          const unit = this.state.operation.units.find(
            (u) =>
              u.strength > 0 &&
              Math.abs(u.x - p.x) <= 1 &&
              Math.abs(u.y - p.y) <= 1,
          );
          this.onSelect(p, unit?.id);
        }
      }
      this.down = undefined;
    });
    this.canvas.addEventListener("pointercancel", () => {
      this.down = undefined;
    });
    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.adjustZoom(e.deltaY < 0 ? 0.2 : -0.2);
      },
      { passive: false },
    );
  }
  mount(
    container: HTMLElement,
    state: GameState,
    selected: string,
    target?: Point,
  ) {
    if (this.state?.missionId !== state.missionId) {
      this.zoom = 1;
      this.pan = { x: 0, y: 0 };
    }
    this.state = state;
    this.event = undefined;
    this.selected = selected;
    this.target = target;
    this.observer.disconnect();
    container.append(this.canvas);
    this.observer.observe(container);
    this.resize();
  }
  adjustZoom(delta: number) {
    this.zoom = Math.max(1, Math.min(3.5, this.zoom + delta));
    this.boundPan();
    this.draw();
  }
  reset() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.draw();
  }
  private boundPan() {
    this.pan.x = Math.max(
      (-this.width * (this.zoom - 1)) / 2,
      Math.min((this.width * (this.zoom - 1)) / 2, this.pan.x),
    );
    this.pan.y = Math.max(
      (-this.height * (this.zoom - 1)) / 2,
      Math.min((this.height * (this.zoom - 1)) / 2, this.pan.y),
    );
  }
  private resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.width = parent.clientWidth;
    this.height = parent.clientHeight;
    if (!this.width || !this.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.width * ratio;
    this.canvas.height = this.height * ratio;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.draw();
  }
  private geometry() {
    const d = this.state!.operation!.definition;
    const t =
      Math.max(
        1,
        Math.min((this.width - 38) / d.columns, (this.height - 45) / d.rows),
      ) * this.zoom;
    return {
      t,
      x: (this.width - d.columns * t) / 2 + this.pan.x,
      y: (this.height - d.rows * t) / 2 + this.pan.y,
    };
  }
  private draw() {
    const s = this.state,
      c = this.ctx;
    if (!s?.operation) return;
    const o = s.operation,
      d = o.definition,
      g = this.geometry(),
      t = g.t,
      naval = s.campaignId === "navy",
      air = s.campaignId === "air";
    c.clearRect(0, 0, this.width, this.height);
    c.fillStyle = naval ? "#162b32" : "#313731";
    c.fillRect(0, 0, this.width, this.height);
    c.save();
    c.translate(g.x, g.y);
    const colors: Record<Terrain, string> = {
      field: air ? "#8d9273" : "#c3c2a8",
      forest: air ? "#566a4d" : "#84927c",
      road: "#b4a58a",
      village: "#b2ad97",
      water: naval ? "#284c55" : "#819ba0",
      runway: "#555e58",
      rubble: "#8b8571",
    };
    c.fillStyle = colors.field;
    c.fillRect(0, 0, d.columns * t, d.rows * t);
    for (let y = 0; y < d.rows; y++)
      for (let x = 0; x < d.columns; x++) {
        const terrain = terrainAt(d, { x, y })!,
          n = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        c.fillStyle = colors[terrain];
        c.fillRect(x * t, y * t, t + 0.5, t + 0.5);
        // Coordinate-based grain: terrain stays stable across turns and animation frames.
        c.fillStyle = n % 2 ? "#ffffff09" : "#00000008";
        c.fillRect(x * t, y * t, t, t);
        if (terrain === "road") {
          c.strokeStyle = "#665c4938"; c.lineWidth = Math.max(1, t * .09);
          for (const offset of [.27, .7]) {
            c.beginPath(); c.moveTo(x*t,(y+offset)*t); c.lineTo((x+1)*t,(y+offset)*t); c.stroke();
          }
        }
        // Static relief is derived from coordinates, never the turn.
        if (terrain === "forest") {
          for (let k = 0; k < 2; k++) {
            const px = (x + 0.22 + (n % 43) / 100 + k * 0.25) * t,
              py = (y + 0.3 + k * 0.35) * t;
            c.fillStyle = k ? "#526650" : "#687b60";
            c.beginPath();
            c.moveTo(px, py - t * 0.28);
            c.lineTo(px - t * 0.2, py + t * 0.18);
            c.lineTo(px + t * 0.2, py + t * 0.18);
            c.fill();
            if (!air) { c.fillStyle = "#e6e9d5a0"; c.beginPath(); c.moveTo(px,py-t*.28); c.lineTo(px-t*.12,py); c.lineTo(px+t*.1,py); c.fill(); }
          }
        }
        if (terrain === "village" || terrain === "rubble") {
          c.fillStyle = "#696c60";
          c.fillRect((x + 0.13) * t, (y + 0.17) * t, t * 0.66, t * 0.58);
          c.fillStyle = terrain === "rubble" ? "#99927f" : "#d5d0b6";
          c.fillRect((x + 0.1) * t, (y + 0.1) * t, t * 0.58, t * 0.48);
          c.strokeStyle = "#777464";
          c.lineWidth = 0.8;
          c.beginPath();
          c.moveTo((x + 0.1) * t, (y + 0.34) * t);
          c.lineTo((x + 0.68) * t, (y + 0.34) * t);
          c.stroke();
          if (terrain === "rubble") {
            c.fillStyle = "#4d4940";
            c.fillRect((x+.24)*t,(y+.25)*t,t*.2,t*.16);
            c.fillRect((x+.67)*t,(y+.73)*t,t*.17,t*.12);
          } else {
            c.fillStyle = "#635a4d";
            c.beginPath(); c.moveTo((x+.07)*t,(y+.32)*t); c.lineTo((x+.39)*t,(y+.06)*t); c.lineTo((x+.73)*t,(y+.32)*t); c.fill();
          }
        }
        if (terrain === "field" && n % 3 === 0) {
          c.strokeStyle = air ? "#7b8062" : "#b0b29a";
          c.lineWidth = 0.6;
          c.beginPath();
          c.moveTo((x + 0.1) * t, (y + 0.3) * t);
          c.lineTo((x + 0.8) * t, (y + 0.6) * t);
          c.stroke();
        }
        if (terrain === "water" && naval && n % 4 === 0) {
          c.strokeStyle = "#496970";
          c.lineWidth = 0.8;
          c.beginPath();
          c.moveTo((x + 0.1) * t, (y + 0.5) * t);
          c.quadraticCurveTo(
            (x + 0.5) * t,
            (y + 0.3) * t,
            (x + 0.9) * t,
            (y + 0.5) * t,
          );
          c.stroke();
        }
        if (terrain === "runway" && y % 2 === 0 && x % 4 < 2) {
          c.fillStyle = "#c0bc9a";
          c.fillRect(x * t, (y + 0.46) * t, t, 0.09 * t);
        }
      }
    c.strokeStyle = naval ? "#69838655" : "#4d59402a";
    c.lineWidth = 0.6;
    for (let x = 0; x <= d.columns; x += 5) {
      c.beginPath();
      c.moveTo(x * t, 0);
      c.lineTo(x * t, d.rows * t);
      c.stroke();
    }
    for (let y = 0; y <= d.rows; y += 5) {
      c.beginPath();
      c.moveTo(0, y * t);
      c.lineTo(d.columns * t, y * t);
      c.stroke();
    }
    c.font = "10px monospace";
    c.fillStyle = "#e4ddbd";
    c.textAlign = "center";
    for (let x = 0; x < d.columns; x += 5)
      c.fillText(String(x).padStart(2, "0"), (x + 0.5) * t, -5);
    for (let y = 0; y < d.rows; y += 5)
      c.fillText(String(y).padStart(2, "0"), -14, (y + 0.7) * t);
    // Unknown terrain is shaded; hidden enemy counters never reach the renderer.
    for (let y = 0; y < d.rows; y++)
      for (let x = 0; x < d.columns; x++)
        if (
          !o.units.some(
            (u) =>
              u.strength > 0 &&
              Math.hypot(u.x - x, u.y - y) <
                4 + s.stats.intelligence / 16 + (u.order === "recon" ? 3 : 0),
          )
        ) {
          c.fillStyle = naval ? "#071b2550" : "#25332e38";
          c.fillRect(x * t, y * t, t + 0.5, t + 0.5);
        }
    c.font = `${Math.max(8, Math.min(12, t * 0.8))}px Georgia`;
    c.textAlign = "center";
    for (const place of d.places) {
      c.fillStyle = naval ? "#bdd0c4" : "#303c31";
      c.strokeStyle = naval ? "#15313a" : "#d8d4bc";
      c.lineWidth = 3;
      c.strokeText(place.name, (place.x + 0.5) * t, (place.y + 0.1) * t);
      c.fillText(place.name, (place.x + 0.5) * t, (place.y + 0.1) * t);
    }
    c.strokeStyle = "#f2cd73";
    c.lineWidth = 2;
    c.setLineDash([5, 4]);
    c.strokeRect(
      (d.objective.x - 1) * t,
      (d.objective.y - 1) * t,
      3 * t,
      3 * t,
    );
    c.setLineDash([]);
    const selected = o.units.find((u) => u.id === this.selected),
      routeTarget = this.target ?? selected?.target;
    if (selected && routeTarget) {
      const path = pathTo(d, selected, routeTarget, naval);
      if (path.length) {
        c.strokeStyle = "#edcf80";
        c.lineWidth = 2;
        c.setLineDash([4, 4]);
        c.beginPath();
        c.moveTo((selected.x + 0.5) * t, (selected.y + 0.5) * t);
        path.forEach((p) => c.lineTo((p.x + 0.5) * t, (p.y + 0.5) * t));
        c.stroke();
        c.setLineDash([]);
        c.strokeRect(routeTarget.x * t, routeTarget.y * t, t, t);
      } else if (this.target) {
        c.strokeStyle = "#c7644f";
        c.lineWidth = 2;
        c.strokeRect(routeTarget.x * t, routeTarget.y * t, t, t);
        c.beginPath();
        c.moveTo(routeTarget.x*t,routeTarget.y*t);
        c.lineTo((routeTarget.x+1)*t,(routeTarget.y+1)*t);
        c.moveTo((routeTarget.x+1)*t,routeTarget.y*t);
        c.lineTo(routeTarget.x*t,(routeTarget.y+1)*t);
        c.stroke();
      }
    }
    for(const site of o.damageSites ?? []) {
      const px=(site.x+.5)*t,py=(site.y+.5)*t;
      c.fillStyle=naval?'#a4bcb635':'#423e3290';c.beginPath();c.ellipse(px,py,t*.65,t*.35,-.3,0,Math.PI*2);c.fill();
      c.strokeStyle='#393a32';c.lineWidth=1;for(let i=0;i<4;i++){c.beginPath();c.moveTo(px+(i-2)*t*.2,py);c.lineTo(px+(i-2)*t*.3,py+t*.4);c.stroke();}
    }
    if(air){for(let i=0;i<Math.min(6,o.systems.aircraft ?? 0);i++)drawAircraft(c,(15+i*3)*t,8*t,t*.85);}
    const hour=new Date(new Date(d.start).getTime()+(s.currentTurn-1)*d.minutes*60000).getUTCHours();
    if(hour>=19||hour<6){c.fillStyle='rgba(12,26,48,.17)';c.fillRect(0,0,d.columns*t,d.rows*t);}
    const enemies = observedEnemies(s);
    for (const u of [...enemies, ...o.units.filter((u) => u.strength > 0)]) {
      const moving = this.event?.kind === "move" && this.event.unitId === u.id ? pointOnRoute(this.event.path ?? [], this.progress) : undefined;
      const hostile = enemies.includes(u),
        active = u.id === this.selected,
        x = ((moving?.x ?? u.x) + 0.5) * t,
        y = ((moving?.y ?? u.y) + 0.5) * t,
        w = Math.max(18, t * 1.6),
        h = w * 0.65;
      drawFormation(c,x,y,w*.7,naval,hostile,active,Boolean(moving),this.reducedMotion?0:this.progress,u.role);
      c.font = "bold 10px monospace";
      c.textAlign = "center";
      const label = hostile
        ? "CONTATO"
        : `${u.name.toUpperCase()} · ${u.strength}`;
      const tw = c.measureText(label).width;
      c.fillStyle = "#152b25e8";
      c.fillRect(x - tw / 2 - 4, y + h / 2 + 3, tw + 8, 15);
      c.fillStyle = hostile ? "#eab5a1" : "#f2ebce";
      c.fillText(label, x, y + h / 2 + 14);
      if (u.order === "move" && u.target && !hostile) {
        c.fillStyle = "#f0d28b";
        c.fillText("→", x + w / 2 + 9, y + 4);
      }
    }
    const event = this.event;
    if (event) {
      const p = event.position ?? (event.path?.length ? pointOnRoute(event.path, this.progress) : undefined);
      if (p) {
        const x = (p.x+.5)*t, y = (p.y+.5)*t;
        c.strokeStyle = event.kind === "contact" ? "#edaa76" : "#ffe3a2";
        c.lineWidth = 2;
        c.beginPath(); c.arc(x,y,t*(1.2+(this.reducedMotion ? .3 : this.progress)*1.5),0,Math.PI*2); c.stroke();
        if (event.kind === "contact" && (event.incomingFire || event.returningFire)) {
          if (event.source) {
            c.setLineDash([3,6]); c.globalAlpha = .65;
            c.beginPath(); c.moveTo((event.source.x+.5)*t,(event.source.y+.5)*t); c.lineTo(x,y); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
          }
          // Slow smoke, no flashing; an unknown origin has no tracer.
          c.fillStyle = "#3f3b34aa";
          for (let i=0;i<3;i++) { c.beginPath(); c.arc(x+(i-1)*t*.4,y-t*(.5+this.progress),t*(.3+i*.12),0,Math.PI*2); c.fill(); }
        }
      }
    }
    // Visible engineering work is tied to active tasks / completed systems.
    for (const task of o.tasks) {
      const site = task.actionId === "aircraft" ? "HANGAR" : ["runway", "sortie"].includes(task.actionId) ? "PISTA" : task.actionId === "shelter" ? "POSTO MÉDICO" : "RÁDIO";
      const place = d.places.find(p => p.name.includes(site));
      const p = naval ? o.units[0] : place ?? o.units[0];
      c.fillStyle = "#172722e8"; c.fillRect((p.x-1)*t,(p.y+1)*t,82,17);
      c.fillStyle = "#e8c883"; c.font = "9px monospace"; c.textAlign = "left";
      c.fillText(`SERVIÇO · T${task.eta}`,(p.x-1)*t+4,(p.y+1)*t+12);
    }
    c.restore();
    c.fillStyle = "#e8dfbe";
    c.font = "bold 12px monospace";
    c.textAlign = "right";
    c.fillText("N ↑", this.width - 18, 25);
    c.textAlign = "left";
    c.font = "10px monospace";
    c.fillStyle = "#d9d7bc";
    c.fillText(
      `QUADRÍCULA TÁTICA · ${d.columns} × ${d.rows} · ${Math.round(this.zoom * 100)}%`,
      16,
      this.height - 12,
    );
  }
}
