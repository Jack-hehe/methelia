import { z } from "zod";
const answer = z.string().trim().min(1).max(800);
export const learnerProfileSchema = z
  .object({
    experience: answer,
    purpose: answer,
    priorKnowledge: answer,
    depth: z.enum(["foundation", "applied", "advanced"]),
    studyPlan: answer,
  })
  .strict();
