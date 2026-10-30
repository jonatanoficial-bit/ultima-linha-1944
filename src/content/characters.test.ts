import { describe,it,expect } from 'vitest';
import { characterForSender,sameCommunicationIdentity } from './characters';
describe('canonical communication identities',()=>{
  it('keeps Brooks history across rank prefixes',()=>expect(sameCommunicationIdentity('1st Sgt. Samuel Brooks','Samuel Brooks')).toBe(true));
  it('keeps Reed history across channel suffixes',()=>expect(sameCommunicationIdentity('Major Andrew Reed · batalhão','Major Andrew Reed')).toBe(true));
  it('never substitutes another medical character for Ward',()=>{
    expect(characterForSender('2nd Lt. Helen Ward')?.id).toBe('P004');
    expect(sameCommunicationIdentity('Helen Ward','Dr. Arthur Whitmore')).toBe(false);
  });
});
