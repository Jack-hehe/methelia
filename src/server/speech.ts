import type { Chapter } from "../core/protocol";
import type { SpeechProfile } from "../core/state";
import { mapNarration, mapCaptions, type Word } from "../core/narration";
import { reserveUsage } from "./usage";

/** Per-model request limit and parameter support, checked against the API.
 * v3 rejects previous_text/next_text outright, and multilingual_v2 ignores
 * language_code, so both have to be decided per model rather than sent blind. */
const models: Record<
  string,
  { limit: number; languageCode: boolean; neighbourText: boolean }
> = {
  eleven_v3: { limit: 5000, languageCode: true, neighbourText: false },
  eleven_multilingual_v2: {
    limit: 10000,
    languageCode: false,
    neighbourText: true,
  },
  eleven_flash_v2_5: { limit: 40000, languageCode: true, neighbourText: true },
};
/** Resolve cache identity without requiring credentials for a new synthesis request. */
export function resolveSpeechProfile(
  pinned?: SpeechProfile,
  language?: "zh-TW" | "en",
) {
  const voiceId = pinned?.voiceId || process.env.ELEVENLABS_VOICE_ID?.trim();
  const model =
    pinned?.model ||
    process.env.ELEVENLABS_MODEL?.trim() ||
    "eleven_flash_v2_5";
  if (!voiceId)
    throw new Error("請先設定 ELEVENLABS_VOICE_ID。仍可閱讀課程。 ");
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(voiceId))
    throw new Error("ELEVENLABS_VOICE_ID 格式不正確，請填入老師的 Voice ID。");
  if (!Object.hasOwn(models, model))
    throw new Error(
      "ELEVENLABS_MODEL 無效，請設定 eleven_v3、eleven_multilingual_v2 或 eleven_flash_v2_5。",
    );
  const capability = models[model];
  const profile: SpeechProfile = { provider: "elevenlabs", voiceId, model };
  if (capability.languageCode && (pinned?.languageCode || language))
    profile.languageCode = language
      ? language === "en"
        ? "en"
        : "zh"
      : pinned?.languageCode;
  return profile;
}

export function speechConfig(
  pinned?: SpeechProfile,
  language?: "zh-TW" | "en",
) {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new Error("請先設定 ELEVENLABS_API_KEY。仍可閱讀課程。 ");
  const profile = resolveSpeechProfile(pinned, language);
  const capability = models[profile.model];
  return {
    key,
    profile,
    limit: capability.limit,
    neighbourText: capability.neighbourText,
  };
}

type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};
function parseAudio(payload: { audio_base64: string; alignment: Alignment }) {
  const alignment = payload?.alignment;
  if (
    typeof payload?.audio_base64 !== "string" ||
    !payload.audio_base64.length ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      payload.audio_base64,
    ) ||
    !Array.isArray(alignment?.characters) ||
    !alignment.characters.length ||
    !Array.isArray(alignment.character_start_times_seconds) ||
    !Array.isArray(alignment.character_end_times_seconds) ||
    alignment.characters.length !==
      alignment.character_start_times_seconds.length ||
    alignment.characters.length !== alignment.character_end_times_seconds.length
  )
    throw new Error("Invalid audio/alignment");
  const words: Word[] = alignment.characters.map((text, i) => ({
    text,
    start: alignment.character_start_times_seconds[i],
    end: alignment.character_end_times_seconds[i],
  }));
  if (
    words.some(
      (word, i) =>
        typeof word.text !== "string" ||
        !word.text.length ||
        !Number.isFinite(word.start) ||
        !Number.isFinite(word.end) ||
        word.start < 0 ||
        word.end < word.start ||
        (i > 0 &&
          (word.start < words[i - 1].start || word.end < words[i - 1].end)),
    )
  )
    throw new Error("Invalid alignment times");
  return { audio: Buffer.from(payload.audio_base64, "base64"), words };
}

export async function synthesize(
  chapter: Chapter,
  pinned?: SpeechProfile,
  context?: { previousText?: string; nextText?: string },
) {
  const config = speechConfig(pinned);
  const text = chapter.script.map((entry) => entry.text).join("\n");
  if (!text.trim() || text.length > config.limit)
    throw new Error("內容不符合語音長度限制");
  reserveUsage("speech", text.length);
  let response: Response;
  try {
    response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.profile.voiceId)}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": config.key,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: config.profile.model,
          language_code: config.profile.languageCode,
          // v3 returns 400 rather than ignoring these, so omit them entirely.
          previous_text: config.neighbourText
            ? context?.previousText
            : undefined,
          next_text: config.neighbourText ? context?.nextText : undefined,
        }),
        signal: AbortSignal.timeout(180000),
      },
    );
  } catch {
    throw new Error(
      "ElevenLabs 連線中斷或逾時，未自動重送；請手動重試（可能再次計費）。",
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(
      `ElevenLabs 請求失敗 (${response.status})，請確認 API key、Voice ID、模型權限與額度後重試。`,
    );
  }
  if (
    !response.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json") ||
    !response.body
  ) {
    await response.body?.cancel();
    throw new Error("ElevenLabs 回應格式不正確，未自動重送。");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let json = "",
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
      json += decoder.decode(value, { stream: true });
    }
    json += decoder.decode();
  } catch {
    throw new Error(
      "ElevenLabs 音訊接收失敗或超過大小限制，未自動重送；手動重試可能再次計費。",
    );
  } finally {
    reader.releaseLock();
  }
  try {
    // `alignment` follows the original input. `normalized_alignment` may
    // spell out numbers and cannot safely map back to the prepared script.
    const parsed = parseAudio(JSON.parse(json));
    return {
      ...parsed,
      cues: mapNarration(chapter.script, parsed.words),
      captions: mapCaptions(chapter.script, parsed.words),
    };
  } catch {
    throw new Error(
      "ElevenLabs 音訊或字幕對齊（alignment）不完整，未開放播放；手動重試可能再次計費，也可繼續閱讀。",
    );
  }
}
