# ÚLTIMA LINHA — 1944: reformulação do mapa, unidades e comando móvel

**Documento interno de execução futura · 31/10/2026**  
**Estado:** planejamento concluído; implementação e publicação não iniciadas por este documento.  
**Base analisada:** edição 0.6, commit `3e9b533`, capturas enviadas pelo autor e cópia local da Bíblia Mestra.  
**Pedido do autor:** mapa mais convincente, tropas/veículos/aeronaves identificáveis e ordens intuitivas, sobretudo no celular. Executar somente na próxima etapa solicitada pelo autor.

## 1. Resultado pretendido

Transformar a carta atual em um campo tático legível e visualmente coerente, no qual o jogador reconhece uma formação, entende o que ela pode fazer, escolhe um destino e acompanha a execução sem perder o mapa atrás de menus. A apresentação deve comunicar pessoas e equipamentos reais da operação, não apenas quadrículas e números.

A solução combina **terreno ortogonal detalhado + sprites de equipamento com transparência + fichas com as artes aprovadas + comandos contextuais compactos**. Manter o motor determinístico por turnos, os eventos narrativos, as cenas e os saves. Não trocar de engine nem migrar para 3D nesta reformulação.

Esta é uma nova frente de melhoria, motivada pelo uso da edição 0.6. O fechamento anterior do plano de imersão não significa que o mapa ou a experiência móvel tenham atingido o acabamento desejado; ausência de transbordamento horizontal não basta para validar usabilidade.

## 2. Diagnóstico fundamentado

| Evidência | Problema | Correção planejada |
| --- | --- | --- |
| [Captura do campo](references/mapa-atual-2026-10-31.png) | Mapa pequeno dentro de uma moldura grande; terreno repetitivo; figuras minúsculas; nomes disputam espaço | Câmera inicial por área operacional, terreno em camadas, níveis de detalhe e rótulos com prioridade |
| [Captura do painel](references/painel-mobile-2026-10-31.png) | Painel lateral ocupa grande parte do mapa, com rolagem interna e ações distantes | Eliminar o painel lateral sobreposto no modo móvel; usar barra contextual e folha inferior com estados explícitos |
| `command-app.ts`, callback de `CommandMap` | Qualquer seleção/destino define `drawerOpen = true` | Tocar no mapa nunca abre o painel completo; apenas muda seleção ou prévia |
| `cinematic.css`, regras de `.drawer-open .orders-panel` | Painel absoluto de até 345 px permanece sobre o campo | Substituir essas regras por layout móvel próprio, sem regras antigas concorrentes |
| `tactical-map.ts`, detecção de toque | Primeiro objeto encontrado em raio de uma célula; tamanho depende do zoom | Hitboxes em pixels de tela e desempate por distância/seleção, com lista curta quando houver sobreposição |
| `Formation` e catálogo atual | Formações têm papel/efetivo, mas não identidade de equipamento; artes V/A/N ficam no acervo | Separar ficha, sprite e entidade de simulação; só ligar uma imagem a uma unidade quando houver correspondência |
| Campos X/Y e botões desabilitados | O jogador não entende se está escolhendo unidade, destino ou ação; falta motivo próximo | Fluxo visual em etapas; coordenadas em opções avançadas; motivo explícito para cada ação indisponível |

## 3. Regras da Bíblia que orientam a solução

Referência consultada: `work/ultima-linha-biblia.docx`, extração `work/bible_docx/word/document.xml`. Antes da execução, verificar se a Bíblia online recebeu alterações posteriores à cópia local; registrar divergências sem substituir silenciosamente o cânone.

