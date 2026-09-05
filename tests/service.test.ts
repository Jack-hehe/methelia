import { afterEach, expect, it, vi } from "vitest";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const stores: Store[] = [];
function setup() {
  const store = new Store(":memory:");
  stores.push(store);
  const service = new LearningService(store);
  const session = service.session();
  const course = service.createCourse(session, "我的網站", "demo", "request-1");
  return { store, service, session, course };
}
afterEach(() => {
  vi.unstubAllEnvs();
  for (const store of stores.splice(0)) store.db.close();
});
it("rejects invalid ElevenLabs configuration before queuing synthesis", () => {
  vi.stubEnv("ELEVENLABS_API_KEY", "test");
  vi.stubEnv("ELEVENLABS_VOICE_ID", "test");
  vi.stubEnv("ELEVENLABS_MODEL", "unknown-model");
  const { service, store, session, course } = setup();
  expect(() => service.retry(session, course.id, "web")).toThrow(
    /ELEVENLABS_MODEL/,
  );
  expect(
    store.db
      .prepare("SELECT COUNT(*) AS n FROM generation_jobs WHERE kind='speech'")
      .get()?.n,
  ).toBe(0);
  expect(service.getChapter(session, course.id, "web").speech).toBe("failed");
});
it("restores saved course and files after reopening the SQLite database", () => {
  const dir = mkdtempSync(join(tmpdir(), "methelia-test-"));
  let store: Store | undefined;
  try {
    const path = join(dir, "state.sqlite");
    store = new Store(path);
    let service = new LearningService(store);
    const session = service.session();
    const course = service.createCourse(session, "Website", "demo", "restart");
    service.saveWorkspace(
      session,
      course.id,
      { "/index.html": "Saved before restart" },
      course.workspace.revision,
    );
    store.db.close();
    store = new Store(path);
    service = new LearningService(store);
    expect(
      service.getCourse(session, course.id).workspace.files["/index.html"],
    ).toBe("Saved before restart");
    expect(service.latest(session)?.id).toBe(course.id);
  } finally {
    store?.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
it("isolates courses between anonymous sessions", () => {
  const { service, course } = setup();
  expect(() => service.getCourse(service.session(), course.id)).toThrow(
    /not found/i,
  );
});
it("can re-enable narration after subtitle fallback only once audio is ready", () => {
  const { service, store, session, course } = setup();
  service.saveProgress(session, course.id, "web", { subtitleOnly: true });
  expect(() =>
    service.saveProgress(session, course.id, "web", { subtitleOnly: false }),
  ).toThrow(/ready/i);
  const pkg = service.getChapter(session, course.id, "web");
  pkg.speech = "ready";
  store.putPackage(course.id, pkg);
  expect(
    service.saveProgress(session, course.id, "web", { subtitleOnly: false })
      .subtitleOnly,
  ).toBe(false);
});
it("deduplicates course creation without generating a second course", () => {
  const { service, session, course } = setup();
  expect(
    service.createCourse(session, "我的網站", "demo", "request-1").id,
  ).toBe(course.id);
});
it("initializes new chapter packages for page audio and retains page-local progress evidence", () => {
  const { service, session, course } = setup();
  const pkg = service.getChapter(session, course.id, "web");
  expect(pkg).toHaveProperty("pageAudio", {});
  service.check(session, course.id, "check", 1);
  const progress = service.saveProgress(session, course.id, "web", {
    sectionId: "structure",
    time: 3.5,
  });
  expect(progress).toMatchObject({
    sectionId: "structure",
    time: 3.5,
    done: ["check"],
  });
});
it("requires exercise evidence before advancing and persists the next chapter", () => {
  const { service, session, course } = setup();
  expect(() => service.advance(session, course.id)).toThrow(/practice/i);
  expect(service.check(session, course.id, "check", 0).passed).toBe(false);
  expect(service.check(session, course.id, "check", 1).passed).toBe(true);
  const next = service.advance(session, course.id);
  expect(next.currentNodeId).toBe("html");
  expect(service.getCourse(session, course.id).completed).toContain("web");
});
it("confirms a branch once and pins the current chapter", () => {
  const { service, session, course } = setup();
  const original = service.getChapter(session, course.id, "web");
  const preview = service.previewBranch(session, course.id, [
    {
      id: "support-one",
      title: "HTML 基礎",
      objective: "理解標籤",
      minutes: 4,
      kind: "support",
      prerequisites: [],
    },
  ]);
  const first = service.confirmBranch(
    session,
    course.id,
    preview.id,
    preview.baseRevision,
  );
  const second = service.confirmBranch(
    session,
    course.id,
    preview.id,
    preview.baseRevision,
  );
  expect(first.revision).toBe(second.revision);
  expect(first.graph!.nodes).toHaveLength(6);
  expect(service.getChapter(session, course.id, "web")).toEqual(original);
});
it("rejects stale workspace edits through the persistence boundary", () => {
  const { service, session, course } = setup();
  const base = service.getCourse(session, course.id).workspace.revision;
  service.saveWorkspace(session, course.id, { "/index.html": "new" }, base);
  expect(() =>
    service.saveWorkspace(session, course.id, { "/index.html": "old" }, base),
  ).toThrow(/conflict/i);
  expect(
    service.getCourse(session, course.id).workspace.files["/index.html"],
  ).toBe("new");
});
it("regenerates a future chapter whose prerequisites changed after a support branch", () => {
  const { service, session, course } = setup();
  const old = service.getChapter(session, course.id, "html").id;
  const preview = service.previewBranch(session, course.id, [
    {
      id: "support-two",
      title: "Tags",
      objective: "Read a tag",
      minutes: 4,
      kind: "support",
      prerequisites: [],
    },
  ]);
  const confirmed = service.confirmBranch(
    session,
    course.id,
    preview.id,
    preview.baseRevision,
  );
  expect(confirmed.chapters.html).toBeUndefined();
  service.check(session, course.id, "check", 1);
  service.advance(session, course.id);
  const ws = service.getCourse(session, course.id).workspace;
  service.saveWorkspace(
    session,
    course.id,
    { "/index.html": "Hello Methelia" },
    ws.revision,
  );
  service.check(session, course.id, "practice");
  service.advance(session, course.id);
  expect(service.getChapter(session, course.id, "html").id).not.toBe(old);
});
it("finishes the whole website route without resetting prior workspace files", () => {
  const { service, session, course } = setup();
  service.check(session, course.id, "check", 1);
  service.advance(session, course.id);
  for (const path of ["/index.html", "/style.css", "/app.js"]) {
    const ws = service.getCourse(session, course.id).workspace;
    service.saveWorkspace(
      session,
      course.id,
      {
        [path]:
          path === "/style.css"
            ? ws.files[path].replace("#7057cd", "#23856b")
            : ws.files[path] + "\n/* Hello Methelia */",
      },
      ws.revision,
    );
    expect(service.check(session, course.id, "practice").passed).toBe(true);
    service.advance(session, course.id);
  }
  service.command(session, course.id, "python -m http.server 8000");
  expect(service.check(session, course.id, "practice").passed).toBe(true);
  const final = service.advance(session, course.id);
  expect(final.completed).toEqual(["web", "html", "css", "js", "publish"]);
  expect(final.workspace.files["/index.html"]).toContain("Hello Methelia");
});
