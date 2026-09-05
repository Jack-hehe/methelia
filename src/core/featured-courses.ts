import {
  validateChapter,
  validateGraph,
  type Chapter,
  type Graph,
  type LearningNode,
  type Section,
} from "./protocol";
import { scienceCourses } from "./featured/science";
import { projectCourses } from "./featured/projects";
import { codingCourses, localizedCodingLesson } from "./featured/coding";
import type { Bilingual } from "./featured/types";
export { featuredCourses } from "./featured/catalog";

const courses = [
  ...codingCourses,
  ...projectCourses.slice(0, 2),
  ...scienceCourses,
  ...projectCourses.slice(2),
];
const pick = (value: Bilingual, language: "en" | "zh-TW") =>
  language === "en" ? value.en : value.zh;
function courseFor(id: string) {
  const course = courses.find((item) => item.id === id);
  if (!course) throw new Error(`Unknown featured course: ${id}`);
  return course;
}
export function featuredGraph(id: string, language: "en" | "zh-TW"): Graph {
  const course = courseFor(id);
  const environment =
    course.kind === "web" || course.kind === "python" ? course.kind : "none";
  const nodes: LearningNode[] = course.lessons.map((lesson, index) => ({
    id: `${course.id}-${index + 1}`,
    title: pick(lesson.title, language),
    objective: pick(lesson.mission, language),
    minutes: 12,
    kind: "main",
    environment,
    depth: index < 2 ? "foundation" : "applied",
    prerequisites: index ? [`${course.id}-${index}`] : [],
    summary: pick(lesson.concept, language),
    assessment: pick(lesson.question, language),
  }));
  return validateGraph({
    schemaVersion: 2,
    title: pick(course.title, language),
    outcome: pick(course.description, language),
    nodes,
    edges: nodes
      .slice(1)
      .map((node, index) => ({ from: nodes[index].id, to: node.id })),
  });
}
export function featuredChapter(
  id: string,
  node: LearningNode,
  language: "en" | "zh-TW",
): Chapter {
  const course = courseFor(id);
  const index = course.lessons.findIndex(
    (_, i) => node.id === `${course.id}-${i + 1}`,
  );
  if (index < 0) throw new Error(`Unknown featured chapter: ${node.id}`);
  const lesson = localizedCodingLesson(course.lessons[index], language);
  const t = (value: Bilingual) => pick(value, language);
  const en = language === "en";
  const code = lesson.code;
  const environment =
    course.kind === "web" || course.kind === "python" ? course.kind : "none";
  const sections: Section[] = [];
  sections.push({
    id: "concept",
    title: t(lesson.title),
    body: t(lesson.concept),
    intent: "explain",
    template: code ? "split" : "focus",
    component: code
      ? {
          type: "code.editor",
          path: code.path,
          language: code.language,
          example: code.example,
        }
      : course.kind !== "web" && course.kind !== "python"
        ? {
            type: "lab.experiment",
            kind: course.kind,
            mission: t(lesson.concept),
            ...(lesson.initial ? { initial: lesson.initial } : {}),
          }
        : {
            type: "lesson.article",
            paragraphs: [t(lesson.concept)],
            takeaway: t(lesson.mission),
          },
  });
  if (code) {
    sections.push({
      id: "build",
      title: en ? "Build and run" : "實作與執行",
      body: t(lesson.mission),
      intent: "practice",
      template: "workspace",
      component: {
        type: "code.editor",
        path: code.path,
        language: code.language,
        example: code.example,
      },
      completion: {
        type: "file.includes",
        path: code.path,
        value: code.target,
      },
    });
  } else if (course.kind !== "web" && course.kind !== "python") {
    sections.push({
      id: "experiment",
      title: en ? "Test your prediction" : "測試你的預測",
      body: t(lesson.mission),
      intent: "explain",
      template: "focus",
      component: {
        type: "lab.experiment",
        kind: course.kind,
        mission: t(lesson.mission),
        ...(lesson.initial ? { initial: lesson.initial } : {}),
      },
    });
  }
  // Rotate answer positions so option order cannot serve as an answer key.
  const offset = index % lesson.options.length;
  const options = [
    ...lesson.options.slice(offset),
    ...lesson.options.slice(0, offset),
  ];
  sections.push({
    id: "checkpoint",
    title: en ? "Explain the result" : "解釋結果",
    body: t(lesson.question),
    intent: "check",
    template: "focus",
    component: {
      type: "quiz.choice",
      question: t(lesson.question),
      options: options.map(t),
      answer: (lesson.options.length - offset) % lesson.options.length,
      explanation: t(lesson.explanation),
    },
    completion: { type: "quiz" },
  });
  return validateChapter({
    schemaVersion: 2,
    nodeId: node.id,
    title: t(lesson.title),
    objective: t(lesson.mission),
    environment,
    sections,
    workspaceSetup: code?.files || {},
    script: sections.map((section) => ({
      sectionId: section.id,
      text:
        section.id === "concept"
          ? t(lesson.concept)
          : section.id === "checkpoint"
            ? `${t(lesson.question)} ${en ? "Choose an answer using the model or program you just tested. The feedback will explain the difference between the alternatives." : "請根據剛才測試的模型或程式選擇答案。回饋會說明不同選項的差異。"}`
            : `${t(lesson.mission)} ${t(lesson.question)}`,
    })),
  });
}
