/** Presentation state is separate from simulation: a prologue never ticks a turn. */
export interface NarrativePlan {
  length: number;
  decisionAfter: number;
  choices: readonly string[];
}
export interface NarrativeState {
  index: number;
  stage: "scene" | "choice" | "summary" | "complete";
  choice?: string;
  skipped: boolean;
}
export type NarrativeAction =
  | { type: "next" | "back" | "skip" }
  | { type: "choose"; id: string };
export const newNarrative = (): NarrativeState => ({ index: 0, stage: "scene", skipped: false });
export function advanceNarrative(s: NarrativeState, a: NarrativeAction, p: NarrativePlan): NarrativeState {
  if (s.stage === "complete") return s;
  if (a.type === "skip") return { ...s, stage: "summary", skipped: true };
  if (a.type === "back") {
    if (s.stage !== "scene" || s.index === 0) return s;
    // An accepted choice is a narrative boundary, never an invitation to apply it again.
    if (s.choice && s.index <= p.decisionAfter + 1) return s;
    return { ...s, index: s.index - 1 };
  }
  if (a.type === "choose") {
    if (s.stage !== "choice" || s.choice || !p.choices.includes(a.id)) return s;
    const more = !s.skipped && s.index + 1 < p.length;
    return { ...s, choice: a.id, stage: more ? "scene" : "complete", index: more ? s.index + 1 : s.index };
  }
  if (s.stage === "choice") return s;
  if (s.stage === "summary") return { ...s, index: p.decisionAfter, stage: s.choice ? "complete" : "choice" };
  if (s.index === p.decisionAfter && !s.choice) return { ...s, stage: "choice" };
  if (s.index + 1 < p.length) return { ...s, index: s.index + 1 };
  return { ...s, stage: s.choice ? "complete" : "choice" };
}
export const readingTime = (text: string): number => Math.max(7000, Math.ceil(text.trim().split(/\s+/).length / 2.5) * 1000);
