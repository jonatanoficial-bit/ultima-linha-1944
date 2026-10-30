import { AUDIO_ASSETS } from "../content/audio-assets";
import type { TurnEvent } from "../core/turn-events";
/** Quiet procedural ambience and event cues. No recorded dialogue or autoplay. */
export class GameAudio {
  private context?: AudioContext;
  private bed?: AudioBufferSourceNode;
  private filter?: BiquadFilterNode;
  private volume?: GainNode;
  private active = false;
  private level = .7;
  private ambient?: HTMLAudioElement;
  private clips = new Set<HTMLAudioElement>();
  private gains = new WeakMap<HTMLAudioElement,number>();
  getVolume() { return this.level; }
  setVolume(level:number) { this.level=Math.max(0,Math.min(1,level)); if(this.volume)this.volume.gain.value=this.ambient && !this.ambient.paused ? 0 : .075*this.level; if(this.ambient)this.ambient.volume=(this.gains.get(this.ambient) ?? .25)*this.level; for(const clip of this.clips)clip.volume=(this.gains.get(clip) ?? .3)*this.level; }
  private recording(key:string, fallback?:()=>void) {
    const asset=AUDIO_ASSETS[key]; if(!asset?.src||!this.active||document.hidden)return false;
    const clip=new Audio(import.meta.env.BASE_URL+asset.src);clip.volume=asset.gain*this.level;clip.loop=asset.loop;this.gains.set(clip,asset.gain);
    if(asset.loop){this.ambient?.pause();this.ambient=clip;}else{this.clips.add(clip);clip.onended=()=>this.clips.delete(clip);}
    void clip.play().then(()=>{if(!this.active||document.hidden||(asset.loop&&this.ambient!==clip)){clip.pause();return;}if(asset.loop&&this.volume)this.volume.gain.value=0;}).catch(()=>{this.clips.delete(clip);if(asset.loop&&this.ambient===clip){this.ambient=undefined;if(this.volume)this.volume.gain.value=.075*this.level;}if(this.active&&!document.hidden)fallback?.();});return true;
  }
  async setEnabled(enabled: boolean, branch: string) {
    this.active = enabled;
    if (!enabled) { this.ambient?.pause(); for(const clip of this.clips)clip.pause(); this.clips.clear(); await this.context?.suspend(); return; }
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
      this.volume.gain.value = .075*this.level;
      this.bed.connect(this.filter).connect(this.volume).connect(context.destination);
      this.bed.start();
    }
    this.setBranch(branch);
    if (!document.hidden) await this.context.resume();
  }
  setBranch(branch: string) {
    this.ambient?.pause(); this.ambient=undefined; if(this.volume)this.volume.gain.value=.075*this.level; this.recording(branch);
    if (this.context && this.filter) this.filter.frequency.setTargetAtTime(branch === "navy" ? 450 : branch === "air" ? 190 : 750, this.context.currentTime, .7);
  }
  visibility() {
    if(document.hidden || !this.active) {this.ambient?.pause();for(const clip of this.clips)clip.pause();this.clips.clear();} else if(this.ambient)void this.ambient.play().catch(()=>{});
    if (!this.context) return;
    if (document.hidden || !this.active) void this.context.suspend();
    else void this.context.resume().catch(() => {});
  }
  signal(procedural = false) {
    if (!this.active || !this.context || document.hidden) return;
    if(!procedural && this.recording('radio',()=>this.signal(true)))return;
    const context = this.context;
    const osc = context.createOscillator(), gain = context.createGain();
    osc.frequency.value = 630;
    gain.gain.setValueAtTime(.025*this.level, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .17);
    osc.connect(gain).connect(context.destination);
    osc.start(); osc.stop(context.currentTime + .18);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  event(event: TurnEvent, procedural = false) {
    if (!this.active || !this.context || document.hidden) return;
    if (event.kind === 'radio') { this.signal(); return; }
    if (event.kind === 'status') return;
    if (event.kind === 'contact' && !event.incomingFire && !event.returningFire) return;
    const context = this.context;
    if(!procedural && this.recording(event.kind,()=>this.event(event,true)))return;
    const duration = event.kind === 'move' ? .7 : .35;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i=0;i<samples.length;i++) samples[i] = (Math.random()*2-1) * Math.exp(-i / (samples.length*.25));
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = event.kind === 'contact' ? 260 : event.kind === 'work' ? 1100 : 650;
    gain.gain.value = (event.kind === 'contact' ? .12 : .045)*this.level;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(); source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
}
