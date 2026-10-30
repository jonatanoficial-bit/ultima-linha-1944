# Arquitetura — ÚLTIMA LINHA · 1944

## Objetivo da fundação

O produto é um jogo de estratégia narrativa com simulação local. A edição 0.3 estabelece contratos, terreno persistente, formações, tarefas, comunicações e um posto de comando adaptado a toque e teclado. É uma etapa jogável; a [matriz da Bíblia](docs/bible-audit-0.3.md) registra as pendências do Lote 1.

## Fronteiras

A edição 0.4 acrescenta `core/narrative.ts`, máquina de estados de apresentação independente do redutor de combate. `content/cinematics.ts` vincula os nove assets às passagens do prólogo; `ui/cinematic-stage.ts` mantém o quadro anterior até a próxima imagem ser decodificada. Somente o handoff após uma escolha explícita cria o estado operacional. O formato v3 permanece compatível com os saves 0.3.

```
HTML/CSS controls ──commands──> reducer puro ──state──> HTML HUD
                                  │
                                  ├── PRNG seedado + planejador inimigo local
                                  ├── regras, recursos e invariantes
                                  └── serialização de save

Mission packs ──> catálogo/loader ──> estado inicial
                                     └── CommandMap / Canvas 2D persistente
```

* `src/content/` declara campanhas e pacotes; não há ramificações por ID de missão no motor.
* `src/core/` contém contratos, PRNG, invariantes, reducer e validação de arquivos. Não importa DOM, rede ou `localStorage`.
* `src/ui/` traduz gestos em comandos e apenas renderiza snapshots do estado.
* `src/game/` renderiza o campo em Canvas 2D. Câmera, arrasto e seleção são locais ao renderizador; regras e alteração do estado passam pelo redutor.
* `src/content/operations.ts` define geografia, formações, contatos, eventos e tarefas. As regras por domínio não dependem de IDs individuais de missão.

## Ciclo de turno

1. O loader cria um `GameState` a partir de `MissionPack`, seed e escolha de prólogo.
2. O jogador emite uma ação válida. O reducer aplica pré-condições, custo, duração e feedback no log.
3. Ao encerrar o turno, o planejador inimigo usa apenas estado observável e o PRNG local.
4. O reducer avalia riscos, atualiza recursos, conserva efetivos e verifica condições de encerramento.
5. O snapshot é renderizado; autosave e exportação serializam exatamente esse snapshot.

## Contratos e compatibilidade

O envelope atual usa `version: 3`, `savedAt` e `state`, incluindo `gameVersion`, `contentVersion` e `missionId`. O decodificador valida limites, contagens, identificadores e tarefas e recoloca a definição oficial do pacote. O arquivo legado `SaveFile` 1.0/estado 0.2 não tem posições e permanece separado, sem migração que invente progresso. Exportações anteriores não são apagadas.

## Regras de integridade já previstas

* capazes, feridos/limitados, desaparecidos, mortos e indisponíveis somam o efetivo original;
* a soma de capazes nas formações acompanha o registro agregado;
* recursos nunca se tornam negativos;
* uma ação só executa quando tem custo e pré-condições satisfeitos;
* o turno não avança pela UI sem passar pelo reducer;
* a IA e a aleatoriedade usam uma seed reproduzível, sem serviços externos.
* respostas de rádio, consumo de reservas e entregas são estágios distintos; nenhum estágio entrega duas vezes;
* geografia não depende da seed ou do turno; unidades só se deslocam por rotas válidas;
* janelas prioritárias suspendem o avanço até uma decisão explícita, sem relógio de tempo real.

## Evolução para o Lote 1

Os próximos incrementos preenchem os pacotes canônicos M01, A01, N01 e M00 com mapas, roster individual, eventos, diálogos, IA por domínio, finais, assets licenciados e testes de replay. A interface atual não substitui esse conteúdo: ela é o alicerce testável em que ele será carregado.

## Apresentação do período · edição 0.5

`Transition.events` transporta recibos filtrados dos acontecimentos efetivamente resolvidos. Eles não entram no save e não alteram PRNG ou tempo. `TurnDirector` anima uma cópia visual, com pausa/avanço/skip e descarte garantido de RAF/listeners ao terminar. `CommandMap.frame` interpola a rota gravada, respeita observação e restaura a câmera. O snapshot final já foi salvo antes da apresentação; repetir ou pular não reaplica o turno. Redução de movimento usa quadros estáticos.

Postos e comunicações usam `content/stations.ts` e as artes aprovadas. O HUD é contextual por padrão. O escopo em duas entregas está em `docs/immersion-plan.md`; pendências de simulação da Bíblia continuam explícitas.
