import { expect, it } from "vitest";
import {
  parseFishStream,
  mapNarration,
  clampSeek,
} from "../src/core/narration";
it("replaces cumulative alignment snapshots and applies chunk offsets", () => {
  const event = (seq: number, offset: number, text: string, end: number) =>
    `data: ${JSON.stringify({ audio_base64: "YQ==", chunk_seq: seq, chunk_audio_offset_sec: offset, alignment: { segments: [{ text, start: 0, end }], audio_duration: end } })}\n\n`;
  const result = parseFishStream(
    event(0, 0, "Hello", 0.5) +
      event(0, 0, "Hello", 1) +
      event(1, 1, "world", 1),
  );
  expect(result.audio.toString()).toBe("aaa");
  expect(result.words).toEqual([
    { text: "Hello", start: 0, end: 1 },
    { text: "world", start: 1, end: 2 },
  ]);
  expect(
    mapNarration(
      [
        { sectionId: "intro", text: "Hello" },
        { sectionId: "practice", text: "world" },
      ],
      result.words,
    )[1].start,
  ).toBe(1);
});
it("refuses fabricated timing when script and alignment disagree", () => {
  expect(() =>
    mapNarration(
      [{ sectionId: "one", text: "Actual lesson" }],
      [{ text: "unrelated", start: 0, end: 1 }],
    ),
  ).toThrow(/alignment/i);
});
it("prevents seeking past an incomplete practice checkpoint", () => {
  expect(
    clampSeek(
      50,
      [{ sectionId: "practice", start: 12, end: 20 }],
      ["practice"],
      [],
    ),
  ).toBe(20);
  expect(
    clampSeek(
      16,
      [{ sectionId: "practice", start: 12, end: 20 }],
      ["practice"],
      [],
    ),
  ).toBe(16);
  expect(
    clampSeek(
      50,
      [{ sectionId: "practice", start: 12, end: 20 }],
      ["practice"],
      ["practice"],
    ),
  ).toBe(50);
});
