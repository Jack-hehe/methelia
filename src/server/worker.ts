import { Store } from "./db";
import { LearningService } from "./service";
import { generateGraph, generateChapter } from "./model";
import { synthesize, speechConfig } from "./speech";
import {
  pageAudioArtifactKey,
  pageAudioForChapter,
  pageAudioReady,
  hasLegacySpeech,
} from "./page-audio";
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
async function synthesizePages(courseId: string, packageId: string) {
  let pkg = activePackage(courseId, packageId);
  if (!pkg?.chapter || !pkg.pageAudio) return;
  const chapter = pkg.chapter;
  store.transaction(() => {
    const current = activePackage(courseId, packageId);
    if (!current?.chapter || !current.pageAudio) return;
    current.pageAudio = pageAudioForChapter(current.chapter, current.pageAudio);
    current.speech = pageAudioReady(current.chapter, current.pageAudio)
      ? "ready"
      : "generating";
    current.error = undefined;
    store.putPackage(courseId, current);
  });
  for (const [index, entry] of chapter.script.entries()) {
    pkg = activePackage(courseId, packageId);
    const page = pkg?.pageAudio?.[entry.sectionId];
    if (!pkg?.chapter || !page) return;
    const artifactKey = pageAudioArtifactKey(packageId, entry.sectionId);
    const saved = store.db
      .prepare("SELECT 1 FROM audio_artifacts WHERE id=? AND length(audio)>0")
      .get(artifactKey);
    if (page.status === "ready" && saved) continue;
    if (page.status === "failed")
      throw new Error(page.error || "Page audio generation failed");
    try {
      pkg = store.transaction(() => {
        const current = activePackage(courseId, packageId);
        const target = current?.pageAudio?.[entry.sectionId];
        if (!current?.chapter || !target) return null;
        if (hasLegacySpeech(current))
          throw new Error(
            "此章仍有舊語音，請手動重建章節語音以改用 ElevenLabs。",
          );
        current.speechProfile = speechConfig(current.speechProfile).profile;
        target.status = "generating";
        store.putPackage(courseId, current);
        return current;
      });
      if (!pkg?.chapter) return;
      const result = await synthesize(
        { ...pkg.chapter, script: [entry] },
        pkg.speechProfile,
        {
          previousText: chapter.script[index - 1]?.text,
          nextText: chapter.script[index + 1]?.text,
        },
      );
      store.transaction(() => {
        const current = activePackage(courseId, packageId);
        const target = current?.pageAudio?.[entry.sectionId];
        if (!current || !target) return;
        store.db
          .prepare("INSERT OR REPLACE INTO audio_artifacts VALUES(?,?,?)")
          .run(artifactKey, result.audio, "audio/mpeg");
        target.cues = result.cues;
        target.captions = result.captions;
        target.status = "ready";
        target.error = undefined;
        current.speech = pageAudioReady(current.chapter!, current.pageAudio!)
          ? "ready"
          : "generating";
        current.error = undefined;
        store.putPackage(courseId, current);
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Page audio generation failed";
      store.transaction(() => {
        const current = activePackage(courseId, packageId);
        const target = current?.pageAudio?.[entry.sectionId];
        if (!current || !target) return;
        target.status = "failed";
        target.error = message;
        current.speech = "failed";
        current.error = message;
        store.putPackage(courseId, current);
      });
      throw error;
    }
  }
}
async function work(job: Job) {
  const course = store.getCourse(job.course_id);
  if (!course) return;
  if (job.kind === "graph") {
    const graph = await generateGraph(course.goal, course.language);
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
    });
    if (chapter.nodeId !== node.id || chapter.objective !== node.objective)
      throw new Error("生成章節與學習目標不一致");
    store.transaction(() => {
      const c = store.getCourse(course.id);
      if (!c || c.chapterIds[nodeId] !== pkg.id) return;
      pkg.chapter = chapter;
      pkg.status = "ready";
      pkg.speech = "not_requested";
      pkg.pageAudio = pageAudioForChapter(chapter);
      store.putPackage(c.id, pkg);
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
  if (pkg.pageAudio) {
    await synthesizePages(course.id, pkg.id);
    return;
  }
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
      if (hasLegacySpeech(current))
        throw new Error(
          "此章仍有舊語音，請手動重建章節語音以改用 ElevenLabs。",
        );
      current.speechProfile = speechConfig(current.speechProfile).profile;
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
async function lane(kind: "content" | "speech") {
  while (!stop) {
    const lease = Date.now() + 240000;
    const job = store.transaction(() => {
      const row = store.db
        .prepare(
          `SELECT j.id,j.course_id,j.package_id,j.kind FROM generation_jobs j LEFT JOIN courses c ON c.id=j.course_id WHERE (j.status='queued' OR (j.status='working' AND j.lease<?)) AND ${kind === "speech" ? "j.kind='speech'" : "j.kind IN ('graph','chapter')"} ORDER BY CASE WHEN j.kind='graph' THEN 0 WHEN j.package_id=json_extract(c.data, '$.chapterIds.' || json_quote(json_extract(c.data, '$.currentNodeId'))) THEN 1 ELSE 2 END,j.rowid LIMIT 1`,
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
// One bounded lane for content and one for narration, sharing the same durable queue.
await Promise.all([lane("content"), lane("speech")]);
store.db.close();
