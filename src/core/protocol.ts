import { z } from "zod";
import {
  emptyWorkspace,
  mergeStarterFiles,
  normalizePath,
  validatePracticeCommand,
} from "./workspace";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const text = z.string().min(1).max(12000);
export const environmentSchema = z.enum(["none", "web", "python", "terminal"]);
export type LearningEnvironment = z.infer<typeof environmentSchema>;
export const nodeSchema = z
  .object({
    id,
    title: text,
    objective: text,
    minutes: z.number().int().min(1).max(20),
    kind: z.enum(["main", "support"]),
    prerequisites: z.array(id).max(40),
    environment: environmentSchema.optional(),
    depth: z.enum(["foundation", "applied", "advanced"]).optional(),
    summary: z.string().max(800).optional(),
    keyConcepts: z.array(z.string().min(1).max(120)).max(8).optional(),
    misconceptions: z.array(z.string().min(1).max(200)).max(5).optional(),
    assessment: z.string().max(500).optional(),
  })
  .strict();
export const graphSchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    title: text,
    outcome: z.string().max(500).optional(),
    scopeNote: z.string().max(800).optional(),
    requiresConfirmation: z.boolean().optional(),
    nodes: z.array(nodeSchema).min(2).max(50),
    edges: z.array(z.object({ from: id, to: id }).strict()).max(100),
    extensions: z
      .array(
        z
          .object({
            id,
            anchorId: id,
            nodeIds: z.array(id).min(1).max(6),
            title: z.string().min(1).max(120),
            depth: z.enum(["foundation", "applied", "advanced"]),
          })
          .strict(),
      )
      .max(20)
      .optional(),
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
      type: z.literal("lesson.article"),
      paragraphs: z.array(z.string().min(1).max(800)).min(1).max(4),
      takeaway: z.string().min(1).max(300),
      figure: z
        .object({
          items: z
            .array(
              z
                .object({
                  label: z.string().min(1).max(60),
                  description: z.string().min(1).max(250),
                })
                .strict(),
            )
            .min(2)
            .max(5),
          caption: z.string().min(1).max(250),
        })
        .strict()
        .optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("concept.canvas"),
      variant: z.enum(["cards", "web.languages"]).optional(),
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
      language: z.enum(["html", "css", "javascript", "python", "bash", "text"]),
      example: z.string().max(30000),
      expectedOutput: z.string().max(4000).optional(),
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
      type: z.literal("steps.sequence"),
      steps: z
        .array(z.object({ title: text, body: text }).strict())
        .min(2)
        .max(6),
    })
    .strict(),
  z
    .object({
      type: z.literal("diagram.flow"),
      items: z
        .array(z.object({ label: text, description: text }).strict())
        .min(2)
        .max(6),
    })
    .strict(),
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
  z.object({ type: z.literal("file.exists"), path: text }).strict(),
  z.object({ type: z.literal("directory.exists"), path: text }).strict(),
  z.object({ type: z.literal("cwd.equals"), path: text }).strict(),
]);
export const chapterSchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    environment: environmentSchema.optional(),
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
  narrative: [
    "lesson.article",
    "concept.canvas",
    "dom.explorer",
    "steps.sequence",
    "diagram.flow",
  ],
  focus: [
    "lesson.article",
    "concept.canvas",
    "dom.explorer",
    "quiz.choice",
    "browser.preview",
    "steps.sequence",
    "diagram.flow",
  ],
  split: [
    "lesson.article",
    "dom.explorer",
    "code.editor",
    "browser.preview",
    "steps.sequence",
    "diagram.flow",
  ],
  workspace: ["code.editor", "terminal", "file.tree", "browser.preview"],
  compare: ["concept.canvas", "steps.sequence", "diagram.flow"],
};

export function chapterEnvironment(chapter: Chapter): LearningEnvironment {
  return chapter.environment || (chapter.schemaVersion === 1 ? "web" : "none");
}

