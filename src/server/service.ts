import { createHash, randomUUID } from "node:crypto";
import type { Store } from "./db";
import { demoGraph, demoChapter } from "../core/fixtures";
import { fishConfig } from "./fish";
import {
  emptyWorkspace,
  normalizePath,
  runCommand,
  saveFiles,
} from "../core/workspace";
import { insertBranch } from "../core/graph";
import { nodeSchema, type LearningNode, type Chapter } from "../core/protocol";
import type {
  Course,
  Snapshot,
  PackageState,
  Message,
  Progress,
} from "../core/state";
export const nodeHash = (node: LearningNode) =>
  createHash("sha256").update(JSON.stringify(node)).digest("hex");
export class LearningService {
  constructor(public store: Store) {}
  session(existing?: string): string {
    if (
      existing &&
      this.store.db
        .prepare("SELECT id FROM learner_sessions WHERE id=?")
        .get(existing)
    )
      return existing;
    const id = randomUUID();
    this.store.db
      .prepare("INSERT INTO learner_sessions VALUES(?,?)")
      .run(id, Date.now());
    return id;
  }
  owned(session: string, id: string): Course {
    const c = this.store.getCourse(id);
    if (!c || c.sessionId !== session) throw new Error("Course not found");
    return c;
  }
  snapshot(c: Course): Snapshot {
    const { sessionId: _, requestId: __, ...safe } = c;
    return {
      ...safe,
      chapters: Object.fromEntries(
        Object.entries(c.chapterIds).map(([node, id]) => [
          node,
          this.store.getPackage(id)!,
        ]),
      ),
    };
  }
  getCourse(session: string, id: string) {
    return this.snapshot(this.owned(session, id));
  }
  latest(session: string) {
    const row = this.store.db
      .prepare(
        "SELECT id FROM courses WHERE session_id=? ORDER BY rowid DESC LIMIT 1",
      )
      .get(session) as { id: string } | undefined;
    return row ? this.getCourse(session, row.id) : null;
  }
  mutate<T>(session: string, id: string, fn: (c: Course) => T): T {
    return this.store.transaction(() => {
      const c = this.owned(session, id);
      const result = fn(c);
      this.store.putCourse(c);
      return result;
    });
  }
  createCourse(
    session: string,
    goal: string,
    mode: "demo" | "live",
    requestId: string,
  ): Snapshot {
    if (!goal.trim() || goal.length > 1500)
      throw new Error("請輸入 1–1500 字的學習目標");
    if (
      mode === "live" &&
      (!process.env.AI_API_KEY ||
        !process.env.AI_BASE_URL ||
        !process.env.AI_MODEL)
    )
      throw new Error(
        "尚未設定 AI。請在 .env.local 設定 AI_BASE_URL、AI_MODEL、AI_API_KEY，或先開啟體驗課程。",
      );
    return this.store.transaction(() => {
      const old = this.store.db
        .prepare("SELECT id FROM courses WHERE session_id=? AND request_id=?")
        .get(session, requestId) as { id: string } | undefined;
      if (old) return this.getCourse(session, old.id);
      const busy = this.store.db
        .prepare(
          "SELECT count(*) AS n FROM generation_jobs j JOIN courses c ON c.id=j.course_id WHERE c.session_id=? AND j.status IN ('queued','working')",
        )
        .get(session) as { n: number };
      if (busy.n > 4) throw new Error("請等待目前的課程生成完成");
      const graph = mode === "demo" ? demoGraph() : null;
      const course: Course = {
        id: randomUUID(),
        sessionId: session,
        requestId,
        goal,
        mode,
        status: graph ? "ready" : "planning",
        graph,
        revision: graph ? 1 : 0,
        currentNodeId: graph?.nodes[0].id || "",
        completed: [],
        chapterIds: {},
        progress: {},
        workspace: emptyWorkspace(),
        messages: [],
        preview: null,
        confirmed: {},
        createdAt: Date.now(),
      };
      this.store.putCourse(course);
      if (graph) {
        this.store.revision(course);
        this.prepare(course, course.currentNodeId);
        this.prefetch(course);
      } else this.store.enqueue(`graph:${course.id}`, course.id, "graph");
      this.store.putCourse(course);
      return this.snapshot(course);
    });
  }
  prepare(c: Course, nodeId: string): PackageState {
    const node = c.graph!.nodes.find((n) => n.id === nodeId);
    if (!node) throw new Error("Node not found");
    const prior = c.chapterIds[nodeId]
      ? this.store.getPackage(c.chapterIds[nodeId])
      : null;
    if (
      prior &&
      (prior.nodeHash === nodeHash(node) ||
        nodeId === c.currentNodeId ||
        c.completed.includes(nodeId))
    )
      return prior;
    const chapter = c.mode === "demo" ? demoChapter(node) : null;
    const pkg: PackageState = {
      id: randomUUID(),
      nodeHash: nodeHash(node),
      status: chapter ? "ready" : "queued",
      speech: chapter ? "failed" : "pending",
      chapter,
      cues: [],
      pageAudio: {},
      ...(chapter
        ? { error: "體驗課程尚未合成語音，可使用完整文字模式。" }
        : {}),
    };
    c.chapterIds[nodeId] = pkg.id;
    this.store.putPackage(c.id, pkg);
    c.progress[nodeId] ??= {
      time: 0,
      sectionId: "",
      done: [],
      subtitleOnly: false,
      follow: true,
    };
    if (chapter && nodeId === c.currentNodeId) this.initialize(c, chapter);
    if (!chapter)
      this.store.enqueue(`chapter:${pkg.id}`, c.id, "chapter", pkg.id);
    return pkg;
  }
  initialize(c: Course, chapter: Chapter) {
    const additions: Record<string, string> = {};
    for (const [name, value] of Object.entries(chapter.workspaceSetup)) {
      const path = normalizePath("/", name);
      if (
        c.workspace.files[path] === undefined &&
        !c.workspace.directories.includes(path)
      ) {
        const parent = path.slice(0, path.lastIndexOf("/")) || "/";
        if (parent === "/") additions[path] = value;
      }
    }
    if (Object.keys(additions).length)
      c.workspace = saveFiles(c.workspace, additions, c.workspace.revision);
  }
  prefetch(c: Course) {
    const next = c.graph?.edges.find((e) => e.from === c.currentNodeId)?.to;
    if (next) this.prepare(c, next);
  }
  getChapter(session: string, courseId: string, nodeId: string) {
    const c = this.owned(session, courseId);
    const id = c.chapterIds[nodeId];
    if (!id) throw new Error("Chapter not found");
    return this.store.getPackage(id)!;
  }
  saveWorkspace(
    session: string,
    id: string,
    files: Record<string, string>,
    base: number,
  ) {
    return this.mutate(session, id, (c) => {
      c.workspace = saveFiles(c.workspace, files, base);
      return c.workspace;
    });
  }
  command(session: string, id: string, command: string) {
    return this.mutate(session, id, (c) => {
      const result = runCommand(c.workspace, command);
      c.workspace = result.workspace;
      return result;
    });
  }
  check(session: string, id: string, sectionId: string, answer?: number) {
    return this.mutate(session, id, (c) => {
      const pkg = this.store.getPackage(c.chapterIds[c.currentNodeId]);
      const section = pkg?.chapter?.sections.find((s) => s.id === sectionId);
      if (!section?.completion) throw new Error("Checkpoint not found");
      const condition = section.completion;
      let passed = false;
      if (condition.type === "quiz" && section.component.type === "quiz.choice")
        passed = answer === section.component.answer;
      if (condition.type === "file.includes")
        passed = (
          c.workspace.files[normalizePath("/", condition.path)] || ""
        ).includes(condition.value);
      if (condition.type === "preview.running")
        passed = c.workspace.previewRunning;
      if (passed) {
        const progress = c.progress[c.currentNodeId];
        progress.done = Array.from(new Set([...progress.done, sectionId]));
        this.store.db
          .prepare("INSERT INTO progress_events(course_id,data) VALUES(?,?)")
          .run(
            id,
            JSON.stringify({ node: c.currentNodeId, sectionId, passed: true }),
          );
      }
      return { passed, progress: c.progress[c.currentNodeId] };
    });
  }
  advance(session: string, id: string) {
    return this.mutate(session, id, (c) => {
      const chapter = this.store.getPackage(
        c.chapterIds[c.currentNodeId],
      )?.chapter;
      if (!chapter) throw new Error("Chapter is not ready");
      if (
        chapter.sections.some(
          (s) =>
            s.completion && !c.progress[c.currentNodeId].done.includes(s.id),
        )
      )
        throw new Error("Complete the required practice first");
      c.completed = Array.from(new Set([...c.completed, c.currentNodeId]));
      const next = c.graph!.edges.find((e) => e.from === c.currentNodeId)?.to;
      if (next) {
        c.currentNodeId = next;
        const pkg = this.prepare(c, next);
        if (pkg.chapter) this.initialize(c, pkg.chapter);
        this.prefetch(c);
      }
      return this.snapshot(c);
    });
  }
  saveProgress(
    session: string,
    id: string,
    nodeId: string,
    update: Partial<Progress>,
  ) {
    return this.mutate(session, id, (c) => {
      if (!c.progress[nodeId]) throw new Error("Unknown progress node");
      const p = c.progress[nodeId];
      if (typeof update.time === "number" && Number.isFinite(update.time))
        p.time = Math.max(0, Math.min(update.time, 7200));
      if (
        typeof update.sectionId === "string" &&
        update.sectionId.length < 100
      ) {
        const pkg = this.store.getPackage(c.chapterIds[nodeId]);
        if (
          pkg?.pageAudio &&
          !pkg.chapter?.sections.some(
            (section) => section.id === update.sectionId,
          )
        )
          throw new Error("Unknown progress section");
        p.sectionId = update.sectionId;
      }
      if (typeof update.follow === "boolean") p.follow = update.follow;
      if (update.subtitleOnly === true) {
        const pkg = this.store.getPackage(c.chapterIds[nodeId]);
        if (pkg?.status !== "ready" || pkg.speech !== "failed")
          throw new Error("Subtitle fallback is not available");
        p.subtitleOnly = true;
      }
      if (update.subtitleOnly === false) {
        if (this.store.getPackage(c.chapterIds[nodeId])?.speech !== "ready")
          throw new Error("Narration is not ready");
        p.subtitleOnly = false;
      }
      return p;
    });
  }
  previewBranch(
    session: string,
    id: string,
    nodes: LearningNode[],
    expected?: { baseRevision: number; afterId: string },
  ) {
    return this.mutate(session, id, (c) => {
      if (
        expected &&
        (expected.baseRevision !== c.revision ||
          expected.afterId !== c.currentNodeId)
      )
        throw new Error(
          "Graph conflict: 課程已更新，請重新整理頁面後再新增節點",
        );
      const accepted = nodes.map((n) => nodeSchema.parse(n));
      insertBranch(c.graph!, c.currentNodeId, accepted);
      c.preview = {
        id: randomUUID(),
        baseRevision: c.revision,
        afterId: c.currentNodeId,
        rejoinId: c.graph!.edges.find((e) => e.from === c.currentNodeId)!.to,
        nodes: accepted,
      };
      return c.preview;
    });
  }
  cancelBranch(session: string, id: string, previewId: string) {
    return this.mutate(session, id, (c) => {
      if (c.preview && c.preview.id !== previewId)
        throw new Error("Graph conflict: 節點預覽已更新");
      c.preview = null;
      return this.snapshot(c);
    });
  }
  confirmBranch(session: string, id: string, previewId: string, base: number) {
    return this.mutate(session, id, (c) => {
      if (c.confirmed[previewId]) return this.snapshot(c);
      if (
        !c.preview ||
        c.preview.id !== previewId ||
        base !== c.revision ||
        c.preview.afterId !== c.currentNodeId
      )
        throw new Error("Graph conflict: please preview the branch again");
      c.graph = insertBranch(c.graph!, c.currentNodeId, c.preview.nodes);
      c.revision++;
      c.confirmed[previewId] = c.revision;
      c.preview = null;
      this.store.revision(c);
      // Detach obsolete future packages immediately; immutable records remain available
      // for diagnostics, but a late worker result cannot become the active binding.
      for (const [nodeId, packageId] of Object.entries(c.chapterIds)) {
        if (nodeId === c.currentNodeId || c.completed.includes(nodeId))
          continue;
        const node = c.graph.nodes.find((n) => n.id === nodeId);
        const pkg = this.store.getPackage(packageId);
        if (!node || pkg?.nodeHash !== nodeHash(node)) {
          delete c.chapterIds[nodeId];
          delete c.progress[nodeId];
          this.store.db
            .prepare(
              "UPDATE generation_jobs SET status='cancelled' WHERE package_id=? AND status='queued'",
            )
            .run(packageId);
        }
      }
      this.prefetch(c);
      return this.snapshot(c);
    });
  }
  appendMessages(session: string, id: string, messages: Message[]) {
    return this.mutate(session, id, (c) => {
      c.messages = [...c.messages, ...messages].slice(-100);
      return c.messages;
    });
  }
  retry(session: string, id: string, nodeId: string) {
    return this.mutate(session, id, (c) => {
      const pkg = this.store.getPackage(c.chapterIds[nodeId]);
      if (!pkg) throw new Error("Chapter not found");
      if (pkg.status === "failed") {
        pkg.status = "queued";
        pkg.error = undefined;
        this.store.putPackage(id, pkg);
        this.store.db
          .prepare(
            "UPDATE generation_jobs SET status='queued',lease=0 WHERE id=? AND status='failed'",
          )
          .run(`chapter:${pkg.id}`);
      } else if (pkg.status === "ready" && pkg.speech === "failed") {
        fishConfig();
        if (pkg.pageAudio) {
          for (const page of Object.values(pkg.pageAudio))
            if (page.status === "failed") {
              page.status = "pending";
              page.error = undefined;
            }
        }
        pkg.speech = "pending";
        pkg.error = undefined;
        this.store.putPackage(id, pkg);
        this.store.enqueue(`speech:${pkg.id}`, id, "speech", pkg.id);
        this.store.db
          .prepare(
            "UPDATE generation_jobs SET status='queued',lease=0 WHERE id=? AND status='failed'",
          )
          .run(`speech:${pkg.id}`);
      }
      return this.snapshot(c);
    });
  }
}
