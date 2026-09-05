import type { Chapter } from "./protocol";
import type { Cue } from "./narration";

/** Pure projection of a prepared demonstration. Seeking never mutates learner files. */
export function guidanceFrame(chapter: Chapter, cues: Cue[], time: number) {
  const files = { ...chapter.workspaceSetup };
  const sections = chapter.sections.filter((s) => s.guide);
  let active = sections[0];
  let fraction = 0;
  for (const section of sections) {
    const cue = cues.find((c) => c.sectionId === section.id);
    if (!cue || time < cue.start) continue;
    active = section;
    fraction = Math.min(
      1,
      Math.max(0, (time - cue.start) / Math.max(0.01, cue.end - cue.start)),
    );
    if (fraction >= 0.6) {
      const guide = section.guide!;
      files[guide.path] = (files[guide.path] || "").replace(
        guide.find,
        guide.replacement,
      );
    }
  }
  return {
    files,
    section: active,
    fraction,
    target: fraction < 0.6 ? "terminal" : "preview",
    previewClick: fraction >= 0.75 ? active?.guide?.previewClick : undefined,
  };
}
