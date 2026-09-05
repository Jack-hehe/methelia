import { createHash, randomUUID } from "node:crypto";
import type { Store } from "./db";
import { demoGraph, demoChapter } from "../core/fixtures";
import { speechConfig } from "./speech";
import { checkFeedback } from "../core/check-feedback";
import { useChapterNarration } from "./page-audio";
import {
  emptyWorkspace,
  normalizePath,
  runCommand,
  saveFiles,
  mergeStarterFiles,
} from "../core/workspace";
import {
  insertBranch,
  routeNodes,
  addExtension,
  nextLearningNode,
} from "../core/graph";
import { learnerProfileSchema } from "../core/learner-profile";
import {
  intakeFields,
  intakeFieldSchema,
  type IntakeField,
  type IntakeQuestion,
} from "../core/intake-question";
import { generateIntakeQuestion as generateQuestion } from "./model";
import { learningNote } from "../core/learning-notes";
import { recommendDepth } from "../core/adaptive-learning";
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
  LearnerProfile,
  LearningDepth,
} from "../core/state";
export const nodeHash = (node: LearningNode) =>
  createHash("sha256").update(JSON.stringify(node)).digest("hex");
const intakeRequests = new WeakMap<
  Store,
  Map<string, Promise<IntakeQuestion>>
>();

