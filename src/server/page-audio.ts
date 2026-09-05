import type { Chapter } from "../core/protocol";
import type { PageAudio } from "../core/state";

export const pageAudioArtifactKey = (packageId: string, sectionId: string) =>
  "page-audio:" + packageId + ":" + sectionId;

export function pageAudioForChapter(
  chapter: Chapter,
  existing: Record<string, PageAudio> = {},
): Record<string, PageAudio> {
  return Object.fromEntries(
    chapter.script.map((entry) => [
      entry.sectionId,
      existing[entry.sectionId] ?? {
        status: "pending",
        cues: [],
        captions: [],
      },
    ]),
  );
}

export function pageAudioReady(
  chapter: Chapter,
  pages: Record<string, PageAudio>,
) {
  return chapter.script.every(
    (entry) => pages[entry.sectionId]?.status === "ready",
  );
}
