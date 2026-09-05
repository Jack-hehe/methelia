import type { Graph } from "../core/protocol";
import { routeNodes } from "../core/graph";

export function mapPositions(graph: Graph) {
  const positions: Record<string, { x: number; y: number }> = {};
  routeNodes(graph).forEach((node, index) => {
    positions[node.id] = {
      x: index * 265 + 50,
      y: node.kind === "support" ? 360 : 190,
    };
  });
  (graph.extensions ?? []).forEach((extension, row) => {
    const anchor = positions[extension.anchorId] ?? { x: 50, y: 190 };
    extension.nodeIds.forEach((id, index) => {
      positions[id] = { x: anchor.x + (index + 1) * 265, y: 550 + row * 200 };
    });
  });
  graph.nodes.forEach((node, index) => {
    positions[node.id] ??= { x: 50 + index * 265, y: 360 };
  });
  return positions;
}
