import { afterEach, expect, it, vi } from "vitest";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
import { demoChapter, demoGraph } from "../src/core/fixtures";
import { featuredAudioKey, storeFeaturedAudio } from "../src/server/featured-audio";
import { resolveSpeechProfile } from "../src/server/speech";

const stores: Store[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const store of stores.splice(0)) store.db.close();
});

it.each(["zh-TW", "en"] as const)("opens the %s starter with prepared audio without a synthesis key", language => {
  vi.stubEnv("ELEVENLABS_API_KEY", "");
  vi.stubEnv("ELEVENLABS_VOICE_ID", "starter-cached-voice");
  vi.stubEnv("ELEVENLABS_MODEL", "eleven_v3");
  const store = new Store(":memory:"); stores.push(store);
  const service = new LearningService(store);
  const chapter = demoChapter(demoGraph(language).nodes[0], language);
  const audio = new Uint8Array([73, 68, 51]);
  const cues = chapter.sections.map((s, i) => ({sectionId:s.id,start:i*10,end:i*10+9}));
  storeFeaturedAudio(store, featuredAudioKey(chapter.script, resolveSpeechProfile(undefined,language)), {audio,cues,captions:[]});
  const snapshot = service.createCourse(service.session(), "Build a homepage", "demo", "starter", language);
  const pkg = snapshot.chapters[snapshot.currentNodeId];
  expect(pkg.speech).toBe("ready");
  expect(pkg.cues).toEqual(cues);
  expect(store.db.prepare("SELECT audio FROM audio_artifacts WHERE id=?").get(pkg.id)).toEqual({audio});
  expect(store.db.prepare("SELECT count(*) AS n FROM generation_jobs WHERE kind='speech'").get()).toEqual({n:0});
});

it("never automatically pays for missing starter audio, even with credentials", () => {
  vi.stubEnv("ELEVENLABS_API_KEY", "configured-key");
  vi.stubEnv("ELEVENLABS_VOICE_ID", "missing-starter-voice");
  const store = new Store(":memory:"); stores.push(store);
  const service = new LearningService(store);
  const snapshot = service.createCourse(service.session(), "Build a homepage", "demo", "starter");
  const course = store.getCourse(snapshot.id)!;
  const pkg = store.getPackage(course.chapterIds[course.currentNodeId])!;
  service.scheduleSpeech(course,pkg);
  expect(pkg.speech).toBe("failed");
  expect(store.db.prepare("SELECT count(*) AS n FROM generation_jobs WHERE kind='speech'").get()).toEqual({n:0});
});
