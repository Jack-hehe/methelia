import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { synthesize } from "../src/server/speech";
import { demoChapter, demoGraph } from "../src/core/fixtures";

beforeEach(() => {
  vi.stubEnv("FISH_AUDIO_API_KEY", "");
  vi.stubEnv("FISH_AUDIO_REFERENCE_ID", "");
  vi.stubEnv("ELEVENLABS_API_KEY", "private-test-key");
  vi.stubEnv("ELEVENLABS_VOICE_ID", "teacher-test");
  vi.stubEnv("ELEVENLABS_MODEL", "eleven_multilingual_v2");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function chapter(text = "第2頁。Hello!") {
  const result = demoChapter(demoGraph().nodes[0]);
  result.script = [{ sectionId: "languages", text }];
  return result;
}
function responseFor(text: string) {
  const characters = [...text];
  return {
    audio_base64: "YXVkaW8=",
    alignment: {
      characters,
      character_start_times_seconds: characters.map((_, i) => i * 0.1),
      character_end_times_seconds: characters.map((_, i) => (i + 1) * 0.1),
    },
    // Normalized speech can spell numbers out. Timing must refer to the
    // ORIGINAL script so captions keep the learner's exact wording.
    normalized_alignment: null,
  };
}
it("uses ElevenLabs once with original character alignment for Chinese and English captions", async () => {
  const fetcher = vi.fn(async (url: string, options: RequestInit) => {
    expect(url).toBe(
      "https://api.elevenlabs.io/v1/text-to-speech/teacher-test/with-timestamps?output_format=mp3_44100_128",
    );
    expect(new Headers(options.headers).get("xi-api-key")).toBe(
      "private-test-key",
    );
    expect(JSON.parse(String(options.body))).toMatchObject({
      text: "第2頁。Hello!",
      model_id: "eleven_multilingual_v2",
    });
    return Response.json(responseFor("第2頁。Hello!"));
  });
  vi.stubGlobal("fetch", fetcher);
  const result = await synthesize(chapter());
  expect(result.audio.toString()).toBe("audio");
  expect(result.cues).toEqual([{ sectionId: "languages", start: 0, end: 0.9 }]);
  expect(result.captions).toEqual([
    {
      sectionId: "languages",
      text: "第2頁。",
      start: 0,
      end: 0.30000000000000004,
    },
    { sectionId: "languages", text: "Hello!", start: 0.4, end: 0.9 },
  ]);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each([401, 403, 429, 503])(
  "does not retry an ElevenLabs %i response or expose its private body",
  async (status) => {
    const fetcher = vi.fn(
      async () => new Response("private provider detail", { status }),
    );
    vi.stubGlobal("fetch", fetcher);
    await expect(synthesize(chapter())).rejects.toThrow(
      new RegExp(`ElevenLabs.*${status}`),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
it("reports an ambiguous connection failure without an automatic paid retry", async () => {
  const fetcher = vi.fn(async () => {
    throw new Error("private provider detail");
  });
  vi.stubGlobal("fetch", fetcher);
  await expect(synthesize(chapter())).rejects.toThrow(
    /ElevenLabs 連線中斷.*未自動重送/,
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each(["missing", "mismatch", "length", "negative", "backwards", "base64"])(
  "rejects %s audio/alignment without replaying the request",
  async (kind) => {
    const payload = responseFor("第2頁。Hello!");
    if (kind === "missing") payload.alignment.characters = [];
    if (kind === "mismatch") payload.alignment.characters[0] = "錯";
    if (kind === "length") payload.alignment.character_end_times_seconds.pop();
    if (kind === "negative")
      payload.alignment.character_start_times_seconds[0] = -1;
    if (kind === "backwards")
      payload.alignment.character_start_times_seconds[2] = 0;
    if (kind === "base64") payload.audio_base64 = "not valid base64";
    const fetcher = vi.fn(async () => Response.json(payload));
    vi.stubGlobal("fetch", fetcher);
    await expect(synthesize(chapter())).rejects.toThrow(
      /ElevenLabs.*alignment/,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
it("rejects overlong text before sending a paid request", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await expect(synthesize(chapter("A".repeat(10001)))).rejects.toThrow(
    /語音長度限制/,
  );
  expect(fetcher).not.toHaveBeenCalled();
});
