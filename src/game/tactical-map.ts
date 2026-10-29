import type { GameState } from "../core/contracts";
import type { Point, Terrain } from "../core/operations-types";
import { observedEnemies, pathTo, terrainAt } from "../core/operations-engine";

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
    const enemies = observedEnemies(s);
    for (const u of [...enemies, ...o.units.filter((u) => u.strength > 0)]) {
      const hostile = enemies.includes(u),
        active = u.id === this.selected,
        x = (u.x + 0.5) * t,
        y = (u.y + 0.5) * t,
        w = Math.max(18, t * 1.6),
        h = w * 0.65;
      c.shadowColor = "#081511aa";
      c.shadowBlur = 6;
      c.shadowOffsetY = 2;
      c.fillStyle = hostile ? "#784c3c" : active ? "#e5c67b" : "#d6d9b6";
      c.fillRect(x - w / 2, y - h / 2, w, h);
      c.shadowBlur = 0;
      c.shadowOffsetY = 0;
      c.strokeStyle = hostile ? "#edac8e" : "#2d4539";
      c.lineWidth = active ? 2 : 1;
      c.strokeRect(x - w / 2, y - h / 2, w, h);
      c.beginPath();
      if (naval) {
        c.moveTo(x - w * 0.35, y);
        c.lineTo(x + w * 0.35, y);
        c.lineTo(x + w * 0.2, y + h * 0.25);
        c.lineTo(x - w * 0.22, y + h * 0.25);
        c.closePath();
      } else {
        c.moveTo(x - w * 0.4, y - h * 0.38);
        c.lineTo(x + w * 0.4, y + h * 0.38);
        c.moveTo(x + w * 0.4, y - h * 0.38);
        c.lineTo(x - w * 0.4, y + h * 0.38);
      }
      c.stroke();
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
