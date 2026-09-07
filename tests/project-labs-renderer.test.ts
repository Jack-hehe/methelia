import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectLab } from "../src/components/labs/project-labs";
import type { LabKind } from "../src/core/lab";

const kinds: LabKind[] = [
  "design",
  "animation",
  "ecosystem",
  "separation",
  "flood",
  "economy",
  "logic",
  "pathfinding",
  "data",
];
describe("project lab renderers", () => {
  it("keeps the squashed animation character in contact with the floor", () => {
    const html = renderToStaticMarkup(
      createElement(ProjectLab, {
        kind: "animation",
        language: "en",
        value: { squash: 25 },
        onChange: () => {},
      }),
    );
    expect(html).toContain("translate(320 296) scale(1.25 0.8)");
  });
  it("colors logic input wires by their own signal even when the alarm locks the door", () => {
    const html = renderToStaticMarkup(
      createElement(ProjectLab, {
        kind: "logic",
        language: "en",
        value: { a: 1, b: 0, c: 1, gate: 1 },
        onChange: () => {},
      }),
    );
    expect(html).toContain('d="M70 230H185V180H220" stroke="#8b99a7"');
    expect(html).toContain('d="M340 155H450" stroke="#31a381"');
  });
  it("offers a cleaned CSV artifact from the data experiment", () => {
    const html = renderToStaticMarkup(
      createElement(ProjectLab, {
        kind: "data",
        language: "en",
        value: {},
        onChange: () => {},
      }),
    );
    expect(html).toContain("Export cleaned CSV");
  });
  it("bounds persisted values before calculating population trajectories", () => {
    const html = renderToStaticMarkup(
      createElement(ProjectLab, {
        kind: "ecosystem",
        language: "en",
        value: { capacity: 0, growth: 1000000, prey: 1000000 },
        onChange: () => {},
      }),
    );
    expect(html).not.toMatch(/NaN|Infinity/);
  });
  for (const language of ["en", "zh-TW"] as const)
    for (const kind of kinds) {
      it(`renders ${kind} with usable ${language} controls and an export`, () => {
        const html = renderToStaticMarkup(
          createElement(ProjectLab, {
            kind,
            language,
            value: {},
            onChange: () => {},
          }),
        );
        expect(html).toContain("<svg");
        expect(html).toContain(
          language === "en" ? "Export project data" : "匯出作品資料",
        );
        expect(html).toContain(language === "en" ? "Export SVG" : "匯出 SVG");
        expect(html).not.toMatch(/NaN|undefined|Infinity/);
      });
    }
  it("makes every editable maze cell keyboard reachable", () => {
    const html = renderToStaticMarkup(
      createElement(ProjectLab, {
        kind: "pathfinding",
        language: "en",
        value: {},
        onChange: () => {},
      }),
    );
    expect(html.match(/tabindex="0"/g)).toHaveLength(62);
  });
});
