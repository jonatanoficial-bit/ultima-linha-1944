import type { BranchId } from "../core/contracts";
import type {
  OperationDefinition,
  Terrain,
  RadioEvent,
  Effects,
  Formation,
} from "../core/operations-types";

// Fixed authored geometry: the same geography is retained across turns and seeds.
const terrain = (
  columns: number,
  rows: number,
  domain: "ground" | "air" | "navy",
): Terrain[] => {
  const cells: Terrain[] = Array(columns * rows).fill(
    domain === "navy" ? "water" : "field",
  );
  const rect = (x: number, y: number, w: number, h: number, type: Terrain) => {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i >= 0 && j >= 0 && i < columns && j < rows)
          cells[j * columns + i] = type;
  };
  if (domain === "ground") {
    rect(23, 2, 12, 8, "forest");
    rect(2, 2, 10, 6, "forest");
    rect(25, 20, 11, 8, "forest");
    rect(15, 22, 5, 5, "forest");
    rect(0, 13, 40, 2, "road");
    rect(10, 5, 2, 22, "road");
    rect(18, 7, 2, 16, "road");
    rect(8, 12, 6, 8, "village");
    rect(15, 10, 3, 3, "rubble");
    for (let y = 0; y < rows; y++) {
      const x = 30 + Math.round(Math.sin(y / 5) * 2);
      cells[y * columns + x] = "water";
    }
    rect(29, 13, 5, 2, "road");
  } else if (domain === "air") {
    rect(0, 0, 8, 36, "forest");
    rect(40, 0, 8, 36, "forest");
    rect(21, 3, 5, 30, "runway");
    rect(10, 18, 27, 2, "road");
    rect(12, 10, 6, 5, "village");
    rect(30, 12, 6, 5, "rubble");
    rect(12, 23, 6, 4, "village");
    rect(30, 25, 6, 4, "village");
  } else {
    rect(0, 0, 8, 18, "forest");
    rect(0, 25, 11, 15, "forest");
    rect(8, 27, 5, 7, "village");
    rect(39, 3, 8, 8, "forest");
    rect(27, 29, 6, 7, "forest");
  }
  return cells;
};
const unit = (
  id: string,
  name: string,
  role: string,
  x: number,
  y: number,
  strength: number,
): Formation => ({ id, name, role, x, y, strength, order: "hold" });
const event = (
  id: string,
  turn: number,
  from: string,
  title: string,
  text: string,
  options: [string, string, Effects][],
): RadioEvent => ({
  id,
  turn,
  from,
  title,
  text,
  choices: options.map(([label, consequence, effects], i) => ({
    id: `${id}-${i}`,
    label,
    consequence,
    effects,
  })),
});
const armyEvents: RadioEvent[] = [
  event(
    "ground-command",
    1,
    "1st Sgt. Samuel Brooks",
    "A companhia espera sua ordem",
    "“Temos homens suficientes para defender alguma coisa, senhor. Mas não podemos defender tudo.” Donovan exige saber por que deve seguir um oficial tão jovem.",
    [
      [
        "Ouvir Donovan e delegar o flanco",
        "Confiança +8; informação +5.",
        { trust: 8, stats: { intelligence: 5 }, flag: "delegated" },
      ],
      [
        "Explicar o plano a toda a companhia",
        "Moral +5; legitimidade +5.",
        { stats: { morale: 5, legitimacy: 5 }, flag: "transparent" },
      ],
      [
        "Exigir silêncio e prontidão",
        "Prontidão +6; confiança −8.",
        { stats: { readiness: 6 }, trust: -8, flag: "strict" },
      ],
    ],
  ),
  event(
    "ground-orders",
    3,
    "Major Andrew Reed · batalhão",
    "Mantenha o acesso leste",
    "O rádio recupera parte da mensagem: “Cedar, confirme seu efetivo. Não tenho homens para lhe enviar. Preciso saber se mantém a estrada.”",
    [
      [
        "Transmitir o quadro real e pedir orientação",
        "Confiança +6; informação +8.",
        { trust: 6, stats: { intelligence: 8 } },
      ],
      [
        "Assumir compromisso de manter a estrada",
        "Legitimidade +8; moral −3. Compromisso registrado.",
        { stats: { legitimacy: 8, morale: -3 }, flag: "pledged-road" },
      ],
    ],
  ),
  event(
    "ground-missing",
    5,
    "Posto Maple",
    "Vozes no bosque",
    "Uma patrulha ouviu vozes a nordeste. Podem ser homens de Cedar desaparecidos. A observação ainda é incerta.",
    [
      [
        "Ordenar reconhecimento antes de avançar",
        "Informação +12; fadiga +4.",
        { stats: { intelligence: 12, fatigue: 4 }, flag: "searched" },
      ],
      [
        "Manter a reserva protegendo a estrada",
        "Defesa +5; confiança −3.",
        { stats: { defense: 5 }, trust: -3 },
      ],
    ],
  ),
  event(
    "ground-medical",
    7,
    "2nd Lt. Helen Ward",
    "A noite na enfermaria",
    "Dezenove feridos chegaram ao posto. Ward precisa de material e de homens descansados; obras e cuidados disputam a mesma capacidade.",
    [
      [
        "Priorizar os cuidados e os abrigos",
        "Moral +8; prontidão −4; confiança +4.",
        {
          stats: { morale: 8, readiness: -4 },
          trust: 4,
          flag: "medical-priority",
        },
      ],
      [
        "Manter a defesa e solicitar kits pelo rádio",
        "Defesa +5; moral −3. Pedido deve ser transmitido.",
        { stats: { defense: 5, morale: -3 } },
      ],
    ],
  ),
  event(
    "ground-civilian",
    10,
    "Samuel Brooks",
    "Uma porta ainda aberta",
    "Quatro moradores permanecem na casa ao sul. Aceitam abrigar feridos se a passagem continuar protegida.",
    [
      [
        "Aceitar com consentimento e proteger a passagem",
        "Moral +6; defesa −3; confiança +5.",
        {
          stats: { morale: 6, defense: -3 },
          trust: 5,
          flag: "civilian-shelter",
        },
      ],
      [
        "Concentrar atendimento no posto",
        "Prontidão +4; fadiga +3.",
        { stats: { readiness: 4, fatigue: 3 } },
      ],
    ],
  ),
  event(
    "ground-late",
    14,
    "Major Andrew Reed",
    "O limite da companhia",
    "“Não confunda manter uma posição com perder todos nela. Relate a estrada e prepare uma alternativa.”",
    [
      [
        "Organizar linha de retirada",
        "Rádio +7; prontidão +5. Alternativa de retirada registrada.",
        { stats: { radio: 7, readiness: 5 }, flag: "withdrawal-plan" },
      ],
      [
        "Reafirmar a defesa até o amanhecer",
        "Defesa +8; fadiga +6.",
        { stats: { defense: 8, fatigue: 6 }, flag: "last-stand" },
      ],
    ],
  ),
];
const airEvents: RadioEvent[] = [
  event(
    "air-return",
    1,
    "Oficial de operações",
    "A última ala",
    "O esquadrão perdeu a coordenação. Duas aeronaves podem voar; outras duas precisam de peças. O comando espera seu plano.",
    [
      [
        "Recuperar a pista antes de prometer uma saída",
        "Confiança +6; prontidão +4.",
        { trust: 6, stats: { readiness: 4 } },
      ],
      [
        "Preservar pilotos e reorganizar a equipe",
        "Moral +7; fadiga −6.",
        { stats: { morale: 7, fatigue: -6 } },
      ],
    ],
  ),
  event(
    "air-lost",
    3,
    "Operador da base",
    "Piloto fora de contato",
    "Uma transmissão interrompida chegou do setor aéreo. A localização do piloto permanece incerta.",
    [
      [
        "Triangular a transmissão",
        "Informação +12; rádio −3.",
        { stats: { intelligence: 12, radio: -3 } },
      ],
      [
        "Manter o canal para a base",
        "Rádio +5; confiança −3.",
        { stats: { radio: 5 }, trust: -3 },
      ],
    ],
  ),
  event(
    "air-hangar",
    5,
    "Chefe de manutenção",
    "O hangar cede",
    "Parte da cobertura ameaça a aeronave reparável. A equipe pede que você decida onde concentrar o trabalho.",
    [
      [
        "Retirar a equipe e proteger o material",
        "Peças −2; moral +6.",
        { systems: { parts: -2 }, stats: { morale: 6 } },
      ],
      [
        "Reforçar a cobertura com material da pista",
        "Materiais −2; prontidão +5.",
        { resources: { materials: -2 }, stats: { readiness: 5 } },
      ],
    ],
  ),
  event(
    "air-demand",
    7,
    "Grupo aéreo",
    "A ordem de saída",
    "O grupo solicita reconhecimento. Seu relatório deverá explicar se a pista, o combustível e os pilotos permitem autorizar a missão.",
    [
      [
        "Aceitar sob condições de segurança",
        "Confiança +5. Preparar uma saída continua exigindo pista e combustível.",
        { trust: 5, flag: "sortie-requested" },
      ],
      [
        "Adiar e assumir a responsabilidade",
        "Legitimidade −5; moral +7. Preservação deliberada registrada.",
        { stats: { legitimacy: -5, morale: 7 }, flag: "preserve-air" },
      ],
    ],
  ),
  event(
    "air-veteran",
    10,
    "Piloto veterano",
    "Não consigo decolar assim",
    "O veterano pede descanso. A voz está firme, mas suas mãos tremem.",
    [
      [
        "Retirar a equipe da escala por este período",
        "Fadiga −12; prontidão −4.",
        { stats: { fatigue: -12, readiness: -4 } },
      ],
      [
        "Redistribuir tarefas e ouvir a equipe",
        "Moral +4; confiança +5.",
        { stats: { morale: 4 }, trust: 5 },
      ],
    ],
  ),
  event(
    "air-weather",
    12,
    "Meteorologia",
    "Janela estreita",
    "A nuvem baixa não desapareceu. Existe uma janela limitada, sujeita à condição da ala.",
    [
      [
        "Manter a decisão condicionada à prontidão",
        "Informação +8; confiança +4.",
        { stats: { intelligence: 8 }, trust: 4 },
      ],
      [
        "Preservar a ala para o relatório",
        "Moral +5; legitimidade −3.",
        { stats: { morale: 5, legitimacy: -3 }, flag: "preserve-air" },
      ],
    ],
  ),
];
const navyEvents: RadioEvent[] = [
  event(
    "nav-damage",
    1,
    "Oficial de ponte",
    "O comando é seu",
    "O comandante e o imediato não responderão. Máquinas pede gente; a enfermaria também. A tripulação espera uma decisão.",
    [
      [
        "Dar prioridade ao controle de danos",
        "Propulsão +5; moral −3.",
        { systems: { propulsion: 5 }, stats: { morale: -3 } },
      ],
      [
        "Proteger primeiro a tripulação ferida",
        "Moral +8; confiança +5.",
        { stats: { morale: 8 }, trust: 5 },
      ],
    ],
  ),
  event(
    "nav-fog",
    3,
    "Vigia de proa",
    "Contato na neblina",
    "Uma silhueta cruza a rota. A vigia não tem identificação suficiente para abrir fogo.",
    [
      [
        "Manter distância e observar",
        "Informação +12; combustível −2.",
        { stats: { intelligence: 12 }, systems: { fuel: -2 } },
      ],
      [
        "Manter formação e transmitir identificação",
        "Rádio +6; prontidão +3.",
        { stats: { radio: 6, readiness: 3 } },
      ],
    ],
  ),
  event(
    "nav-crew",
    5,
    "Chefe de máquinas",
    "A equipe está no limite",
    "Um marinheiro se recusa a continuar o turno. Os demais aguardam sua reação.",
    [
      [
        "Ouvir e redistribuir a vigia",
        "Fadiga −9; confiança +6.",
        { stats: { fatigue: -9 }, trust: 6 },
      ],
      [
        "Cobrar disciplina e manter o serviço",
        "Prontidão +5; moral −5.",
        { stats: { readiness: 5, morale: -5 } },
      ],
    ],
  ),
  event(
    "nav-orders",
    7,
    "Grupo-tarefa",
    "Duas mensagens, dois rumos",
    "Uma ordem manda manter estação; a segunda menciona retorno. O trecho final está ilegível.",
    [
      [
        "Pedir confirmação e preparar retorno",
        "Informação +9; confiança +5.",
        { stats: { intelligence: 9 }, trust: 5, flag: "return-plan" },
      ],
      [
        "Manter a última ordem confirmada",
        "Legitimidade +5; combustível −2.",
        { stats: { legitimacy: 5 }, systems: { fuel: -2 } },
      ],
    ],
  ),
  event(
    "nav-fuel",
    10,
    "Máquinas",
    "Reserva de combustível",
    "O chefe pede uma margem para manobrar perto do porto. Velocidade e autonomia já não podem crescer juntas.",
    [
      [
        "Racionar e reduzir a carga de serviço",
        "Combustível +0; fadiga −6; consumo reduzido.",
        { stats: { fatigue: -6 }, flag: "economy" },
      ],
      [
        "Manter o ritmo para alcançar a costa",
        "Prontidão +7; combustível −3.",
        { stats: { readiness: 7 }, systems: { fuel: -3 } },
      ],
    ],
  ),
  event(
    "nav-final",
    12,
    "Oficial de ponte",
    "Preservar o navio, preservar os homens",
    "A ponte precisa conhecer sua prioridade para a última janela de navegação.",
    [
      [
        "Preparar resgate se a condição piorar",
        "Confiança +5; rádio +8.",
        { trust: 5, stats: { radio: 8 }, flag: "rescue-plan" },
      ],
      [
        "Sustentar o retorno com a tripulação",
        "Moral +7; fadiga +4.",
        { stats: { morale: 7, fatigue: 4 }, flag: "return-plan" },
      ],
    ],
  ),
];
// An exhausted depot must never make a mandatory narrative decision impossible.
airEvents
  .find((e) => e.id === "air-hangar")!
  .choices.push({
    id: "air-hangar-2",
    label: "Interditar o hangar e retirar a equipe",
    consequence: "Prontidão −6; moral −4. Sem consumo de estoque.",
    effects: { stats: { readiness: -6, morale: -4 }, flag: "hangar-closed" },
  });
