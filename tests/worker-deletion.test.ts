import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { rmSync, mkdtempSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoChapter, demoGraph } from "../src/core/fixtures";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
import { generalGraph } from "./fixtures/general-course";

type DeferredProvider = {
  kind: "model" | "speech";
  server: Server;
  url: string;
  received: Promise<void>;
  release: () => void;
  requestCount: () => number;
};

function deferredProvider(
  kind: "model" | "speech",
  outcome: "success" | "failure",
): Promise<DeferredProvider> {
  let signalReceived!: () => void;
  let releaseResponse!: () => void;
  const received = new Promise<void>((resolve) => {
    signalReceived = resolve;
  });
  const released = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  let requests = 0;
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    requests++;
    signalReceived();
    await released;
    if (outcome === "failure") {
      res.statusCode = 503;
      res.end("provider unavailable");
      return;
    }
    res.setHeader("Content-Type", "application/json");
    if (kind === "model") {
      const request = JSON.parse(body);
      const input = JSON.parse(request.messages[1].content).input;
      const content = input.node ? demoChapter(input.node) : generalGraph();
      res.end(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(content) } }],
        }),
      );
      return;
    }
    const input = JSON.parse(body);
    res.end(
      JSON.stringify({
        audio_base64: "YXVkaW8=",
        alignment: {
          characters: [input.text],
          character_start_times_seconds: [0],
          character_end_times_seconds: [2],
        },
      }),
    );
  });
  return new Promise((resolveReady, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("No test provider address"));
        return;
      }
      resolveReady({
        kind,
        server,
        url: `http://127.0.0.1:${address.port}`,
        received,
        release: releaseResponse,
        requestCount: () => requests,
      });
    });
  });
}

