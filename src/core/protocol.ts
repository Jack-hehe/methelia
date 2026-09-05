import { z } from "zod";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const text = z.string().min(1).max(12000);
export const nodeSchema = z
  .object({
    id,
    title: text,
    objective: text,
    minutes: z.number().int().min(1).max(20),
    kind: z.enum(["main", "support"]),
    prerequisites: z.array(id).max(40),
  })
  .strict();
export const graphSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: text,
    nodes: z.array(nodeSchema).min(2).max(50),
    edges: z.array(z.object({ from: id, to: id }).strict()).max(100),
  })
  .strict();
const card = z
  .object({
    title: text,
    body: text,
    accent: z.enum(["violet", "blue", "amber", "green"]),
  })
  .strict();
export const componentSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("concept.canvas"),
      cards: z.array(card).min(1).max(6),
    })
    .strict(),
  z
    .object({
      type: z.literal("dom.explorer"),
      elements: z
        .array(
          z
            .object({
              tag: z.string().regex(/^[a-z][a-z0-9]*$/),
              label: text,
              description: text,
            })
            .strict(),
        )
        .min(1)
        .max(8),
    })
    .strict(),
  z
    .object({
      type: z.literal("code.editor"),
      path: text,
      language: z.enum(["html", "css", "javascript"]),
      example: z.string().max(30000),
    })
    .strict(),
  z
    .object({
      type: z.literal("terminal"),
      commands: z.array(text).min(1).max(8),
    })
    .strict(),
  z.object({ type: z.literal("file.tree") }).strict(),
  z.object({ type: z.literal("browser.preview") }).strict(),
  z
    .object({
      type: z.literal("quiz.choice"),
      question: text,
      options: z.array(text).min(2).max(5),
      answer: z.number().int().min(0),
      explanation: text,
    })
    .strict(),
]);
const conditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("quiz") }).strict(),
  z
    .object({ type: z.literal("file.includes"), path: text, value: text })
    .strict(),
  z.object({ type: z.literal("preview.running") }).strict(),
]);
export const chapterSchema = z
  .object({
    schemaVersion: z.literal(1),
    nodeId: id,
    title: text,
    objective: text,
    sections: z
      .array(
        z
          .object({
            id,
            title: text,
            body: text,
            intent: z.enum(["explain", "demonstrate", "practice", "check"]),
            template: z.enum([
              "narrative",
              "focus",
              "split",
              "workspace",
              "compare",
            ]),
            component: componentSchema,
            guide: z
              .object({
                path: text,
                find: z.string().min(1).max(5000),
                replacement: z.string().min(1).max(5000),
                previewClick: z
                  .string()
                  .regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,99}$/)
                  .optional(),
              })
              .strict()
              .optional(),
            completion: conditionSchema.optional(),
          })
          .strict(),
      )
      .min(2)
      .max(10),
    script: z
      .array(z.object({ sectionId: id, text }).strict())
      .min(2)
      .max(10),
    workspaceSetup: z.record(z.string(), z.string().max(50000)),
  })
  .strict();
export type Graph = z.infer<typeof graphSchema>;
export type LearningNode = z.infer<typeof nodeSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type Section = Chapter["sections"][number];
export type Component = z.infer<typeof componentSchema>;
export const templateRegistry: Record<
  Section["template"],
  readonly Component["type"][]
> = {
  narrative: ["concept.canvas", "dom.explorer"],
  focus: ["concept.canvas", "dom.explorer", "quiz.choice", "browser.preview"],
  split: ["dom.explorer", "code.editor", "browser.preview"],
  workspace: ["code.editor", "terminal", "file.tree", "browser.preview"],
  compare: ["concept.canvas"],
};

export function validateGraph(input: unknown): Graph {
  const graph = graphSchema.parse(input);
  const ids = new Set(graph.nodes.map((n) => n.id));
  if (ids.size !== graph.nodes.length) throw new Error("Duplicate node ID");
  const seenEdges = new Set<string>();
  for (const edge of graph.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to))
      throw new Error("Unknown edge node");
    const key = `${edge.from}:${edge.to}`;
    if (seenEdges.has(key)) throw new Error("Duplicate edge");
    seenEdges.add(key);
  }
  const visited = new Set<string>(),
    active = new Set<string>();
  function visit(key: string) {
    if (active.has(key)) throw new Error("Graph cycle");
    if (visited.has(key)) return;
    active.add(key);
    for (const e of graph.edges.filter((e) => e.from === key)) visit(e.to);
    active.delete(key);
    visited.add(key);
  }
  visit(graph.nodes[0].id);
  if (visited.size !== ids.size) throw new Error("Unreachable graph node");
  for (const node of graph.nodes)
    for (const prerequisite of node.prerequisites) {
      if (!ids.has(prerequisite) || prerequisite === node.id)
        throw new Error("Invalid prerequisite");
      const reachable = new Set<string>();
      function walk(key: string) {
        if (reachable.has(key)) return;
        reachable.add(key);
        for (const e of graph.edges.filter((e) => e.from === key)) walk(e.to);
      }
      walk(prerequisite);
      if (!reachable.has(node.id))
        throw new Error("Prerequisite must precede node");
    }
  if (
    graph.nodes.some(
      (n) => graph.edges.filter((e) => e.from === n.id).length > 1,
    )
  )
    throw new Error("MVP route requires one successor");
  return graph;
}

export function validateChapter(input: unknown): Chapter {
  const chapter = chapterSchema.parse(input);
  const ids = new Set(chapter.sections.map((s) => s.id));
  if (ids.size !== chapter.sections.length)
    throw new Error("Duplicate section");
  if (
    chapter.script.length !== chapter.sections.length ||
    chapter.script.some((s, i) => s.sectionId !== chapter.sections[i].id)
  )
    throw new Error("Narration section order mismatch");
  if (chapter.script.map((s) => s.text).join("\n").length > 12000)
    throw new Error("Chapter narration too long");
  const demonstrationFiles = { ...chapter.workspaceSetup };
  for (const section of chapter.sections) {
    if (section.guide) {
      const { path, find, replacement } = section.guide;
      const source = demonstrationFiles[path];
      if (section.intent !== "demonstrate" || !source || !source.includes(find))
        throw new Error(
          "Invalid guide: expected a replayable demonstration edit",
        );
      demonstrationFiles[path] = source.replace(find, replacement);
    }
    const c = section.component;
    if (!templateRegistry[section.template].includes(c.type))
      throw new Error("Component is incompatible with template");
    if (c.type === "quiz.choice" && c.answer >= c.options.length)
      throw new Error("Invalid quiz answer");
    if (section.completion?.type === "quiz" && c.type !== "quiz.choice")
      throw new Error("Quiz completion requires quiz component");
    if (["practice", "check"].includes(section.intent) && !section.completion)
      throw new Error("Practice section needs completion");
    if (
      c.type === "terminal" &&
      c.commands.some(
        (command) =>
          !/^(pwd|ls|cd|mkdir|touch|cat|clear)( [a-zA-Z0-9_./ -]+)?$|^python -m http\.server 8000$/.test(
            command,
          ),
      )
    )
      throw new Error("Unsupported terminal command");
  }
  if (
    Object.keys(chapter.workspaceSetup).length > 30 ||
    Object.keys(chapter.workspaceSetup).some(
      (p) =>
        !p.startsWith("/") || p.split("/").includes("..") || p.includes("\\"),
    )
  )
    throw new Error("Invalid starter path");
  return chapter;
}
