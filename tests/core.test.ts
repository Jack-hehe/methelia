import { describe, expect, it } from "vitest";
import { validateGraph, validateChapter } from "../src/core/protocol";
import { insertBranch } from "../src/core/graph";
import { emptyWorkspace, runCommand, saveFiles } from "../src/core/workspace";
import { demoGraph, demoChapter } from "../src/core/fixtures";

describe("protocol boundaries", () => {
  it("rejects duplicate node IDs even when their titles differ", () => {
    const graph = demoGraph();
    graph.nodes[1].id = graph.nodes[0].id;
    expect(() => validateGraph(graph)).toThrow(/duplicate/i);
  });
  it("rejects a cyclic course route", () => {
    const graph = demoGraph();
    graph.edges.push({ from: graph.nodes.at(-1)!.id, to: graph.nodes[0].id });
    expect(() => validateGraph(graph)).toThrow(/cycle/i);
  });
  it("rejects unknown interactive components before rendering", () => {
    const chapter = demoChapter(demoGraph().nodes[0]);
    const input = JSON.parse(JSON.stringify(chapter));
    input.sections[0].component.type = "run-anything";
    expect(() => validateChapter(input)).toThrow();
  });
  it("rejects missing narration targets", () => {
    const chapter = demoChapter(demoGraph().nodes[0]);
    chapter.script[0].sectionId = "missing";
    expect(() => validateChapter(chapter)).toThrow(/section/i);
  });
  it("rejects a layout that cannot host its component", () => {
    const chapter = demoChapter(demoGraph().nodes[0]);
    chapter.sections[2].template = "split";
    expect(() => validateChapter(chapter)).toThrow(/template/i);
  });
  it("inserts a branch without changing the original route or active objective", () => {
    const graph = demoGraph();
    const before = JSON.stringify(graph);
    const next = insertBranch(graph, graph.nodes[0].id, [
      {
        id: "support-html",
        title: "HTML basics",
        objective: "Understand tags",
        minutes: 4,
        kind: "support",
        prerequisites: [],
      },
    ]);
    expect(JSON.stringify(graph)).toBe(before);
    expect(next.edges).toContainEqual({
      from: graph.nodes[0].id,
      to: "support-html",
    });
    expect(next.edges).toContainEqual({
      from: "support-html",
      to: graph.nodes[1].id,
    });
    expect(next.nodes[0].objective).toBe(graph.nodes[0].objective);
  });
});
describe("shared virtual workspace", () => {
  it("reads saved editor files through the terminal", () => {
    const ws = saveFiles(
      emptyWorkspace(),
      { "/index.html": "<h1>Hello</h1>" },
      0,
    );
    expect(runCommand(ws, "cat index.html").output).toBe("<h1>Hello</h1>");
  });
  it("does not permit traversal or arbitrary host commands", () => {
    expect(runCommand(emptyWorkspace(), "cd ../../").output).toMatch(/root/i);
    expect(runCommand(emptyWorkspace(), "whoami").output).toMatch(/supported/i);
    expect(runCommand(emptyWorkspace(), "ls; whoami").output).toMatch(
      /supported/i,
    );
  });
  it("preserves existing content when touch is repeated", () => {
    const ws = saveFiles(emptyWorkspace(), { "/index.html": "hello" }, 0);
    expect(
      runCommand(ws, "touch index.html").workspace.files["/index.html"],
    ).toBe("hello");
  });
  it("rejects stale saves rather than overwriting newer edits", () => {
    const ws = saveFiles(emptyWorkspace(), { "/index.html": "newer" }, 0);
    expect(() => saveFiles(ws, { "/index.html": "older" }, 0)).toThrow(
      /conflict/i,
    );
  });
});
