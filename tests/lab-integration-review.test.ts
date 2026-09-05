import { afterEach, expect, it } from "vitest";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
import { labValueSchema } from "../src/core/lab";
import { featuredAudioKey } from "../src/server/featured-audio";
const stores: Store[] = [];
afterEach(() => {
  for (const store of stores.splice(0)) store.db.close();
});

it("rejects unknown laboratory parameters before saving learner work", () => {
  const store = new Store(":memory:");
  stores.push(store);
  const service = new LearningService(store),
    session = service.session();
  const course = service.createFeatured(session, "equation-explorer", "en");
  const node = course.currentNodeId;
  const section = course.chapters[node].chapter!.sections.find(
    (s) => s.component.type === "lab.experiment",
  )!;
  expect(() =>
    service.saveLab(session, course.id, node, section.id, { nonexistent: 7 }),
  ).toThrow();
});

it("rejects non-finite values, oversized parameter sets and unsafe key names", () => {
  expect(labValueSchema.safeParse({ radius: Infinity }).success).toBe(false);
  expect(labValueSchema.safeParse({ "../radius": 2 }).success).toBe(false);
  expect(
    labValueSchema.safeParse(
      Object.fromEntries(
        Array.from({ length: 129 }, (_, i) => [`param${i}`, 0]),
      ),
    ).success,
  ).toBe(false);
});

it("keeps the newest laboratory save when requests arrive out of order", () => {
  const store = new Store(":memory:");
  stores.push(store);
  const service = new LearningService(store),
    session = service.session();
  const course = service.createFeatured(session, "equation-explorer", "en");
  const node = course.currentNodeId;
  const section = course.chapters[node].chapter!.sections.find(
    (s) => s.component.type === "lab.experiment",
  )!;
  const version = Date.now();
  service.saveLab(session, course.id, node, section.id, { radius: 4 }, version);
  expect(
    service.saveLab(
      session,
      course.id,
      node,
      section.id,
      { radius: 2 },
      version - 1,
    ),
  ).toMatchObject({ stale: true });
  expect(
    service.getCourse(session, course.id).labWork?.[node]?.[section.id],
  ).toEqual({ radius: 4 });
  expect(() =>
    service.saveLab(
      session,
      course.id,
      node,
      section.id,
      { radius: 2 },
      version + 120000,
    ),
  ).toThrow();
  expect(() =>
    service.saveLab(
      session,
      course.id,
      node,
      section.id,
      { radius: 99 },
      version + 1,
    ),
  ).toThrow();
});

it("changes shared narration cache keys when scripts or voices change", () => {
  const profile = {
    provider: "elevenlabs",
    voiceId: "voice-one",
    model: "model",
  };
  const a = featuredAudioKey([], profile);
  expect(
    featuredAudioKey(
      [{ sectionId: "one", text: "Changed narration" }],
      profile,
    ),
  ).not.toBe(a);
  expect(featuredAudioKey([], { ...profile })).toBe(a);
  expect(featuredAudioKey([], { ...profile, voiceId: "voice-two" })).not.toBe(
    a,
  );
});