function intakeContext(c: Course, field: IntakeField, base: number) {
  if (!c.intake) throw new Error("Intake not found");
  if (c.status !== "intake" || c.intake.revision !== base)
    throw new Error("Intake conflict: 回答已更新，請重新載入");
  const answers: Partial<LearnerProfile> = {};
  for (const previous of intakeFields.slice(0, intakeFields.indexOf(field))) {
    const answer = c.intake.answers[previous];
    if (!answer?.trim()) throw new Error("請先回答前面的問題");
    Object.assign(answers, { [previous]: answer });
  }
  return {
    answers,
    context: JSON.stringify([c.goal, c.language || "zh-TW", field, answers]),
  };
}
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
  deleteCourse(
    session: string,
    id: string,
    intakeRevision?: number,
  ): { deleted: true } {
    return this.store.transaction(() => {
      const course = this.owned(session, id);
      if (
        intakeRevision !== undefined &&
        (course.status !== "intake" ||
          course.intake?.revision !== intakeRevision)
      )
        throw new Error("Intake conflict: 課程已更新，請重新載入後再取消");
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
    intake = false,
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
      const graph = mode === "demo" ? demoGraph(language) : null;
      const course: Course = {
        id: randomUUID(),
        sessionId: session,
        requestId,
        goal,
        language,
        scopeAccepted: true,
        mode,
        status: graph ? "ready" : intake ? "intake" : "planning",
        ...(intake && mode === "live"
          ? {
              learningVersion: 1 as const,
              intake: { answers: {}, revision: 0 },
              attempts: [],
              notes: {},
              adjustments: [],
            }
          : {}),
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
      } else if (!intake)
        this.store.enqueue(`graph:${course.id}`, course.id, "graph");
      this.store.putCourse(course);
      return this.snapshot(course);
    });
  }
  async generateIntakeQuestion(
    session: string,
    id: string,
    requestedField: IntakeField,
    base: number,
  ): Promise<IntakeQuestion> {
    const field = intakeFieldSchema.parse(requestedField);
    const course = this.owned(session, id);
    const { answers, context } = intakeContext(course, field, base);
    const cached = course.intake!.questions?.[field];
    if (cached?.context === context) return cached.question;
    let requests = intakeRequests.get(this.store);
    if (!requests) intakeRequests.set(this.store, (requests = new Map()));
    const key = JSON.stringify([id, base, context]);
    const pending = requests.get(key);
    if (pending) return pending;
    const request = (async () => {
      const question = await generateQuestion(
        course.goal,
        course.language || "zh-TW",
        field,
        answers,
      );
      return this.mutate(session, id, (c) => {
        if (intakeContext(c, field, base).context !== context)
          throw new Error("Intake conflict: 回答已更新，請重新載入");
        c.intake!.questions ??= {};
        c.intake!.questions[field] = { context, question };
        return question;
      });
    })();
    requests.set(key, request);
    try {
      return await request;
    } finally {
      requests.delete(key);
    }
  }
  saveIntake(
    session: string,
    id: string,
    answers: Partial<LearnerProfile>,
    base: number,
    finalize: boolean,
  ) {
    const patch = learnerProfileSchema.partial().parse(answers);
    return this.mutate(session, id, (c) => {
      if (!c.intake) throw new Error("Intake not found");
      const merged = { ...c.intake.answers, ...patch };
      if (c.status !== "intake") {
        if (
          finalize &&
          JSON.stringify(learnerProfileSchema.parse(merged)) ===
            JSON.stringify(c.learnerProfile)
        )
          return this.snapshot(c);
        throw new Error("Intake conflict: 課程已開始，請保留目前設定");
      }
      if (c.intake.revision !== base)
        throw new Error("Intake conflict: 回答已更新，請重新載入");
      if (c.intake.questions) {
        const changed = intakeFields.findIndex(
          (field) =>
            patch[field] !== undefined &&
            patch[field] !== c.intake!.answers[field],
        );
        if (changed >= 0) {
          for (const later of intakeFields.slice(changed + 1)) {
            delete c.intake.questions[later];
            if (patch[later] === undefined) delete merged[later];
          }
        }
      }
      if (finalize) {
        c.learnerProfile = learnerProfileSchema.parse(merged);
        c.status = "planning";
        this.store.enqueue(`graph:${c.id}`, c.id, "graph");
      }
      c.intake = { ...c.intake, answers: merged, revision: base + 1 };
      return this.snapshot(c);
    });
  }
  refreshNote(c: Course, nodeId: string) {
    const pkg = this.store.getPackage(c.chapterIds[nodeId]);
    if (!pkg?.chapter) return;
    c.notes ??= {};
    c.notes[nodeId] = learningNote(c, nodeId, pkg);
  }
  saveNote(
    session: string,
    id: string,
    nodeId: string,
    text: string,
    base: number,
  ) {
    if (text.length > 10000) throw new Error("筆記最多 10,000 字");
    return this.mutate(session, id, (c) => {
      if (!c.graph?.nodes.some((n) => n.id === nodeId))
        throw new Error("Node not found");
      this.refreshNote(c, nodeId);
      c.notes ??= {};
      const note = c.notes[nodeId] || {
        summary: [],
        checkpoints: [],
        questions: [],
        personal: "",
        revision: 0,
      };
      if (note.revision !== base)
        throw new Error(
          "Note conflict: 筆記已更新，草稿仍保留，請重新載入後合併",
        );
      c.notes[nodeId] = { ...note, personal: text, revision: base + 1 };
      return this.snapshot(c);
    });
  }
  prepare(c: Course, nodeId: string): PackageState {
    if (c.learningVersion === 1 && nodeId !== c.currentNodeId)
      throw new Error("一次只準備正在學習的章節");
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
    const chapter = c.mode === "demo" ? demoChapter(node, c.language) : null;
    const pkg: PackageState = {
      id: randomUUID(),
      nodeHash: this.preparationHash(c, node),
      status: chapter ? "ready" : "queued",
      speech: chapter ? "failed" : "not_requested",
      chapter,
      cues: [],
      narrationMode: "chapter",
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
    if (chapter && nodeId === c.currentNodeId) {
      this.initialize(c, chapter);
      this.refreshNote(c, nodeId);
    }
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
      useChapterNarration(pkg);
      pkg.speechProfile = speechConfig(
        pkg.speechProfile,
        c.language || "zh-TW",
      ).profile;
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
    if (c.learningVersion === 1) return;
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
      const result = runCommand(c.workspace, command, c.language);
      c.workspace = result.workspace;
      return result;
    });
  }
  check(
    session: string,
    id: string,
    sectionId: string,
    answer?: number,
    nodeId?: string,
  ) {
    return this.mutate(session, id, (c) => {
      if (nodeId && nodeId !== c.currentNodeId)
        throw new Error("Chapter conflict: 學習位置已改變，請重新載入");
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
      if (!c.progress[c.currentNodeId].done.includes(sectionId)) {
        c.attempts ??= [];
        if (c.attempts.length >= 5000)
          throw new Error("本課程已達作答紀錄上限");
        const feedback = checkFeedback(
          section,
          c.workspace,
          passed,
          answer,
          c.language,
        );
        c.attempts.push({
          nodeId: c.currentNodeId,
          sectionId,
          passed,
          answer,
          at: Date.now(),
          usedHelp:
            !!c.notes?.[c.currentNodeId]?.questions.length ||
            c.messages.some(
              (m) => m.nodeId === c.currentNodeId && m.role === "user",
            ),
          actual: feedback.actual?.slice(0, 4000),
          expected: feedback.expected?.slice(0, 4000),
        });
      }
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
      this.refreshNote(c, c.currentNodeId);
      this.recommendNext(c);
      return {
        passed,
        progress: c.progress[c.currentNodeId],
        notes: c.notes,
        adjustments: c.adjustments,
        feedback: checkFeedback(
          section,
          c.workspace,
          passed,
          answer,
          c.language,
        ),
      };
    });
  }
  advance(session: string, id: string, nodeId?: string) {
    return this.mutate(session, id, (c) => {
      if (nodeId && nodeId !== c.currentNodeId)
        throw new Error("Chapter conflict: 學習位置已改變，請重新載入");
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
      this.refreshNote(c, c.currentNodeId);
      const next = nextLearningNode(
        c.graph!,
        c.currentNodeId,
        c.extensionSession?.extensionId,
      );
      if (next) {
        const adjustment = c.adjustments?.find(
          (a) => a.fromNodeId === c.currentNodeId && a.nodeId === next.id,
        );
        if (
          adjustment &&
          !adjustment.reverted &&
          !c.completed.includes(next.id) &&
          !c.chapterIds[next.id]
        ) {
          next.depth = adjustment.depth;
          c.revision++;
          this.store.revision(c);
        }
        c.currentNodeId = next.id;
        const pkg = this.prepare(c, next.id);
        if (pkg.chapter) this.initialize(c, pkg.chapter);
        this.scheduleSpeech(c, pkg);
        this.prefetch(c);
      } else if (c.extensionSession) this.returnFromExtension(c);
      return this.snapshot(c);
    });
  }
  /** Move the learning position to a chapter further along the route without
   * completing what comes before. Nothing is marked done, so a skipped chapter
   * stays available and the learner can jump back to it later. */
  jumpTo(session: string, id: string, nodeId: string) {
    return this.mutate(session, id, (c) => {
      if (!c.graph) throw new Error("課程還在規劃中，請稍後再試。");
      if (c.extensionSession)
        throw new Error("請先離開延伸單元，再跳到其他章節。");
      if (!c.graph.nodes.some((n) => n.id === nodeId))
        throw new Error("Node not found");
      if (
        c.graph.extensions?.some((extension) =>
          extension.nodeIds.includes(nodeId),
        )
      )
        throw new Error("請使用「進入延伸」開啟這個單元，以保留主線進度。");
      if (nodeId === c.currentNodeId) return this.snapshot(c);
      c.currentNodeId = nodeId;
      const pkg = this.prepare(c, nodeId);
      if (pkg.chapter) this.initialize(c, pkg.chapter);
      this.scheduleSpeech(c, pkg);
      this.prefetch(c);
      return this.snapshot(c);
    });
  }
  recommendNext(c: Course) {
    if (c.learningVersion !== 1 || !c.graph) return;
    const chapter = this.store.getPackage(
      c.chapterIds[c.currentNodeId],
    )?.chapter;
    if (
      !chapter ||
      chapter.sections.some(
        (s) => s.completion && !c.progress[c.currentNodeId].done.includes(s.id),
      )
    )
      return;
    const next = nextLearningNode(
      c.graph,
      c.currentNodeId,
      c.extensionSession?.extensionId,
    );
    if (!next || c.chapterIds[next.id] || c.completed.includes(next.id)) return;
    c.adjustments ??= [];
    if (
      c.adjustments.some(
        (a) => a.fromNodeId === c.currentNodeId && a.nodeId === next.id,
      )
    )
      return;
    const depth = next.depth || c.learnerProfile?.depth || "foundation";
    const suggestion = recommendDepth(
      c.attempts || [],
      c.currentNodeId,
      depth,
      c.language || "zh-TW",
    );
    if (suggestion)
      c.adjustments.push({
        id: randomUUID(),
        fromNodeId: c.currentNodeId,
        nodeId: next.id,
        previousDepth: depth,
        ...suggestion,
      });
  }
  keepDifficulty(
    session: string,
    id: string,
    adjustmentId: string,
    keep: boolean,
  ) {
    return this.mutate(session, id, (c) => {
      const a = c.adjustments?.find((a) => a.id === adjustmentId);
      if (!a || a.fromNodeId !== c.currentNodeId || c.chapterIds[a.nodeId])
        throw new Error("Adjustment conflict: 下一章已開始或建議已過期");
      a.reverted = keep;
      return this.snapshot(c);
    });
  }
  previewExtension(
    session: string,
    id: string,
    nodes: LearningNode[],
    plan: {
      title: string;
      depth: LearningDepth;
      reason: string;
      afterId: string;
      baseRevision: number;
      returnNodeId: string;
    },
  ) {
    return this.mutate(session, id, (c) => {
      if (!c.graph || c.status !== "ready" || c.scopeAccepted === false)
        throw new Error("課程範圍尚未準備完成");
      if (
        c.revision !== plan.baseRevision ||
        c.currentNodeId !== plan.returnNodeId
      )
        throw new Error("Graph conflict: 學習位置已更新，請重新預覽");
      const extension = {
        id: randomUUID(),
        title: plan.title,
        depth: plan.depth,
      };
      const accepted = nodes.map((n) => nodeSchema.parse(n));
      addExtension(c.graph, plan.afterId, accepted, extension);
      c.preview = {
        id: randomUUID(),
        baseRevision: c.revision,
        afterId: plan.afterId,
        rejoinId: c.currentNodeId,
        nodes: accepted,
        extension,
        reason: plan.reason,
      };
      return c.preview;
    });
  }
  confirmExtension(
    session: string,
    id: string,
    previewId: string,
    base: number,
    enterNow = false,
  ) {
    return this.mutate(session, id, (c) => {
      if (c.confirmed[previewId]) return this.snapshot(c);
      const p = c.preview;
      if (
        !p?.extension ||
        p.id !== previewId ||
        base !== c.revision ||
        p.rejoinId !== c.currentNodeId
      )
        throw new Error("Graph conflict: 延伸預覽已過期，請重新預覽");
      c.graph = addExtension(c.graph!, p.afterId, p.nodes, p.extension);
      c.revision++;
      c.confirmed[previewId] = c.revision;
      c.preview = null;
      this.store.revision(c);
      if (enterNow) this.startExtension(c, p.extension.id);
      return this.snapshot(c);
    });
  }
  startExtension(c: Course, extensionId: string) {
    if (c.extensionSession) {
      if (c.extensionSession.extensionId === extensionId) return;
      throw new Error("請先返回主線，再進入另一個延伸單元");
    }
    if (c.scopeAccepted === false || c.status !== "ready")
      throw new Error("請先確認課程範圍");
    const ext = c.graph?.extensions?.find((e) => e.id === extensionId);
    if (!ext) throw new Error("Extension not found");
    if (!c.completed.includes(ext.anchorId) && ext.anchorId !== c.currentNodeId)
      throw new Error("請先學習來源節點，再進入這個延伸單元");
    if (
      this.store.getPackage(c.chapterIds[c.currentNodeId])?.status !== "ready"
    )
      throw new Error("請等待目前章節準備完成，再切換單元");
    c.extensionSession = {
      extensionId,
      returnNodeId: c.currentNodeId,
      mainWorkspace: structuredClone(c.workspace),
    };
    const oldRevision = c.workspace.revision;
    c.workspace = structuredClone(
      c.extensionWorkspaces?.[extensionId] || emptyWorkspace(),
    );
    c.workspace.revision = Math.max(oldRevision, c.workspace.revision) + 1;
    c.currentNodeId =
      ext.nodeIds.find((id) => !c.completed.includes(id)) || ext.nodeIds[0];
    const pkg = this.prepare(c, c.currentNodeId);
    if (pkg.chapter) this.initialize(c, pkg.chapter);
    this.scheduleSpeech(c, pkg);
  }
  enterExtension(session: string, id: string, extensionId: string) {
    return this.mutate(session, id, (c) => {
      this.startExtension(c, extensionId);
      return this.snapshot(c);
    });
  }
  returnFromExtension(c: Course) {
    const active = c.extensionSession;
    if (!active) return;
    c.extensionWorkspaces ??= {};
    c.extensionWorkspaces[active.extensionId] = structuredClone(c.workspace);
    const revision = c.workspace.revision;
    c.workspace = structuredClone(active.mainWorkspace);
    c.workspace.revision = Math.max(c.workspace.revision, revision) + 1;
    c.currentNodeId = active.returnNodeId;
    c.extensionSession = undefined;
    c.preview = null;
  }
  leaveExtension(session: string, id: string) {
    return this.mutate(session, id, (c) => {
      if (
        c.extensionSession &&
        ["queued", "generating"].includes(
          this.store.getPackage(c.chapterIds[c.currentNodeId])?.status || "",
        )
      )
        throw new Error("請等待延伸章節準備完成，再返回主線");
      this.returnFromExtension(c);
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
          (pkg?.pageAudio || pkg?.narrationMode === "chapter") &&
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
      for (const nodeId of new Set(
        messages.map((m) => m.nodeId || c.currentNodeId),
      ))
        this.refreshNote(c, nodeId);
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
        const profile = speechConfig(undefined, c.language || "zh-TW").profile;
        const next: PackageState = {
          ...pkg,
          id: randomUUID(),
          speech: "pending",
          error: undefined,
          cues: [],
          captions: [],
          narrationMode: "chapter",
          speechProfile: profile,
        };
        delete next.pageAudio;
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
        useChapterNarration(pkg);
        pkg.speechProfile = speechConfig(
          pkg.speechProfile,
          c.language || "zh-TW",
        ).profile;
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
