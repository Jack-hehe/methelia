import { expect, it } from "vitest";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
import { demoGraph, demoChapter } from "../src/core/fixtures";
it("processes persisted graph and chapter jobs in the real worker process", async () => {
  const dir = mkdtempSync(join(tmpdir(), "methelia-worker-"));
  const store = new Store(join(dir, "methelia.sqlite"));
  const service = new LearningService(store);
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const input = JSON.parse(JSON.parse(body).messages[1].content).input;
    const content = input.node ? demoChapter(input.node) : demoGraph();
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(content) } }],
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No test server address");
  // Create the graph job through the same service, then use a real worker and a local model double.
  const session = service.session();
  const course = service.createCourse(
    session,
    "A website",
    "demo",
    "worker-test",
  );
  service.mutate(session, course.id, (c) => {
    c.mode = "live";
    c.status = "planning";
    c.graph = null;
    c.revision = 0;
    c.currentNodeId = "";
    c.chapterIds = {};
    c.progress = {};
    store.db.prepare("DELETE FROM graph_revisions WHERE course_id=?").run(c.id);
    store.enqueue("worker-graph", c.id, "graph");
  });
  const child = spawn(
    process.execPath,
    ["--import", "tsx", resolve("src/server/worker.ts")],
    {
      env: {
        ...process.env,
        METHELIA_DATA_DIR: dir,
        AI_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
        AI_MODEL: "local-test",
        AI_API_KEY: "test",
        FISH_AUDIO_API_KEY: "",
        FISH_AUDIO_REFERENCE_ID: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  let errors = "";
  child.stderr.on("data", (data) => {
    errors += String(data);
  });
  try {
    const deadline = Date.now() + 15000;
    let snapshot = service.getCourse(session, course.id);
    while (Date.now() < deadline) {
      snapshot = service.getCourse(session, course.id);
      if (snapshot.chapters.web?.speech === "failed") break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(snapshot.status, errors).toBe("ready");
    expect(snapshot.chapters.web.status, errors).toBe("ready");
    expect(snapshot.chapters.web.chapter?.sections).toHaveLength(3);
    expect(snapshot.chapters.web.speech).toBe("failed");
    service.saveProgress(session, course.id, "web", { subtitleOnly: true });
    expect(service.check(session, course.id, "check", 1).passed).toBe(true);
  } finally {
    const exited = once(child, "exit");
    child.kill();
    await exited;
    await new Promise<void>((r) => server.close(() => r()));
    store.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}, 25000);
