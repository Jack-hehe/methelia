import { validateGraph, type Graph, type LearningNode } from "./protocol";
export function addExtension(
  graph: Graph,
  anchorId: string,
  nodes: LearningNode[],
  extension: Pick<
    NonNullable<Graph["extensions"]>[number],
    "id" | "title" | "depth"
  >,
): Graph {
  if (!graph.nodes.some((node) => node.id === anchorId))
    throw new Error("Unknown extension anchor");
  if (!nodes.length || nodes.length > 6)
    throw new Error("Choose one to six extension nodes");
  const normalize = (value: string) =>
    value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  const titles = new Set(graph.nodes.map((node) => normalize(node.title)));
  const objectives = new Set(
    graph.nodes.map((node) => normalize(node.objective)),
  );
  for (const node of nodes) {
    const title = normalize(node.title),
      objective = normalize(node.objective);
    if (titles.has(title) || objectives.has(objective))
      throw new Error("Extension repeats an existing title or objective");
    titles.add(title);
    objectives.add(objective);
  }
  const result = structuredClone(graph);
  result.extensions = [
    ...(result.extensions || []),
    { ...extension, anchorId, nodeIds: nodes.map((node) => node.id) },
  ];
  nodes.forEach((node, index) => {
    const previous = index ? nodes[index - 1].id : anchorId;
    result.nodes.push({
      ...structuredClone(node),
      kind: "support",
      prerequisites: [previous],
    });
    if (index) result.edges.push({ from: previous, to: node.id });
  });
  return validateGraph(result);
}

export function nextLearningNode(
  graph: Graph,
  currentId: string,
  extensionId?: string,
): LearningNode | undefined {
  if (extensionId !== undefined) {
    const extension = graph.extensions?.find((item) => item.id === extensionId);
    if (!extension) return;
    const index = extension.nodeIds.indexOf(currentId);
    const nextId =
      currentId === extension.anchorId
        ? extension.nodeIds[0]
        : index >= 0
          ? extension.nodeIds[index + 1]
          : undefined;
    return graph.nodes.find((node) => node.id === nextId);
  }
  if (
    graph.extensions?.some((extension) => extension.nodeIds.includes(currentId))
  )
    return;
  const nextId = graph.edges.find((edge) => edge.from === currentId)?.to;
  return graph.nodes.find((node) => node.id === nextId);
}

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
