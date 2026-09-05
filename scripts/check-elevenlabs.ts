import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { speechConfig, synthesize } from "../src/server/speech";
import { demoChapter, demoGraph } from "../src/core/fixtures";

// Default is free configuration validation. The explicit flag makes ONE paid
// request; no course/database is touched and an existing sample is never replaced.
try {
  const { profile } = speechConfig();
  console.log(`ElevenLabs configuration valid; model: ${profile.model}`);
  if (process.argv.includes("--synthesize")) {
    const chapter = demoChapter(demoGraph().nodes[0]);
    chapter.script = [
      {
        sectionId: "languages",
        text: "HTML 放內容，CSS 改外觀，JavaScript 處理互動。先改一個標題，再看看網頁有什麼變化。",
      },
    ];
    const result = await synthesize(chapter, profile);
    const directory = resolve(".data", "speech-samples");
    mkdirSync(directory, { recursive: true });
    const prefix = resolve(directory, `elevenlabs-${Date.now()}`);
    writeFileSync(`${prefix}.mp3`, result.audio, { flag: "wx" });
    writeFileSync(
      `${prefix}.json`,
      JSON.stringify(
        {
          script: chapter.script,
          cues: result.cues,
          captions: result.captions,
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    console.log(
      JSON.stringify({
        audio: `${prefix}.mp3`,
        bytes: result.audio.length,
        durationFromAlignment: result.words.at(-1)?.end,
        captions: result.captions.length,
      }),
    );
  } else {
    console.log(
      "No API request made. Add --synthesize for one short paid sample.",
    );
  }
} catch (error) {
  // Adapter errors are redacted; never print a raw provider response or env.
  console.error(error instanceof Error ? error.message : "Speech check failed");
  process.exitCode = 1;
}
