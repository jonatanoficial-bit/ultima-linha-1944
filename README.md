# ÚLTIMA LINHA — 1944

Jogo de comando tático e narrativa em 1944. A edição 0.3 substitui a página de indicadores por um posto de comando com mapa persistente em Canvas 2D, formações selecionáveis, prólogos, comunicações e ordens resolvidas por turnos. Publicação em [GitHub Pages](https://jonatanoficial-bit.github.io/ultima-linha-1944/).

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

O [storyboard com nove prompts completos](docs/storyboard-prompts.md) organiza a próxima etapa visual: três cenas por campanha, referências de personagens e pontos de entrada no prólogo. As novas imagens aguardam geração, revisão e integração; este documento não altera a versão jogável 0.3.
