import type { GameState } from './contracts';
import { sameCommunicationIdentity } from '../content/characters';

/** Derive remembered orders from authoritative events and the existing diary.
 * No invented choices or retroactive relationship scores for old saves. */
export function rememberedDecisions(state: GameState, sender: string) {
  const operation = state.operation;
  if (!operation) return [];
  return operation.definition.events
    .filter(event => operation.decisions.includes(event.id) && sameCommunicationIdentity(event.from,sender))
    .map(event => {
      const entry = state.log.find(log => log.text.startsWith(event.from + ': '));
      const record = operation.decisionRecords?.find(r=>r.eventId===event.id);
      const choice = (record && event.choices.find(c=>c.id===record.choiceId)) || (entry && event.choices.find(choice => entry.text === `${event.from}: ${choice.label}. ${choice.consequence}`));
      return { eventId:event.id, title:event.title, turn:event.turn, sender:event.from,
        choice:choice?.label, consequence:choice?.consequence };
    });
}
export function situationConsequences(state: GameState): string[] {
  const operation=state.operation;
  if(!operation) return [];
  const messages:string[]=[];
  const initial=operation.definition.units.reduce((sum,u)=>sum+u.strength,0);
  if(state.personnel.capable<initial) messages.push(`${initial-state.personnel.capable} pessoas a menos em condição de serviço desde a abertura. A disponibilidade das formações foi reduzida.`);
  if(state.personnel.wounded>0) messages.push(`${state.personnel.wounded} feridos ou limitados permanecem no registro; ${state.resources.medKits} kits médicos disponíveis.`);
  if(operation.flags.includes('delegated')) messages.push('Você ouviu Donovan e delegou o flanco. Essa decisão permanece no registro da companhia.');
  if(operation.flags.includes('medical-priority')) messages.push('O atendimento e os abrigos receberam prioridade por sua decisão.');
  if(operation.flags.includes('pledged-road')) messages.push('O batalhão recebeu seu compromisso de manter a estrada.');
  if(state.campaignId==='air') messages.push(`${operation.systems.aircraft} aeronave(s) disponível(is); pista em ${operation.systems.runway}%. A capacidade de cumprir uma saída depende desses recursos.`);
  if(state.campaignId==='navy') messages.push(`Casco em ${operation.systems.hull}%; alagamento em ${operation.systems.flooding}%. As avarias continuam exigindo decisão.`);
  return messages;
}

/** Initial values for Brooks/Ward come from the Bible; other channels start at the operation baseline. */
export function relationshipWith(state: GameState, sender: string) {
 const initial=/Brooks/.test(sender)?43:/Ward/.test(sender)?44:38;
 let trust=initial,known=0;
 for(const memory of rememberedDecisions(state,sender)){
  const event=state.operation!.definition.events.find(e=>e.id===memory.eventId)!;
  const choice=event.choices.find(c=>c.label===memory.choice);
  if(choice){known++;trust+=choice.effects.trust ?? 0;}
 }
 trust=Math.max(0,Math.min(100,trust));
 return {trust,known,reaction:!known?'A relação ainda depende das suas próximas decisões.':trust<35?'Suas decisões deixaram tensão neste canal de comando.':trust>=50?'As decisões registradas fortaleceram a confiança neste canal.':'O interlocutor acompanha suas decisões; a confiança ainda é cautelosa.'};
}
