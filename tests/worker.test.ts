import { expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
import { demoGraph, demoChapter } from "../src/core/fixtures";
it("synthesizes page audio sequentially, retries only a failed page, and reuses ready pages", async () => {
  const dir = mkdtempSync(join(tmpdir(), "methelia-fish-worker-"));
  const store = new Store(join(dir, "methelia.sqlite"));
  const service = new LearningService(store);
  const session = service.session();
  const course = service.createCourse(
    session,
    "Website",
    "demo",
    "fish-worker",
  );
  const pkg = service.getChapter(session, course.id, "web");
  pkg.chapter!.script = pkg.chapter!.script.map((s, i) => ({
    ...s,
    text: ["Page one.", "Page two.", "Page three."][i],
  }));
  pkg.speech = "pending";
  store.putPackage(course.id, pkg);
  store.enqueue("fish-one", course.id, "speech", pkg.id);
  const requests: string[] = [];
  let failSecondPage = true;
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const input = JSON.parse(body);
    requests.push(input.text);
    if (input.text === "Page two." && failSecondPage) {
      failSecondPage = false;
      res.statusCode = 503;
      res.end("unavailable");
      return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.end(
      `data: ${JSON.stringify({
        audio_base64: "YXVkaW8=",
        chunk_seq: 0,
        chunk_audio_offset_sec: 0,
        alignment: {
          audio_duration: 2,
          segments: [{ text: input.text, start: 0, end: 2 }],
        },
      })}\n\n`,
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No test server address");
  const child = spawn(
    process.execPath,
    [
      "--import",
      pathToFileURL(resolve("tests/fixtures/fish-fetch.mjs")).href,
      "--import",
      "tsx",
      resolve("src/server/worker.ts"),
    ],
    {
      env: {
        ...process.env,
        METHELIA_DATA_DIR: dir,
        AI_API_KEY: "",
        FISH_AUDIO_API_KEY: "test",
        FISH_AUDIO_REFERENCE_ID: "test",
        FISH_AUDIO_MODEL: "s2.1-pro-free",
        METHELIA_TEST_FISH_URL: `http://127.0.0.1:${address.port}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  let errors = "";
  child.stderr.on("data", (data) => {
    errors += String(data);
  });
  const waitJob = async (id: string) => {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const row = store.db
        .prepare("SELECT status FROM generation_jobs WHERE id=?")
        .get(id);
      if (row?.status === "done" || row?.status === "failed") return row.status;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("Worker timeout: " + errors);
  };
  try {
    expect(await waitJob("fish-one"), errors).toBe("failed");
    const partial = service.getChapter(session, course.id, "web");
    expect(partial).toMatchObject({
      speech: "failed",
      pageAudio: {
        languages: {
          status: "ready",
          cues: [{ sectionId: "languages", start: 0, end: 2 }],
          captions: [
            { sectionId: "languages", text: "Page one.", start: 0, end: 2 },
          ],
        },
        structure: { status: "failed" },
      },
    });
    expect(requests).toEqual(["Page one.", "Page two."]);
    vi.stubEnv("FISH_AUDIO_API_KEY", "test");
    vi.stubEnv("FISH_AUDIO_REFERENCE_ID", "test");
    vi.stubEnv("FISH_AUDIO_MODEL", "s2.1-pro-free");
    service.retry(session, course.id, "web");
    expect(await waitJob("speech:" + pkg.id), errors).toBe("done");
    const ready = service.getChapter(session, course.id, "web");
    expect(ready).toMatchObject({
      speech: "ready",
      pageAudio: {
        languages: { status: "ready" },
        structure: {
          status: "ready",
          captions: [
            { sectionId: "structure", text: "Page two.", start: 0, end: 2 },
          ],
        },
        check: { status: "ready" },
      },
    });
    expect(
      store.db.prepare("SELECT COUNT(*) AS n FROM audio_artifacts").get(),
    ).toMatchObject({ n: 3 });
    store.enqueue("fish-duplicate", course.id, "speech", pkg.id);
    expect(await waitJob("fish-duplicate"), errors).toBe("done");
    expect(requests).toEqual([
      "Page one.",
      "Page two.",
      "Page two.",
      "Page three.",
    ]);
  } finally {
    vi.unstubAllEnvs();
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
    await new Promise<void>((r) => server.close(() => r()));
    store.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}, 25000);
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
