import { describe, expect, it } from "vitest";
import { demoChapter, demoGraph } from "../src/core/fixtures";
import { validateChapter, validateGraph } from "../src/core/protocol";

describe("localized demo courses", () => {
  it("keeps Traditional Chinese as the backward-compatible default", () => {
    expect(demoGraph()).toEqual(demoGraph("zh-TW"));
    for (const node of demoGraph().nodes) {
      expect(demoChapter(node)).toEqual(demoChapter(node, "zh-TW"));
      expect(demoChapter(node).title).toMatch(/\p{Script=Han}/u);
    }
  });

  it("provides an entirely English graph, narration, interactions, and workspace", () => {
    const graph = validateGraph(demoGraph("en"));
    expect(JSON.stringify(graph)).not.toMatch(/\p{Script=Han}/u);
    for (const node of graph.nodes) {
      const chapter = validateChapter(demoChapter(node, "en"));
      expect(JSON.stringify(chapter)).not.toMatch(/\p{Script=Han}/u);
      expect(chapter.workspaceSetup["/index.html"]).toContain('lang="en"');
      expect(chapter.script.map((line) => line.sectionId)).toEqual(
        chapter.sections.map((section) => section.id),
      );
    }
  });

  it("preserves the course route and every interaction contract across languages", () => {
    const english = demoGraph("en");
    const chinese = demoGraph("zh-TW");
    expect(english.edges).toEqual(chinese.edges);
    expect(
      english.nodes.map(({ id, prerequisites, minutes }) => ({
        id,
        prerequisites,
        minutes,
      })),
    ).toEqual(
      chinese.nodes.map(({ id, prerequisites, minutes }) => ({
        id,
        prerequisites,
        minutes,
      })),
    );
    for (const [index, node] of english.nodes.entries()) {
      const en = demoChapter(node, "en");
      const zh = demoChapter(chinese.nodes[index], "zh-TW");
      expect(
        en.sections.map(({ id, intent, template, component, completion }) => ({
          id,
          intent,
          template,
          type: component.type,
          completion,
        })),
      ).toEqual(
        zh.sections.map(({ id, intent, template, component, completion }) => ({
          id,
          intent,
          template,
          type: component.type,
          completion,
        })),
      );
    }
  });

  it.each(["en", "zh-TW"] as const)(
    "keeps demonstration edits replayable and sufficient for file checkpoints in %s",
    (locale) => {
      for (const node of demoGraph(locale).nodes) {
        const chapter = demoChapter(node, locale);
        const files = { ...chapter.workspaceSetup };
        for (const { guide } of chapter.sections) {
          if (!guide) continue;
          expect(files[guide.path]).toContain(guide.find);
          files[guide.path] = files[guide.path].replace(
            guide.find,
            guide.replacement,
          );
          if (guide.previewClick)
            expect(files["/index.html"]).toContain(
              `id="${guide.previewClick}"`,
            );
        }
        for (const { completion } of chapter.sections) {
          if (completion?.type !== "file.includes") continue;
          expect(chapter.workspaceSetup[completion.path]).not.toContain(
            completion.value,
          );
          expect(files[completion.path]).toContain(completion.value);
        }
      }
    },
  );
});
