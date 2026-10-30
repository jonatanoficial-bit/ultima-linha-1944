import type { GameState } from '../core/contracts';
import { applyVisualEvent, eventDuration, type TurnEvent } from '../core/turn-events';

/** Plays receipts after the turn has been committed. Never invokes the reducer. */
export class TurnDirector {
  private frame = 0;
  private last = 0;
  private elapsed = 0;
  private index = 0;
  private stopped = false;
  paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  speed = 1;
  private reducedMotion = this.paused;
  private visual: GameState;
  constructor(before: GameState, readonly events: TurnEvent[],
    private draw: (state: GameState, event: TurnEvent, progress: number) => void,
    private announce: (event: TurnEvent, index: number) => void,
    private finish: () => void) {
    this.visual = structuredClone(before);
    document.addEventListener('visibilitychange', this.visibility);
  }
  start() { if (!this.events.length) { this.skip(); return; } this.enter(); }
  private visibility = () => { if (document.hidden) { this.paused = true; cancelAnimationFrame(this.frame); this.last = 0; this.announce(this.events[this.index], this.index); } };
  private enter() {
    if (this.stopped) return;
    this.elapsed = 0; this.last = 0;
    const event = this.events[this.index];
    this.announce(event, this.index);
    this.draw(this.visual, event, this.reducedMotion ? 1 : 0);
    if (!this.paused) this.frame = requestAnimationFrame(this.tick);
  }
  private tick = (now: number) => {
    if (this.stopped || this.paused || document.hidden) return;
    if (this.last) this.elapsed += Math.min(100, now - this.last) * this.speed;
    this.last = now;
    const event = this.events[this.index];
    const progress = Math.min(1, this.elapsed / eventDuration(event));
    this.draw(this.visual, event, this.reducedMotion ? 1 : progress);
    if (progress >= 1) this.next();
    else this.frame = requestAnimationFrame(this.tick);
  };
  togglePause() {
    this.paused = !this.paused; this.last = 0;
    cancelAnimationFrame(this.frame);
    this.announce(this.events[this.index], this.index);
    if (!this.paused && !document.hidden) this.frame = requestAnimationFrame(this.tick);
  }
  toggleSpeed() { this.speed = this.speed === 1 ? 2 : 1; this.announce(this.events[this.index], this.index); }
  next() {
    if (this.stopped) return;
    cancelAnimationFrame(this.frame);
    applyVisualEvent(this.visual, this.events[this.index]);
    if (++this.index >= this.events.length) this.skip(); else this.enter();
  }
  skip() {
    if (this.stopped) return;
    this.stopped = true;
    cancelAnimationFrame(this.frame);
    document.removeEventListener('visibilitychange', this.visibility);
    this.finish();
  }
}
