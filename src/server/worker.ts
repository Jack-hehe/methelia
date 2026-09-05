import { randomUUID } from "node:crypto";
import { Store } from "./db";
import { LearningService } from "./service";
import { generateGraph, generateChapter } from "./model";
import { synthesize } from "./fish";
const store = new Store();
const service = new LearningService(store);
type Job = {
  id: string;
  course_id: string;
  package_id: string | null;
  kind: string;
};
async function work(job: Job) {
  const course = store.getCourse(job.course_id);
  if (!course) return;
  if (job.kind === "graph") {
    const graph = await generateGraph(course.goal);
    store.transaction(() => {
      const c = store.getCourse(course.id)!;
      if (c.graph) return;
      c.graph = graph;
      c.status = "ready";
      c.revision = 1;
      c.currentNodeId = graph.nodes[0].id;
      store.revision(c);
      service.prepare(c, c.currentNodeId);
      service.prefetch(c);
      store.putCourse(c);
    });
    return;
  }
  const pkg = store.getPackage(job.package_id!);
  if (!pkg) return;
  const nodeId = Object.keys(course.chapterIds).find(
    (id) => course.chapterIds[id] === pkg.id,
  );
  if (!nodeId) return;
  if (!pkg.chapter) {
    pkg.status = "generating";
    store.putPackage(course.id, pkg);
    const node = course.graph!.nodes.find((n) => n.id === nodeId)!;
    const chapter = await generateChapter(node, course.goal, course.workspace);
    if (chapter.nodeId !== node.id || chapter.objective !== node.objective)
      throw new Error("生成章節與學習目標不一致");
    store.transaction(() => {
      const c = store.getCourse(course.id)!;
      if (c.chapterIds[nodeId] !== pkg.id) return;
      pkg.chapter = chapter;
      pkg.status = "ready";
      pkg.speech = "pending";
      store.putPackage(c.id, pkg);
      if (c.currentNodeId === nodeId) service.initialize(c, chapter);
      store.putCourse(c);
    });
  }
  if (!pkg.chapter) return;
  pkg.speech = "generating";
  store.putPackage(course.id, pkg);
  try {
    const result = await synthesize(pkg.chapter);
    store.transaction(() => {
      store.db
        .prepare("INSERT OR REPLACE INTO audio_artifacts VALUES(?,?,?)")
        .run(pkg.id, result.audio, "audio/mpeg");
      pkg.cues = result.cues;
      pkg.speech = "ready";
      pkg.error = undefined;
      store.putPackage(course.id, pkg);
    });
  } catch (error) {
    pkg.speech = "failed";
    pkg.error = error instanceof Error ? error.message : "語音生成失敗";
    store.putPackage(course.id, pkg);
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
while (!stop) {
  const lease = Date.now() + 240000;
  const job = store.transaction(() => {
    const row = store.db
      .prepare(
        "SELECT id,course_id,package_id,kind FROM generation_jobs WHERE status='queued' OR (status='working' AND lease<?) ORDER BY CASE kind WHEN 'graph' THEN 0 WHEN 'speech' THEN 1 ELSE 2 END,rowid LIMIT 1",
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
      .prepare("UPDATE generation_jobs SET status='done',lease=0 WHERE id=?")
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
        const pkg = store.getPackage(job.package_id);
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
store.db.close();
