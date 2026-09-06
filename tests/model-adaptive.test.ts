import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  generateGraph,
  generateChapter,
  generateExtension,
} from "../src/server/model";
import { emptyWorkspace } from "../src/core/workspace";
import { courseTeachingPolicy, chapterTeachingPolicy, narrationPolicy } from "../src/core/teaching-policy";
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

it("requires a full replacement when a repair returns abbreviated sections and missing chapter fields", async () => {
  let calls = 0;
  vi.stubGlobal("fetch", async (_url: unknown, options: RequestInit) => {
    calls++;
    const request = JSON.parse(String(options.body));
    if (calls === 1) return response({ ...chapter(2), sections: [chapter(2).sections[0], "unchanged"], script: undefined, workspaceSetup: undefined });
    expect(request.messages.at(-1).content).toContain("COMPLETE corrected JSON");
    expect(request.messages.at(-1).content).toContain("NEVER a patch");
    expect(JSON.parse(request.messages[1].content).validationFeedback).toContain("sections must contain full section objects");
    return response(chapter(2));
  });
  const result = await generateChapter(node("b"), "Learn paths", emptyWorkspace(), { learnerProfile: profile, language: "en" });
  expect(result.script).toHaveLength(result.sections.length);
  expect(calls).toBe(2);
});

it("gives concrete repair instructions when generated quizzes omit completion", async () => {
  let calls = 0;
  vi.stubGlobal("fetch", async (_url: unknown, options: RequestInit) => {
    const request = JSON.parse(String(options.body));
    const { validationFeedback } = JSON.parse(request.messages[1].content);
    calls++;
    if (calls === 1) {
      const invalid = chapter(2);
      invalid.sections.forEach(section => { delete section.completion; });
      return response(invalid);
    }
    expect(validationFeedback).toContain('"completion":{"type":"quiz"}');
    expect(validationFeedback).toContain("section level");
    expect(validationFeedback).toContain("matching script entry");
    return response(chapter(2));
  });
  const result = await generateChapter(node("b"), "Learn paths", emptyWorkspace(), { learnerProfile: profile, language: "en" });
  expect(result.sections.filter(s => s.completion)).toHaveLength(2);
  expect(calls).toBe(2);
});

it("sends the shared teaching standard to planning and full chapter requests without an extra model call", async () => {
  const requests: { messages: { content: string }[] }[] = [];
  vi.stubGlobal("fetch", async (_url: unknown, options: RequestInit) => {
    requests.push(JSON.parse(String(options.body)));
    return response(requests.length === 1 ? graph() : chapter(1));
  });
  await generateGraph("Understand relative paths", "en");
  await generateChapter(node("b"), "Understand relative paths", emptyWorkspace(), { language: "en" });
  expect(requests).toHaveLength(2);
  for (const request of requests) {
    expect(request.messages[0].content).toContain(courseTeachingPolicy);
    expect(request.messages[0].content).not.toContain("40-180 Chinese");
    expect(JSON.parse(request.messages[1].content).input.policy.narration).toBe(narrationPolicy);
  }
  expect(requests[1].messages[0].content).toContain(chapterTeachingPolicy);
  expect(requests[1].messages[0].content).toContain(narrationPolicy);
});

it("reports separate page errors together so one repair can fix the whole chapter", async () => {
  let calls = 0;
  vi.stubGlobal("fetch", async (_url: unknown, options: RequestInit) => {
    const { validationFeedback } = JSON.parse(
      JSON.parse(String(options.body)).messages[1].content,
    );
    if (++calls === 1) {
      const invalid = chapter(2);
      invalid.environment = "web";
      invalid.sections[0].intent = "practice";
      invalid.sections[1].component = {
        type: "code.editor",
        path: "/plan.txt",
        language: "text",
        example: "Plan",
      };
      invalid.sections[1].template = "workspace";
      invalid.sections[1].completion = {
        type: "file.includes",
        path: "/plan.txt",
        value: "Plan",
      };
      invalid.workspaceSetup = { "/plan.txt": "Write a plan" };
      return response(invalid);
    }
    expect(validationFeedback).toContain('Section "intro"');
    expect(validationFeedback).toContain("Practice section needs completion");
    expect(validationFeedback).toContain('Section "check-0"');
    expect(validationFeedback).toContain(
      "Code language is incompatible with environment",
    );
    const valid = chapter(2);
    valid.environment = "web";
    return response(valid);
  });
  await generateChapter(
    { ...node("b"), environment: "web" },
    "Learn paths",
    emptyWorkspace(),
    { learnerProfile: profile, language: "en" },
  );
  expect(calls).toBe(2);
});

it("retains the final validation cause after bounded repairs are exhausted", async () => {
  const fetch = vi.fn(async () => response(chapter(1)));
  vi.stubGlobal("fetch", fetch);
  await expect(
    generateChapter(node("b"), "Learn paths", emptyWorkspace(), {
      learnerProfile: profile,
      language: "en",
    }),
  ).rejects.toThrow(
    /課程格式驗證失敗[\s\S]*at least two meaningful checkpoints/,
  );
  expect(fetch).toHaveBeenCalledTimes(3);
});

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
    { graph: graph(), learnerProfile: profile, attempts, language: "en" },
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

it("accepts a valid chapter with redundant root completion without another model call", async () => {
  const fetch = vi.fn(async () => response({ ...chapter(2), completion: { type: "quiz" } }));
  vi.stubGlobal("fetch", fetch);
  const result = await generateChapter(node("b"), "Learn paths", emptyWorkspace(), { learnerProfile: profile, language: "en" });
  expect(result.sections.filter(s => s.completion)).toHaveLength(2);
  expect(result).not.toHaveProperty("completion");
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("preserves Japanese examples through the full chapter generation path", async () => {
  const value = chapter(2);
  value.sections[0].body = 'Compare "お願いします" with "頼む".';
  const fetch = vi.fn(async () => response(value));
  vi.stubGlobal("fetch", fetch);
  await expect(generateChapter(node("b"), "Learn Japanese", emptyWorkspace(), { learnerProfile: profile, language: "en" })).resolves.toMatchObject({sections: value.sections});
  expect(fetch).toHaveBeenCalledTimes(1);
});
