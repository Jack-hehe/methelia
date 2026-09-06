import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { GenerationProgress } from "../src/components/generation-progress";
import type { PackageState } from "../src/core/state";

const pkg: PackageState = { id: "progress", nodeHash: "hash", status: "queued", speech: "not_requested", chapter: null, cues: [] };
it("distinguishes queued work from generating content without invented percentages", () => {
  const queued = renderToStaticMarkup(createElement(GenerationProgress, { pkg }));
  expect(queued).toContain("製作佇列");
  expect(queued).toContain('aria-valuenow="1"');
  expect(queued).toContain('aria-valuemax="3"');
  expect(queued).toContain('role="status"');
  expect(renderToStaticMarkup(createElement(GenerationProgress, { pkg: { ...pkg, status: "generating" } }))).toContain("正在編寫講解");
});
it("allows reading while speech is preparing or has failed", () => {
  for (const speech of ["pending", "generating", "failed"] as const) {
    const html = renderToStaticMarkup(createElement(GenerationProgress, { pkg: { ...pkg, status: "ready", speech } }));
    expect(html).toContain("可以先閱讀");
    expect(html).not.toContain("內容與語音都已準備完成");
  }
});
it("reports completion only when both content and narration are ready", () => {
  expect(renderToStaticMarkup(createElement(GenerationProgress, { pkg: { ...pkg, status: "ready", speech: "ready" } }))).toContain("內容與語音都已準備完成");
  expect(renderToStaticMarkup(createElement(GenerationProgress, { planning: true }))).toContain("正在根據你的回答");
});
