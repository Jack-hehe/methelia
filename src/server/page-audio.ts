import type { Chapter } from "../core/protocol";
import type { PageAudio, PackageState } from "../core/state";

export function hasLegacySpeech(pkg: PackageState) {
  return (
    !pkg.speechProfile &&
    (pkg.speech === "ready" ||
      pkg.cues.length > 0 ||
      Object.values(pkg.pageAudio || {}).some(
        (page) => page.status === "ready",
      ))
  );
}

// A partially voiced page package must be rebuilt under a new package ID,
// preserving its existing paid audio instead of mixing narration formats.
export function hasReadyPageSpeech(pkg: PackageState) {
  return Object.values(pkg.pageAudio || {}).some(
    (page) => page.status === "ready" || page.cues.length > 0,
  );
}

export function useChapterNarration(pkg: PackageState) {
  if (hasLegacySpeech(pkg) || hasReadyPageSpeech(pkg))
    throw new Error("此章仍有舊語音，請使用「重建章節語音」生成完整章節旁白。");
  pkg.narrationMode = "chapter";
  delete pkg.pageAudio;
}

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