- Mapa com câmera vertical de 90°, grade retangular e projeção ortogonal. Não usar isometria, horizonte ou cena cinematográfica como terreno jogável.
- Arte P/U/V/A/N/HL aprovada permanece intacta nas fichas e no acervo. Sprites top-down são derivados separados, com alfa e estado de revisão identificado.
- Zoom distante apresenta símbolos de formação; próximo revela figuras. Efetivo numérico deve ser verdadeiro; três soldados desenhados não significam três soldados disponíveis.
- Referência de zoom da Bíblia: 0,65–2,2. Normalizar essa escala em relação à câmera operacional, sem copiar os limites atuais 1–3,5 como se fossem canônicos.
- Alvos de toque com pelo menos 44 px. Interface HTML/CSS; mundo em Canvas 2D.
- M01 Cedar é fictício, 40×30; aeródromo 48×36; setor aéreo previsto 60×40; setor naval 60×40. A carta histórica regional permanece referência separada.
- A01 registra seis aeronaves: duas utilizáveis, duas reparáveis e duas perdas definitivas. Disponibilidade agregada atual não é ainda um roster completo por matrícula.
- M01 tem reserva externa com **zero veículos**. A coleção de blindados não concede blindados à companhia. Apoio aéreo está desativado nesse pacote; artilharia deve respeitar intermediação e disponibilidade, nunca um botão de ataque gratuito.
- Pesquisar teatro, variante, unidade e data antes de atribuir modelos históricos. Aprovação artística não confirma precisão técnica do equipamento.
- Nenhum veículo, tripulante, avião ou navio surge sem origem declarada. Destruídos não retornam por recarga. Animação não muda o resultado do turno.

## 4. Direção de arte do campo

### Terreno

Construir terreno por dados da missão, com tiles/seções alinhados à mesma grade de colisão. Estradas terão bordas e continuidade; florestas, copas vistas de cima e clareiras; vilas, telhados com pegadas coerentes; neve, variação tonal e marcas discretas. Pista, hangares, pátios e depósitos devem parecer instalações distintas. Mar terá costa legível, recortes de terra e ondulação sutil, sem blocos terrestres que pareçam paredes geométricas arbitrárias.

Separar camadas: base → relevo/vegetação → estruturas → marcas persistentes conhecidas → rotas/alcances → unidades → efeitos → identificação. Grade fraca por padrão; realçar apenas área de destino e ações. Nevoeiro de guerra deve ocultar contatos e alterações não observadas. Dano desconhecido não pode aparecer através da névoa.

Primeiro redesenhar a aparência mantendo a geografia/células atuais. Qualquer mudança de obstáculos ou ligações de estrada passa por nova versão do pacote e testes de caminho; não é mero retoque visual.

### Câmera e leitura

Abrir enquadrando forças próprias e objetivo imediato com margem, em vez de obrigar o mapa inteiro a caber numa miniatura. Oferecer “Visão geral” e “Minha unidade”. A câmera não deve saltar ou voltar ao centro ao abrir uma ficha, emitir ordem ou fechar um painel.

Pan por arrasto; pinça de dois dedos ancorada no ponto médio; zoom por botões e roda. Distinguir toque de arrasto por tolerância em pixels CSS. Segundo dedo cancela seleção pendente; `pointercancel` limpa o gesto. Limites de pan calculados pelas bordas reais do mundo e pela área útil, não apenas pelo tamanho total do canvas.

Rótulo completo só para selecionado, objetivo relevante e contato sob inspeção. Demais unidades: símbolo de tipo, nome curto e efetivo quando houver espaço. Se rótulos colidirem, reduzir informação com prioridade, não diminuir fonte indefinidamente. Amigo/inimigo/selecionado diferem por forma, contorno e texto, além da cor.

## 5. Arte aprovada, recortes e sprites

**Fotografia/arte na ficha; silhueta ortogonal no mapa.** Um PNG com fundo removido continua em perspectiva se o original for oblíquo. Nesses casos, usar a imagem aprovada como referência para gerar uma vista superior separada, sem deformá-la artificialmente. Recortar diretamente apenas quando a câmera e o objeto já forem adequados.

Pipeline previsto:

1. Inventariar `src/content/assets.ts` e os arquivos existentes, preservando IDs e hashes dos originais.
2. Montar matriz por asset: original, ângulo, teatro, variante, uso permitido, necessidade de derivação, missão de destino.
3. Inspecionar as imagens; selecionar as compatíveis com a missão. Não preencher lacunas de modelo por adivinhação.
4. Produzir sprites individuais com alfa real, visão superior 90°, luz e escala coerentes, proa/frente para cima e sem chão, neve, placa, texto ou sombra de cenário incorporada. Preservar marcas verificadas; evitar inventar identificação histórica.
5. Salvar derivados em diretório separado; registrar `sourceAssetId`, orientação, pivô, dimensões úteis, versão e estado de revisão. Fundo quadriculado pintado não conta como transparência.
6. Validar bordas em fundo claro/escuro, alinhamento, leitura em tamanho de jogo e diferença entre modelos. Atlas derivados são opcionais, mantendo os originais individuais.
7. Gerar estados de dano somente quando existirem estados correspondentes no motor. Fumaça/chama pertencem à camada de efeitos, e não à imagem do equipamento intacto.