export const OPERATIONS: Record<BranchId, OperationDefinition> = {
  army: {
    title: "SETOR CEDAR",
    commander: "Daniel Mercer",
    rank: "2nd Lieutenant · comando provisório",
    start: "1944-12-20T18:00:00Z",
    minutes: 120,
    weather: "NEVE · VISIBILIDADE REDUZIDA",
    columns: 40,
    rows: 30,
    terrain: terrain(40, 30, "ground"),
    places: [
      { name: "BASTOGNE ←", x: 3, y: 13 },
      { name: "VIA DE NEFFE", x: 34, y: 13 },
      { name: "ACESSO BIZORY", x: 13, y: 4 },
      { name: "POSTO MÉDICO", x: 9, y: 17 },
      { name: "CASA CIVIL", x: 12, y: 20 },
    ],
    units: [
      unit("hq", "Cedar HQ", "Comando", 10, 14, 4),
      unit("able", "Able", "Infantaria", 19, 10, 21),
      unit("baker", "Baker", "Infantaria", 19, 18, 18),
      unit("charlie", "Charlie", "Reserva", 13, 7, 17),
      unit("support", "Apoio", "Armas e socorro", 12, 16, 6),
    ],
    enemies: [
      unit("e1", "E1", "Patrulha", 36, 9, 8),
      unit("e2", "E2", "Infantaria", 37, 14, 16),
      unit("e3", "E3", "Infantaria", 35, 20, 14),
      unit("e4", "E4", "Apoio", 38, 18, 7),
      unit("e5", "E5", "Reserva", 38, 6, 12),
    ],
    contacts: [
      {
        id: "reed",
        name: "Major Andrew Reed",
        role: "Ligação com o batalhão",
        channel: "radio",
      },
      {
        id: "medical",
        name: "Mesa médica",
        role: "Coordenação do socorro",
        channel: "radio",
      },
      {
        id: "logistics",
        name: "Mesa logística",
        role: "Reservas e rotas",
        channel: "radio",
      },
      {
        id: "maple",
        name: "Posto Maple",
        role: "Unidade adjacente",
        channel: "radio",
      },
    ],
    events: armyEvents,
    prologue: [
      {
        speaker: "20 DEZEMBRO 1944 · 17:47",
        text: "O vento passa pelas árvores. A estrada para Bastogne desaparece sob neve e fumaça. Cedar aguarda uma ordem que não chega.",
      },
      {
        speaker: "Private Thomas Bell",
        text: "“O capitão Hayes não voltou. O tenente Wallace está ferido.”",
      },
      {
        speaker: "1st Sgt. Samuel Brooks",
        text: "“Não temos ninguém acima do senhor em condições de dar ordens aqui. O batalhão ainda não respondeu.”",
      },
      {
        speaker: "2nd Lt. Helen Ward",
        text: "“Dezenove feridos. Pouco transporte. Preciso que decida o que protegemos primeiro.”",
      },
      {
        speaker: "Cpl. Isaac Turner · rádio",
        text: "“Mantenham o acesso leste… aguardem…” A frase se perde na estática. Você assume o comando provisório.",
      },
    ],
    systems: { wire: 0 },
    systemLabels: { wire: "Linha de campanha" },
    actions: [
      {
        id: "wire",
        label: "Restaurar telefone",
        description:
          "Reparar a ligação por fio. Libera contatos mesmo com rádio fraco.",
        ap: 1,
        duration: 2,
        cost: { materials: 2 },
        effects: { systems: { wire: 100 } },
      },
      {
        id: "shelter",
        label: "Construir abrigo",
        description:
          "Trabalho de apoio por dois turnos; melhora defesa e reduz fadiga.",
        ap: 2,
        duration: 2,
        cost: { materials: 3 },
        effects: { stats: { defense: 12, fatigue: -8 } },
      },
    ],
    reserve: { ammo: 16, medKits: 4, food: 6 },
    objective: { x: 19, y: 14 },
    mapNote:
      "Setor fictício 40 × 30 inspirado nos acessos Neffe/Bizory. Carta histórica regional disponível no arquivo.",
  },
  air: {
    title: "A ÚLTIMA ALA",
    commander: "Thomas E. Walker",
    rank: "Captain · USAAF · nome provisório",
    start: "1944-12-20T06:00:00Z",
    minutes: 60,
    weather: "NUVEM BAIXA · TETO RESTRITO",
    columns: 48,
    rows: 36,
    terrain: terrain(48, 36, "air"),
    places: [
      { name: "PISTA 09 / 27", x: 24, y: 5 },
      { name: "HANGAR", x: 13, y: 10 },
      { name: "RÁDIO", x: 31, y: 12 },
      { name: "ENFERMARIA", x: 13, y: 23 },
      { name: "COMBUSTÍVEL", x: 31, y: 25 },
    ],
    units: [
      unit("hq", "Operações", "Comando", 18, 19, 3),
      unit("mechanics", "Manutenção", "Equipe de solo", 16, 15, 9),
      unit("ground", "Serviços", "Equipe de solo", 30, 22, 6),
    ],
    enemies: [],
    contacts: [
      {
        id: "group",
        name: "Grupo aéreo",
        role: "Superior · ordens de missão",
        channel: "radio",
      },
      {
        id: "weather",
        name: "Meteorologia",
        role: "Teto e visibilidade",
        channel: "radio",
      },
      {
        id: "maintenance",
        name: "Chefe de manutenção",
        role: "Peças e aeronaves",
        channel: "local",
      },
      {
        id: "medic",
        name: "Enfermaria",
        role: "Saúde dos aviadores",
        channel: "local",
      },
    ],
    events: airEvents,
    prologue: [
      {
        speaker: "EUROPA OCIDENTAL · 1944",
        text: "Você saiu vivo dos destroços. O operador ainda não respondeu. O ruído do motor continua em sua cabeça.",
      },
      {
        speaker: "THOMAS E. WALKER",
        text: "O caminho de volta leva a uma base que você mal reconhece: telhados abertos, pista marcada, colegas ausentes.",
      },
      {
        speaker: "OFICIAL DE OPERAÇÕES",
        text: "“Dois aviões utilizáveis. Dois que talvez possamos reparar. Os outros são perdas definitivas. Precisamos de alguém que reorganize a ala.”",
      },
    ],
    systems: {
      fuel: 18,
      parts: 12,
      runway: 46,
      aircraft: 2,
      repairable: 2,
      sorties: 0,
    },
    systemLabels: {
      fuel: "Combustível",
      parts: "Peças",
      runway: "Pista %",
      aircraft: "Aeronaves aptas",
      repairable: "Reparáveis",
      sorties: "Saídas concluídas",
    },
    actions: [
      {
        id: "runway",
        label: "Recuperar pista",
        description: "Manutenção por dois turnos. Integridade +22.",
        ap: 2,
        duration: 2,
        cost: { materials: 2 },
        systemsCost: { parts: 2 },
        effects: { systems: { runway: 22 } },
      },
      {
        id: "aircraft",
        label: "Reparar aeronave",
        description:
          "Uma das duas células reparáveis. Usa peças e três turnos.",
        ap: 2,
        duration: 3,
        cost: {},
        systemsCost: { parts: 4, repairable: 1 },
        effects: { systems: { aircraft: 1 } },
      },
      {
        id: "sortie",
        label: "Autorizar reconhecimento",
        description:
          "Requer pista ≥65%, aeronave e combustível. Retorno em dois turnos, sujeito a perdas.",
        ap: 2,
        duration: 2,
        cost: { ammo: 4 },
        systemsCost: { fuel: 4, aircraft: 1 },
        requires: { runway: 65, aircraft: 1 },
        effects: {
          systems: { sorties: 1, aircraft: 1 },
          stats: { intelligence: 14 },
        },
      },
    ],
    reserve: { ammo: 12, medKits: 3, materials: 4 },
    objective: { x: 23, y: 18 },
    mapNote:
      "Aeródromo fictício 48 × 36 da Bíblia. Nenhuma base histórica específica é atribuída a esta operação.",
  },
  navy: {
    title: "VIGIA QUEBRADA",
    commander: "Robert J. Sullivan",
    rank: "Lt. Commander · comando interino · nome provisório",
    start: "1944-12-20T18:00:00Z",
    minutes: 60,
    weather: "MAR PESADO · BANCOS DE NEBLINA",
    columns: 60,
    rows: 40,
    terrain: terrain(60, 40, "navy"),
    places: [
      { name: "ZONA DE RETORNO", x: 15, y: 22 },
      { name: "COSTA / PORTO", x: 9, y: 29 },
      { name: "CONTATO INCERTO", x: 49, y: 12 },
    ],
    units: [unit("ship", "Vigia", "Contratorpedeiro", 49, 24, 48)],
    enemies: [
      unit("e1", "Contato E1", "Superfície", 52, 9, 12),
      unit("e2", "Contato E2", "Superfície", 56, 34, 10),
    ],
    contacts: [
      {
        id: "taskforce",
        name: "Grupo-tarefa",
        role: "Superior · coordenação naval",
        channel: "radio",
      },
      {
        id: "engine",
        name: "Chefe de máquinas",
        role: "Propulsão e avarias",
        channel: "local",
      },
      {
        id: "medical",
        name: "Enfermaria",
        role: "Tripulantes feridos",
        channel: "local",
      },
      {
        id: "port",
        name: "Autoridade de porto",
        role: "Rota e acolhimento",
        channel: "radio",
      },
    ],
    events: navyEvents,
    prologue: [
      {
        speaker: "PACÍFICO · 1944",
        text: "A ponte se enche de fumaça. O comandante e o imediato morreram no ataque. Uma voz pede ordens.",
      },
      {
        speaker: "MÁQUINAS",
        text: "“Propulsão a trinta e oito por cento. Há água onde não deveria haver. Precisamos de equipes.”",
      },
      {
        speaker: "ENFERMARIA",
        text: "“Dezessete feridos e nove desaparecidos. Não sabemos ainda quem ficou isolado.”",
      },
      {
        speaker: "OFICIAL DE PONTE",
        text: "“Sullivan, o comando é seu. Diga para onde vamos.”",
      },
    ],
    systems: { hull: 54, propulsion: 38, fuel: 34, parts: 8, flooding: 22 },
    systemLabels: {
      hull: "Casco %",
      propulsion: "Propulsão %",
      fuel: "Combustível",
      parts: "Peças",
      flooding: "Inundação %",
    },
    actions: [
      {
        id: "hull",
        label: "Controlar avarias",
        description:
          "Equipe de reparo por dois turnos: casco +16, inundação −14.",
        ap: 2,
        duration: 2,
        cost: { materials: 1 },
        systemsCost: { parts: 2 },
        effects: { systems: { hull: 16, flooding: -14 } },
      },
      {
        id: "engine",
        label: "Recuperar máquinas",
        description: "Máquinas por dois turnos: propulsão +22.",
        ap: 2,
        duration: 2,
        cost: { materials: 1 },
        systemsCost: { parts: 2 },
        effects: { systems: { propulsion: 22 } },
      },
      {
        id: "pump",
        label: "Mobilizar equipe de contenção",
        description:
          "Contém a entrada de água neste período; desgaste adicional.",
        ap: 1,
        duration: 1,
        cost: {},
        effects: { systems: { flooding: -8 }, stats: { fatigue: 4 } },
      },
    ],
    reserve: { ammo: 12, medKits: 3, materials: 3 },
    objective: { x: 14, y: 23 },
    mapNote:
      "Carta operacional fictícia 60 × 40, conforme N01. A Bíblia ainda não atribui uma ilha ou porto histórico à missão.",
  },
  lab: undefined as unknown as OperationDefinition,
};
OPERATIONS.lab = {
  ...OPERATIONS.army,
  title: "POSTO DE VALIDAÇÃO",
  units: [unit("hq", "Comando", "Exercício", 10, 14, 8)],
  events: [],
  enemies: [],
  prologue: [
    {
      speaker: "EXERCÍCIO",
      text: "Uma operação curta para ensaiar o comando.",
    },
  ],
};
