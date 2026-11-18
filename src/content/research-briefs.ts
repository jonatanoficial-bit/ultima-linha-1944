import type { BranchId } from "../core/contracts";

export interface ResearchBrief {
  id: string;
  branch: Exclude<BranchId, "lab">;
  title: string;
  date: string;
  status: "context-confirmed" | "source-package-pending";
  summary: string;
  confirmedFacts: string[];
  requiredBeforePlay: string[];
  source: { title: string; publisher: string; url: string };
}

/**
 * Editorial research is visible to the player, but never becomes a playable
 * chapter until map, units, events, art and QA are all authored and approved.
 */
export const RESEARCH_BRIEFS: ResearchBrief[] = [
  {
    id: "army_m02_bastogne_corridor",
    branch: "army",
    title: "M02 · Corredor de Bastogne",
    date: "26–27 de dezembro de 1944",
    status: "context-confirmed",
    summary: "Base histórica confirmada para a continuidade terrestre; ainda não é uma missão publicada.",
    confirmedFacts: [
      "A 4ª Divisão Blindada alcançou o perímetro de Bastogne em 26 de dezembro de 1944.",
      "O contato abriu o corredor, mas sua segurança permaneceu precária.",
      "A operação seguinte envolvia ampliar a brecha e manter os acessos rodoviários abertos.",
    ],
    requiredBeforePlay: [
      "Carta tática datada e licenciável na escala da missão, com legenda e procedência verificadas.",
      "Ordem de batalha, limites de setor e cronologia local reconciliados com fontes primárias.",
      "Novo pacote de cenas, retratos autorizados, objetivos, decisões, testes determinísticos e QA mobile.",
    ],
    source: {
      title: "The Ardennes: Battle of the Bulge · Chapter XXIV",
      publisher: "U.S. Army Center of Military History",
      url: "https://history.army.mil/portals/143/Images/Publications/catalog/7-8.pdf",
    },
  },
  {
    id: "air_a02_source_gate",
    branch: "air",
    title: "A02 · Próxima frente USAAF",
    date: "1944 · em curadoria",
    status: "source-package-pending",
    summary: "Nenhuma base, unidade, modelo de aeronave ou alvo será atribuído sem um dossiê de fontes fechado.",
    confirmedFacts: [],
    requiredBeforePlay: [
      "Diário operacional ou fonte primária equivalente, com data, unidade e teatro definidos.",
      "Inventário de aeronaves, carta de missão e imagens autorizadas para os modelos exibidos.",
      "Roteiro, decisões e validação de sistemas da USAAF de 1944.",
    ],
    source: {
      title: "Research gate · no chapter released",
      publisher: "Última Linha 1944 editorial policy",
      url: "https://history.army.mil/Research/Research-by-Conflict-and-Time-Period/World-War-II/WWII-European-African-Middle-Eastern-Theater/",
    },
  },
  {
    id: "navy_n02_source_gate",
    branch: "navy",
    title: "N02 · Próxima vigia naval",
    date: "1944 · em curadoria",
    status: "source-package-pending",
    summary: "A próxima operação naval permanece bloqueada até que navio, posição, data e fontes sejam documentados.",
    confirmedFacts: [],
    requiredBeforePlay: [
      "Fonte naval verificável para navio ou força-tarefa, data, posição e contexto operacional.",
      "Carta marítima histórica e inventário visual aprovado para unidades e sistemas.",
      "Eventos, objetivos, som, acessibilidade e testes completos antes de qualquer publicação.",
    ],
    source: {
      title: "Research gate · no chapter released",
      publisher: "Última Linha 1944 editorial policy",
      url: "https://www.history.navy.mil/research/archives.html",
    },
  },
];

export const researchBriefFor = (branch: Exclude<BranchId, "lab">) =>
  RESEARCH_BRIEFS.find((brief) => brief.branch === branch)!;