Guia inicial de produção: sprites humanos em tela-base de 128 ou 256 px; veículos/aeronaves em 512 px; navios longos até 1024 px. São tamanhos de trabalho, sujeitos à medição; não tamanhos fixos de exibição. Rotação do sprite pelo rumo é preferível a oito PNGs por direção nesta etapa. Sombras suaves e seleção são renderizadas separadamente.

| Grupo existente | Uso previsto | Restrição |
| --- | --- | --- |
| U001–U008, arquétipos de pessoal | Fichas e derivados de infantaria, médico, engenheiro, rádio, apoio e marinheiro | Arquétipo não vira retrato de personagem nomeado |
| V001–V006: Sherman, Chaffee, Stuart, Greyhound, half-track, Willys | Fichas de veículos e sprites quando houver unidade autorizada | Modelo/variante e presença no teatro precisam de verificação |
| V007–V010: autopropulsada, obuseiro, antitanque e morteiro | Identificação de armas, alcance e apoio conforme regras | V007/V009 exigem identificação técnica; artilharia externa não vira peça local |
| A001–A010: Mustang, Thunderbolt, Spitfire, Hurricane, B-17, C-47, Lightning, Bf 109, Fw 190, Zero | Coleção completa preservada; derivados ativados por pacote | RAF, USAAF, adversários europeus e Pacífico não são uma frota intercambiável |
| N001–N010, navios | Silhuetas por classe e ficha do contato quando identificado | Não revelar classe de contato incerto; Vigia não vira encouraçado por preferência estética |

Produzir primeiro as famílias usadas na experiência jogável. Os demais modelos permanecem acessíveis no acervo com ficha; todos entram no inventário de derivados, mas não devem atrasar a correção do controle móvel nem aparecer como reforços fictícios. Registrar explicitamente quais derivados estão prontos e quais ainda dependem de pesquisa/produção.

## 6. Unidades e veículos: comportamento real

### Exército

- Cedar HQ, Able, Baker, Charlie e Apoio mantêm seus efetivos e identidades. Renderizar pequenos agrupamentos representativos; mostrar força e estado reais na ficha.
- Apoio é “Armas e socorro” no pacote atual. Não substituir automaticamente todo esse grupo por um obuseiro. Divisão em equipe médica/armas exige roster, contabilização e regras próprios.
- Introduzir tipos explícitos: infantaria, apoio, equipe médica, engenharia, reconhecimento, transporte, blindado e artilharia. Papel visual não concede automaticamente habilidades.
- Veículo jogável exige origem, ID, classe, tripulação alocada, integridade, combustível/munição pertinentes, mobilidade e restrições de terreno. Tripulantes pertencem ao efetivo; não somar pessoas novamente ao contar o veículo.
- Novos blindados não entram retroativamente em M01. Demonstrar tipos e comandos em cenário de treinamento separado, identificado como exercício, e habilitar nas campanhas apenas quando a Bíblia/pacote definir presença ou reforço plausível.
- Se artilharia estiver fora do mapa, mostrar solicitação, situação da autorização e área estimada quando conhecida. Se for peça local autorizada, mostrar a peça, guarnição, orientação, alcance, munição e tempo de preparo. Não oferecer tiro direto/indireto sem regras implementadas.

### Aviação

- Distinguir aeródromo, aeronaves estacionadas e missão aérea. Equipes de manutenção se movem no chão; aviões não recebem ordens de infantaria.
- Ficha da aeronave: imagem aprovada, modelo verificado, identificação única, condição, piloto/tripulação alocada, combustível, armamento e restrições de pista. Indicar “modelo não definido no pacote” enquanto faltar definição canônica.
- Representar as seis aeronaves do inventário quando o roster estiver definido: dois slots operacionais, dois em reparo e dois de perda definitiva; quantidades visuais derivadas do estado, nunca um laço decorativo independente.
- Cliques em avião abrem “Inspecionar”, “Preparar”, “Reparar” ou “Alocar tripulação” somente quando sustentados por regras. Ordem indisponível informa causa: pista, peças, combustível, pessoal ou destruição definitiva.
- Separar “Base” e “Setor aéreo” quando houver sistema de saída/retorno. Um voo exige autorização, reserva de recursos e registro de transição; a aeronave não existe simultaneamente nas duas vistas. Não animar decolagem fictícia para representar um contador alterado.
- O catálogo com dez modelos não define quais seis estavam na base. A execução deve buscar essa definição na Bíblia atualizada; se ausente, manter identificação genérica honesta e registrar a decisão editorial necessária.

