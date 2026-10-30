# Bíblia Mestra → edição 0.5 · O peso da ordem

Referência: exportação local da Bíblia Mestra já utilizada nas versões anteriores, conferida novamente nas seções de prólogo, personagens, comunicações, resolução de turnos e artes pendentes.

## Contrato de apresentação

O redutor retorna recibos de acontecimentos em `Transition.events`, separados do save. `tickOperation` usa a mesma aleatoriedade e regras, sem sorteios adicionais para animações. Caminhos contêm apenas células efetivamente percorridas. Contatos registram tiros efetivamente consumidos; a origem de um atacante só é exposta se observada no instante do encontro. Não há som direcional que revele uma coordenada oculta.

O diretor de apresentação mantém uma cópia visual descartável do estado anterior. Ao terminar ou pular, mostra o estado final já salvo. Nenhuma animação avança tempo, reaplica custos ou aplica uma decisão. A câmera retorna ao enquadramento anterior. Aba oculta pausa a execução, e retomada exige ação do jogador. Redução de movimento inicia com quadros estáticos e avanço manual.

A execução é uma representação resumida do período. **Não implementa os quatro subturnos táticos da Bíblia**, nem transforma desenhos do mapa em simulação individual de combate. As posições inimigas conhecidas são atualizadas ao retornar ao estado final; movimentos inimigos completos não são reencenados nesta etapa.

## Conteúdo preservado

Mercer continua segundo-tenente, Brooks organiza a companhia, Ward permanece oficial médica agregada fictícia e Reed representa o batalhão. Não foi aberto acesso irrestrito a generais. A cena usada na comunicação é identificada como ambiente; não é um retrato individual novo aprovado. Os retratos P002/P004/P005 continuam pendentes conforme a Bíblia. As nove artes originais permanecem intactas.

Os postos usam ilustrações já aprovadas. Não se afirma que são espaços 3D ou ambientes interativos livres. A confiança exibida é compartilhada; memórias usam o diário existente. Não foi inventado um sistema de relações por pessoa.

## Verificação

Testes do motor e das três campanhas, recibos determinísticos, rotas, proteção de coordenadas ocultas, preservação do save, compatibilidade 0.3/0.4 e ciclo de vida da apresentação. TypeScript e compilação de produção. QA no navegador registrada na conclusão da entrega; este documento não substitui a verificação visual.

O [plano de imersão](immersion-plan.md) agrupa o trabalho em duas partes e delimita a parte restante.
