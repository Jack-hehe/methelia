import { afterEach, expect, it, vi } from "vitest";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
import { featuredChapter, featuredGraph } from "../src/core/featured-courses";
import {
  featuredAudioKey,
  storeFeaturedAudio,
} from "../src/server/featured-audio";
import type { SpeechProfile } from "../src/core/state";

const stores: Store[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const store of stores.splice(0)) store.db.close();
});

it.each(["environment", "pinned"])(
  "plays prepared narration with a %s voice profile and no synthesis key",
  (source) => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    vi.stubEnv("ELEVENLABS_VOICE_ID", "cached-voice");
    vi.stubEnv("ELEVENLABS_MODEL", "eleven_flash_v2_5");
    const store = new Store(":memory:");
    stores.push(store);
    const service = new LearningService(store);
    const profile: SpeechProfile = {
      provider: "elevenlabs",
      voiceId: "cached-voice",
      model: "eleven_flash_v2_5",
      languageCode: "en",
    };
    const node = featuredGraph("equation-explorer", "en").nodes[0];
    const chapter = featuredChapter("equation-explorer", node, "en");
    const audio = new Uint8Array([73, 68, 51]);
    const cues = [{ sectionId: chapter.sections[0].id, start: 0, end: 2 }];
    storeFeaturedAudio(store, featuredAudioKey(chapter.script, profile), {
      audio,
      cues,
      captions: [],
    });
    const snapshot = service.createFeatured(
      service.session(),
      "equation-explorer",
      "en",
    );
    const course = store.getCourse(snapshot.id)!;
    const pkg = store.getPackage(course.chapterIds[course.currentNodeId])!;
    if (source === "pinned") {
      vi.stubEnv("ELEVENLABS_VOICE_ID", "");
      pkg.speechProfile = profile;
      pkg.speech = "not_requested";
      service.scheduleSpeech(course, pkg);
    }
    expect(pkg.speech).toBe("ready");
    expect(pkg.cues).toEqual(cues);
    expect(
      store.db
        .prepare("SELECT audio FROM audio_artifacts WHERE id=?")
        .get(pkg.id),
    ).toEqual({ audio });
    expect(
      store.db
        .prepare(
          "SELECT count(*) AS n FROM generation_jobs WHERE kind='speech'",
        )
        .get(),
    ).toEqual({ n: 0 });
  },
);

it("does not schedule synthesis on a cache miss without an API key", () => {
  vi.stubEnv("ELEVENLABS_API_KEY", "");
  vi.stubEnv("ELEVENLABS_VOICE_ID", "uncached-voice");
  vi.stubEnv("ELEVENLABS_MODEL", "eleven_flash_v2_5");
  const store = new Store(":memory:");
  stores.push(store);
  const service = new LearningService(store);
  const course = service.createFeatured(
    service.session(),
    "equation-explorer",
    "en",
  );
  expect(course.chapters[course.currentNodeId].speech).toBe("failed");
  expect(course.chapters[course.currentNodeId].error).toContain(
    "ELEVENLABS_API_KEY",
  );
  expect(
    store.db
      .prepare("SELECT count(*) AS n FROM generation_jobs WHERE kind='speech'")
      .get(),
  ).toEqual({ n: 0 });
});

it("retries previously failed narration from a newly available cache without a synthesis key", () => {
  vi.stubEnv("ELEVENLABS_API_KEY", "");
  vi.stubEnv("ELEVENLABS_VOICE_ID", "retry-cached-voice");
  vi.stubEnv("ELEVENLABS_MODEL", "eleven_flash_v2_5");
  const store = new Store(":memory:");
  stores.push(store);
  const service = new LearningService(store),
    session = service.session();
  const course = service.createFeatured(session, "equation-explorer", "en");
  const pkg = course.chapters[course.currentNodeId];
  expect(pkg.speech).toBe("failed");
  const profile: SpeechProfile = {
    provider: "elevenlabs",
    voiceId: "retry-cached-voice",
    model: "eleven_flash_v2_5",
    languageCode: "en",
  };
  storeFeaturedAudio(store, featuredAudioKey(pkg.chapter!.script, profile), {
    audio: new Uint8Array([73, 68, 51]),
    cues: [],
    captions: [],
  });
  expect(
    service.retry(session, course.id, course.currentNodeId).chapters[
      course.currentNodeId
    ].speech,
  ).toBe("ready");
  expect(
    store.db
      .prepare("SELECT count(*) AS n FROM generation_jobs WHERE kind='speech'")
      .get(),
  ).toEqual({ n: 0 });
});
