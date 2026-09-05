import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { demoGraph, demoChapter } from "../src/core/fixtures";
const starterCourses = [{ id: "starter-website" }];
import { featuredAudioKey } from "../src/server/featured-audio";
import { resolveSpeechProfile } from "../src/server/speech";
import type { Caption, Cue } from "../src/core/narration";

// Read-only: decode the actual bundled MP3s and verify their page/caption timing.
const browser = await chromium.launch();
const page = await browser.newPage();
let ready = 0;
const missing: string[] = [];
let totalSeconds = 0;
try {
  for (const entry of starterCourses) {
    for (const language of ["en", "zh-TW"] as const) {
      const profile = resolveSpeechProfile(undefined, language);
      for (const node of demoGraph(language).nodes) {
        const chapter = demoChapter(node, language);
        const key = featuredAudioKey(chapter.script, profile);
        const path = resolve("public/starter-audio", key);
        if (!existsSync(`${path}.mp3`) || !existsSync(`${path}.json`)) {
          missing.push(`${entry.id}/${language}/${node.id}`);
          continue;
        }
        const metadata = JSON.parse(readFileSync(`${path}.json`, "utf8")) as {
          cues: Cue[];
          captions: Caption[];
        };
        const duration = await page.evaluate(
          async (encoded) => {
            const bytes = Uint8Array.from(atob(encoded), (c) =>
              c.charCodeAt(0),
            );
            const context = new AudioContext();
            try {
              return (await context.decodeAudioData(bytes.buffer)).duration;
            } finally {
              await context.close();
            }
          },
          readFileSync(`${path}.mp3`).toString("base64"),
        );
        if (!Number.isFinite(duration) || duration < 1)
          throw new Error(`Invalid MP3: ${node.id}/${language}`);
        const ids = chapter.sections.map((s) => s.id);
        if (
          JSON.stringify(metadata.cues.map((c) => c.sectionId)) !==
          JSON.stringify(ids)
        )
          throw new Error(`Page cues mismatch: ${node.id}/${language}`);
        for (const [i, cue] of metadata.cues.entries()) {
          if (
            !(
              cue.start >= 0 &&
              cue.end > cue.start &&
              cue.end <= duration + 0.3
            ) ||
            (i > 0 && cue.start < metadata.cues[i - 1].end)
          )
            throw new Error(
              `Invalid cue: ${node.id}/${language}/${cue.sectionId}`,
            );
          if (
            !metadata.captions.some(
              (c) => c.sectionId === cue.sectionId && c.text.trim(),
            )
          )
            throw new Error(
              `Missing captions: ${node.id}/${language}/${cue.sectionId}`,
            );
        }
        for (const caption of metadata.captions) {
          if (
            !ids.includes(caption.sectionId) ||
            caption.start < 0 ||
            caption.end < caption.start ||
            caption.end > duration + 0.3
          )
            throw new Error(`Invalid caption: ${node.id}/${language}`);
        }
        ready++;
        totalSeconds += duration;
      }
    }
  }
  console.log(
    JSON.stringify({
      decoded: ready,
      missing: missing.length,
      totalMinutes: Math.round(totalSeconds / 60),
    }),
  );
  if (missing.length && process.argv.includes("--require-all"))
    throw new Error(
      `Missing ${missing.length} narration assets; first: ${missing[0]}`,
    );
} finally {
  await browser.close();
}