### Marinha

- Vigia ganha sprite da classe compatível, rumo legível e esteira somente durante deslocamento real. Luz, fumaça e inclinação estilizada devem corresponder a avarias conhecidas.
- Contatos incertos usam símbolos neutros até classificação; não mostrar o PNG de submarino inimigo antes da identificação.
- Navegação e controle de avarias são modos diferentes. “Avarias” abre um esquema funcional de compartimentos somente quando os dados correspondentes existirem; até lá, manter sistemas agregados com nomes claros.

## 7. Fluxo de ordens sem ambiguidade

Máquina de estados de interface proposta:

`Explorando → Unidade selecionada → Ação escolhida → Escolhendo alvo/destino → Prévia → Confirmada`

- **Explorando:** arrastar navega; tocar terreno mostra informação breve, sem abrir painel e sem dar ordem.
- **Unidade selecionada:** halo e ficha compacta com miniatura, nome, tipo, efetivo/condição e ordem atual. Ações básicas em barra curta. Tocar outra unidade troca seleção e cancela apenas a prévia não confirmada.
- **Ação escolhida:** “Mover” entra explicitamente em seleção de destino; “Manter” pode seguir direto à prévia. A mesma célula não muda silenciosamente de significado.
- **Destino:** mapa permanece livre; toque atualiza rota e mostra destino por nome/coordenadas discretas. Destino inválido recebe marca e motivo; não consome PC.
- **Prévia:** exibir “Able → bosque leste”, custo, duração estimada segundo o motor e efeito. Riscos apenas quando conhecidos; não revelar inimigos ocultos. Botões Confirmar e Cancelar.
- **Confirmada:** reducer valida novamente; só então desconta custo. Fechar folha de destino automaticamente, deixar resumo “Ordem registrada; executa ao resolver turno” e rota persistente. Se rejeitar, explicar motivo e preservar contexto para correção.
- **Cancelar/Voltar/Esc:** recua um estado, sem mover unidade, gastar recurso ou perder a posição da câmera.

Uma ordem por formação por turno continua a regra atual. Não oferecer “desfazer” após confirmação se o motor não suporta devolver custos com segurança. Replanejamento e reservas reversíveis seriam uma alteração separada, explícita e testada.

Coordenadas manuais ficam em “Destino por coordenadas”, acessível por teclado; não são o primeiro controle no celular. Mostrar motivo acessível ao lado de ações desabilitadas, sem depender de hover.

## 8. Interface móvel e desktop

### Celular

Eliminar a gaveta lateral. Reservar quatro zonas: cabeçalho compacto, mapa, barra contextual e ação de turno. Recursos secundários ficam recolhidos em “Situação”; o botão Resolver não compete com uma confirmação de destino.

Folha inferior com três estados:

| Estado | Conteúdo | Efeito no mapa |
| --- | --- | --- |
| Fechada | Somente controles do campo | Máxima área útil |
| Compacta | Miniatura/nome e ações essenciais; alvo inicial 96–144 px | Reservar espaço no layout; unidade selecionada permanece visível |
| Expandida | Ficha, rádio, situação ou diário, aberta explicitamente | Limitar altura, oferecer Fechar fixo e “Voltar ao mapa”; sem fingir que o campo está totalmente acessível |

Durante escolha de destino, fechar o conteúdo expandido. Reabrir detalhes exige gesto explícito. Confirmar ordem recolhe automaticamente. Botão Fechar mínimo 44×44 px, sempre visível e fora da área rolável; deslizar para baixo pode ser atalho, nunca única saída. Clique fora recolhe ficha expandida sem transformar esse clique em ordem no mapa. Rolagem da ficha não arrasta o mapa.

Usar `100dvh` com fallback, safe areas e cuidado com barra do navegador/teclado virtual. Em paisagem baixa, trocar a folha por faixa compacta e abrir detalhes como tela dedicada. Escolher breakpoint por espaço útil (largura e altura), não por detecção de aparelho. Fora de detalhes expandidos, meta de pelo menos 60% da altura útil para o campo, medida com HUD real; em 320 px/baixa altura, priorizar ainda mais mapa e reduzir conteúdo persistente.

