import { describe, expect, it } from "vitest";
import { demoChapter, demoGraph } from "../src/core/fixtures";
import { validateChapter } from "../src/core/protocol";
import { guidanceFrame } from "../src/core/guidance";

describe("prepared guided demonstrations", () => {
  it("shows partial typing before the completed replacement", () => {
    const chapter = demoChapter(demoGraph().nodes[0]);
    const section = chapter.sections.find((s) => s.guide)!;
    const cues = [{ sectionId: section.id, start: 0, end: 10 }];
    const middle = guidanceFrame(chapter, cues, 4);
    expect(middle.files).not.toEqual(chapter.workspaceSetup);
    expect(middle.files[section.guide!.path]).not.toContain(
      section.guide!.replacement,
    );
  });
  it("prepares a safe preview click for the JavaScript demonstration result", () => {
    const chapter = demoChapter(demoGraph().nodes.find((n) => n.id === "js")!);
    const section = chapter.sections.find((s) => s.guide)!;
    const cues = [{ sectionId: section.id, start: 0, end: 10 }];
    expect(guidanceFrame(chapter, cues, 1).previewClick).toBeUndefined();
    expect(guidanceFrame(chapter, cues, 9).previewClick).toBe("hello");
  });
  it("reconstructs a demonstration from its audio clock without modifying starter files", () => {
    const chapter = demoChapter(demoGraph().nodes[0]);
    const section = chapter.sections.find((s) => s.guide)!;
    expect(section).toBeDefined();
    const original = structuredClone(chapter.workspaceSetup);
    const cues = [{ sectionId: section.id, start: 10, end: 30 }];
    const before = guidanceFrame(chapter, cues, 10);
    const after = guidanceFrame(chapter, cues, 28);
    expect(before.files).toEqual(original);
    expect(after.files[section.guide!.path]).toContain(
      section.guide!.replacement,
    );
    expect(guidanceFrame(chapter, cues, 10).files).toEqual(original);
    expect(chapter.workspaceSetup).toEqual(original);
    expect(after.target).toBe("preview");
  });
  it("rejects guide edits that cannot be replayed or run outside demonstration sections", () => {
    const chapter = demoChapter(demoGraph().nodes[0]);
    const section = chapter.sections.find((s) => s.guide)!;
    section.guide!.find = "missing source content";
    expect(() => validateChapter(chapter)).toThrow(/guide/i);
    section.intent = "explain";
    expect(() => validateChapter(chapter)).toThrow(/guide/i);
  });
});
