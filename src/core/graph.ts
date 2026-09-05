import { validateGraph, type Graph, type LearningNode } from "./protocol";
export function insertBranch(
  graph: Graph,
  afterId: string,
  nodes: LearningNode[],
): Graph {
  const successor = graph.edges.find((e) => e.from === afterId)?.to;
  if (!successor) throw new Error("This node has no future rejoin point");
  if (!nodes.length || nodes.length > 3)
    throw new Error("Choose one to three support nodes");
  const result = structuredClone(graph);
  result.edges = result.edges.filter((e) => e.from !== afterId);
  let previous = afterId;
  for (const node of nodes) {
    result.nodes.push({ ...node, kind: "support", prerequisites: [previous] });
    result.edges.push({ from: previous, to: node.id });
    previous = node.id;
  }
  result.edges.push({ from: previous, to: successor });
  const rejoin = result.nodes.find((n) => n.id === successor)!;
  rejoin.prerequisites = Array.from(
    new Set([...rejoin.prerequisites, previous]),
  );
  return validateGraph(result);
}
export function routeNodes(graph: Graph): LearningNode[] {
  const result: LearningNode[] = [];
  let id: string | undefined = graph.nodes[0].id;
  while (id && result.length < graph.nodes.length) {
    const node = graph.nodes.find((n) => n.id === id);
    if (!node) break;
    result.push(node);
    id = graph.edges.find((e) => e.from === id)?.to;
  }
  return result;
}
