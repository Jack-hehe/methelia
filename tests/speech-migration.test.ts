import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
let store: Store;
beforeEach(() => {
  store = new Store(":memory:");
  vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
  vi.stubEnv("ELEVENLABS_VOICE_ID", "teacher-new");
  vi.stubEnv("ELEVENLABS_MODEL", "eleven_multilingual_v2");
});
afterEach(() => {
  store.db.close();
  vi.unstubAllEnvs();
});
function legacyCourse() {
  const service = new LearningService(store);
  const session = service.session();
  const course = service.createCourse(session, "Legacy lesson", "demo", "one");
  const pkg = service.getChapter(session, course.id, "web");
  delete pkg.pageAudio;
  pkg.speech = "ready";
  pkg.cues = [{ sectionId: "languages", start: 0, end: 3 }];
  store.putPackage(course.id, pkg);
  store.db
    .prepare("INSERT INTO audio_artifacts VALUES(?,?,?)")
    .run(pkg.id, Buffer.from("old audio"), "audio/mpeg");
  return { service, session, course, pkg };
}
it("keeps existing Fish audio until an explicit whole-chapter rebuild creates a new audio package", () => {
  const { service, session, course, pkg } = legacyCourse();
  service.saveProgress(session, course.id, "web", {
    sectionId: "structure",
    time: 2,
  });
  expect(service.getCourse(session, course.id).chapters.web).toEqual(pkg);
  const updated = service.retry(session, course.id, "web", {
    packageId: pkg.id,
    rebuild: true,
  });
  expect(updated.chapterIds.web).not.toBe(pkg.id);
  expect(updated.chapters.web).toMatchObject({
    chapter: pkg.chapter,
    speech: "pending",
    cues: [],
    captions: [],
    speechProfile: {
      provider: "elevenlabs",
      voiceId: "teacher-new",
      model: "eleven_multilingual_v2",
    },
    pageAudio: {
      languages: { status: "pending" },
      structure: { status: "pending" },
      check: { status: "pending" },
    },
  });
  expect(updated.progress.web).toMatchObject({
    sectionId: "structure",
    time: 0,
  });
  expect(updated.workspace).toEqual(course.workspace);
  expect(store.getPackage(pkg.id)).toEqual(pkg);
  expect(
    store.db
      .prepare("SELECT count(*) AS n FROM audio_artifacts WHERE id=?")
      .get(pkg.id)?.n,
  ).toBe(1);
  expect(
    store.db
      .prepare(
        "SELECT count(*) AS n FROM generation_jobs WHERE kind='speech' AND status='queued'",
      )
      .get()?.n,
  ).toBe(1);
  expect(() =>
    service.retry(session, course.id, "web", {
      packageId: pkg.id,
      rebuild: true,
    }),
  ).toThrow(/conflict/i);
});
it("does not mix an incomplete Fish chapter with new ElevenLabs pages on ordinary retry", () => {
  const { service, session, course, pkg } = legacyCourse();
  pkg.speech = "failed";
  store.putPackage(course.id, pkg);
  expect(() => service.retry(session, course.id, "web")).toThrow(
    /重建章節語音/,
  );
  expect(store.getPackage(pkg.id)).toEqual(pkg);
});
it("validates credentials before replacing a ready chapter's audio", () => {
  const { service, session, course, pkg } = legacyCourse();
  vi.stubEnv("ELEVENLABS_API_KEY", "");
  expect(() =>
    service.retry(session, course.id, "web", {
      packageId: pkg.id,
      rebuild: true,
    }),
  ).toThrow(/ELEVENLABS_API_KEY/);
  expect(service.getCourse(session, course.id).chapterIds.web).toBe(pkg.id);
  expect(store.getPackage(pkg.id)).toEqual(pkg);
});
it("rejects stale or foreign audio rebuild requests before creating jobs", () => {
  const { service, session, course, pkg } = legacyCourse();
  expect(() =>
    service.retry(session, course.id, "web", {
      packageId: "stale",
      rebuild: true,
    }),
  ).toThrow(/conflict/i);
  expect(() =>
    service.retry(service.session(), course.id, "web", {
      packageId: pkg.id,
      rebuild: true,
    }),
  ).toThrow(/not found/i);
  expect(
    store.db
      .prepare("SELECT count(*) AS n FROM generation_jobs WHERE kind='speech'")
      .get()?.n,
  ).toBe(0);
});
