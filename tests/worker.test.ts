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
import { generalGraph, generalChapter } from "./fixtures/general-course";
it("a blocked prefetch cannot delay a new foreground course", async () => {
  const dir = mkdtempSync(join(tmpdir(), "methelia-priority-"));
  const store = new Store(join(dir, "methelia.sqlite"));
  const service = new LearningService(store);
  let release!: () => void,
    prefetchStarted = false;
  const blocked = new Promise<void>((r) => {
    release = r;
  });
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const input = JSON.parse(JSON.parse(raw).messages[1].content).input;
    if (input.goal === "first" && input.node?.id === "html") {
      prefetchStarted = true;
      await blocked;
    }
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify(
                input.node ? generalChapter(input.node) : generalGraph("none"),
              ),
            },
          },
        ],
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No address");
  const env = {
    ...process.env,
    METHELIA_DATA_DIR: dir,
    AI_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
    AI_API_KEY: "test",
    AI_MODEL: "local-test",
    ELEVENLABS_API_KEY: "",
    ELEVENLABS_VOICE_ID: "",
  };
  vi.stubEnv("AI_BASE_URL", env.AI_BASE_URL);
  vi.stubEnv("AI_API_KEY", "test");
  vi.stubEnv("AI_MODEL", "local-test");
  const child = spawn(
    process.execPath,
    ["--import", "tsx", resolve("src/server/worker.ts")],
    { env, stdio: "ignore", windowsHide: true },
  );
  try {
    const session = service.session();
    service.createCourse(session, "first", "live", "first");
    await vi.waitFor(() => expect(prefetchStarted).toBe(true), {
      timeout: 10000,
    });
    const started = Date.now();
    const second = service.createCourse(session, "second", "live", "second");
    await vi.waitFor(
      () =>
        expect(service.getCourse(session, second.id).chapters.web?.status).toBe(
          "ready",
        ),
      { timeout: 5000 },
    );
    console.log(
      `Foreground chapter ready while prefetch blocked: ${Date.now() - started}ms`,
    );
  } finally {
    release();
    child.kill();
    await once(child, "exit");
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    vi.unstubAllEnvs();
    store.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}, 20000);
it.each(["new chapter", "unvoiced legacy pages"])(
  "synthesizes %s in one request, retries a failed request, and reuses its one artifact",
  async (mode) => {
    const dir = mkdtempSync(join(tmpdir(), "methelia-speech-worker-"));
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
    if (mode === "unvoiced legacy pages") {
      delete pkg.narrationMode;
      pkg.pageAudio = {};
    }
    store.putPackage(course.id, pkg);
    store.enqueue("fish-one", course.id, "speech", pkg.id);
    const requests: string[] = [];
    let failChapter = true;
    const server = createServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += chunk;
      const input = JSON.parse(body);
      requests.push(input.text);
      if (failChapter) {
        failChapter = false;
        res.statusCode = 503;
        res.end("unavailable");
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          audio_base64: "YXVkaW8=",
          alignment: {
            characters: Array.from(input.text),
            character_start_times_seconds: Array.from(
              input.text,
              (_, i) => i / 10,
            ),
            character_end_times_seconds: Array.from(
              input.text,
              (_, i) => (i + 1) / 10,
            ),
          },
        }),
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
        pathToFileURL(resolve("tests/fixtures/elevenlabs-fetch.mjs")).href,
        "--import",
        "tsx",
        resolve("src/server/worker.ts"),
      ],
      {
        env: {
          ...process.env,
          METHELIA_DATA_DIR: dir,
          AI_API_KEY: "",
          ELEVENLABS_API_KEY: "test",
          ELEVENLABS_VOICE_ID: "teacher-test",
          ELEVENLABS_MODEL: "eleven_multilingual_v2",
          METHELIA_TEST_SPEECH_URL: `http://127.0.0.1:${address.port}`,
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
        if (row?.status === "done" || row?.status === "failed")
          return row.status;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error("Worker timeout: " + errors);
    };
    try {
      expect(await waitJob("fish-one"), errors).toBe("failed");
      const partial = service.getChapter(session, course.id, "web");
      expect(partial).toMatchObject({
        speech: "failed",
        speechProfile: {
          provider: "elevenlabs",
          voiceId: "teacher-test",
          model: "eleven_multilingual_v2",
        },
        narrationMode: "chapter",
      });
      expect(partial.pageAudio).toBeUndefined();
      expect(partial.cues).toEqual([]);
      expect(
        store.db.prepare("SELECT COUNT(*) AS n FROM audio_artifacts").get()?.n,
      ).toBe(0);
      const fullText = "Page one.\nPage two.\nPage three.";
      expect(requests).toEqual([fullText]);
      vi.stubEnv("ELEVENLABS_API_KEY", "test");
      vi.stubEnv("ELEVENLABS_VOICE_ID", "different-voice");
      vi.stubEnv("ELEVENLABS_MODEL", "eleven_flash_v2_5");
      service.retry(session, course.id, "web");
      expect(await waitJob("speech:" + pkg.id), errors).toBe("done");
      const ready = service.getChapter(session, course.id, "web");
      expect(ready).toMatchObject({
        speech: "ready",
        speechProfile: {
          provider: "elevenlabs",
          voiceId: "teacher-test",
          model: "eleven_multilingual_v2",
        },
        narrationMode: "chapter",
      });
      expect(ready.pageAudio).toBeUndefined();
      expect(ready.cues.map((cue) => cue.sectionId)).toEqual(
        pkg.chapter!.script.map((entry) => entry.sectionId),
      );
      expect(ready.captions?.map((caption) => caption.sectionId)).toEqual(
        pkg.chapter!.script.map((entry) => entry.sectionId),
      );
      for (let i = 1; i < ready.cues.length; i++)
        expect(ready.cues[i].start).toBeGreaterThanOrEqual(
          ready.cues[i - 1].end,
        );
      expect(store.db.prepare("SELECT id FROM audio_artifacts").all()).toEqual([
        { id: pkg.id },
      ]);
      store.enqueue("fish-duplicate", course.id, "speech", pkg.id);
      expect(await waitJob("fish-duplicate"), errors).toBe("done");
      expect(requests).toEqual([fullText, fullText]);
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
  },
  25000,
);

