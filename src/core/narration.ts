export type Word = { text: string; start: number; end: number };
export type Cue = { sectionId: string; start: number; end: number };
type FishEvent = {
  audio_base64: string;
  chunk_seq: number;
  chunk_audio_offset_sec: number;
  alignment: null | { segments: Word[] };
};
export function parseFishStream(stream: string): {
  audio: Buffer;
  words: Word[];
} {
  const chunks: Buffer[] = [];
  const snapshots = new Map<number, { offset: number; words: Word[] }>();
  for (const block of stream.replace(/\r\n/g, "\n").split("\n\n")) {
    const data = block
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .join("\n");
    if (!data || data === "[DONE]") continue;
    const event: FishEvent = JSON.parse(data);
    if (
      typeof event.audio_base64 !== "string" ||
      !Number.isInteger(event.chunk_seq) ||
      !Number.isFinite(event.chunk_audio_offset_sec)
    )
      throw new Error("Invalid Fish event");
    chunks.push(Buffer.from(event.audio_base64, "base64"));
    if (event.alignment)
      snapshots.set(event.chunk_seq, {
        offset: event.chunk_audio_offset_sec,
        words: event.alignment.segments,
      });
  }
  const words = [...snapshots.entries()]
    .sort((a, b) => a[0] - b[0])
    .flatMap(([, s]) =>
      s.words.map((w) => ({
        text: w.text,
        start: w.start + s.offset,
        end: w.end + s.offset,
      })),
    );
  if (
    !chunks.length ||
    !words.length ||
    words.some(
      (w) =>
        typeof w.text !== "string" ||
        !Number.isFinite(w.start) ||
        !Number.isFinite(w.end) ||
        w.start < 0 ||
        w.end < w.start,
    )
  )
    throw new Error("Missing or invalid alignment");
  return { audio: Buffer.concat(chunks), words };
}
const normalized = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
export function mapNarration(
  script: { sectionId: string; text: string }[],
  words: Word[],
): Cue[] {
  const full = words.map((w) => normalized(w.text)).join("");
  const expected = script.map((s) => normalized(s.text)).join("");
  if (full !== expected || !full)
    throw new Error("Narration alignment does not match the complete script");
  const spans: { start: number; end: number; word: Word }[] = [];
  let offset = 0;
  for (const word of words) {
    const length = normalized(word.text).length;
    spans.push({ start: offset, end: offset + length, word });
    offset += length;
  }
  offset = 0;
  return script.map((s) => {
    const start = offset;
    offset += normalized(s.text).length;
    const matches = spans.filter((w) => w.end > start && w.start < offset);
    if (!matches.length) throw new Error("Missing section alignment");
    return {
      sectionId: s.sectionId,
      start: matches[0].word.start,
      end: matches.at(-1)!.word.end,
    };
  });
}
export function clampSeek(
  target: number,
  cues: Cue[],
  required: string[],
  completed: string[],
): number {
  const gate = cues.find(
    (c) =>
      required.includes(c.sectionId) &&
      !completed.includes(c.sectionId) &&
      c.end < target,
  );
  return gate ? gate.end : target;
}
