import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  generateGraph,
  generateChapter,
  generateExtension,
} from "../src/server/model";
import { emptyWorkspace } from "../src/core/workspace";
import type { Graph, Chapter, LearningNode } from "../src/core/protocol";
import type { LearnerProfile, LearningAttempt } from "../src/core/state";

const profile: LearnerProfile = {
  experience: "Beginner",
  purpose: "Everyday use",
  priorKnowledge: "None",
  depth: "applied",
  studyPlan: "Short examples",
};
const metadata = {
  depth: "applied" as const,
  summary: "Understand file locations",
  keyConcepts: ["Relative paths"],
  misconceptions: ["All paths start at root"],
  assessment: "Resolve a relative path",
};
const node = (id: string): LearningNode => ({
  id,
  title: id,
  objective: `Explain ${id}`,
  minutes: 5,
  kind: "main",
  prerequisites: [],
  environment: "none",
});
const graph = (): Graph => ({
  schemaVersion: 2,
  title: "Paths",
  outcome: "Resolve paths",
  nodes: [node("a"), { ...node("b"), prerequisites: ["a"] }],
  edges: [{ from: "a", to: "b" }],
});
const checkpoint = (id: string): Chapter["sections"][number] => ({
  id,
  title: id,
  body: "Predict the location.",
  intent: "check",
  template: "focus",
  component: {
    type: "quiz.choice",
    question: `Where does ${id} resolve?`,
    options: ["Root", "Current directory"],
    answer: 1,
    explanation: "Relative paths start at the current directory.",
  },
  completion: { type: "quiz" },
});
const chapter = (count: number): Chapter => ({
  schemaVersion: 2,
  environment: "none",
  nodeId: "b",
  title: "b",
  objective: "Explain b",
  sections: [
    {
      id: "intro",
      title: "Paths",
      body: "Relative paths start at the current directory.",
      intent: "explain",
      template: "narrative",
      component: {
        type: "lesson.article",
        paragraphs: ["Relative paths start at the current directory."],
        takeaway: "Identify the starting directory.",
      },
    },
    ...Array.from({ length: count }, (_, i) => checkpoint(`check-${i}`)),
  ],
  script: [
    { sectionId: "intro", text: "Identify the starting directory." },
    ...Array.from({ length: count }, (_, i) => ({
      sectionId: `check-${i}`,
      text: "Predict the resolved location.",
    })),
  ],
  workspaceSetup: {},
});
beforeEach(() => {
  vi.stubEnv("AI_API_KEY", "test-key");
  vi.stubEnv("AI_BASE_URL", "https://model.test/v1");
  vi.stubEnv("AI_MODEL", "test-model");
  vi.stubEnv("METHELIA_AI_DAILY_REQUESTS", "");
  vi.stubEnv("RENDER", "false");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const response = (value: unknown) =>
  Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });

it("repairs profile graphs missing learning metadata and supplies the learner profile", async () => {
  let calls = 0;
  vi.stubGlobal("fetch", async (_url: unknown, options: RequestInit) => {
    const input = JSON.parse(
      JSON.parse(String(options.body)).messages[1].content,
    ).input;
    expect(input.learnerProfile).toEqual(profile);
    calls++;
    const result = graph();
    if (calls > 1)
      result.nodes = result.nodes.map((n) => ({ ...n, ...metadata }));
    return response(result);
  });
  const result = await generateGraph("Learn paths", "en", profile);
  expect(calls).toBe(2);
  expect(result.nodes.every((n) => n.depth === "applied" && n.assessment)).toBe(
    true,
  );
});

it("requires two checkpoints for profile courses and sends only bounded relevant attempts", async () => {
  let calls = 0;
  const attempts: LearningAttempt[] = Array.from({ length: 65 }, (_, i) => ({
    nodeId: i === 0 ? "private-unrelated" : "a",
    sectionId: `s${i}`,
    passed: false,
    at: i,
    usedHelp: false,
  }));
  vi.stubGlobal("fetch", async (_url: unknown, options: RequestInit) => {
    const input = JSON.parse(
      JSON.parse(String(options.body)).messages[1].content,
    ).input;
    expect(input.learnerProfile).toEqual(profile);
    expect(input.attempts.length).toBeLessThanOrEqual(40);
    expect(input.attempts.length).toBeGreaterThan(0);
    expect(input.attempts.every((a: LearningAttempt) => a.nodeId === "a")).toBe(
      true,
    );
    return response(chapter(++calls === 1 ? 1 : 2));
  });
  const result = await generateChapter(
    { ...graph().nodes[1], ...metadata },
    "Learn paths",
    emptyWorkspace(),
    { graph: graph(), learnerProfile: profile, attempts },
  );
  expect(calls).toBe(2);
  expect(result.sections.filter((s) => s.completion)).toHaveLength(2);
});

it("repairs extension duplicates and returns explicit bounded learning metadata", async () => {
  let calls = 0;
  vi.stubGlobal("fetch", async () => {
    calls++;
    return response({
      title: "Path practice",
      reason:
        "Extends relative paths with nested directory examples in the supported virtual environment.",
      nodes: [
        {
          ...node("support-path-42"),
          ...metadata,
          kind: "support",
          title: calls === 1 ? " A " : "Nested relative paths",
          objective: "Resolve nested paths",
          prerequisites: ["a"],
        },
      ],
    });
  });
  const result = await generateExtension({
    topic: "Nested paths",
    depth: "applied",
    anchor: graph().nodes[0],
    graph: graph(),
    learnerProfile: profile,
    language: "en",
  });
  expect(calls).toBe(2);
  expect(result.nodes[0].title).toBe("Nested relative paths");
  expect(result.nodes[0].environment).toBe("none");
});
