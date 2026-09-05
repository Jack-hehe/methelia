import { describe, expect, it } from "vitest";
import {
  addExtension,
  insertBranch,
  nextLearningNode,
  routeNodes,
} from "../src/core/graph";
import {
  validateGraph,
  type Graph,
  type LearningNode,
} from "../src/core/protocol";
import { recommendDepth } from "../src/core/adaptive-learning";
import type { LearningAttempt } from "../src/core/state";

const node = (id: string): LearningNode => ({
  id,
  title: id,
  objective: `Learn ${id}`,
  minutes: 5,
  kind: "main",
  prerequisites: [],
});
const base = (): Graph => ({
  schemaVersion: 1,
  title: "Course",
  nodes: [node("a"), { ...node("b"), prerequisites: ["a"] }],
  edges: [{ from: "a", to: "b" }],
});
const extension = { id: "extra", title: "Extra", depth: "applied" as const };
const expanded = () =>
  addExtension(base(), "b", [node("x"), node("y")], extension);

describe("extension graph", () => {
  it("preserves main edges and supports a final anchor without mutating input", () => {
    const original = base();
    const graph = addExtension(
      original,
      "b",
      [node("x"), node("y")],
      extension,
    );
    expect(original).toEqual(base());
    expect(graph.edges).toEqual([...original.edges, { from: "x", to: "y" }]);
    expect(graph.nodes.slice(2).map((n) => [n.kind, n.prerequisites])).toEqual([
      ["support", ["b"]],
      ["support", ["x"]],
    ]);
    expect(validateGraph(graph)).toEqual(graph);
    expect(routeNodes(graph).map((n) => n.id)).toEqual(["a", "b"]);
    expect(nextLearningNode(graph, "b")).toBeUndefined();
    expect(nextLearningNode(graph, "b", "extra")?.id).toBe("x");
    expect(nextLearningNode(graph, "x", "extra")?.id).toBe("y");
    expect(nextLearningNode(graph, "y", "extra")).toBeUndefined();
    expect(nextLearningNode(graph, "a", "extra")).toBeUndefined();
    expect(nextLearningNode(graph, "x")).toBeUndefined();
  });
  it("supports sibling branches and historical linear support routes", () => {
    const graph = addExtension(expanded(), "b", [node("z")], {
      ...extension,
      id: "second",
    });
    expect(graph.extensions).toHaveLength(2);
    const legacy = insertBranch(base(), "a", [node("legacy")]);
    expect(routeNodes(validateGraph(legacy)).map((n) => n.id)).toEqual([
      "a",
      "legacy",
      "b",
    ]);
    expect(nextLearningNode(legacy, "a")?.id).toBe("legacy");
  });
  it("rejects duplicate identity, repeated content, invalid anchors and oversized extensions", () => {
    expect(() =>
      addExtension(base(), "missing", [node("x")], extension),
    ).toThrow();
    expect(() => addExtension(base(), "a", [node("a")], extension)).toThrow();
    expect(() =>
      addExtension(base(), "a", [{ ...node("x"), title: " A " }], extension),
    ).toThrow();
    expect(() =>
      addExtension(
        base(),
        "a",
        [node("x"), { ...node("y"), objective: "Learn x" }],
        extension,
      ),
    ).toThrow();
    expect(() =>
      addExtension(expanded(), "a", [node("z")], extension),
    ).toThrow();
    expect(() =>
      addExtension(
        base(),
        "a",
        Array.from({ length: 7 }, (_, i) => node(`x${i}`)),
        extension,
      ),
    ).toThrow();
  });
  it("rejects orphan roots, multiple ownership, non-support nodes and broken chain prerequisites", () => {
    const missing = expanded();
    missing.extensions = [];
    expect(() => validateGraph(missing)).toThrow();
    const shared = expanded();
    shared.extensions!.push({
      ...extension,
      id: "other",
      anchorId: "a",
      nodeIds: ["x", "y"],
    });
    expect(() => validateGraph(shared)).toThrow();
    const wrongKind = expanded();
    wrongKind.nodes[2].kind = "main";
    expect(() => validateGraph(wrongKind)).toThrow();
    const prerequisite = expanded();
    prerequisite.nodes[2].prerequisites = ["a"];
    expect(() => validateGraph(prerequisite)).toThrow();
    const broken = expanded();
    broken.edges = broken.edges.filter((e) => e.from !== "x");
    expect(() => validateGraph(broken)).toThrow();
  });
  it("rejects physical entry/return edges and virtual anchor cycles", () => {
    const entry = expanded();
    entry.edges.push({ from: "b", to: "x" });
    expect(() => validateGraph(entry)).toThrow();
    const returning = expanded();
    returning.edges.push({ from: "y", to: "a" });
    expect(() => validateGraph(returning)).toThrow();
    const cycle = expanded();
    cycle.extensions![0].anchorId = "y";
    cycle.nodes[2].prerequisites = ["y"];
    expect(() => validateGraph(cycle)).toThrow();
  });
});

const attempt = (
  sectionId: string,
  passed: boolean,
  usedHelp = false,
): LearningAttempt => ({ nodeId: "a", sectionId, passed, usedHelp, at: 0 });
describe("depth recommendations", () => {
  it("requires distinct checkpoints and never treats one error or elapsed time as low ability", () => {
    expect(
      recommendDepth(
        [attempt("one", false), attempt("one", false)],
        "a",
        "applied",
      ),
    ).toBeNull();
    expect(
      recommendDepth(
        [attempt("one", false), attempt("two", true)],
        "a",
        "applied",
      ),
    ).toBeNull();
    expect(
      recommendDepth(
        [{ ...attempt("one", true), at: 99999999 }],
        "a",
        "applied",
      ),
    ).toBeNull();
  });
  it("raises one step with independent first-pass evidence, respecting bounds and node scope", () => {
    const attempts = [attempt("one", true), attempt("two", true)];
    expect(recommendDepth(attempts, "a", "foundation")?.depth).toBe("applied");
    expect(recommendDepth(attempts, "a", "advanced")).toBeNull();
    expect(recommendDepth(attempts, "other", "foundation")).toBeNull();
    expect(
      recommendDepth([...attempts, attempt("two", true, true)], "a", "applied"),
    ).toBeNull();
  });
  it("retains first attempts through retries and lowers only with repeated failure evidence", () => {
    const attempts = [
      attempt("one", false),
      attempt("one", true),
      attempt("two", false),
      attempt("two", true),
    ];
    expect(recommendDepth(attempts, "a", "advanced")?.depth).toBe("applied");
    expect(recommendDepth(attempts, "a", "foundation")).toBeNull();
  });
});
