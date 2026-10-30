import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameAudio } from './game-audio';
import { AUDIO_ASSETS } from '../content/audio-assets';

class Node {
 gain={value:0,setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()};
 frequency={value:0,setTargetAtTime:vi.fn()};
 connect(){return this;} disconnect(){} start(){} stop(){}
}
class Context {
 sampleRate=100; currentTime=0; destination={};
 resume=vi.fn(async()=>{}); suspend=vi.fn(async()=>{});
 createBuffer(_channels:number,length:number){return {getChannelData:()=>new Float32Array(length)};}
 createBufferSource(){return new Node();} createBiquadFilter(){return new Node();}
 createGain(){return new Node();} createOscillator=vi.fn(()=>new Node());
}
class Recording {
 static instances:Recording[]=[]; static fail=false;
 volume=1; loop=false; paused=true; onended?:()=>void;
 constructor(public src:string){Recording.instances.push(this);}
 play=vi.fn(async()=>{if(Recording.fail)throw Error('missing recording');this.paused=false;});
 pause=vi.fn(()=>{this.paused=true;});
}
describe('optional recorded audio',()=>{
 let context:Context;
 beforeEach(()=>{
  context=new Context(); Recording.instances=[];Recording.fail=false;
  vi.stubGlobal('document',{hidden:false});vi.stubGlobal('Audio',Recording);
  vi.stubGlobal('AudioContext',function(){return context;});
 });
 afterEach(()=>{for(const asset of Object.values(AUDIO_ASSETS))asset.src=null;vi.unstubAllGlobals();});
 it('makes no requests for empty slots and clamps volume',async()=>{
  const audio=new GameAudio();await audio.setEnabled(true,'army');audio.signal();
  expect(Recording.instances).toHaveLength(0);expect(context.createOscillator).toHaveBeenCalledOnce();
  audio.setVolume(-1);expect(audio.getVolume()).toBe(0);audio.setVolume(2);expect(audio.getVolume()).toBe(1);
 });
 it('respects per-track gains, mute, visibility and branch switching',async()=>{
  AUDIO_ASSETS.army.src='assets/audio/army.ogg';AUDIO_ASSETS.navy.src='assets/audio/navy.ogg';
  const audio=new GameAudio();await audio.setEnabled(true,'army');
  const first=Recording.instances[0];audio.setVolume(.5);expect(first.volume).toBe(.125);
  audio.setBranch('navy');expect(first.paused).toBe(true);await Promise.resolve();
  const second=Recording.instances[1];expect(second.src).toContain('assets/audio/navy.ogg');
  vi.stubGlobal('document',{hidden:true});audio.visibility();expect(second.paused).toBe(true);
  vi.stubGlobal('document',{hidden:false});audio.visibility();await Promise.resolve();expect(second.paused).toBe(false);
  await audio.setEnabled(false,'navy');expect(second.paused).toBe(true);expect(context.suspend).toHaveBeenCalled();
 });
 it('falls back to a procedural signal when a supplied file fails',async()=>{
  AUDIO_ASSETS.radio.src='assets/audio/missing.ogg';Recording.fail=true;
  const audio=new GameAudio();await audio.setEnabled(true,'army');audio.signal();
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  expect(context.createOscillator).toHaveBeenCalledOnce();
 });
});
