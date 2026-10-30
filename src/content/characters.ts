/** Canonical identities shared by calls and the personnel register. */
export interface CommandCharacter {
  id: string;
  name: string;
  role: string;
  branch: 'army' | 'air' | 'navy';
  aliases: string[];
  portraitStatus: 'generated';
}
export const COMMAND_CHARACTERS: CommandCharacter[] = [
  { id:'P002', name:'Samuel Brooks', role:'First Sergeant · organização da companhia', branch:'army', aliases:['Brooks'], portraitStatus:'generated' },
  { id:'P004', name:'Helen Ward', role:'2nd Lieutenant · oficial médica agregada fictícia', branch:'army', aliases:['Ward'], portraitStatus:'generated' },
  { id:'P005', name:'Isaac Turner', role:'Corporal · operador de rádio', branch:'army', aliases:['Turner'], portraitStatus:'generated' },
];
export function characterForSender(sender: string) {
  return COMMAND_CHARACTERS.find(character => character.aliases.some(alias => sender.includes(alias)));
}
/** Rank prefixes and channel suffixes do not split one person's history. */
export function sameCommunicationIdentity(left: string, right: string): boolean {
  const a=characterForSender(left), b=characterForSender(right);
  if (a || b) return Boolean(a && b && a.id === b.id);
  if (/Andrew Reed/.test(left) && /Andrew Reed/.test(right)) return true;
  return left === right;
}

export function portraitForSender(sender: string): string | undefined {
 const character=characterForSender(sender);
 const files:Record<string,string>={P002:'P002_brooks_primary.png',P004:'P004_ward_primary.png',P005:'P005_turner_primary.png'};
 return character ? import.meta.env.BASE_URL+'assets/portraits/'+files[character.id] : undefined;
}
