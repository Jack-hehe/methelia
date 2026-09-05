import { expect, test } from "vitest";
import { validateChapter, validateGraph } from "../src/core/protocol";
import { generalChapter, generalGraph } from "./fixtures/general-course";

const profile = {
  experience: "New",
  purpose: "Practice",
  priorKnowledge: "None",
  depth: "applied" as const,
  studyPlan: "20 minutes with examples",
};

test("profile fixtures provide detailed plans and two distinct concept checkpoints", () => {
  const graph = validateGraph(generalGraph("none", profile));
  expect(graph.nodes[0].depth).toBe("applied");
  expect(graph.nodes[0].keyConcepts?.length).toBeGreaterThan(0);
  expect(graph.nodes[0].assessment).toBeTruthy();
  const chapter = validateChapter(generalChapter(graph.nodes[0], profile));
  const checkpoints = chapter.sections.filter((section) => section.completion);
  expect(checkpoints).toHaveLength(2);
  expect(checkpoints[0].id).not.toBe(checkpoints[1].id);
  expect(checkpoints[0].body).not.toBe(checkpoints[1].body);
});
