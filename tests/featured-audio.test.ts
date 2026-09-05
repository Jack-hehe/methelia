import { expect, it } from "vitest";
import { featuredAudioKey } from "../src/server/featured-audio";
it("shares identical narration but invalidates on voice, text or page order changes", () => {
  const script = [
    { sectionId: "a", text: "A circle" },
    { sectionId: "b", text: "A sphere" },
  ];
  const profile = {
    provider: "elevenlabs" as const,
    voiceId: "voice",
    model: "eleven_v3",
    languageCode: "en",
  };
  expect(featuredAudioKey(script, profile)).toBe(
    featuredAudioKey([...script], { ...profile }),
  );
  expect(featuredAudioKey(script, profile)).not.toBe(
    featuredAudioKey([...script].reverse(), profile),
  );
  expect(featuredAudioKey(script, profile)).not.toBe(
    featuredAudioKey(script, { ...profile, voiceId: "another" }),
  );
});