export function validateGraph(input: unknown): Graph {
  const graph = graphSchema.parse(input);
  if (
    graph.schemaVersion === 2 &&
    (!graph.outcome?.trim() || graph.nodes.some((n) => !n.environment))
  )
    throw new Error(
      "v2 graph requires an outcome and explicit node environments",
    );
  if (graph.requiresConfirmation && !graph.scopeNote?.trim())
    throw new Error("Scope confirmation requires an explanation");
  if (
    graph.schemaVersion === 2 &&
    graph.nodes.some((n) => n.title.length > 100 || n.objective.length > 500)
  )
    throw new Error("Node title/objective exceeds presentation limits");
  const ids = new Set(graph.nodes.map((n) => n.id));
  if (ids.size !== graph.nodes.length) throw new Error("Duplicate node ID");
  const extensions = graph.extensions || [];
  const extensionIds = new Set<string>();
  const owned = new Set<string>();
  const internalEdges = new Set<string>();
  for (const extension of extensions) {
    if (extensionIds.has(extension.id))
      throw new Error("Duplicate extension ID");
    extensionIds.add(extension.id);
    if (!ids.has(extension.anchorId))
      throw new Error("Unknown extension anchor");
    if (extension.nodeIds.includes(extension.anchorId))
      throw new Error("Extension anchor cycle");
    extension.nodeIds.forEach((nodeId, index) => {
      if (owned.has(nodeId))
        throw new Error("Extension node has multiple owners");
      owned.add(nodeId);
      const node = graph.nodes.find((item) => item.id === nodeId);
      if (!node || node.kind !== "support")
        throw new Error("Extension requires support nodes");
      const previous = index
        ? extension.nodeIds[index - 1]
        : extension.anchorId;
      if (node.prerequisites.length !== 1 || node.prerequisites[0] !== previous)
        throw new Error("Extension prerequisites must follow its chain");
      if (index) internalEdges.add(`${previous}:${nodeId}`);
    });
  }
  if (owned.has(graph.nodes[0].id))
    throw new Error("Main root cannot belong to an extension");
  const seenEdges = new Set<string>();
  for (const edge of graph.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to))
      throw new Error("Unknown edge node");
    const key = `${edge.from}:${edge.to}`;
    if (seenEdges.has(key)) throw new Error("Duplicate edge");
    if ((owned.has(edge.from) || owned.has(edge.to)) && !internalEdges.has(key))
      throw new Error("Extension edges must form one isolated chain");
    seenEdges.add(key);
  }
  for (const key of internalEdges)
    if (!seenEdges.has(key)) throw new Error("Missing extension chain edge");
  const traversalEdges = [
    ...graph.edges,
    ...extensions.map((extension) => ({
      from: extension.anchorId,
      to: extension.nodeIds[0],
    })),
  ];
  const visited = new Set<string>(),
    active = new Set<string>();
  function visit(key: string) {
    if (active.has(key)) throw new Error("Graph cycle");
    if (visited.has(key)) return;
    active.add(key);
    for (const e of traversalEdges.filter((e) => e.from === key)) visit(e.to);
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
        for (const e of traversalEdges.filter((e) => e.from === key))
          walk(e.to);
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
  const environment = chapterEnvironment(chapter);
  if (chapter.schemaVersion === 2) {
    if (!chapter.environment)
      throw new Error("v2 chapter requires an environment");
    if (!chapter.sections.some((s) => s.completion))
      throw new Error("Chapter needs at least one checkpoint");
    if (
      chapter.title.length > 100 ||
      chapter.objective.length > 500 ||
      chapter.sections.some((s) => s.title.length > 100 || s.body.length > 800)
    )
      throw new Error("Chapter exceeds title/body presentation limits");
    if (environment === "none" && Object.keys(chapter.workspaceSetup).length)
      throw new Error("Concept environment must not create a workspace");
  }
  // Same initializer as activation; no accepted-but-dropped nested paths.
  mergeStarterFiles(emptyWorkspace(), chapter.workspaceSetup);
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
  const sectionErrors: string[] = [];
  for (const section of chapter.sections) {
    try {
      if (section.guide) {
        const { path, find, replacement } = section.guide;
        const source = demonstrationFiles[path];
        if (
          section.intent !== "demonstrate" ||
          !source ||
          !source.includes(find)
        )
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
        throw new Error(
          "Quiz completion requires quiz component (quiz.choice). For ungraded exploration use intent explain and omit completion; keep assessed questions in separate quiz.choice sections.",
        );
      if (["practice", "check"].includes(section.intent) && !section.completion)
        throw new Error(
          "Practice section needs completion. For ungraded exploration use intent explain and omit completion. For an assessed task supply a compatible checkpoint; completion type quiz requires a quiz.choice component.",
        );
      if (c.type === "terminal")
        for (const command of c.commands) validatePracticeCommand(command);
      if (chapter.schemaVersion === 2) {
        if (
          environment === "none" &&
          (["terminal", "code.editor", "file.tree", "browser.preview"].includes(
            c.type,
          ) ||
            section.guide ||
            (section.completion && section.completion.type !== "quiz"))
        )
          throw new Error(
            "Component/checkpoint requires a practical environment",
          );
        if (
          (c.type === "browser.preview" ||
            c.type === "dom.explorer" ||
            (c.type === "concept.canvas" && c.variant === "web.languages")) &&
          environment !== "web"
        )
          throw new Error("Web component requires the web environment");
        if (c.type === "terminal" && environment !== "terminal")
          throw new Error(
            "Terminal component requires the terminal environment",
          );
        if (
          c.type === "terminal" &&
          c.commands.some((cmd) => cmd.startsWith("python "))
        )
          throw new Error(
            "Terminal environment is a file sandbox, not Python or a web server",
          );
        if (c.type === "code.editor") {
          if (
            normalizePath("/", c.path) !== c.path ||
            !(c.path in chapter.workspaceSetup)
          )
            throw new Error(
              "Code editor requires a prepared, canonical file path",
            );
          if (
            (c.language === "python") !== (environment === "python") ||
            (environment === "web" &&
              !["html", "css", "javascript"].includes(c.language))
          )
            throw new Error(
              `Code language is incompatible with environment: ${environment} does not support ${c.language}. Use ${environment === "python" ? "python" : "html, css or javascript"} for this editor, or present non-code planning as lesson.article plus a separate quiz.choice checkpoint.`,
            );
        }
        const condition = section.completion;
        if (
          condition &&
          "path" in condition &&
          normalizePath("/", condition.path) !== condition.path
        )
          throw new Error("Checkpoint path must be canonical");
        if (
          condition?.type === "file.includes" &&
          (!(condition.path in chapter.workspaceSetup) ||
            condition.value.length > 2000)
        )
          throw new Error(
            "File checkpoint requires a prepared editable file and a short target",
          );
        if (
          condition &&
          ["directory.exists", "cwd.equals", "file.exists"].includes(
            condition.type,
          ) &&
          environment !== "terminal"
        )
          throw new Error(
            "Filesystem checkpoint requires terminal environment",
          );
        if (condition?.type === "preview.running")
          throw new Error(
            "v2 needs a meaningful edit or quiz checkpoint, not merely viewing a preview",
          );
        if (
          c.type === "quiz.choice" &&
          (c.question.length > 500 ||
            c.explanation.length > 900 ||
            c.options.some((o) => o.length > 260))
        )
          throw new Error("Quiz exceeds presentation limits");
        if (
          c.type === "concept.canvas" &&
          c.cards.some(
            (card) => card.title.length > 100 || card.body.length > 800,
          )
        )
          throw new Error("Concept cards exceed presentation limits");
        if (section.guide?.previewClick && environment !== "web")
          throw new Error(
            "Preview click is only supported by the web environment",
          );
      }
    } catch (error) {
      sectionErrors.push(
        `Section "${section.id}": ${error instanceof Error ? error.message : "Invalid section"}`,
      );
    }
  }
  if (sectionErrors.length) throw new Error(sectionErrors.join("\n"));
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
