import type { LabKind } from "../lab";

export type Bilingual = { en: string; zh: string };
export const bi = (en: string, zh: string): Bilingual => ({ en, zh });
export interface Lesson {
  title: Bilingual;
  concept: Bilingual;
  mission: Bilingual;
  question: Bilingual;
  options: Bilingual[];
  explanation: Bilingual;
  initial?: Record<string, number>;
  code?: {
    path: string;
    language: "html" | "css" | "javascript" | "python";
    files: Record<string, string>;
    example: string;
    target: string;
  };
}
export interface CuratedCourse {
  id: string;
  title: Bilingual;
  description: Bilingual;
  domain: Bilingual;
  kind: LabKind | "web" | "python";
  lessons: Lesson[];
}
// Each row is authored in both languages; this helper only removes object syntax.
export function lesson(
  title: Bilingual,
  concept: Bilingual,
  mission: Bilingual,
  question: Bilingual,
  correct: Bilingual,
  wrong: Bilingual,
  explanation: Bilingual,
  initial?: Record<string, number>,
): Lesson {
  return {
    title,
    concept,
    mission,
    question,
    options: [correct, wrong],
    explanation,
    initial,
  };
}
