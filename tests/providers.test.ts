import { afterEach, expect, it, vi } from "vitest";
import { generateGraph, generateChapter } from "../src/server/model";
import { synthesize } from "../src/server/fish";
import { demoGraph, demoChapter } from "../src/core/fixtures";
import { emptyWorkspace } from "../src/core/workspace";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function modelEnv() {
  vi.stubEnv("AI_API_KEY", "test-key");
  vi.stubEnv("AI_BASE_URL", "https://model.test/v1");
  vi.stubEnv("AI_MODEL", "test-model");
}
it("passes the actual learner goal to the model and validates the generated graph", async () => {
  modelEnv();
  const requests: string[] = [];
  vi.stubGlobal("fetch", async (_url: unknown, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    const goal = JSON.parse(body.messages[1].content).input.goal;
    requests.push(goal);
    return Response.json({
      choices: [
        {
          message: { content: JSON.stringify({ ...demoGraph(), title: goal }) },
        },
      ],
    });
  });
  expect((await generateGraph("做一個攝影作品集")).title).toBe(
    "做一個攝影作品集",
  );
  expect((await generateGraph("做一個食譜網站")).title).toBe("做一個食譜網站");
  expect(requests).toEqual(["做一個攝影作品集", "做一個食譜網站"]);
});
it("repairs a chapter bound to the wrong node instead of activating it", async () => {
  modelEnv();
  let count = 0;
  const node = demoGraph().nodes[0];
  vi.stubGlobal("fetch", async () => {
    count++;
    const chapter = demoChapter(node);
    if (count === 1) chapter.nodeId = "wrong-node";
    return Response.json({
      choices: [{ message: { content: JSON.stringify(chapter) } }],
    });
  });
  expect((await generateChapter(node, "網站", emptyWorkspace())).nodeId).toBe(
    "web",
  );
  expect(count).toBe(2);
});
it("sends the whole chapter to Fish once and maps returned timestamps", async () => {
  vi.stubEnv("FISH_AUDIO_API_KEY", "fish-test");
  vi.stubEnv("FISH_AUDIO_REFERENCE_ID", "voice-test");
  let requests = 0;
  const chapter = demoChapter(demoGraph().nodes[0]);
  chapter.script = chapter.script.map((s, i) => ({
    ...s,
    text: ["Hello", "world", "learn"][i],
  }));
  vi.stubGlobal("fetch", async (_url: unknown, options: RequestInit) => {
    requests++;
    const body = JSON.parse(String(options.body));
    expect(body.text).toBe("Hello\nworld\nlearn");
    expect(body.reference_id).toBe("voice-test");
    return new Response(
      "data: " +
        JSON.stringify({
          audio_base64: "YXVkaW8=",
          chunk_seq: 0,
          chunk_audio_offset_sec: 0,
          alignment: {
            segments: [
              { text: "Hello", start: 0, end: 1 },
              { text: "world", start: 1, end: 2 },
              { text: "learn", start: 2, end: 3 },
            ],
          },
        }) +
        "\n\n",
      { headers: { "Content-Type": "text/event-stream" } },
    );
  });
  const result = await synthesize(chapter);
  expect(result.audio.toString()).toBe("audio");
  expect(result.cues[2]).toEqual({ sectionId: "check", start: 2, end: 3 });
  expect(requests).toBe(1);
});
it("fails credential errors immediately without retrying a paid request", async () => {
  vi.stubEnv("FISH_AUDIO_API_KEY", "invalid");
  vi.stubEnv("FISH_AUDIO_REFERENCE_ID", "voice");
  let requests = 0;
  vi.stubGlobal("fetch", async () => {
    requests++;
    return new Response("", { status: 401 });
  });
  await expect(synthesize(demoChapter(demoGraph().nodes[0]))).rejects.toThrow(
    /401/,
  );
  expect(requests).toBe(1);
});
it("does not repeat paid synthesis when a completed response has invalid alignment", async () => {
  vi.stubEnv("FISH_AUDIO_API_KEY", "test");
  vi.stubEnv("FISH_AUDIO_REFERENCE_ID", "test");
  const fetcher = vi.fn(
    async () =>
      new Response(
        'data: {"audio_base64":"YQ==","chunk_seq":0,"chunk_audio_offset_sec":0,"alignment":{"segments":[{"text":"wrong","start":0,"end":1}]}}\n\n',
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  await expect(synthesize(demoChapter(demoGraph().nodes[0]))).rejects.toThrow(
    /alignment/i,
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});
