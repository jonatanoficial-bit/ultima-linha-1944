# ÚLTIMA LINHA — 1944

Jogo de comando tático e narrativa em 1944. A edição 0.4 incorpora as nove cenas fornecidas pelo autor em prólogos de tela inteira, com transições, leitura automática opcional, histórico e decisões. O posto de comando tem mapa persistente em Canvas 2D, comunicações e ordens resolvidas por turnos. Publicação em [GitHub Pages](https://jonatanoficial-bit.github.io/ultima-linha-1944/?v=0.4.0).

> Em desenvolvimento. A Bíblia Mestra permanece a referência de conteúdo e regras. Esta versão implementa uma etapa jogável, não a totalidade do Lote 1. Consulte a [matriz de aderência](docs/bible-audit-0.3.md) para as diferenças e pendências.

As três operações têm mapas próprios: Cedar 40×30, aeródromo 48×36 e mar 60×40. Movimento, observação, cobertura, munição, trabalhos com duração, reservas externas e decisões afetam o estado da missão. O arquivo inclui as 45 artes do catálogo e uma carta regional histórica de Bastogne dos Arquivos Nacionais dos EUA.

O menu de pausa permite exportar/importar partidas. Cada carreira tem um slot local na edição 0.3; o registro antigo 0.2 permanece guardado em sua chave anterior, sem conversão silenciosa de uma simulação incompatível. A simulação não depende de servidor após carregar; instalação e reabertura integral sem internet ainda precisam de cache offline próprio.

## Executar

```bash
pnpm install
pnpm dev
```

## Verificar

```bash
pnpm test
pnpm build
```

Leia [architecture.md](architecture.md) antes de alterar motor, saves ou pacotes de missão.

## Produção das cenas narrativas

As nove imagens do [storyboard](docs/storyboard-prompts.md) foram entregues e integradas, preservando os PNGs originais e seus SHA-256. `pnpm validate:cinematics` confere o catálogo; o build também executa essa verificação antes da compilação. A [auditoria da edição 0.4](docs/bible-audit-0.4.md) registra escopo e limites.

Na Aviação, a escolha inicial ocorre nos destroços, antes do retorno à base. O modo automático para nas decisões; pular mostra um resumo e exige uma escolha explícita. Nenhuma cena avança turnos. Partidas da edição 0.3 continuam compatíveis com o mesmo slot v3.

No campo, **F** alterna foco no mapa, **1–5** selecionam formações, **R/O/J** abrem rádio/ordens/diário e **Enter** abre a revisão do turno. Com o mapa em foco de teclado, as setas marcam coordenadas. No celular, Ordens abre um painel sobre o campo, com fechamento próprio. O ambiente sonoro procedural é opcional e começa desligado.
