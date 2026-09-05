import { z } from "zod";

export const intakeFields = [
  "experience",
  "purpose",
  "priorKnowledge",
  "depth",
  "studyPlan",
] as const;
export type IntakeField = (typeof intakeFields)[number];
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
): IntakeQuestion {
  const question = intakeQuestionSchema.parse(value);
  if (question.field !== field)
    throw new Error("Question field does not match the requested step");
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
