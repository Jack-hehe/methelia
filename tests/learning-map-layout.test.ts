import { describe, expect, it } from "vitest";
import { mapPositions } from "../src/components/learning-map-layout";
import type { Graph } from "../src/core/protocol";

describe("learning map branch layout", () => {
  it("keeps the main route in place and gives each extension its own row", () => {
    const node = (id: string) => ({
      id,
      title: id,
      objective: id,
      minutes: 5,
      kind: "main" as const,
      prerequisites: [],
    });
    const graph: Graph = {
      schemaVersion: 2,
      title: "Map",
      nodes: ["a", "b", "c", "e1", "e2", "f"].map(node),
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "e1", to: "e2" },
      ],
      extensions: [
        {
          id: "e",
          anchorId: "b",
          nodeIds: ["e1", "e2"],
          title: "Extension",
          depth: "applied",
        },
        {
          id: "f",
          anchorId: "b",
          nodeIds: ["f"],
          title: "Second",
          depth: "foundation",
        },
      ],
    };
    const positions = mapPositions(graph);
    expect(positions.c.x - positions.b.x).toBe(265);
    expect(positions.a.y).toBe(positions.c.y);
    expect(positions.e1.x).toBeGreaterThan(positions.b.x);
    expect(positions.e1.y).toBeGreaterThan(positions.b.y);
    expect(positions.e2.y).toBe(positions.e1.y);
    expect(positions.f.y).toBeGreaterThan(positions.e1.y);
    expect(Object.keys(positions)).toHaveLength(graph.nodes.length);
  });
});
