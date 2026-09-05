import { Store } from "./db";
import { LearningService } from "./service";
import { generateGraph, generateChapter } from "./model";
import { synthesize, speechConfig } from "./speech";
import { useChapterNarration } from "./page-audio";
const store = new Store();
const service = new LearningService(store);
type Job = {
  id: string;
  course_id: string;
  package_id: string | null;
  kind: string;
};
// Check inside the same transaction as each write. A request may finish after
// the learner deletes a course or replaces its narration package.
function activePackage(courseId: string, packageId: string) {
  const course = store.getCourse(courseId);
  return course && Object.values(course.chapterIds).includes(packageId)
    ? store.getPackage(packageId)
    : null;
}
async function work(job: Job) {
  const course = store.getCourse(job.course_id);
  if (!course) return;
  if (job.kind === "graph") {
    const graph = await generateGraph(
      course.goal,
      course.language,
      course.learnerProfile,
    );
    store.transaction(() => {
      const c = store.getCourse(course.id);
      if (!c || c.graph) return;
      c.graph = graph;
      c.status = "ready";
      c.revision = 1;
      c.currentNodeId = graph.nodes[0].id;
      c.scopeAccepted = !graph.requiresConfirmation;
      store.revision(c);
      if (c.scopeAccepted) {
        service.prepare(c, c.currentNodeId);
        service.prefetch(c);
      }
      store.putCourse(c);
    });
    return;
  }
  const pkg = activePackage(course.id, job.package_id!);
  if (!pkg) return;
  const nodeId = Object.keys(course.chapterIds).find(
    (id) => course.chapterIds[id] === pkg.id,
  );
  if (!nodeId) return;
  if (!pkg.chapter) {
    const active = store.transaction(() => {
      if (!activePackage(course.id, pkg.id)) return false;
      pkg.status = "generating";
      store.putPackage(course.id, pkg);
      return true;
    });
    if (!active) return;
    const node = course.graph!.nodes.find((n) => n.id === nodeId)!;
    const chapter = await generateChapter(node, course.goal, course.workspace, {
      graph: course.graph,
      completed: course.completed,
      language: course.language,
      learnerProfile: course.learnerProfile,
      attempts: course.attempts,
    });
    if (chapter.nodeId !== node.id || chapter.objective !== node.objective)
      throw new Error("生成章節與學習目標不一致");
    store.transaction(() => {
      const c = store.getCourse(course.id);
      if (!c || c.chapterIds[nodeId] !== pkg.id) return;
      pkg.chapter = chapter;
      pkg.status = "ready";
      pkg.speech = "not_requested";
      pkg.narrationMode = "chapter";
      delete pkg.pageAudio;
      store.putPackage(c.id, pkg);
      service.refreshNote(c, nodeId);
      if (c.currentNodeId === nodeId) {
        service.initialize(c, chapter);
        service.scheduleSpeech(c, pkg);
      }
      store.putCourse(c);
    });
  }
  // Content preparation never waits for TTS. Prefetched chapters remain unvoiced.
  if (job.kind !== "speech") {
    store.transaction(() => {
      const current = store.getCourse(course.id);
      const active = activePackage(course.id, pkg.id);
      if (current?.currentNodeId === nodeId && active)
        service.scheduleSpeech(current, active);
    });
    return;
  }
  if (!pkg.chapter) return;
  // Ready page packages remain playable until an explicit rebuild.
  if (pkg.pageAudio && pkg.speech === "ready") return;
  // Recovered/duplicate deliveries must reuse an already committed audio package.
  if (
    pkg.speech === "ready" &&
    pkg.cues.length &&
    store.db
      .prepare("SELECT 1 FROM audio_artifacts WHERE id=? AND length(audio)>0")
      .get(pkg.id)
  )
    return;
  try {
    const active = store.transaction(() => {
      const current = activePackage(course.id, pkg.id);
      if (!current) return null;
      useChapterNarration(current);
      current.speechProfile = speechConfig(
        current.speechProfile,
        course.language || "zh-TW",
      ).profile;
      current.speech = "generating";
      store.putPackage(course.id, current);
      return current;
    });
    if (!active?.chapter) return;
    const result = await synthesize(active.chapter, active.speechProfile);
    store.transaction(() => {
      const current = activePackage(course.id, pkg.id);
      if (!current) return;
      store.db
        .prepare("INSERT OR REPLACE INTO audio_artifacts VALUES(?,?,?)")
        .run(pkg.id, result.audio, "audio/mpeg");
      current.cues = result.cues;
      current.captions = result.captions;
      current.speech = "ready";
      current.error = undefined;
      store.putPackage(course.id, current);
    });
  } catch (error) {
    store.transaction(() => {
      const current = activePackage(course.id, pkg.id);
      if (!current) return;
      current.speech = "failed";
      current.error = error instanceof Error ? error.message : "語音生成失敗";
      store.putPackage(course.id, current);
    });
    throw error;
  }
}
let stop = false;
process.on("SIGINT", () => {
  stop = true;
});
process.on("SIGTERM", () => {
  stop = true;
});
console.log("Methelia generation worker ready");
async function lane(kind: "content" | "prefetch" | "speech") {
  while (!stop) {
    const lease = Date.now() + 240000;
    const job = store.transaction(() => {
      const row = store.db
        .prepare(
          `SELECT j.id,j.course_id,j.package_id,j.kind FROM generation_jobs j LEFT JOIN courses c ON c.id=j.course_id WHERE (j.status='queued' OR (j.status='working' AND j.lease<?)) AND ${kind === "speech" ? "j.kind='speech'" : kind === "prefetch" ? "j.kind='chapter' AND c.id IS NOT NULL AND j.package_id != COALESCE(json_extract(c.data, '$.chapterIds.' || json_quote(json_extract(c.data, '$.currentNodeId'))), '')" : "(j.kind='graph' OR (j.kind='chapter' AND (c.id IS NULL OR j.package_id = json_extract(c.data, '$.chapterIds.' || json_quote(json_extract(c.data, '$.currentNodeId'))))))"} ORDER BY CASE WHEN j.kind='graph' THEN 0 WHEN j.package_id=json_extract(c.data, '$.chapterIds.' || json_quote(json_extract(c.data, '$.currentNodeId'))) THEN 1 ELSE 2 END,j.rowid LIMIT 1`,
        )
        .get(Date.now()) as Job | undefined;
      if (row)
        store.db
          .prepare(
            "UPDATE generation_jobs SET status='working',lease=? WHERE id=?",
          )
          .run(lease, row.id);
      return row;
    });
    if (!job) {
      await new Promise((r) => setTimeout(r, 700));
      continue;
    }
    const heartbeat = setInterval(
      () =>
        store.db
          .prepare(
            "UPDATE generation_jobs SET lease=? WHERE id=? AND status='working'",
          )
          .run(Date.now() + 240000, job.id),
      30000,
    );
    try {
      await work(job);
      store.db
        .prepare(
          "UPDATE generation_jobs SET status='done',lease=0 WHERE id=? AND status='working'",
        )
        .run(job.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Generation failed";
      store.transaction(() => {
        store.db
          .prepare(
            "UPDATE generation_jobs SET status='failed',lease=0,error=? WHERE id=?",
          )
          .run(message, job.id);
        const c = store.getCourse(job.course_id);
        if (c && job.kind === "graph") {
          c.status = "failed";
          c.error = message;
          store.putCourse(c);
        } else if (job.package_id) {
          const pkg = activePackage(job.course_id, job.package_id);
          if (pkg && !pkg.chapter) {
            pkg.status = "failed";
            pkg.error = message;
            store.putPackage(job.course_id, pkg);
          }
        }
      });
      console.error("Generation job failed", job.id, message);
    } finally {
      clearInterval(heartbeat);
    }
  }
}
// Reserve a foreground lane: a speculative chapter cannot block the learner's request.
await Promise.all([lane("content"), lane("prefetch"), lane("speech")]);
store.db.close();
