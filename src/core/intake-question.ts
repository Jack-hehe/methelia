import { z } from "zod";

export const intakeFields = [
  "experience",
  "purpose",
  "priorKnowledge",
  "depth",
  "studyPlan",
] as const;
export type IntakeField = (typeof intakeFields)[number];
export const intakeQuestionVersion = 2;
export const intakeFocus: Record<IntakeField, string> = {
  experience:
    "Ask only about actual previous exposure to the target subject. If the goal already states beginner/advanced, ask one concrete experience that clarifies the starting point, not the same level label again.",
  purpose:
    "Ask which concrete outcome or real-use situation matters most. Do not ask ability, prerequisites or teaching format. If outcomes are already specified, ask which remaining use case should get priority.",
  priorKnowledge:
    "Ask about TRANSFERABLE background outside the target subject, not target-subject experience again. For a new Japanese learner, ask about other language-learning or reading-system familiarity, not kana knowledge already answered. For Linux, ask about file/folder or computer familiarity rather than Linux commands again. Offer an honest none/unsure choice and allow skipping. Never repeat a fact already supplied.",
  depth:
    "Ask how far to take the explanation within the chosen goal: essential intuition, applying/adapting it, or mechanisms and edge cases. This is desired depth, NOT current skill or a repeated list of use cases. Keep the learner's beginner starting point even if they want deep understanding. Values are foundation/applied/advanced.",
  studyPlan:
    "Ask only about learning format or pacing within the ALREADY selected outcome and depth: e.g. worked examples then a try, visual explanations then checks, or short mixed sessions. Do not offer travel/work/personal goals again, ask level again, or ask the learner to choose their depth again. If format was already answered, ask about session length instead. Do not promise unavailable tools such as speech recognition.",
};
export const intakePolicy = (field: IntakeField) => ({
  multiple: field === "purpose" || field === "priorKnowledge",
  optional: field === "priorKnowledge" || field === "studyPlan",
});
export const skippedIntakeAnswer =
  "[Skipped: learner did not provide this information. Do not infer their knowledge or preferences.]";

export function readIntakeSelection(
  value: string | undefined,
  options: IntakeQuestion["options"],
) {
  if (!value || value === skippedIntakeAnswer)
    return { selected: [] as string[], detail: "" };
  try {
    const data = JSON.parse(value);
    if (
      Array.isArray(data.selected) &&
      data.selected.every((item: unknown) => typeof item === "string") &&
      typeof data.detail === "string"
    )
      return {
        selected: data.selected as string[],
        detail: data.detail as string,
      };
  } catch {
    /* Plain answers from older drafts remain supported. */
  }
  return options.some((option) => option.value === value)
    ? { selected: [value], detail: "" }
    : { selected: [] as string[], detail: value };
}
export function writeIntakeSelection(selected: string[], detail: string) {
  return selected.length ? JSON.stringify({ selected, detail }) : detail;
}
export const intakeFieldSchema = z.enum(intakeFields);
export const intakeQuestionSchema = z
  .object({
    field: intakeFieldSchema,
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().max(260),
    options: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).max(120),
            value: z.string().trim().min(1).max(800),
            description: z.string().trim().max(180),
          })
          .strict(),
      )
      .min(3)
      .max(5),
    placeholder: z.string().trim().max(180),
  })
  .strict();
export type IntakeQuestion = z.infer<typeof intakeQuestionSchema>;
export type IntakeQuestionRecord = {
  context: string;
  question: IntakeQuestion;
};

export function validateIntakeQuestion(
  value: unknown,
  field: IntakeField,
  previousQuestions: IntakeQuestion[] = [],
): IntakeQuestion {
  const question = intakeQuestionSchema.parse(value);
  if (question.field !== field)
    throw new Error("Question field does not match the requested step");
  const normalize = (text: string) =>
    text
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replace(/[\p{P}\p{Z}\s]/gu, "");
  if (
    previousQuestions.some(
      (previous) => normalize(previous.title) === normalize(question.title),
    )
  )
    throw new Error(
      "This question repeats a previous question. Ask for a distinct missing detail assigned to the current field; do not rephrase the same question.",
    );
  for (const key of ["value", "label"] as const) {
    if (
      new Set(question.options.map((option) => option[key].toLocaleLowerCase()))
        .size !== question.options.length
    )
      throw new Error("Question options must be distinct");
  }
  if (
    field === "depth" &&
    (question.options.length !== 3 ||
      !["foundation", "applied", "advanced"].every((value) =>
        question.options.some((option) => option.value === value),
      ))
  )
    throw new Error(
      "Depth must offer foundation, applied and advanced exactly once",
    );
  return question;
}
