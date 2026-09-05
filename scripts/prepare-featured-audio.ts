import { existsSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import {
  featuredCourses,
  featuredGraph,
  featuredChapter,
} from "../src/core/featured-courses";
import { speechConfig, synthesize } from "../src/server/speech";
import { featuredAudioKey } from "../src/server/featured-audio";

// Dry by default. Existing content-addressed assets are reused; failed API calls are not retried.
const generate = process.argv.includes("--generate");
const selected = process.argv.find((a) => a.startsWith("--course="))?.slice(9);
const locale = process.argv.find((a) => a.startsWith("--language="))?.slice(11);
const firstOnly = process.argv.includes("--first-chapters");
const directory = resolve("public/featured-audio");
const entries = [];
for (const course of featuredCourses.filter(
  (c) => !selected || c.id === selected,
)) {
  for (const language of ["zh-TW", "en"] as const) {
    if (locale && language !== locale) continue;
    const { profile } = speechConfig(undefined, language);
    const nodes = featuredGraph(course.id, language).nodes;
    for (const node of firstOnly ? nodes.slice(0, 1) : nodes) {
      const chapter = featuredChapter(course.id, node, language);
      const key = featuredAudioKey(chapter.script, profile);
      const ready =
        existsSync(resolve(directory, `${key}.mp3`)) &&
        existsSync(resolve(directory, `${key}.json`));
      entries.push({
        course: course.id,
        language,
        node: node.id,
        chapter,
        profile,
        key,
        ready,
        characters: chapter.script.map((s) => s.text).join("\n").length,
      });
    }
  }
}
console.log(
  JSON.stringify({
    chapters: entries.length,
    ready: entries.filter((e) => e.ready).length,
    charactersRemaining: entries
      .filter((e) => !e.ready)
      .reduce((sum, e) => sum + e.characters, 0),
    generate,
  }),
);
if (generate) {
  mkdirSync(directory, { recursive: true });
  for (const entry of entries) {
    if (entry.ready) continue;
    console.log(
      `Preparing ${entry.course} / ${entry.language} / ${entry.node} (${entry.characters} characters)`,
    );
    try {
      const result = await synthesize(entry.chapter, entry.profile);
      writeFileSync(resolve(directory, `${entry.key}.mp3.tmp`), result.audio);
      writeFileSync(
        resolve(directory, `${entry.key}.json.tmp`),
        JSON.stringify({ cues: result.cues, captions: result.captions }),
      );
      renameSync(
        resolve(directory, `${entry.key}.mp3.tmp`),
        resolve(directory, `${entry.key}.mp3`),
      );
      renameSync(
        resolve(directory, `${entry.key}.json.tmp`),
        resolve(directory, `${entry.key}.json`),
      );
      console.log(`Saved ${entry.course} / ${entry.language} / ${entry.node}`);
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "Narration preparation failed",
      );
      process.exitCode = 1;
      break;
    }
  }
}
