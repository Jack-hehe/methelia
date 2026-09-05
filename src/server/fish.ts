import type { Chapter } from "../core/protocol";
import { parseFishStream, mapNarration, mapCaptions } from "../core/narration";

// Fish silently falls back on unknown IDs. Validate before sending any paid request.
export function fishConfig() {
  const key = process.env.FISH_AUDIO_API_KEY?.trim();
  const referenceId = process.env.FISH_AUDIO_REFERENCE_ID?.trim();
  if (!key || !referenceId)
    throw new Error(
      "請先設定 FISH_AUDIO_API_KEY 與 FISH_AUDIO_REFERENCE_ID。可使用完整文字模式。",
    );
  const model = process.env.FISH_AUDIO_MODEL?.trim() || "s2-pro";
  if (!["s1", "s2-pro", "s2.1-pro", "s2.1-pro-free"].includes(model))
    throw new Error(
      "FISH_AUDIO_MODEL 無效，請設定 s1、s2-pro、s2.1-pro 或 s2.1-pro-free，並確認帳號權限。",
    );
  return { key, referenceId, model };
}

export async function synthesize(chapter: Chapter) {
  const config = fishConfig();
  const text = chapter.script.map((s) => s.text).join("\n");
  if (!text.trim() || text.length > 12000)
    throw new Error("章節不符合語音長度限制");
  // One chapter, one request. A timeout/disconnect may already have been billed;
  // leave retries to an explicit user action, never replay it automatically.
  let response: Response;
  try {
    response = await fetch(
      "https://api.fish.audio/v1/tts/stream/with-timestamp",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.key}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          model: config.model,
        },
        body: JSON.stringify({
          text,
          reference_id: config.referenceId,
          format: "mp3",
          latency: "normal",
          normalize: false,
          condition_on_previous_chunks: true,
        }),
        signal: AbortSignal.timeout(180000),
      },
    );
  } catch {
    throw new Error(
      "Fish Audio 連線中斷或逾時，未自動重送；請確認服務狀態後手動重試（可能再次計費）。",
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(
      `Fish Audio 請求失敗 (${response.status})，請確認憑證、模型權限與額度後重試。`,
    );
  }
  if (
    !response.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("text/event-stream")
  ) {
    await response.body?.cancel();
    throw new Error("Fish Audio 串流格式不正確，未自動重送。");
  }
  if (!response.body) throw new Error("Fish Audio 回應為空，未自動重送。");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let stream = "",
    size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 50000000) {
        await reader.cancel();
        throw new Error("Response too large");
      }
      stream += decoder.decode(value, { stream: true });
    }
    stream += decoder.decode();
  } catch {
    throw new Error(
      "Fish Audio 音訊接收失敗或超過大小限制，未自動重送；手動重試可能再次計費。",
    );
  } finally {
    reader.releaseLock();
  }
  try {
    const parsed = parseFishStream(stream);
    return {
      ...parsed,
      cues: mapNarration(chapter.script, parsed.words),
      captions: mapCaptions(chapter.script, parsed.words),
    };
  } catch {
    // Never surface raw SSE/JSON parsing errors (they may include response data).
    throw new Error(
      "Fish Audio 音訊或字幕對齊（alignment）不完整，未開放播放；手動重試可能再次計費，也可使用文字模式。",
    );
  }
}
