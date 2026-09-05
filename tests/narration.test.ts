import { expect, it } from "vitest";
import {
  parseFishStream,
  mapNarration,
  mapCaptions,
  clampSeek,
} from "../src/core/narration";
it("maps short Chinese captions to returned word boundaries without invented times", () => {
  expect(
    mapCaptions(
      [{ sectionId: "intro", text: "先看 HTML。再試 CSS！" }],
      [
        { text: "先看", start: 0.2, end: 0.8 },
        { text: "HTML", start: 0.8, end: 1.5 },
        { text: "再試", start: 1.9, end: 2.5 },
        { text: "CSS", start: 2.5, end: 3.2 },
      ],
    ),
  ).toEqual([
    { sectionId: "intro", text: "先看 HTML。", start: 0.2, end: 1.5 },
    { sectionId: "intro", text: "再試 CSS！", start: 1.9, end: 3.2 },
  ]);
});

it("keeps coarse alignment together instead of creating overlapping captions", () => {
  expect(
    mapCaptions(
      [{ sectionId: "intro", text: "你好。繼續！" }],
      [{ text: "你好繼續", start: 0, end: 3 }],
    ),
  ).toEqual([{ sectionId: "intro", text: "你好。繼續！", start: 0, end: 3 }]);
});
it("preserves spaces when coarse English captions are merged", () => {
  expect(
    mapCaptions(
      [{ sectionId: "one", text: "Hello. Next step!" }],
      [{ text: "Hello Next step", start: 0, end: 3 }],
    ),
  ).toEqual([
    { sectionId: "one", text: "Hello. Next step!", start: 0, end: 3 },
  ]);
});
it("rejects timestamps that run backwards instead of activating an invalid playback timeline", () => {
  const event = {
    audio_base64: "YQ==",
    chunk_seq: 0,
    chunk_audio_offset_sec: 0,
    alignment: {
      segments: [
        { text: "first", start: 3, end: 4 },
        { text: "second", start: 1, end: 2 },
      ],
    },
  };
  expect(() => parseFishStream(`data: ${JSON.stringify(event)}\n\n`)).toThrow(
    /alignment/i,
  );
});

it.each([
  { audio_base64: "" },
  { audio_base64: "???" },
  { chunk_seq: -1 },
  { chunk_audio_offset_sec: -1 },
  {
    alignment: { segments: [{ text: "hi", start: -1, end: 1 }] },
    chunk_audio_offset_sec: 2,
  },
])("rejects malformed Fish audio/alignment: %j", (override) => {
  const event = {
    audio_base64: "YQ==",
    chunk_seq: 0,
    chunk_audio_offset_sec: 0,
    alignment: { segments: [{ text: "hi", start: 0, end: 1 }] },
    ...override,
  };
  expect(() => parseFishStream(`data: ${JSON.stringify(event)}\n\n`)).toThrow();
});
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
