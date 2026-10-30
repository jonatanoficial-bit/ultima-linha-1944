# Edição 0.6 — Rostos da linha

Parte 2 do plano de imersão, com produção dos arquivos de som adiada a pedido do autor. Referência de conteúdo: Bíblia Mestra do projeto, consultada na cópia local de produção. O jogo continua em desenvolvimento; esta entrega não equivale à implementação integral da Bíblia ou a certificação Steam/Xbox.

## Implementado

- Três retratos originais por IA: Brooks (42), Ward (30) e Turner (23), vinculados a identidades canônicas. Ward continua personagem médica agregada fictícia.
- Registro de pessoas, ordens aceitas e consequências operacionais. As decisões passam a ter memória própria no save, mesmo após redução do diário. Saves antigos preservam somente o que realmente registraram.
- Confiança por canal derivada das decisões conhecidas. Brooks começa em 43 e Ward em 44 conforme referência; 38 nos demais canais é uma convenção desta implementação. O efeito de confiança já definido em cada escolha alimenta a apresentação daquele interlocutor; não é um segundo modificador de combate.
- Chamadas recebidas com rosto quando disponível, reação e situação de pessoal. Turner presente no rádio de saída; solicitações continuam sujeitas a PC, espera, resposta e estoque externo.
- Figuras de infantaria e silhuetas navais substituem os retângulos das formações. Passos/esteiras acompanham movimento registrado. Aeronaves estacionadas refletem a disponibilidade da base; equipes de chão não são apresentadas como aeronaves em voo.
- Marcas persistentes de contatos que causaram perdas, sem representar destruição de edifícios não simulada. Iluminação noturna segue o relógio de operação. Ambiente visual com movimento discreto e respeito a movimento reduzido.
- Volume ajustável, suspensão em aba oculta, mixagem configurável e slots para sete gravações futuras. Áudio opcional e informação equivalente em texto.

## Limites mantidos

Cedar e os demais setores táticos são cenários de operação fictícios; a carta regional histórica continua no arquivo. Esta entrega não inventa cartografia documental, clima dinâmico, destruição estrutural, baixas individuais nomeadas ou retratos de personagens que não foram produzidos. Roster completo, subturnos táticos, combate aéreo estratégico e compartimentos navais pertencem à expansão de sistemas, fora deste plano de imersão. A simulação continua por turnos; rever/pular apresentações não executa novos turnos.

## Validação

Testes de motor, operações, narrativa, apresentação, identidades e memória; compilação TypeScript; build Vite; hashes das nove cenas originais. Testes adicionais cobrem memória após corte do diário e rejeição de escolhas forjadas ou marcas fora do mapa/futuras. Revisão de interface nos três domínios e em viewport estreita registrada no fechamento da entrega.

Produção futura: [prompts de áudio](audio-production-prompts.md). Registro de arte: [prompts dos retratos](portrait-production-0.6.md).

Fechamento: 54 testes aprovados em 8 arquivos; TypeScript e build aprovados; nove hashes cinematográficos intactos. Navegador: prólogos e campos dos três domínios, chamada/decisão/recarga no Exército, solicitação ao batalhão e resposta no turno seguinte, retratos no registro, volume mantido na pausa, viewport de 390 px sem transbordamento horizontal. Nenhum erro de console observado. Testes de áudio cobrem slots vazios, ganhos, troca de campanha, suspensão e fallback de gravação indisponível.
