# Sons para produzir — edição 0.6

Os arquivos gravados ficam para uma entrega futura, conforme combinado. O jogo já funciona com ambiente e sinais procedurais opcionais. Não há dublagem gravada nesta versão.

Use este complemento em todos os prompts: **Som original para jogo histórico de 1944, realista e discreto, sem música, falas inteligíveis, equipamentos modernos ou distorção. Entregar WAV 48 kHz e cópia OGG ou MP3. Evitar picos bruscos.**

| Arquivo / chave | Prompt específico |
| --- | --- |
| army.ogg / army | 45 segundos, loop contínuo sem emenda. Abrigo militar de madeira no inverno das Ardenas: vento abafado, madeira rangendo, tecido e neve discretos. Sem tiros, pois contatos são reproduzidos separadamente. |
| air.ogg / air | 45 segundos, loop contínuo. Sala de operações de aeródromo de 1944: vento externo, vibração distante e constante de motor a pistão, estrutura metálica suave. Sem decolagens ou alarmes. |
| navy.ogg / navy | 45 segundos, loop contínuo. Ponte de contratorpedeiro em mar pesado: ondas contra casco, vibração grave de máquinas, metal rangendo suavemente. Sem sirenes ou combate. |
| radio.ogg / radio | 1 segundo. Rádio militar analógico de 1944 abrindo transmissão: clique mecânico e breve estática, sem fala, sem beep digital. |
| move.ogg / move | 0,7 segundo. Sinal discreto e não literal de deslocamento na mesa tática: fricção seca curta e pulsação grave suave. Adequado aos três domínios, sem passos nem hélices identificáveis. |
| work.ogg / work | 0,5 segundo. Breve manuseio de ferramentas mecânicas e tecido, indicando trabalho concluído; sem sino ou efeito eletrônico. |
| contact.ogg / contact | 0,6 segundo. Breve impacto distante abafado, grave e seco, para contato registrado em combate; sem gritos, explosão prolongada ou rajada que sugira ações adicionais. |

## Inserção futura

1. Colocar os sete arquivos em `public/assets/audio/`.
2. Em `src/content/audio-assets.ts`, substituir cada `src:null` pelo caminho correspondente, por exemplo `src:'assets/audio/army.ogg'`. Sem barra inicial: funciona também no subdiretório do GitHub Pages.
3. Manter `loop:true` só nos três ambientes; ajustar `gain` de cada faixa durante a escuta. Arquivo ausente ou reprodução recusada usa o sinal procedural quando possível. Enquanto `src` for nulo, não há requisição de arquivo.
4. Conferir troca de campanha, áudio desligado, volume zero, ocultar/retornar à aba e reprodução dos turnos. Publicar com os mesmos testes e build.

Áudio começa desligado. O controle de volume fica na pausa. A aba oculta suspende o som. As informações necessárias para decidir continuam disponíveis visualmente; não é necessário ouvir para jogar.
