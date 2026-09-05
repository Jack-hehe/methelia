import { expect, it } from "vitest";
import { validateChapter, validateGraph } from "../src/core/protocol";
import { emptyWorkspace, runCommand } from "../src/core/workspace";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";

const concept = () => ({
  schemaVersion: 2,
  environment: "none",
  nodeId: "intro",
  title: "Why bread rises",
  objective: "Explain what yeast does",
  sections: [
    {
      id: "explore",
      title: "Yeast and bubbles",
      body: "Select a step to see what changes.",
      intent: "explain",
      template: "focus",
      component: {
        type: "steps.sequence",
        steps: [
          { title: "Feed", body: "Yeast consumes sugar." },
          { title: "Rise", body: "Carbon dioxide expands the dough." },
        ],
      },
    },
    {
      id: "check",
      title: "Try a prediction",
      body: "What expands the dough?",
      intent: "check",
      template: "focus",
      component: {
        type: "quiz.choice",
        question: "Which gas helps dough rise?",
        options: ["Carbon dioxide", "Oxygen"],
        answer: 0,
        explanation: "Yeast produces carbon dioxide during fermentation.",
      },
      completion: { type: "quiz" },
    },
  ],
  script: [
    {
      sectionId: "explore",
      text: "Yeast uses sugar and produces gas. The bubbles expand the dough.",
    },
    {
      sectionId: "check",
      text: "Choose the gas responsible for the expansion.",
    },
  ],
  workspaceSetup: {},
});

it("accepts a workspace-free v2 concept chapter without changing its subject", () => {
  expect(validateChapter(concept()).title).toBe("Why bread rises");
});
it("rejects new chapters that have no verifiable checkpoint", () => {
  const chapter = concept();
  chapter.sections = chapter.sections
    .slice(0, 1)
    .concat({ ...chapter.sections[0], id: "again" });
  chapter.script = chapter.script
    .slice(0, 1)
    .concat({ sectionId: "again", text: "Recall what changed." });
  expect(() => validateChapter(chapter)).toThrow(/checkpoint/i);
});
it("requires an explicit practical environment and prevents a terminal in a concept-only chapter", () => {
  const chapter = concept();
  const input = JSON.parse(JSON.stringify(chapter));
  input.sections[0] = {
    ...input.sections[0],
    template: "workspace",
    component: { type: "terminal", commands: ["ls"] },
  };
  expect(() => validateChapter(input)).toThrow(/environment/i);
});
it("accepts goal-specific environments without rewriting Python as a website", () => {
  const graph = validateGraph({
    schemaVersion: 2,
    title: "Python budgeting",
    outcome: "Write a small budget calculator",
    scopeNote: "",
    requiresConfirmation: false,
    nodes: [
      {
        id: "intro",
        title: "Numbers",
        objective: "Add prices",
        minutes: 4,
        kind: "main",
        prerequisites: [],
        environment: "python",
      },
      {
        id: "finish",
        title: "A budget",
        objective: "Build a budget calculator",
        minutes: 5,
        kind: "main",
        prerequisites: ["intro"],
        environment: "python",
      },
    ],
    edges: [{ from: "intro", to: "finish" }],
  });
  expect(graph.title).toBe("Python budgeting");
});
it("initializes nested files without dropping them or overwriting learner work", async () => {
  const { mergeStarterFiles } = await import("../src/core/workspace");
  const first = mergeStarterFiles(emptyWorkspace(), {
    "/src/main.py": "print(1)",
  });
  expect(first.files["/src/main.py"]).toBe("print(1)");
  const second = mergeStarterFiles(first, {
    "/src/main.py": "print(2)",
    "/src/data/example.txt": "hello",
  });
  expect(second.files["/src/main.py"]).toBe("print(1)");
  expect(second.directories).toContain("/src/data");
});
it("does not accept a terminal command whose arguments the runtime cannot support", async () => {
  const { validatePracticeCommand } = await import("../src/core/workspace");
  expect(() => validatePracticeCommand("pwd ignored")).toThrow();
  expect(() => validatePracticeCommand("mkdir -p example")).toThrow();
  expect(() => validatePracticeCommand("mkdir example")).not.toThrow();
  expect(
    runCommand(emptyWorkspace(), "mkdir example").workspace.directories,
  ).toContain("/example");
});
it("checks terminal directory evidence on the server, not a client's completion claim", () => {
  const store = new Store(":memory:");
  try {
    const service = new LearningService(store);
    const session = service.session();
    const snapshot = service.createCourse(
      session,
      "Linux files",
      "demo",
      "terminal-test",
    );
    const course = store.getCourse(snapshot.id)!;
    const pkg = store.getPackage(course.chapterIds[course.currentNodeId])!;
    const input = concept();
    const terminal = JSON.parse(JSON.stringify(input));
    terminal.nodeId = course.currentNodeId;
    terminal.environment = "terminal";
    terminal.sections[0] = {
      id: "mkdir",
      title: "Make a directory",
      body: "Run mkdir notes",
      intent: "practice",
      template: "workspace",
      component: { type: "terminal", commands: ["mkdir notes"] },
      completion: { type: "directory.exists", path: "/notes" },
    };
    terminal.script[0].sectionId = "mkdir";
    pkg.chapter = validateChapter(terminal);
    store.putPackage(course.id, pkg);
    expect(service.check(session, course.id, "mkdir").passed).toBe(false);
    service.command(session, course.id, "mkdir notes");
    expect(service.check(session, course.id, "mkdir").passed).toBe(true);
  } finally {
    store.db.close();
  }
});

it("resolves parent navigation against the actual terminal directory while retaining the root boundary", () => {
  const created = runCommand(emptyWorkspace(), "mkdir examples").workspace;
  const nested = runCommand(created, "cd examples").workspace;
  const returned = runCommand(nested, "cd ..");
  expect(returned.workspace.cwd).toBe("/");
  expect(returned.output).toBe("");
  expect(runCommand(returned.workspace, "cd ..").output).toContain(
    "Cannot leave virtual root",
  );
});
