import type { Chapter } from "./protocol";
import type { PackageState } from "./state";
import type { Cue, Caption } from "./narration";

export function pageIndex(chapter: Chapter, preferred: string) {
  return Math.max(
    0,
    chapter.sections.findIndex((s) => s.id === preferred),
  );
}

/** Page boundaries use the returned alignment, including silence between sentences. */
export function chapterSectionAt(pkg: PackageState, time: number): string {
  const sections = pkg.chapter?.sections || [];
  let selected = sections[0]?.id || "";
  for (const section of sections) {
    const first = pkg.cues.find((c) => c.sectionId === section.id);
    if (first && first.start <= time) selected = section.id;
  }
  return selected;
}

export function pageTrack(
  pkg: PackageState,
  sectionId: string,
): {
  url: string;
  ready: boolean;
  start: number;
  end: number;
  cues: Cue[];
  captions: Caption[];
} {
  const page = pkg.pageAudio?.[sectionId];
  const cues = (pkg.pageAudio ? page?.cues || [] : pkg.cues).filter(
    (c) => c.sectionId === sectionId,
  );
  return {
    url:
      `/api/audio/${encodeURIComponent(pkg.id)}` +
      (pkg.pageAudio ? `?sectionId=${encodeURIComponent(sectionId)}` : ""),
    ready:
      pkg.speech === "ready" &&
      cues.length > 0 &&
      (!pkg.pageAudio || page?.status === "ready"),
    start: pkg.pageAudio ? 0 : cues[0]?.start || 0,
    end: cues.at(-1)?.end || 0,
    cues,
    captions: (pkg.pageAudio
      ? page?.captions || []
      : pkg.captions || []
    ).filter((c) => c.sectionId === sectionId),
  };
}

/** Each page's demo starts from the effects of earlier prepared demos, not learner edits. */
export function workspaceChapter(chapter: Chapter, sectionId: string): Chapter {
  const workspaceSetup = { ...chapter.workspaceSetup };
  for (const section of chapter.sections) {
    if (section.id === sectionId) break;
    if (section.guide) {
      const g = section.guide;
      workspaceSetup[g.path] = (workspaceSetup[g.path] || "").replace(
        g.find,
        g.replacement,
      );
    }
  }
  return {
    ...chapter,
    workspaceSetup,
    sections: chapter.sections.filter((s) => s.id === sectionId),
  };
}
