import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AudioControls } from "../src/components/audio-controls";
import { demoChapter, demoGraph } from "../src/core/fixtures";
import type { PackageState } from "../src/core/state";

const chapter = demoChapter(demoGraph().nodes[0]);
const pkg: PackageState = {
  id: "chapter-audio",
  nodeHash: "hash",
  status: "ready",
  speech: "ready",
  narrationMode: "chapter",
  chapter,
  cues: [
    { sectionId: "languages", start: 0, end: 10 },
    { sectionId: "languages", start: 10, end: 15 },
    { sectionId: "structure", start: 15, end: 40 },
    { sectionId: "check", start: 40, end: 60 },
  ],
};
function render(value = pkg) {
  return renderToStaticMarkup(
    createElement(AudioControls, {
      pkg: value,
      sectionId: "structure",
      paused: false,
      progress: {
        time: 20,
        sectionId: "structure",
        done: [],
        subtitleOnly: false,
        follow: true,
      },
      onTime() {},
      onSave() {},
      onError() {},
    }),
  );
}
it("shows the whole chapter range with one accessible marker per page", () => {
  const html = render();
  expect(html).toContain('max="60"');
  expect(html).toContain('aria-label="本章解說時間"');
  expect(html.match(/data-page-marker=/g)).toHaveLength(3);
  expect(html).toContain('data-page-marker="structure"');
  expect(html).toContain("left:25%");
  expect(html).toContain(chapter.sections[1].title);
});
it("retains page-local duration and URL for legacy page audio", () => {
  const html = render({
    ...pkg,
    pageAudio: {
      structure: {
        status: "ready",
        cues: [{ sectionId: "structure", start: 0, end: 8 }],
        captions: [],
      },
    },
  });
  expect(html).toContain('max="8"');
  expect(html).toContain("?sectionId=structure");
  expect(html).not.toContain("data-page-marker=");
});
