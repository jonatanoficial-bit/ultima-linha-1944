# Arquitetura — ÚLTIMA LINHA · 1944

## Objetivo desta primeira fundação

O produto é um jogo de estratégia narrativa offline. Esta fundação estabelece os contratos, a simulação determinística, o catálogo de campanhas e uma interface touch-first. Ela é uma fatia vertical inicial, não a declaração de que o Lote 1 canônico está completo.

## Fronteiras

```
HTML/CSS controls ──commands──> reducer puro ──state──> HTML HUD
                                  │
                                  ├── PRNG seedado + planejador inimigo local
                                  ├── regras, recursos e invariantes
                                  └── serialização de save

Mission packs ──> catálogo/loader ──> estado inicial
                                     └── Phaser FieldScene (mapa sem controles)
```

* `src/content/` declara campanhas e pacotes; não há ramificações por ID de missão no motor.
* `src/core/` contém contratos, PRNG, invariantes e reducer. Não importa DOM, Phaser, rede ou `localStorage`.
* `src/ui/` traduz gestos em comandos e apenas renderiza snapshots do estado.
* `src/game/` renderiza o campo 2D por Phaser. Nenhuma decisão de jogo é feita no canvas.

## Ciclo de turno

1. O loader cria um `GameState` a partir de `MissionPack`, seed e escolha de prólogo.
2. O jogador emite uma ação válida. O reducer aplica pré-condições, custo, duração e feedback no log.
3. Ao encerrar o turno, o planejador inimigo usa apenas estado observável e o PRNG local.
4. O reducer avalia riscos, atualiza recursos, conserva efetivos e verifica condições de encerramento.
5. O snapshot é renderizado; autosave e exportação serializam exatamente esse snapshot.

## Contratos e compatibilidade

`SaveFile` sempre inclui `gameVersion`, `contentVersion`, `missionId` e o estado inteiro. Migrações futuras serão funções versionadas que preservam campos desconhecidos, permitindo que saves antigos sobrevivam à ampliação do catálogo.

## Regras de integridade já previstas

* combatentes, feridos, desaparecidos e mortos somam o efetivo original;
* recursos nunca se tornam negativos;
* uma ação só executa quando tem custo e pré-condições satisfeitos;
* o turno não avança pela UI sem passar pelo reducer;
* a IA e a aleatoriedade usam uma seed reproduzível, sem serviços externos.

## Evolução para o Lote 1

Os próximos incrementos preenchem os pacotes canônicos M01, A01, N01 e M00 com mapas, roster individual, eventos, diálogos, IA por domínio, finais, assets licenciados e testes de replay. A interface atual não substitui esse conteúdo: ela é o alicerce testável em que ele será carregado.
