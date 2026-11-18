export interface AudioAssetDefinition {
  /** Set when the approved recording is placed in public/assets/audio/. */
  src: string | null;
  gain: number;
  loop: boolean;
  title: string;
  destination: string;
  prompt: string;
}

/**
 * A null source intentionally selects the quiet procedural fallback. The
 * manifest makes future recording delivery a drop-in content operation.
 */
export const AUDIO_ASSETS: Record<string, AudioAssetDefinition> = {
 army: { src: null, gain: .25, loop: true, title: "Ambiente terrestre", destination: "assets/audio/army-ambience.ogg", prompt: "Loop estéreo de 60 segundos, inverno nas Ardenas em 1944: vento frio baixo, lona distante, motor ocioso muito discreto, sem tiros, sem fala, sem música, dinâmica contida para fundo de jogo." },
 air: { src: null, gain: .25, loop: true, title: "Ambiente de base USAAF", destination: "assets/audio/air-ambience.ogg", prompt: "Loop estéreo de 60 segundos, base aérea aliada em 1944: vento no hangar, motor distante em marcha lenta e rádio indistinto sem palavras inteligíveis, sem música, volume contido." },
 navy: { src: null, gain: .25, loop: true, title: "Ambiente naval", destination: "assets/audio/navy-ambience.ogg", prompt: "Loop estéreo de 60 segundos, convés de navio no Pacífico em 1944: mar pesado, casco rangendo leve, vento e maquinaria distante, sem fala, sem música, dinâmica contida." },
 radio: { src: null, gain: .45, loop: false, title: "Sinal de rádio", destination: "assets/audio/radio-cue.ogg", prompt: "Sinal curto de rádio militar analógico, dois pulsos discretos com chiado breve, 0,4 segundos, mono ou estéreo estreito, sem voz, sem melodia." },
 move: { src: null, gain: .3, loop: false, title: "Execução de deslocamento", destination: "assets/audio/move-cue.ogg", prompt: "SFX curto de deslocamento tático abstrato: tecido, passo ou motor muito distante, 0,7 segundos, sem explosão e sem voz." },
 work: { src: null, gain: .3, loop: false, title: "Trabalho de campo", destination: "assets/audio/work-cue.ogg", prompt: "SFX curto de trabalho de campanha: ferramenta metálica suave e lona, 0,35 segundos, sem fala, sem música." },
 contact: { src: null, gain: .4, loop: false, title: "Contato hostil", destination: "assets/audio/contact-cue.ogg", prompt: "SFX tenso e breve de contato distante, impacto abafado e ruído grave, 0,35 segundos, sem gritos, sem fala, sem música." },
};