### Desktop

Ficha contextual de largura limitada ao lado do mapa, ocupando área de layout quando expandida. Não abrir o grande posto de comando ao selecionar uma unidade. Rádio/diário/situação ficam em atalhos próprios. Manter atalhos de teclado documentados e alternativas por botão. A primeira abertura de detalhes começa no topo, com foco acessível; retorno restaura foco no controle que a abriu.

### Esquema móvel

```text
┌ missão · horário · pausa ┐
│                         │
│      CAMPO TÁTICO       │
│ unidade → rota → alvo   │
│                         │
├ miniatura · Able · 21 ──┤
│ Mover  Cobrir  Observar │
├ prévia + confirmar* ───┤
└ Resolver turno** ───────┘
* só no estado de prévia
** oculto/substituído durante confirmação de destino
```

## 9. Arquitetura e persistência

Separar componentes hoje concentrados em `command-app.ts`: controlador de interação, barra de unidade, prévia de ordem e folha de detalhes. `CommandMap` emite seleção/gesto; não decide abrir menus. Consultas de validade retornam motivo e custo sem alterar o estado.

Arquivos propostos, a ajustar durante execução:

| Área | Alteração |
| --- | --- |
| `src/game/tactical-map.ts` | Câmera, LOD, camadas, gestos, hitboxes e informação parcial |
| `src/game/world-figures.ts` | Renderizador por tipo, sprite e fallback semântico |
| `src/content/unit-visuals.ts` (novo) | Relação entre classe, imagem de ficha, sprite e estado de revisão |
| `src/ui/map-interaction.ts` (novo) | Estados de seleção/ação/destino/prévia |
| `src/ui/unit-command-bar.ts` e `unit-detail-sheet.ts` (novos) | Controles separados, responsivos e acessíveis |
| `src/core/operations-types.ts` e motor | Identidades e regras de equipamento apenas onde houver expansão de simulação |
| `src/core/persistence.ts` | Versão/migração e validação de IDs, quantidades, alocação e perdas |
| CSS de comando/cinemático/imersão | Remover sobreposição e especificidade duplicadas; centralizar regras do campo |
| `public/assets/sprites/` | Derivados separados dos originais aprovados |

Manifest visual sugerido: `visualId`, `sourceAssetId`, `classId`, `spriteFile`, `cardFile`, `pivot`, `nativeFacing`, `displayScale`, `reviewStatus`. Entidade de jogo referencia classe/identidade; caminho de arquivo não é regra de combate.

Mudanças puramente visuais mantêm saves v3. Roster de equipamentos exige migração versionada própria, mantendo cópia recuperável da partida anterior. Não converter silenciosamente o contador de aviões de uma campanha avançada em seis aeronaves com histórias inventadas: preservar modo legado ou migrar apenas quando a equivalência puder ser comprovada. Nenhum save antigo ganha tanque, combustível, morto ressuscitado ou benefício extra.

## 10. Desempenho e acessibilidade

- Carregar arte só da campanha e dos detalhes abertos. Não carregar todas as imagens do catálogo no menu. Meta da Bíblia: primeira carga inferior a 8 MB transferidos; medir cache frio, incluindo arte, e registrar resultado.
- Cachear terreno estático; usar atlas se medição justificar; redesenhar apenas quando houver mudança/animação. Limitar partículas e densidade de pixels em aparelhos modestos.
- Meta de 60 fps no aparelho de referência e mínimo estável de 30 fps no aparelho Android definido para QA. São metas a medir, não certificação; registrar hardware, duração e versão.
- Texto de interface em tamanho legível, evitando microtipografia atual; alvo inicial de 14–16 px para informações operacionais. Controles de pelo menos 44 px e contraste verificado.
- Movimento reduzido remove deriva/partículas não essenciais e preserva informação. Áudio nunca é condição para saber que houve contato ou resposta.
- Canvas possui equivalente acessível em lista de formações/contatos conhecidos e seleção de destino por coordenadas. Tabulação, foco, Escape e leitor de tela devem permitir o mesmo ciclo de ordem.

## 11. Plano de execução em uma entrega consolidada

Executar na ordem abaixo, com commits internos e uma publicação final, após o próximo pedido do autor:

