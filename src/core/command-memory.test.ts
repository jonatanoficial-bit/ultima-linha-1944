import { describe,it,expect } from 'vitest';
import { MISSIONS } from '../content/missions';
import {createInitialState,reduce} from './engine';
import {pendingEvent} from './operations-engine';
import {rememberedDecisions,situationConsequences,relationshipWith} from './command-memory';
import {encodeSave,decodeSave} from './persistence';
describe('command memory',()=>{
 it('preserves choices and channel trust after the diary is trimmed',()=>{
  const mission=MISSIONS.find(m=>m.campaignId==='army')!;
  const initial=createInitialState(mission,'durable-memory'); const event=pendingEvent(initial)!;
  const choice=event.choices[0];
  const next=reduce(initial,{type:'DECIDE',eventId:event.id,choiceId:choice.id}).state;
  next.log=[];
  const restored=decodeSave(encodeSave(next),mission);
  expect(rememberedDecisions(restored,event.from)[0].choice).toBe(choice.label);
  expect(relationshipWith(restored,event.from).trust).toBe(43+(choice.effects.trust??0));
  expect(relationshipWith(restored,'Helen Ward').trust).toBe(44);
 });
 it('rejects forged decision choices and future or off-map damage',()=>{
  const mission=MISSIONS.find(m=>m.campaignId==='army')!;
  const state=createInitialState(mission,'validation'); const event=pendingEvent(state)!;
  state.operation!.decisions.push(event.id);
  state.operation!.decisionRecords=[{eventId:event.id,choiceId:'forged',turn:1}];
  expect(()=>decodeSave(encodeSave(state),mission)).toThrow();
  delete state.operation!.decisionRecords;
  state.operation!.damageSites=[{x:0,y:0,turn:2}];
  expect(()=>decodeSave(encodeSave(state),mission)).toThrow();
  state.operation!.damageSites=[{x:999,y:0,turn:1}];
  expect(()=>decodeSave(encodeSave(state),mission)).toThrow();
  state.operation!.damageSites=[{x:4,y:5,turn:1}];
  expect(decodeSave(encodeSave(state),mission).operation!.damageSites).toEqual(state.operation!.damageSites);
 });
 it('remembers the actual accepted choice across saves and speaker labels',()=>{
  const mission=MISSIONS.find(m=>m.campaignId==='army')!;
  const initial=createInitialState(mission,'memory'); const event=pendingEvent(initial)!;
  const next=reduce(initial,{type:'DECIDE',eventId:event.id,choiceId:event.choices[0].id}).state;
  const restored=decodeSave(encodeSave(next),mission);
  const memory=rememberedDecisions(restored,'Samuel Brooks');
  expect(memory).toHaveLength(1);expect(memory[0].choice).toBe(event.choices[0].label);
  expect(rememberedDecisions(restored,'Helen Ward')).toHaveLength(0);
 });
 it('does not invent a choice when an older diary no longer contains it',()=>{
  const initial=createInitialState(MISSIONS[0],'old-memory');
  initial.operation!.decisions.push(initial.operation!.definition.events[0].id);
  initial.log=[];
  expect(rememberedDecisions(initial,'Samuel Brooks')[0].choice).toBeUndefined();
 });
 it('uses current resources and casualties without changing the simulation',()=>{
  for(const mission of MISSIONS.filter(m=>m.operation&&m.campaignId!=='lab')){
   const state=createInitialState(mission,'consequences');const before=structuredClone(state);
   expect(situationConsequences(state).length).toBeGreaterThan(0);expect(state).toEqual(before);
  }
 });
});
