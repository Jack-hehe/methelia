import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Chapter } from "../core/protocol";
import type { Caption, Cue } from "../core/narration";
import type { Store } from "./db";

export function featuredAudioKey(script: Chapter["script"], profile: unknown) {
  return createHash("sha256")
    .update(JSON.stringify({ version: 1, script, profile }))
    .digest("hex");
}
export type FeaturedAudio = {
  audio: Uint8Array;
  cues: Cue[];
  captions: Caption[];
};
export function readFeaturedAudio(
  store: Store,
  key: string,
): FeaturedAudio | null {
  const row = store.db
    .prepare("SELECT audio,metadata FROM featured_audio WHERE id=?")
    .get(key) as { audio: Uint8Array; metadata: string } | undefined;
  if (row) return { audio: row.audio, ...JSON.parse(row.metadata) };
  // Bundled, content-addressed assets are prepared before release and reusable across learners.
  try {
    const metadata = JSON.parse(
      readFileSync(resolve("public/featured-audio", `${key}.json`), "utf8"),
    );
    const audio = readFileSync(resolve("public/featured-audio", `${key}.mp3`));
    return { audio, cues: metadata.cues, captions: metadata.captions };
  } catch {
    return null;
  }
}
export function storeFeaturedAudio(
  store: Store,
  key: string,
  result: FeaturedAudio,
) {
  store.db
    .prepare("INSERT OR REPLACE INTO featured_audio VALUES(?,?,?)")
    .run(
      key,
      result.audio,
      JSON.stringify({ cues: result.cues, captions: result.captions }),
    );
}