it("prepares the next chapter while current narration is blocked and preserves content after speech fails", async () => {
  const dir = mkdtempSync(join(tmpdir(), "methelia-independent-lanes-"));
  const store = new Store(join(dir, "methelia.sqlite"));
  const service = new LearningService(store);
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let speechStarted = false;
  let speechCalls = 0;
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    if (body.text) {
      speechCalls++;
      speechStarted = true;
      await blocked;
      res.statusCode = 503;
      res.end("Local speech double failed");
    } else {
      const input = JSON.parse(body.messages[1].content).input;
      const content = input.node
        ? generalChapter(input.node)
        : generalGraph("none");
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(content) } }],
        }),
      );
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing server address");
  const session = service.session();
  const course = service.createCourse(session, "Concepts", "demo", "lanes");
  service.mutate(session, course.id, (c) => {
    c.mode = "live";
    c.status = "planning";
    c.graph = null;
    c.revision = 0;
    c.currentNodeId = "";
    c.chapterIds = {};
    c.progress = {};
    store.db.prepare("DELETE FROM graph_revisions WHERE course_id=?").run(c.id);
    store.enqueue("lane-graph", c.id, "graph");
  });
  const child = spawn(
    process.execPath,
    [
      "--import",
      pathToFileURL(resolve("tests/fixtures/elevenlabs-fetch.mjs")).href,
      "--import",
      "tsx",
      resolve("src/server/worker.ts"),
    ],
    {
      env: {
        ...process.env,
        METHELIA_DATA_DIR: dir,
        AI_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
        AI_MODEL: "local-test",
        AI_API_KEY: "test",
        ELEVENLABS_API_KEY: "test",
        ELEVENLABS_VOICE_ID: "teacher-test",
        ELEVENLABS_MODEL: "eleven_multilingual_v2",
        METHELIA_TEST_SPEECH_URL: `http://127.0.0.1:${address.port}`,
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
    await vi.waitFor(
      () => {
        expect(speechStarted, errors).toBe(true);
        expect(
          service.getCourse(session, course.id).chapters.html?.status,
          errors,
        ).toBe("ready");
      },
      { timeout: 10000, interval: 50 },
    );
    const before = service.getCourse(session, course.id);
    expect(before.chapters.web.speech).toBe("generating");
    expect(before.chapters.html.speech).toBe("not_requested");
    expect(speechCalls).toBe(1);
    release();
    await vi.waitFor(
      () =>
        expect(service.getCourse(session, course.id).chapters.web.speech).toBe(
          "failed",
        ),
      { timeout: 5000 },
    );
    expect(service.getCourse(session, course.id).chapters.web.chapter).toEqual(
      before.chapters.web.chapter,
    );
    expect(speechCalls).toBe(1);
    expect(service.check(session, course.id, "check", 1).passed).toBe(true);
  } finally {
    release();
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}, 20000);
it("processes persisted graph and chapter jobs in the real worker process", async () => {
  const dir = mkdtempSync(join(tmpdir(), "methelia-worker-"));
  const store = new Store(join(dir, "methelia.sqlite"));
  const service = new LearningService(store);
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const input = JSON.parse(JSON.parse(body).messages[1].content).input;
    const content = input.node ? generalChapter(input.node) : generalGraph();
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
        ELEVENLABS_API_KEY: "",
        ELEVENLABS_VOICE_ID: "",
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