function startWorker(dir: string, provider: DeferredProvider): ChildProcess {
  return spawn(
    process.execPath,
    [
      ...(provider.kind === "speech"
        ? [
            "--import",
            pathToFileURL(resolve("tests/fixtures/elevenlabs-fetch.mjs")).href,
          ]
        : []),
      "--import",
      "tsx",
      resolve("src/server/worker.ts"),
    ],
    {
      env: {
        ...process.env,
        METHELIA_DATA_DIR: dir,
        AI_BASE_URL: `${provider.url}/v1`,
        AI_MODEL: "local-test",
        AI_API_KEY: "test",
        ELEVENLABS_API_KEY: "test",
        ELEVENLABS_VOICE_ID: "teacher-test",
        ELEVENLABS_MODEL: "eleven_multilingual_v2",
        METHELIA_TEST_SPEECH_URL: provider.url,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
}

async function waitForProvider(
  provider: DeferredProvider,
  child: ChildProcess,
  errors: () => string,
) {
  let received = false;
  void provider.received.then(() => {
    received = true;
  });
  await waitFor(() => received, child, errors);
}

async function waitFor(
  check: () => boolean,
  child: ChildProcess,
  errors: () => string,
) {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (check()) return;
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error(`Worker exited before draining: ${errors()}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Worker timeout: ${errors()}`);
}

async function stopWorker(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill();
  await exited;
}

async function closeServer(server: Server) {
  if (!server.listening) return;
  await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
}

function expectCourseTablesEmpty(store: Store) {
  const tables = [
    "courses",
    "graph_revisions",
    "chapter_packages",
    "generation_jobs",
    "audio_artifacts",
    "progress_events",
  ] as const;
  expect(
    Object.fromEntries(
      tables.map((table) => [
        table,
        store.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()?.n,
      ]),
    ),
  ).toEqual(Object.fromEntries(tables.map((table) => [table, 0])));
}

async function proveWorkerDrained(
  store: Store,
  child: ChildProcess,
  errors: () => string,
) {
  const sentinel = `deletion-sentinel:${randomUUID()}`;
  store.enqueue(sentinel, `missing:${randomUUID()}`, "speech", randomUUID());
  await waitFor(
    () =>
      store.db
        .prepare("SELECT status FROM generation_jobs WHERE id=?")
        .get(sentinel)?.status === "done",
    child,
    errors,
  );
  expect(child.exitCode, errors()).toBeNull();
  expect(child.signalCode, errors()).toBeNull();
  store.db.prepare("DELETE FROM generation_jobs WHERE id=?").run(sentinel);
}

afterEach(() => vi.unstubAllEnvs());

describe.each(["success", "failure"] as const)(
  "when a deferred provider resolves with %s",
  (outcome) => {
    it("does not restore a deleted course after graph generation", async () => {
      const dir = mkdtempSync(join(tmpdir(), "methelia-delete-graph-"));
      const store = new Store(join(dir, "methelia.sqlite"));
      const service = new LearningService(store);
      const session = service.session();
      vi.stubEnv("AI_BASE_URL", "http://127.0.0.1/test");
      vi.stubEnv("AI_MODEL", "local-test");
      vi.stubEnv("AI_API_KEY", "test");
      const course = service.createCourse(
        session,
        "A deferred graph",
        "live",
        randomUUID(),
      );
      vi.unstubAllEnvs();
      const provider = await deferredProvider("model", outcome);
      const child = startWorker(dir, provider);
      let stderr = "";
      child.stderr?.on("data", (data) => (stderr += String(data)));
      try {
        await waitForProvider(provider, child, () => stderr);
        service.deleteCourse(session, course.id);
        provider.release();
        await proveWorkerDrained(store, child, () => stderr);
        expectCourseTablesEmpty(store);
      } finally {
        provider.release();
        await stopWorker(child);
        await closeServer(provider.server);
        store.db.close();
        rmSync(dir, { recursive: true, force: true });
      }
    }, 25_000);

    it("does not restore a deleted course after chapter generation", async () => {
      const dir = mkdtempSync(join(tmpdir(), "methelia-delete-chapter-"));
      const store = new Store(join(dir, "methelia.sqlite"));
      const service = new LearningService(store);
      const session = service.session();
      const course = service.createCourse(
        session,
        "A deferred chapter",
        "demo",
        randomUUID(),
      );
      const pkg = service.getChapter(session, course.id, "web");
      pkg.status = "queued";
      pkg.speech = "pending";
      pkg.chapter = null;
      pkg.cues = [];
      pkg.captions = [];
      pkg.pageAudio = {};
      store.putPackage(course.id, pkg);
      store.enqueue(`deletion-chapter:${pkg.id}`, course.id, "chapter", pkg.id);
      const provider = await deferredProvider("model", outcome);
      const child = startWorker(dir, provider);
      let stderr = "";
      child.stderr?.on("data", (data) => (stderr += String(data)));
      try {
        await waitForProvider(provider, child, () => stderr);
        service.deleteCourse(session, course.id);
        provider.release();
        await proveWorkerDrained(store, child, () => stderr);
        expectCourseTablesEmpty(store);
      } finally {
        provider.release();
        await stopWorker(child);
        await closeServer(provider.server);
        store.db.close();
        rmSync(dir, { recursive: true, force: true });
      }
    }, 25_000);

    it.each(["legacy whole-chapter", "paged"] as const)(
      "does not restore deleted package or audio after %s speech generation",
      async (speechKind) => {
        const dir = mkdtempSync(join(tmpdir(), "methelia-delete-speech-"));
        const store = new Store(join(dir, "methelia.sqlite"));
        const service = new LearningService(store);
        const session = service.session();
        const course = service.createCourse(
          session,
          "Deferred narration",
          "demo",
          randomUUID(),
        );
        const pkg = service.getChapter(session, course.id, "web");
        const firstSection = pkg.chapter!.sections[0];
        const firstScript = pkg.chapter!.script[0];
        pkg.chapter = {
          ...pkg.chapter!,
          sections: [firstSection],
          script: [firstScript],
        };
        pkg.status = "ready";
        pkg.speech = "pending";
        pkg.cues = [];
        pkg.captions = [];
        if (speechKind === "legacy whole-chapter") delete pkg.pageAudio;
        else pkg.pageAudio = {};
        store.putPackage(course.id, pkg);
        store.enqueue(`deletion-speech:${pkg.id}`, course.id, "speech", pkg.id);
        const provider = await deferredProvider("speech", outcome);
        const child = startWorker(dir, provider);
        let stderr = "";
        child.stderr?.on("data", (data) => (stderr += String(data)));
        try {
          await waitForProvider(provider, child, () => stderr);
          service.deleteCourse(session, course.id);
          provider.release();
          await proveWorkerDrained(store, child, () => stderr);
          expectCourseTablesEmpty(store);
        } finally {
          provider.release();
          await stopWorker(child);
          await closeServer(provider.server);
          store.db.close();
          rmSync(dir, { recursive: true, force: true });
        }
      },
      25_000,
    );
  },
);

describe.each(["success", "failure"] as const)(
  "when replaced speech resolves with %s",
  (outcome) => {
    it.each(["legacy whole-chapter", "paged"] as const)(
      "does not modify the detached or replacement %s package",
      async (speechKind) => {
        const dir = mkdtempSync(join(tmpdir(), "methelia-replace-speech-"));
        const store = new Store(join(dir, "methelia.sqlite"));
        const service = new LearningService(store);
        const session = service.session();
        const course = service.createCourse(
          session,
          "Replaced narration",
          "demo",
          randomUUID(),
        );
        const pkg = service.getChapter(session, course.id, "web");
        pkg.status = "ready";
        pkg.speech = "pending";
        pkg.cues = [];
        pkg.captions = [];
        if (speechKind === "legacy whole-chapter") {
          const firstSection = pkg.chapter!.sections[0];
          const firstScript = pkg.chapter!.script[0];
          pkg.chapter = {
            ...pkg.chapter!,
            sections: [firstSection],
            script: [firstScript],
          };
          delete pkg.pageAudio;
        } else {
          pkg.pageAudio = {};
        }
        store.putPackage(course.id, pkg);
        store.enqueue(
          `replacement-speech:${pkg.id}`,
          course.id,
          "speech",
          pkg.id,
        );
        const provider = await deferredProvider("speech", outcome);
        const child = startWorker(dir, provider);
        let stderr = "";
        child.stderr?.on("data", (data) => (stderr += String(data)));
        try {
          await waitForProvider(provider, child, () => stderr);
          const detachedAtSwap = structuredClone(store.getPackage(pkg.id)!);
          const replacement = structuredClone(detachedAtSwap);
          replacement.id = randomUUID();
          replacement.speech = "failed";
          replacement.error = "replacement stays untouched";
          replacement.cues = [];
          replacement.captions = [];
          store.transaction(() => {
            const current = store.getCourse(course.id)!;
            current.chapterIds.web = replacement.id;
            store.putPackage(current.id, replacement);
            store.putCourse(current);
          });
          provider.release();
          await proveWorkerDrained(store, child, () => stderr);
          expect(store.getCourse(course.id)?.chapterIds.web).toBe(
            replacement.id,
          );
          expect(store.getPackage(pkg.id)).toEqual(detachedAtSwap);
          expect(store.getPackage(replacement.id)).toEqual(replacement);
          expect(
            store.db.prepare("SELECT COUNT(*) AS n FROM audio_artifacts").get(),
          ).toMatchObject({ n: 0 });
          expect(provider.requestCount()).toBe(1);
        } finally {
          provider.release();
          await stopWorker(child);
          await closeServer(provider.server);
          store.db.close();
          rmSync(dir, { recursive: true, force: true });
        }
      },
      25_000,
    );
  },
);
