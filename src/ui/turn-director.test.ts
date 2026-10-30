import { afterEach, describe, expect, it, vi } from 'vitest';
import { TurnDirector } from './turn-director';
import { createInitialState } from '../core/engine';
import { MISSIONS } from '../content/missions';
import type { TurnEvent } from '../core/turn-events';

function setup(reduced = false) {
  const frames = new Map<number, FrameRequestCallback>(); let id = 0;
  const listeners = new Map<string, () => void>();
  const doc = { hidden: false, addEventListener: (name: string, cb: () => void) => listeners.set(name,cb), removeEventListener: (name: string) => listeners.delete(name) };
  vi.stubGlobal('document',doc);
  vi.stubGlobal('matchMedia',()=>({matches:reduced}));
  vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{ frames.set(++id,cb); return id; });
  vi.stubGlobal('cancelAnimationFrame',(n:number)=>frames.delete(n));
  const state=createInitialState(MISSIONS[0],'director');
  const source=JSON.stringify(state);
  const events:TurnEvent[]=[{kind:'move',text:'HQ avança',unitId:'hq',path:[{x:1,y:1},{x:2,y:1}]},{kind:'radio',text:'Mensagem recebida'}];
  const draw=vi.fn(),announce=vi.fn(),finish=vi.fn();
  const director=new TurnDirector(state,events,draw,announce,finish);
  return {director,state,source,frames,listeners,doc,draw,announce,finish};
}
afterEach(()=>vi.unstubAllGlobals());
describe('turn director lifecycle',()=>{
  it('skip completes once and removes animation and visibility handlers',()=>{
    const t=setup();t.director.start();t.director.skip();t.director.skip();
    expect(t.finish).toHaveBeenCalledTimes(1);expect(t.frames.size).toBe(0);expect(t.listeners.size).toBe(0);
    expect(JSON.stringify(t.state)).toBe(t.source);
  });
  it('pausing cancels scheduled progress and manual advancement stays paused',()=>{
    const t=setup();t.director.start();t.director.togglePause();
    expect(t.frames.size).toBe(0);t.director.next();expect(t.frames.size).toBe(0);
    expect(t.announce.mock.lastCall?.[1]).toBe(1);t.director.togglePause();expect(t.frames.size).toBe(1);t.director.skip();
  });
  it('hiding the tab pauses playback until the user resumes',()=>{
    const t=setup();t.director.start();t.doc.hidden=true;t.listeners.get('visibilitychange')!();
    expect(t.director.paused).toBe(true);expect(t.frames.size).toBe(0);
    t.doc.hidden=false;t.listeners.get('visibilitychange')!();expect(t.frames.size).toBe(0);t.director.skip();
  });
  it('reduced motion starts with still frames and explicit advancement',()=>{
    const t=setup(true);t.director.start();expect(t.director.paused).toBe(true);
    expect(t.draw.mock.lastCall?.[2]).toBe(1);expect(t.frames.size).toBe(0);
    t.director.next();t.director.next();expect(t.finish).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(t.state)).toBe(t.source);
  });
});
