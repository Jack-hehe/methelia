import { describe, expect, it } from "vitest";
import {
  featuredChapter,
  featuredCourses,
  featuredGraph,
} from "../src/core/featured-courses";
import { validateChapter, validateGraph } from "../src/core/protocol";
import { validLabParameters } from "../src/core/lab";
import { scienceCourses } from "../src/core/featured/science";
import { projectCourses } from "../src/core/featured/projects";
import { codingCourses } from "../src/core/featured/coding";
import { coaster, simulateOrbit, sphereSlice } from "../src/core/labs/science";
import { featuredReferences } from "../src/core/featured/references";

describe("curated bilingual course publication", () => {
  it("publishes exactly twenty distinct authored five-chapter courses", () => {
    expect(featuredCourses).toHaveLength(20);
    expect(new Set(featuredCourses.map((c) => c.id)).size).toBe(20);
    const authored = [...scienceCourses, ...projectCourses, ...codingCourses];
    for (const course of featuredCourses) {
      const source = authored.find((c) => c.id === course.id)!;
      expect(source).toBeDefined();
      expect(course.chapters).toBe(source.lessons.length);
      expect(course.title).toEqual(source.title);
      expect(course.description).toEqual(source.description);
      expect(course.chapters).toBeGreaterThanOrEqual(5);
      expect(course.chapters).toBeLessThanOrEqual(7);
      expect(featuredReferences[course.id]?.length).toBeGreaterThan(0);
      for (const reference of featuredReferences[course.id]) {
        expect(new URL(reference.url).protocol).toBe("https:");
        expect(reference.title.length).toBeGreaterThan(10);
      }
    }
  });
  for (const language of ["en", "zh-TW"] as const) {
    for (const course of featuredCourses) {
      it(`${course.id}: complete, valid and actionable in ${language}`, () => {
        const graph = validateGraph(featuredGraph(course.id, language));
        expect(graph.nodes).toHaveLength(course.chapters);
        const answers = new Set<number>();
        const concepts = new Set<string>();
        for (const node of graph.nodes) {
          const chapter = validateChapter(
            featuredChapter(course.id, node, language),
          );
          expect(chapter.sections.length).toBeGreaterThanOrEqual(3);
          expect(chapter.sections.length).toBeLessThanOrEqual(6);
          expect(chapter.script.map((s) => s.sectionId)).toEqual(
            chapter.sections.map((s) => s.id),
          );
          concepts.add(chapter.sections[0].body);
          for (const section of chapter.sections) {
            if (section.component.type === "quiz.choice") {
              answers.add(section.component.answer);
              expect(section.component.explanation.length).toBeGreaterThan(25);
              expect(new Set(section.component.options).size).toBe(
                section.component.options.length,
              );
            }
            if (section.component.type === "lab.experiment") {
              expect(
                validLabParameters(
                  section.component.kind,
                  section.component.initial || {},
                ),
              ).toBe(true);
              expect(section.component.mission.length).toBeGreaterThan(25);
            }
            const condition = section.completion;
            if (condition?.type === "file.includes") {
              expect(chapter.workspaceSetup[condition.path]).not.toContain(
                condition.value,
              );
              expect(section.component.type).toBe("code.editor");
              if (section.component.type === "code.editor")
                expect(section.component.example).toContain(condition.value);
            }
          }
          if (language === "zh-TW")
            expect(chapter.title).toMatch(/[\u3400-\u9fff]/);
        }
        expect(concepts.size).toBe(course.chapters);
        expect(answers.size).toBeGreaterThan(1);
      });
    }
  }
  it("rejects unknown catalog and chapter identifiers", () => {
    expect(() => featuredGraph("invented-course", "en")).toThrow(
      "Unknown featured course",
    );
    const node = featuredGraph("equation-explorer", "en").nodes[0];
    expect(() => featuredChapter("fair-game", node, "en")).toThrow(
      "Unknown featured chapter",
    );
  });
  it("keeps the taught science examples aligned with renderer mathematics", () => {
    expect(sphereSlice(5, 3)).toBe(4);
    expect(coaster(1, 0.5, 0).slope).toBeCloseTo(1 / 3);
    const circular = simulateOrbit(2, 1);
    expect(circular.status).toBe("orbit");
    expect(
      Math.max(...circular.points.map((p) => Math.hypot(p.x, p.y))) - 2,
    ).toBeLessThan(0.001);
    expect(simulateOrbit(2, 1.6).status).toBe("escape");
    const calculus = featuredChapter(
      "smooth-coaster",
      featuredGraph("smooth-coaster", "en").nodes[2],
      "en",
    );
    const quiz = calculus.sections.find(
      (s) => s.component.type === "quiz.choice",
    )!.component;
    if (quiz.type === "quiz.choice")
      expect(quiz.options[quiz.answer]).toBe("1/3");
    const orbit = featuredChapter(
      "satellite-mission",
      featuredGraph("satellite-mission", "en").nodes[1],
      "en",
    );
    const lab = orbit.sections.find(
      (s) => s.component.type === "lab.experiment",
    )!.component;
    if (lab.type === "lab.experiment") expect(lab.initial?.speed).toBe(1);
  });
});
