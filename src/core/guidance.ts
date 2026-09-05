import type { Chapter } from "./protocol";
import type { Cue } from "./narration";

/** Pure projection of a prepared demonstration. Seeking never mutates learner files. */
export function guidanceFrame(chapter: Chapter, cues: Cue[], time: number) {
  const files = { ...chapter.workspaceSetup };
  const sections = chapter.sections.filter((s) => s.guide);
  let active = sections[0];
  let fraction = 0;
  let typingLine = -1;
  for (const section of sections) {
    const cue = cues.find((c) => c.sectionId === section.id);
    if (!cue || time < cue.start) continue;
    active = section;
    fraction = Math.min(
      1,
      Math.max(0, (time - cue.start) / Math.max(0.01, cue.end - cue.start)),
    );
    typingLine = -1;
    if (fraction >= 0.2) {
      const guide = section.guide!;
      const source = files[guide.path] || "";
      if (fraction < 0.6) {
        const prefix = source.slice(0, source.indexOf(guide.find));
        const typed = [...guide.replacement]
          .slice(
            0,
            Math.ceil(
              [...guide.replacement].length *
                Math.min(1, (fraction - 0.2) / 0.4),
            ),
          )
          .join("");
        typingLine = (prefix + typed).split("\n").length - 1;
      }
      files[guide.path] = (files[guide.path] || "").replace(guide.find, () =>
        [...guide.replacement]
          .slice(
            0,
            Math.ceil(
              [...guide.replacement].length *
                Math.min(1, (fraction - 0.2) / 0.4),
            ),
          )
          .join(""),
      );
    }
  }
  return {
    files,
    section: active,
    fraction,
    typingLine,
    target: fraction < 0.6 ? "terminal" : "preview",
    previewClick: fraction >= 0.75 ? active?.guide?.previewClick : undefined,
  };
}
