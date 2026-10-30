import type { TurnEvent } from "../core/turn-events";
/** Quiet procedural ambience and event cues. No recorded dialogue or autoplay. */
export class GameAudio {
  private context?: AudioContext;
  private bed?: AudioBufferSourceNode;
  private filter?: BiquadFilterNode;
  private volume?: GainNode;
  private active = false;
  async setEnabled(enabled: boolean, branch: string) {
    this.active = enabled;
    if (!enabled) { await this.context?.suspend(); return; }
    if (!this.context) {
      const context = this.context = new AudioContext();
      const buffer = context.createBuffer(1, context.sampleRate * 6, context.sampleRate);
      const data = buffer.getChannelData(0);
      let previous = 0;
      for (let i = 0; i < data.length; i++) { previous = (previous + (Math.random() * 2 - 1) * .02) / 1.02; data[i] = previous * 3.5; }
      this.bed = context.createBufferSource();
      this.bed.buffer = buffer;
      this.bed.loop = true;
      this.filter = context.createBiquadFilter();
      this.filter.type = "lowpass";
      this.volume = context.createGain();
      this.volume.gain.value = .075;
      this.bed.connect(this.filter).connect(this.volume).connect(context.destination);
      this.bed.start();
    }
    this.setBranch(branch);
    if (!document.hidden) await this.context.resume();
  }
  setBranch(branch: string) {
    if (this.context && this.filter) this.filter.frequency.setTargetAtTime(branch === "navy" ? 450 : branch === "air" ? 190 : 750, this.context.currentTime, .7);
  }
  visibility() {
    if (!this.context) return;
    if (document.hidden || !this.active) void this.context.suspend();
    else void this.context.resume().catch(() => {});
  }
  signal() {
    if (!this.active || !this.context || document.hidden) return;
    const context = this.context;
    const osc = context.createOscillator(), gain = context.createGain();
    osc.frequency.value = 630;
    gain.gain.setValueAtTime(.025, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .17);
    osc.connect(gain).connect(context.destination);
    osc.start(); osc.stop(context.currentTime + .18);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  event(event: TurnEvent) {
    if (!this.active || !this.context || document.hidden) return;
    if (event.kind === 'radio') { this.signal(); return; }
    if (event.kind === 'status') return;
    if (event.kind === 'contact' && !event.incomingFire && !event.returningFire) return;
    const context = this.context;
    const duration = event.kind === 'move' ? .7 : .35;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i=0;i<samples.length;i++) samples[i] = (Math.random()*2-1) * Math.exp(-i / (samples.length*.25));
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = event.kind === 'contact' ? 260 : event.kind === 'work' ? 1100 : 650;
    gain.gain.value = event.kind === 'contact' ? .12 : .045;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(); source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
}
