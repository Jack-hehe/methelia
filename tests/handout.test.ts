import { describe, expect, it } from "vitest";
import { demoChapter, demoGraph } from "../src/core/fixtures";
import { renderHandout } from "../src/core/handout";

describe("localized handouts", () => {
  it("exports English labels, guides, answer keys, and document language", () => {
    const graph = demoGraph("en");
    const chapters = graph.nodes.map((node) => demoChapter(node, "en"));
    const html = renderHandout(
      { goal: "Build a website", graph, language: "en" },
      chapters,
    );
    expect(html).not.toMatch(/\p{Script=Han}/u);
    for (const label of [
      '<html lang="en">',
      "Course handout",
      "Learning objective",
      "Chapter 1",
      "Practice Terminal",
      "My answer:",
      "Demonstration",
      "Find this content",
      "Replace with",
      "Preview action: click",
      "Chapter practice files",
      "Quiz answers and explanations",
      "Answer B",
      'aria-label="Handout contents"',
      "5 prepared chapters",
    ]) {
      expect(html).toContain(label);
    }
  });

  it("keeps Chinese defaults and supports explicit Traditional Chinese", () => {
    const graph = demoGraph();
    const chapters = graph.nodes.map((node) => demoChapter(node));
    const course = { goal: "建立網站", graph };
    const html = renderHandout(course, chapters);
    expect(html).toEqual(
      renderHandout({ ...course, language: "zh-TW" }, chapters),
    );
    for (const label of [
      '<html lang="zh-Hant">',
      "課程講義",
      "學習目標",
      "第 1 章",
      "教學 Terminal",
      "我的答案：",
      "操作示範",
      "測驗答案與解析",
      "5 個已準備章節",
    ]) {
      expect(html).toContain(label);
    }
  });

  it("localizes the empty export and missing practice files", () => {
    const empty = renderHandout({ goal: "", graph: null, language: "en" }, []);
    expect(empty).toContain("No chapters are ready to export yet");
    expect(empty).toContain("<h1>Course handout</h1>");
    expect(empty).not.toMatch(/\p{Script=Han}/u);
    const graph = demoGraph("en");
    const chapter = demoChapter(graph.nodes[0], "en");
    chapter.workspaceSetup = {};
    chapter.sections[0].component = { type: "file.tree" };
    const html = renderHandout({ goal: "Learn", graph, language: "en" }, [
      chapter,
    ]);
    expect(html).toContain("No practice files are prepared for this chapter.");
    expect(html).toContain("1 prepared chapter.");
    expect(html).not.toContain("1 prepared chapters");
    expect(renderHandout({ goal: "", graph: null }, [])).toContain(
      "目前尚無可匯出的章節",
    );
  });

  it("preserves and escapes learner text and lesson markup without translating it", () => {
    const graph = demoGraph("en");
    graph.title = "自訂 <script>alert('title')</script>";
    const chapter = demoChapter(graph.nodes[0], "en");
    chapter.sections[0].body = '保留原文 <img src=x onerror="alert(1)"> & text';
    const html = renderHandout(
      { goal: "我的目標 <b>learn</b>", graph, language: "en" },
      [chapter],
    );
    expect(html).toContain("我的目標 &lt;b&gt;learn&lt;/b&gt;");
    expect(html).toContain(
      "自訂 &lt;script&gt;alert(&#39;title&#39;)&lt;/script&gt;",
    );
    expect(html).toContain(
      "保留原文 &lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; text",
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("Course handout");
    expect(html).toContain("default-src 'none'");
  });
});
