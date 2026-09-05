import { createHash, randomUUID } from "node:crypto";
import type { Store } from "./db";
import { demoGraph, demoChapter } from "../core/fixtures";
import { speechConfig } from "./speech";
import { hasLegacySpeech, pageAudioForChapter } from "./page-audio";
import {
  emptyWorkspace,
  normalizePath,
  runCommand,
  saveFiles,
  mergeStarterFiles,
} from "../core/workspace";
import { insertBranch, routeNodes } from "../core/graph";
import {
  nodeSchema,
  chapterEnvironment,
  type LearningNode,
  type Chapter,
} from "../core/protocol";
import type {
  Course,
  CourseSummary,
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
  listCourses(session: string): CourseSummary[] {
    // Project only card metadata; opening the library must not load every
    // course's chapter packages, messages, or workspace files.
    return this.store.db
      .prepare(
        `SELECT id, json_extract(data, '$.goal') AS goal,
          json_extract(data, '$.status') AS status,
          json_extract(data, '$.createdAt') AS createdAt
         FROM courses WHERE session_id=? ORDER BY rowid DESC`,
      )
      .all(session) as CourseSummary[];
  }
  deleteCourse(session: string, id: string): { deleted: true } {
    return this.store.transaction(() => {
      this.owned(session, id);
      const packages = this.store.db
        .prepare("SELECT id FROM chapter_packages WHERE course_id=?")
        .all(id) as { id: string }[];
      const deleteAudio = this.store.db.prepare(
        "DELETE FROM audio_artifacts WHERE id=? OR substr(id,1,length(?))=?",
      );
      for (const pkg of packages) {
        const pageAudioPrefix = `page-audio:${pkg.id}:`;
        deleteAudio.run(pkg.id, pageAudioPrefix, pageAudioPrefix);
      }
      this.store.db
        .prepare("DELETE FROM generation_jobs WHERE course_id=?")
        .run(id);
      this.store.db
        .prepare("DELETE FROM progress_events WHERE course_id=?")
        .run(id);
      this.store.db
        .prepare("DELETE FROM graph_revisions WHERE course_id=?")
        .run(id);
      this.store.db
        .prepare("DELETE FROM chapter_packages WHERE course_id=?")
        .run(id);
      this.store.db.prepare("DELETE FROM courses WHERE id=?").run(id);
      return { deleted: true };
    });
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
    language: "zh-TW" | "en" = "zh-TW",
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
        language,
        scopeAccepted: true,
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
    if (c.scopeAccepted === false)
      throw new Error("請先確認課程範圍，再準備章節。");
    const node = c.graph!.nodes.find((n) => n.id === nodeId);
    if (!node) throw new Error("Node not found");
    const prior = c.chapterIds[nodeId]
      ? this.store.getPackage(c.chapterIds[nodeId])
      : null;
    if (
      prior &&
      (prior.nodeHash === this.preparationHash(c, node) ||
        nodeId === c.currentNodeId ||
        c.completed.includes(nodeId))
    )
      return prior;
    const chapter = c.mode === "demo" ? demoChapter(node) : null;
    const pkg: PackageState = {
      id: randomUUID(),
      nodeHash: this.preparationHash(c, node),
      status: chapter ? "ready" : "queued",
      speech: chapter ? "failed" : "not_requested",
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
    if (chapterEnvironment(chapter) !== "none")
      c.workspace = mergeStarterFiles(c.workspace, chapter.workspaceSetup);
  }
  preparationHash(c: Course, node: LearningNode) {
    if (c.graph?.schemaVersion !== 2) return nodeHash(node);
    const route = routeNodes(c.graph);
    const at = route.findIndex((n) => n.id === node.id);
    return createHash("sha256")
      .update(
        JSON.stringify({
          protocol: 2,
          goal: c.goal,
          language: c.language,
          node,
          prior: route.slice(0, at).map((n) => ({
            id: n.id,
            objective: n.objective,
            environment: n.environment,
          })),
          next: route[at + 1]?.objective,
        }),
      )
      .digest("hex");
  }
  scheduleSpeech(c: Course, pkg: PackageState, automatic = true) {
    if (
      !pkg.chapter ||
      pkg.status !== "ready" ||
      ["pending", "generating", "ready"].includes(pkg.speech)
    )
      return;
    if (automatic && (c.mode !== "live" || pkg.speech === "failed")) return;
    try {
      if (hasLegacySpeech(pkg))
        throw new Error("舊語音仍保留，請使用重建章節語音切換供應商。");
      pkg.speechProfile = speechConfig(pkg.speechProfile).profile;
      pkg.pageAudio = pageAudioForChapter(pkg.chapter, pkg.pageAudio);
      pkg.speech = "pending";
      pkg.error = undefined;
      this.store.putPackage(c.id, pkg);
      this.store.enqueue(`speech:${pkg.id}`, c.id, "speech", pkg.id);
    } catch (error) {
      if (!automatic) throw error;
      pkg.speech = "failed";
      pkg.error = error instanceof Error ? error.message : "語音尚未設定";
      this.store.putPackage(c.id, pkg);
    }
  }
  acceptScope(session: string, id: string) {
    return this.mutate(session, id, (c) => {
      if (!c.graph || c.status !== "ready")
        throw new Error("課程路徑尚未準備完成。");
      if (c.scopeAccepted !== false) return this.snapshot(c);
      c.scopeAccepted = true;
      const pkg = this.prepare(c, c.currentNodeId);
      this.scheduleSpeech(c, pkg);
      this.prefetch(c);
      return this.snapshot(c);
    });
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
      const chapter = this.store.getPackage(
        c.chapterIds[c.currentNodeId],
      )?.chapter;
      if (
        chapter?.schemaVersion === 2 &&
        chapterEnvironment(chapter) !== "terminal"
      )
        throw new Error("這個章節使用編輯器，不提供 Terminal 指令。");
      if (chapter?.schemaVersion === 2 && command.trim().startsWith("python "))
        throw new Error(
          "教學檔案環境不執行 Python；請使用 Python 編輯器的執行按鈕。",
        );
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
      if (condition.type === "file.exists")
        passed = condition.path in c.workspace.files;
      if (condition.type === "directory.exists")
        passed = c.workspace.directories.includes(condition.path);
      if (condition.type === "cwd.equals")
        passed = c.workspace.cwd === condition.path;
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
        this.scheduleSpeech(c, pkg);
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
        if (!node || pkg?.nodeHash !== this.preparationHash(c, node)) {
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
  retry(
    session: string,
    id: string,
    nodeId: string,
    request?: { packageId: string; rebuild?: boolean },
  ) {
    return this.mutate(session, id, (c) => {
      const pkg = this.store.getPackage(c.chapterIds[nodeId]);
      if (!pkg) throw new Error("Chapter not found");
      if (request && request.packageId !== pkg.id)
        throw new Error("Chapter conflict，請重新整理後再試。");
      if (request?.rebuild) {
        if (pkg.status !== "ready" || !pkg.chapter)
          throw new Error("請等待章節內容準備完成。");
        if (["pending", "generating"].includes(pkg.speech))
          throw new Error("語音仍在準備中，請稍後再試。");
        const profile = speechConfig().profile;
        const next: PackageState = {
          ...pkg,
          id: randomUUID(),
          speech: "pending",
          error: undefined,
          cues: [],
          captions: [],
          pageAudio: pageAudioForChapter(pkg.chapter),
          speechProfile: profile,
        };
        // Keep the prior package/audio intact. A new ID prevents old tabs or
        // late worker responses from replacing the newly requested narrator.
        this.store.putPackage(id, next);
        c.chapterIds[nodeId] = next.id;
        if (c.progress[nodeId]) c.progress[nodeId].time = 0;
        this.store.db
          .prepare(
            "UPDATE generation_jobs SET status='failed',lease=0,error='Audio package replaced' WHERE package_id=? AND status IN ('queued','working')",
          )
          .run(pkg.id);
        this.store.enqueue(`speech:${next.id}`, id, "speech", next.id);
        return this.snapshot(c);
      }
      if (pkg.status === "failed") {
        pkg.status = "queued";
        pkg.error = undefined;
        this.store.putPackage(id, pkg);
        this.store.db
          .prepare(
            "UPDATE generation_jobs SET status='queued',lease=0 WHERE id=? AND status='failed'",
          )
          .run(`chapter:${pkg.id}`);
      } else if (
        pkg.status === "ready" &&
        ["failed", "not_requested"].includes(pkg.speech)
      ) {
        if (hasLegacySpeech(pkg))
          throw new Error(
            "此章仍有舊語音，請使用「重建章節語音」改用 ElevenLabs，避免混用聲音。",
          );
        pkg.speechProfile = speechConfig(pkg.speechProfile).profile;
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
