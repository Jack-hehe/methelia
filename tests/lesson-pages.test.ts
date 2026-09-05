import { expect, it } from "vitest";
import { demoChapter, demoGraph } from "../src/core/fixtures";
import type { PackageState } from "../src/core/state";
import {
  pageTrack,
  pageIndex,
  workspaceChapter,
} from "../src/core/lesson-pages";
const chapter = demoChapter(demoGraph().nodes[0]);
const legacy: PackageState = {
  id: "pkg",
  nodeHash: "hash",
  status: "ready",
  speech: "ready",
  chapter,
  cues: [
    { sectionId: "languages", start: 0, end: 10 },
    { sectionId: "structure", start: 10, end: 30 },
  ],
  captions: [{ sectionId: "structure", text: "標題", start: 11, end: 13 }],
};
it("restores the selected page and falls back to the first page for a stale ID", () => {
  expect(pageIndex(chapter, "structure")).toBe(1);
  expect(pageIndex(chapter, "removed")).toBe(0);
});
it("bounds a legacy track to the selected page without guessing new timestamps", () => {
  expect(pageTrack(legacy, "structure")).toMatchObject({
    url: "/api/audio/pkg",
    ready: true,
    start: 10,
    end: 30,
    captions: [{ sectionId: "structure", text: "標題", start: 11, end: 13 }],
  });
  expect(pageTrack(legacy, "unknown").ready).toBe(false);
});
it("selects page-local audio and waits for aggregate readiness", () => {
  const pkg = {
    ...legacy,
    pageAudio: {
      structure: {
        status: "ready" as const,
        cues: [{ sectionId: "structure", start: 0.1, end: 8 }],
        captions: [],
      },
    },
  };
  expect(pageTrack(pkg, "structure")).toMatchObject({
    url: "/api/audio/pkg?sectionId=structure",
    ready: true,
    start: 0,
    end: 8,
  });
  expect(pageTrack({ ...pkg, speech: "generating" }, "structure").ready).toBe(
    false,
  );
});
it("prepares a selected demonstration from its prerequisite demo edits, never learner files", () => {
  const first = chapter.sections[1];
  const second = {
    ...first,
    id: "second",
    guide: {
      path: "/index.html",
      find: "Hello Methelia",
      replacement: "Finished",
    },
  };
  const scoped = workspaceChapter(
    { ...chapter, sections: [first, second] },
    "second",
  );
  expect(scoped.sections).toHaveLength(1);
  expect(scoped.sections[0].id).toBe("second");
  expect(scoped.workspaceSetup["/index.html"]).toContain("Hello Methelia");
  expect(chapter.workspaceSetup["/index.html"]).toContain("我的第一個網站");
});
