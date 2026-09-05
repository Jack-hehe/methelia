import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CoursePlayer } from "../src/components/course-player";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
import { validateChapter, validateGraph } from "../src/core/protocol";
import { generalChapter, generalGraph } from "./fixtures/general-course";
import { LessonSection } from "../src/components/lesson-section";
import { demoChapter, demoGraph } from "../src/core/fixtures";

it("retains the v1 language experiment without inferring v2 interactions from lesson titles", () => {
  const section = demoChapter(demoGraph().nodes[0]).sections[0];
  const render = (schemaVersion: 1 | 2) =>
    renderToStaticMarkup(
      createElement(LessonSection, {
        schemaVersion,
        section,
        index: 0,
        done: false,
        files: {},
        onCheck: async () => false,
        onPractice() {},
      }),
    );
  expect(render(1)).toContain("mini-site");
  expect(render(2)).not.toContain("mini-site");
});

it.each(["none", "web", "python", "terminal"] as const)(
  "presents and persists %s practice without imposing a website workflow",
  (environment) => {
    const store = new Store(":memory:");
    const service = new LearningService(store);
    const session = service.session();
    const initial = service.createCourse(
      session,
      "A different subject",
      "demo",
      environment,
    );
    try {
      service.mutate(session, initial.id, (c) => {
        c.graph = validateGraph(generalGraph(environment));
        const pkg = store.getPackage(c.chapterIds.web)!;
        pkg.chapter = validateChapter(generalChapter(c.graph.nodes[0]));
        pkg.speech = "not_requested";
        c.workspace = {
          files: {},
          directories: ["/"],
          cwd: "/",
          revision: 0,
          previewRunning: false,
          history: [],
        };
        service.initialize(c, pkg.chapter);
        store.putPackage(c.id, pkg);
        c.progress.web.sectionId = "try";
      });
      const render = () =>
        renderToStaticMarkup(
          createElement(CoursePlayer, {
            course: service.getCourse(session, initial.id),
            onChange() {},
            onError() {},
            onHome() {},
            themeControl: null,
          }),
        );
      const html = render();
      if (environment === "none") {
        expect(html).not.toContain("開啟實作區");
        expect(service.getCourse(session, initial.id).workspace.files).toEqual(
          {},
        );
      } else {
        expect(html).toContain(
          environment === "python"
            ? "Python 輸出"
            : environment === "terminal"
              ? "mkdir notes"
              : "Hello",
        );
        expect(service.check(session, initial.id, "try").passed).toBe(false);
        if (environment === "terminal")
          service.command(session, initial.id, "mkdir notes");
        else {
          const w = service.getCourse(session, initial.id).workspace;
          service.saveWorkspace(
            session,
            initial.id,
            environment === "python"
              ? { "/main.py": "print(2 + 3)" }
              : { "/index.html": "<h1>Welcome</h1>" },
            w.revision,
          );
        }
        expect(service.check(session, initial.id, "try").passed).toBe(true);
      }
      expect(service.check(session, initial.id, "check", 1).passed).toBe(true);
      service.mutate(session, initial.id, (c) => {
        c.completed = c.graph!.nodes.map((n) => n.id);
        c.progress.web.sectionId = "check";
      });
      const completed = render();
      if (environment === "none")
        expect(completed).not.toContain("/api/workspace/export");
      if (environment === "python" || environment === "terminal")
        expect(completed).not.toContain("匯出網站");
      expect(
        service.getCourse(session, initial.id).progress.web.done,
      ).toContain("check");
      expect(html).toContain("準備章節語音");
    } finally {
      store.db.close();
    }
  },
);
