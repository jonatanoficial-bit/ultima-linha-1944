import type { BranchId } from '../core/contracts';
import { CINEMATICS, cinematicUrl } from './cinematics';

export const stations: Record<BranchId, { title: string; location: string; scene: string; desk: string }> = {
  army: { title: 'Posto Cedar', location: 'Abrigo de comando · acesso leste', scene: 'CIN04', desk: 'Mesa de operações' },
  air: { title: 'Sala de operações', location: 'Aeródromo · comando da ala', scene: 'AIR_CIN03', desk: 'Carta do aeródromo' },
  navy: { title: 'Ponte de comando', location: 'Vigia · controle de avarias', scene: 'NAV_CIN03', desk: 'Carta de navegação' },
  lab: { title: 'Posto de comando', location: 'Exercício', scene: 'CIN04', desk: 'Mesa de operações' },
};
export const sceneUrl = (id: string) => cinematicUrl(CINEMATICS.find(scene => scene.id === id)!);
export function communicationScene(branch: BranchId, sender: string) {
  if (branch === 'army') return /Ward|médic|enferm/i.test(sender) ? 'CIN03' : /Brooks/i.test(sender) ? 'CIN02' : 'CIN04';
  if (branch === 'air') return /manutenção|mecânic/i.test(sender) ? 'AIR_CIN02' : 'AIR_CIN03';
  return /máquinas|enferm/i.test(sender) ? 'NAV_CIN02' : 'NAV_CIN03';
}
export function communicationRole(sender: string) {
  if (/Brooks/.test(sender)) return 'Primeiro-sargento · organização da companhia';
  if (/Ward/.test(sender)) return 'Oficial médica agregada · posto médico';
  if (/Reed/.test(sender)) return 'Comando de batalhão · escalão superior';
  if (/Maple/.test(sender)) return 'Posto vizinho · observação local';
  return 'Rede de comando · canal da operação';
}
