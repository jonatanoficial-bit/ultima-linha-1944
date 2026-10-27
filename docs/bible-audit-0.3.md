# Bíblia Mestra → edição 0.3

Referência de autoria: [Bíblia Mestra de Última Linha — 1944](https://docs.google.com/document/d/1JRYP_Hk7IJlhCgYjGs0inozYO6W_-_d3dJLfVWfXcwk/edit). Implementação conferida com a exportação local da Bíblia, incluindo a errata das três campanhas, prólogos P00, mapas M01/A01/N01, efetivos e comunicações.

## Implementado nesta etapa

| Referência | Comportamento verificável |
| --- | --- |
| Mercer, segundo-tenente em comando provisório | Patente e retrato P001 no prólogo. Nenhuma promoção automática a capitão. |
| Cedar: 118 pessoas, 66 capazes | Registro 66/19/14/19; formações HQ 4, Able 21, Baker 18, Charlie 17, apoio 6. Ferimentos e triagem conservam a soma. |
| Geografia M01 persistente 40×30 | Estrada, ponte, bosque, posto médico, povoado, objetivo e formações mantêm posição entre turnos. Sem sorteio de terreno a cada render. |
| Inimigos finitos e informação parcial | Cinco formações com 57 homens no total; perdas não reaparecem; munição finita. IA usa observação local e último alvo, jogador vê apenas contatos observados. |
| Comando por formação | Movimento ortogonal validado por rota, bosque custa mais; cobertura reduz exposição. Uma ordem por formação/período, custo de comando e confirmação. |
| M01: 18 períodos de 2 h | Janela de 20/12 às 18 h até 22/12 às 6 h; terreno, tarefas e pessoal persistem. |
| Cadeia de comando | Contatos de batalhão, mesa médica, logística e Maple; nenhum acesso irrestrito a generais. Rádio, contato local e ligação reparada por fio. |
| Pedidos não equivalem a entregas | Resposta em 1–2 turnos, falha/negação/autorização parcial, portador posterior, reserva compartilhada finita e retenção se falta cobertura do acesso. Entrega contabilizada uma só vez. |
| Decisões e tensão de comando | Seis eventos por carreira, incluindo Donovan, feridos, civis, ordem aérea e avarias. Prévia das consequências, aplicação única, diário e bloqueio do avanço enquanto a chamada prioritária aguarda. |
| A01: 12 aviadores + 24 pessoas de solo | 36 no registro: 18 capazes, 10 feridos/limitados, 3 desaparecidos, 5 indisponíveis. Aeródromo 48×36, 14 períodos de 60 min, pista 46, 2 aeronaves aptas, 2 reparáveis, combustível 18, peças 12. |
| Recuperação aérea | Pista e aeronaves exigem peças/equipes/tempo; reconhecimento exige pista ≥65%, combustível e aeronave. Aeronave comprometida até retorno, com risco de perda. |
| N01: 82 tripulantes | 48 capazes, 17 feridos, 9 desaparecidos, 8 mortos; casco 54, propulsão 38, rádio 29, combustível 34. |
| Retorno naval condicionado | Mar 60×40, 14 períodos de 60 min; navegação depende de propulsão/combustível. Inundação e contatos degradam casco. Porto somente após alcançar a zona, com casco positivo e a partir do período 8. Sem retorno automático após naufrágio. |
| Artes aprovadas | Os 45 arquivos permanecem no catálogo. Fundos próprios de cada campanha e Mercer no prólogo. Nenhum retrato genérico apresentado como Walker/Sullivan canônicos. |
| Estado local e reprodutibilidade | Redutor determinístico, confirmação de ordens, saves por carreira, exportação/importação validada. Testes de replay até o encerramento nas três operações. |

## Ainda não implementado integralmente

- Os 118 registros individuais, ferimentos por pessoa, relações persistentes e consequências entre missões. Triagem e combate ainda operam por formações/contagens agregadas.
- Os quatro subturnos táticos de 15 minutos dentro da janela operacional de M01. O protótipo resolve o período completo numa etapa.
- Inventário detalhado por calibre, tipo de alimento, ferramenta, cobertor e peça; parte do material ainda é agregada. Não há representação física do mensageiro com débito individual de pessoal.
- Todos os eventos e desfechos canônicos, telefonemas com diálogos ramificados completos, falas gravadas, comunicações condicionadas por posição de cada personagem e todas as variações de disciplina. Parte das escolhas ainda afeta indicadores globais.
- Mapa aéreo estratégico 60×40, modelo de pilotos por aeronave, manutenção por especialidade, dano estrutural por componente, meteorologia dinâmica e combate aéreo visual.
- Compartimentos internos do navio, equipes individualizadas, manobras e identificação detalhada de contatos, simulação balística naval e conteúdo completo da fase de porto.
- A atribuição de base, porto e datas específicas para A01/N01. O relógio de dezembro é um marcador de simulação; não estabelece evento histórico documentado.
- Animações de combate em escala de personagem, campanha posterior a estas três operações, controles completos de gamepad, certificação Steam/xCloud e empacotamento offline instalável.

## Decisões de implementação e compatibilidade

A compra instantânea de unidades por reputação deixou o fluxo jogável. Os módulos antigos de suporte/progressão continuam no histórico técnico, mas o novo posto não cria tanques, pilotos ou navios por compra. Recursos externos vêm de uma reserva finita, com pedido e entrega separados.

O renderizador usa um único canvas persistente, com câmera reaproveitada e observador de tamanho. A interface anterior criava novas instâncias de mapa ao reconstruir a página; foi removida. Arte de apresentação permanece separada da simulação e não é tratada como fotografia documental.

Saves da edição 0.2 não contêm posições e tarefas do novo modelo. Permanecem na chave antiga e não são sobrescritos nem convertidos com dados inventados. A edição 0.3 usa `ultima-linha-1944/command-save/v3/<missionId>` e permite exportação/importação. Definições de missão sempre vêm do pacote instalado, nunca do arquivo importado.

## Carta histórica

Arquivo incluído: `public/assets/maps/bastogne-20-dec-1944.jpg`.

- Instituição: U.S. National Archives and Records Administration (NARA).
- [Registro de catálogo 152951359](https://catalog.archives.gov/id/152951359).
- [Página de mapas da Segunda Guerra Mundial](https://www.archives.gov/research/cartographic/ww2).
- [Imagem publicada pela instituição](https://www.archives.gov/files/74003581-002.jpg).
- A folha registra a situação de 20 de dezembro de 1944; o rodapé indica reprodução em janeiro de 1945. É referência regional e pode ser aberta em sua resolução original no jogo.

O setor Cedar continua explicitamente fictício e inspirado nos acessos Neffe/Bizory, como a Bíblia estabelece. A carta de arquivo não comprova coordenadas, personagens nem posições criadas para a missão.
