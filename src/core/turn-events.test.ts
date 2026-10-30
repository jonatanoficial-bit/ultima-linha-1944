import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../content/missions';
import { createInitialState, reduce } from './engine';
import { pendingEvent, tickOperation, terrainAt } from './operations-engine';
import { pointOnRoute, applyVisualEvent, type TurnEvent } from './turn-events';
import { encodeSave, decodeSave } from './persistence';

function ready(branch = 'army') {
  let s = createInitialState(MISSIONS.find(m => m.campaignId === branch)!, 'receipt-test');
  const e = pendingEvent(s)!;
  s = reduce(s,{type:'DECIDE',eventId:e.id,choiceId:e.choices[0].id}).state;
  return s;
}
describe('turn presentation receipts', () => {
  it('records the actual route without changing RNG or simulation results', () => {
    let s = ready();
    s = reduce(s,{type:'ORDER',unitId:'hq',order:'move',target:{x:15,y:14}}).state;
    const original = structuredClone(s), events: TurnEvent[] = [];
    const next = tickOperation(s,events);
    expect(next).toEqual(tickOperation(s));
    expect(s).toEqual(original);
    const move = events.find(e=>e.kind === 'move')!;
    expect(move).toBeDefined();
    expect(move.path![0]).toEqual({x:original.operation!.units[0].x,y:original.operation!.units[0].y});
    expect(move.path!.at(-1)).toEqual({x:next.operation!.units[0].x,y:next.operation!.units[0].y});
    for(let i=1;i<move.path!.length;i++) {
      const a=move.path![i-1], b=move.path![i];
      expect(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)).toBe(1);
      expect(terrainAt(s.operation!.definition,b)).not.toBe('water');
    }
  });
  it('does not disclose an unobserved attacker through receipts', () => {
    const s = ready(); s.currentTurn = 3; s.stats.intelligence = 0;
    s.operation!.units.forEach(u=>Object.assign(u,{x:0,y:0}));
    Object.assign(s.operation!.units[0],{x:10,y:10});
    s.operation!.enemies.forEach(e=>Object.assign(e,{x:35,y:25}));
    Object.assign(s.operation!.enemies[0],{x:15,y:10});
    const events: TurnEvent[]=[]; tickOperation(s,events);
    const contact=events.find(e=>e.kind==='contact')!;
    expect(contact).toBeDefined(); expect(contact.source).toBeUndefined();
    expect(contact.position).toEqual({x:10,y:10});
  });
  it('never invents combat before combat is active', () => {
    const events: TurnEvent[]=[]; tickOperation(ready(),events);
    expect(events.some(e=>e.kind==='contact')).toBe(false);
  });
  it('follows corners instead of moving diagonally through terrain', () => {
    const path=[{x:1,y:1},{x:2,y:1},{x:2,y:2}];
    expect(pointOnRoute(path,.25)).toEqual({x:1.5,y:1});
    expect(pointOnRoute(path,.75)).toEqual({x:2,y:1.5});
    expect(pointOnRoute(path,2)).toEqual({x:2,y:2});
  });
  for(const branch of ['army','air','navy']) it(`playing or skipping the ${branch} receipts cannot change the committed save`, () => {
    const s=ready(branch), transition=reduce(s,{type:'END_TURN'});
    expect(transition.accepted).toBe(true);
    const committed=encodeSave(transition.state), visual=structuredClone(s);
    for(const event of transition.events!) applyVisualEvent(visual,event);
    expect(JSON.parse(encodeSave(transition.state)).state).toEqual(JSON.parse(committed).state);
    expect(transition.state.currentTurn).toBe(s.currentTurn+1);
    expect(decodeSave(committed,MISSIONS.find(m=>m.campaignId===branch)!).currentTurn).toBe(2);
  });
  it('keeps saves from both preceding editions readable', () => {
    for(const version of ['0.3.0','0.4.0']) {
      const s=ready(); s.gameVersion=version;
      expect(decodeSave(encodeSave(s),MISSIONS.find(m=>m.campaignId==='army')!)).toEqual(s);
    }
  });
});