1. **Auditoria e matriz de conteúdo:** confirmar Bíblia atual, inventário, estados da missão, modelos permitidos e referências técnicas. Listar lacunas reais sem interromper trabalho independente.
2. **Interação primeiro:** implementar máquina de estados e barra/folha móvel com figuras provisórias identificáveis; eliminar abertura automática da gaveta e validar seleção → destino → confirmação.
3. **Campo e câmera:** redesenhar terreno ortogonal sem alterar silenciosamente colisão; pan/zoom/LOD, alvos de toque e rótulos; validar três mapas.
4. **Produção e integração visual:** reaproveitar fichas aprovadas, produzir derivados necessários, revisar ângulo/transparência/escala e conectar por classe/estado.
5. **Equipamentos funcionais:** adicionar somente entidades sustentadas pelo pacote; treinamento demonstra classes adicionais. Aviação recebe roster/controles coerentes quando sua definição estiver resolvida. Não declarar frota jogável apenas porque há PNGs.
6. **Verificação e publicação:** testes, sessões por toque/teclado, comparação visual, orçamento de carregamento, migração, build, upload e conferência pública da nova versão.

Se uma identidade histórica continuar indefinida, não inventar: usar identificação genérica permitida e registrar a limitação. Se um sistema de frota/voo não estiver pronto, não marcar esse item como entregue nem substituir por animação decorativa. A publicação deve descrever exatamente o que passou nos critérios abaixo.

## 12. Critérios de aceite e testes

### Interação

- Tocar unidade não abre painel grande; tocar chão no modo explorar não emite ordem.
- Selecionar → Mover → destino → Confirmar funciona no celular sem coordenadas digitadas.
- Unidade selecionada, destino, custo, duração estimada e ordem vigente são visíveis e inequívocos.
- Fechar detalhes funciona sempre; o próximo toque no mapa não os reabre automaticamente.
- Confirmar/cancelar não perde câmera; arrasto, pinça, `pointercancel` e duplo toque não geram ordens acidentais.
- Seleção de unidades próximas é determinística; sobreposição permite escolher a unidade correta.
- Ação indisponível explica causa; prévia não consome PC/recursos nem altera PRNG; confirmação consome uma vez.

### Arte e simulação

- Cada unidade tem aparência correspondente ao tipo; sprite respeita vista superior e alfa verdadeiro.
- Arte aprovada preservada; não usar retrato de outra pessoa nem modelo de equipamento incompatível.
- Acervo não gera entidades na campanha. M01 continua sem reforço de veículos não autorizado.
- Roster aéreo, se introduzido, conserva seis registros, perdas e alocação; nenhuma aeronave voa sem requisitos.
- Movimento, fogo, avaria e reparo exibidos correspondem a eventos reais e observáveis. Não revelar inimigos ocultos por sprite, alcance ou efeito.
- Repetir/pular turno visual produz exatamente o mesmo estado final.

### Matriz de QA

Testar 320×568, 360×800, 390×844, 768×1024, 844×390 e 1366×768; incluir Android real se disponível, não apenas viewport em desktop. Conferir barras do navegador, teclado virtual, retrato/paisagem, texto longo e área segura. Sem dispositivo real, registrar a limitação claramente.

Automatizar testes do controlador de interação, transformação mundo/tela, seleção, validade de ordens, invariantes de equipamento e migração. Manter os 54 testes existentes como regressão, ampliando somente onde houver comportamento novo. Realizar jornadas completas nas três campanhas e no treinamento de equipamentos; salvar capturas de antes/depois, incluindo ficha fechada, unidade selecionada, rota pronta e painel expandido.

**Pronto para entrega:** fluxo completo legível no celular, mapa utilizável sem obstrução permanente, artes e entidades coerentes com o pacote, testes/build aprovados, pendências de conteúdo descritas sem alegações falsas e versão pública conferida. Som gravado permanece na entrega futura já combinada; não bloqueia esta reformulação.

## 13. Handoff para a próxima conversa

Ao receber o pedido de execução, começar por este documento, pelo estado atual do Git e pela Bíblia atualizada. Reutilizar a base existente; não refazer retratos/cinemáticas já aprovados. Prioridade absoluta: resolver a seleção e a obstrução móvel antes de ampliar o catálogo visual. Manter o autor informado sobre conteúdo que a Bíblia não define, continuar o restante autonomamente e terminar com evidência do jogo publicado.

Este planejamento não altera código, saves, assets de produção ou deploy. As duas capturas foram copiadas para `docs/planning/references/` para não dependerem de arquivos temporários do computador.
