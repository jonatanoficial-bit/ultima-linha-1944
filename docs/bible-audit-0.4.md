# Bíblia Mestra → edição 0.4 · Sob seu comando

Referência: [Bíblia Mestra](https://docs.google.com/document/d/1JRYP_Hk7IJlhCgYjGs0inozYO6W_-_d3dJLfVWfXcwk/edit), seção 03, P00/P00-AIR/P00-NAVY, e pacote de nove cenas fornecido pelo autor em 28/10/2026. O README e a auditoria anexados ao ZIP são metadados de produção; a autorização para integrar veio do pedido do usuário.

## Cenas recebidas e integração

- Exército: CIN02 nas falas de abertura, Bell e Brooks; CIN03 na fala de Ward; CIN04 na transmissão de Turner e decisão inicial. O quadro de ruínas acompanha a abertura textual; não é apresentado como a arte ainda pendente CIN01 de bosque.
- Aviação: AIR_CIN01 nos destroços e na primeira escolha; AIR_CIN02 no retorno; AIR_CIN03 na transferência de responsabilidade. A escolha fica registrada e só é aplicada ao estado inicial uma vez, na entrada no campo.
- Marinha: NAV_CIN01 na ponte; NAV_CIN02 nos pedidos de máquinas/enfermaria; NAV_CIN03 na decisão de comando. Nenhum quadro pressupõe retorno bem-sucedido ou ressurreição dos oficiais.
- Os nove PNGs permanecem byte a byte iguais aos arquivos recebidos, 1672×941. Caminhos e hashes constam no manifesto entregue, preservado em `public/assets/cinematic-scenes.manifest.json`. O campo `publicationStatus` desse manifesto descreve o pacote na origem; esta auditoria registra sua incorporação ao projeto.
- Cenas também disponíveis no Arquivo de guerra. As 45 artes anteriores permanecem intactas. Uma cena com Walker ou Sullivan não é cadastrada como retrato individual P023/P024.

## Apresentação e fluxo

Imagem em tela inteira, sobreposição discreta de fala e controles, transição entre quadros decodificados, pré-carregamento da próxima cena e tentativa de recarga em caso de falha. Telas verticais preservam a composição completa da arte na área superior, sem deformação. A opção Ver cena esconde a legenda e pode ser revertida.

Avanço manual, retorno entre falas anteriores à escolha, histórico, modo automático por tempo de leitura e pular com resumo. O automático para diante de uma decisão, quando um diálogo é aberto e quando a aba fica oculta. Pular não inventa uma decisão neutra: exige escolha explícita e registra a abreviação no diário. Essa opção difere do ramo sintético neutro descrito na Bíblia, para manter agência e consequências explícitas nesta etapa.

As estatísticas e os custos das escolhas iniciais permanecem os do protótipo 0.3. O fluxo aéreo agora respeita a posição temporal da escolha, mas ainda não implementa busca individual de operador, simulação médica individual ou toda a árvore de consequências da Bíblia.

Ambiente sonoro procedural discreto por domínio, ligado somente pelo jogador; nenhum áudio gravado, dublagem ou música foi anunciado como existente. Silenciado quando a aba fica oculta. Transições respeitam a preferência do sistema por redução de movimento.

## Evolução de comando

Modo de foco amplia a carta e recolhe os painéis. Em telas menores o campo e a barra de turno permanecem dentro da janela; Ordens abre um painel sobre o mapa com fechamento acessível. Seleção de formações, rádio e tarefas continuam disponíveis.

Ordens inválidas são desabilitadas com a mesma validação do redutor. Destinos inacessíveis recebem uma marca vermelha. O painel apresenta extensão da rota e estimativa em turnos usando o custo dos bosques e a propulsão atual. A estimativa não promete segurança nem prevê avarias futuras. Antes de resolver um turno, a confirmação mostra as ordens mantidas, novas ordens, trabalhos e pontos de comando não utilizados.

Atalhos F, 1–5, R/O/J e setas no canvas complementam os controles de toque/mouse. Não há suporte completo de gamepad nesta edição.

## Compatibilidade e verificação

Estado novo identifica `gameVersion: 0.4.0`; o decodificador aceita 0.3.0 e 0.4.0, mantendo o envelope e o slot v3. Nenhum salvamento existente é substituído apenas por ver cenas; a troca acontece após confirmação de nova operação, escolha e entrada no campo. O teste de compatibilidade preserva recursos, estatísticas, escolha, turno e decisões da versão anterior.

Validação automatizada: integridade das nove imagens, TypeScript, build e testes do motor, campanhas completas, narrativa e saves. Verificação no navegador: três prólogos, bloqueio nas escolhas, resumo, entrada no campo, ordem terrestre e resolução de turno, painéis responsivos e compatibilidade de apresentação.

## Próximos sistemas

As pendências de simulação da [auditoria 0.3](bible-audit-0.3.md) continuam: pessoas individualizadas, subturnos, eventos e diálogos completos, operação aérea estratégica, compartimentos navais e episódios posteriores. Este incremento entrega narrativa ilustrada e melhor interação no campo; não representa certificação Steam/xCloud, qualidade AAA concluída ou reconstrução documental dos equipamentos nas ilustrações.
