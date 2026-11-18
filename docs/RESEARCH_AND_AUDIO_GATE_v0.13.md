# Última Linha 1944 — Portão editorial e audiovisual v0.13

## Princípio de publicação

Uma frente não se torna jogável por ter apenas uma data, um texto de briefing ou uma arte genérica. Para entrar no menu como capítulo publicado, precisa de: fonte e recorte temporal verificáveis, carta de referência rastreável, ordem de batalha e sistemas definidos, mapa tático coerente, objetivos e eventos, imagens autorizadas, testes determinísticos e QA de teclado/mobile.

Esse portão impede que pesquisa em andamento seja apresentada como fato histórico ou que o jogador receba um mapa vazio.

## M02 — Corredor de Bastogne

Base confirmada: em 26 de dezembro de 1944, elementos da 4ª Divisão Blindada atingiram o perímetro de Bastogne. O contato abriu o corredor, ainda vulnerável; o esforço posterior precisava ampliar a brecha e preservar os acessos.

Fonte principal: *The Ardennes: Battle of the Bulge*, Chapter XXIV, U.S. Army Center of Military History.
https://history.army.mil/portals/143/Images/Publications/catalog/7-8.pdf

Estado: **pesquisa de contexto confirmada; não jogável**.

Ainda exigido antes de escrever a missão:

- carta tática datada com origem, escala, legenda e direito de uso conferidos;
- unidades, limites e cronologia locais conciliados com fontes primárias;
- cenas, retratos e material visual aprovado para o novo capítulo;
- objetivos, eventos, escolhas, resultados, testes e QA de interface.

## A02 e N02

Estado: **curadoria aberta; não jogáveis**. Nenhuma base, aeronave, navio, unidade ou coordenada será inventada para preencher o menu. Cada frente precisa de pacote próprio de fontes antes da pré-produção.

## Áudio — entrega plugável

O motor usa, por escolha do jogador, ambiente procedural discreto enquanto não há gravações aprovadas. Ao receber cada OGG, colocar em `public/assets/audio/` e trocar o campo `src` correspondente em `src/content/audio-assets.ts`. Ganho, looping, fallback, visibilidade da página e testes já existem.

| Entrega | Destino | Regra |
| --- | --- | --- |
| Ambiente terrestre | `army-ambience.ogg` | Loop limpo, sem fala ou música |
| Ambiente USAAF | `air-ambience.ogg` | Loop limpo, sem fala inteligível |
| Ambiente naval | `navy-ambience.ogg` | Loop limpo, sem fala ou música |
| Rádio, deslocamento, trabalho, contato | `*-cue.ogg` | Curto, sem diálogo, sem sustos excessivos |

Os prompts completos, o estado e o destino aparecem no jogo em **Acessibilidade → Plano de áudio**, para que o material enviado seja auditável pelo jogador e pela produção.
