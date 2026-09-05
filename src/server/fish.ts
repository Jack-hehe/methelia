import type { Chapter } from "../core/protocol";
import { parseFishStream, mapNarration } from "../core/narration";
export async function synthesize(chapter: Chapter) {
  if (!process.env.FISH_AUDIO_API_KEY || !process.env.FISH_AUDIO_REFERENCE_ID)
    throw new Error("語音尚未設定。可重試或使用完整文字模式。");
  const text = chapter.script.map((s) => s.text).join("\n");
  if (text.length > 12000) throw new Error("章節超過語音長度限制");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(
        "https://api.fish.audio/v1/tts/stream/with-timestamp",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
            "Content-Type": "application/json",
            model: process.env.FISH_AUDIO_MODEL || "s2-pro",
          },
          body: JSON.stringify({
            text,
            reference_id: process.env.FISH_AUDIO_REFERENCE_ID,
            format: "mp3",
            latency: "normal",
            normalize: false,
          }),
          signal: AbortSignal.timeout(180000),
        },
      );
      if (!response.ok) {
        if (response.status !== 429 && response.status < 500)
          throw new NonRetryable(
            `Fish Audio 設定或輸入錯誤 (${response.status})`,
          );
        throw new Error(`Fish Audio 暫時無法使用 (${response.status})`);
      }
      if (!response.body) throw new Error("Fish Audio 回應為空");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let stream = "",
        size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 50000000) {
          await reader.cancel();
          throw new NonRetryable("Audio response exceeded size limit");
        }
        stream += decoder.decode(value, { stream: true });
      }
      stream += decoder.decode();
      try {
        const parsed = parseFishStream(stream);
        return { ...parsed, cues: mapNarration(chapter.script, parsed.words) };
      } catch (error) {
        // A completed synthesis must not be charged again for a local mapping error.
        throw new NonRetryable(
          error instanceof Error
            ? error.message
            : "Invalid narration alignment",
        );
      }
    } catch (error) {
      if (error instanceof NonRetryable || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
  throw new Error("Fish Audio failed");
}
class NonRetryable extends Error {}
