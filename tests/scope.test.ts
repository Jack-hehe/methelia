import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as database from "../src/server/db";
import { LearningService } from "../src/server/service";
import { POST } from "../src/app/api/[...path]/route";
import { CoursePlayer } from "../src/components/course-player";

afterEach(() => vi.restoreAllMocks());

function pendingCourse() {
  const store = new database.Store(":memory:");
  const service = new LearningService(store);
  const session = service.session();
  const course = service.createCourse(
    session,
    "Learn Linux administration",
    "demo",
    "scope",
  );
  service.mutate(session, course.id, (c) => {
    c.mode = "live";
    c.scopeAccepted = false;
    c.graph = {
      schemaVersion: 2,
      title: "Linux file basics",
      outcome: "Navigate and create virtual directories",
      scopeNote:
        "This is a virtual filesystem. Package installation and real processes are unavailable.",
      requiresConfirmation: true,
      nodes: [
        {
          id: "start",
          title: "Directories",
          objective: "Create a directory",
          minutes: 4,
          kind: "main",
          prerequisites: [],
          environment: "terminal",
        },
        {
          id: "next",
          title: "Navigation",
          objective: "Change directory",
          minutes: 4,
          kind: "main",
          prerequisites: ["start"],
          environment: "terminal",
        },
      ],
      edges: [{ from: "start", to: "next" }],
    };
    c.chapterIds = {};
    c.progress = {};
    c.currentNodeId = "start";
  });
  return { store, service, session, id: course.id };
}

it("confirms scope through the API once and persists chapter preparation only for the owner", async () => {
  const { store, service, session, id } = pendingCourse();
  vi.spyOn(database, "getStore").mockReturnValue(store);
  const request = (owner: string) =>
    new NextRequest(`http://localhost:3000/api/courses/${id}/accept-scope`, {
      method: "POST",
      headers: { host: "localhost:3000", cookie: `methelia_session=${owner}` },
      body: "{}",
    });
  try {
    expect((await POST(request(service.session()))).status).toBe(404);
    expect(service.getCourse(session, id).chapters).toEqual({});
    const response = await POST(request(session));
    expect(response.status).toBe(200);
    const accepted = await response.json();
    expect(accepted.scopeAccepted).toBe(true);
    expect(Object.keys(accepted.chapters)).toEqual(["start", "next"]);
    expect(accepted.chapters.start.status).toBe("queued");
    const repeated = await (await POST(request(session))).json();
    expect(repeated.chapterIds).toEqual(accepted.chapterIds);
    expect(service.getCourse(session, id).scopeAccepted).toBe(true);
  } finally {
    store.db.close();
  }
});

it("prepares chapters while the learner is still on the learning map", () => {
  const { store, service, session, id } = pendingCourse();
  try {
    service.mutate(session, id, (c) => service.prepare(c, "start"));
    expect(service.getCourse(session, id).chapters.start.status).toBe("queued");
  } finally {
    store.db.close();
  }
});

it("does not move the learner through the course before they start", () => {
  const { store, service, session, id } = pendingCourse();
  try {
    expect(() => service.advance(session, id)).toThrow(/開始學習/);
    expect(() => service.jumpTo(session, id, "next")).toThrow(/開始學習/);
    expect(service.getCourse(session, id).currentNodeId).toBe("start");
  } finally {
    store.db.close();
  }
});

it("opens on the learning map with the route, the outcome and the limitation", () => {
  const { store, service, session, id } = pendingCourse();
  try {
    const html = renderToStaticMarkup(
      createElement(CoursePlayer, {
        course: service.getCourse(session, id),
        onChange() {},
        onError() {},
        onHome() {},
        themeControl: null,
      }),
    );
    expect(html).toContain("Navigate and create virtual directories");
    expect(html).toContain(
      "Package installation and real processes are unavailable.",
    );
    // Every planned chapter is on the map, as the numbered list used to show.
    expect(html).toContain("Directories");
    expect(html).toContain("Navigation");
    expect(html).toContain("等等再學");
    expect(html).not.toContain("正在準備章節");
  } finally {
    store.db.close();
  }
});

it("waits for the first chapter before offering to start", () => {
  const { store, service, session, id } = pendingCourse();
  const render = () =>
    renderToStaticMarkup(
      createElement(CoursePlayer, {
        course: service.getCourse(session, id),
        onChange() {},
        onError() {},
        onHome() {},
        themeControl: null,
      }),
    );
  try {
    service.mutate(session, id, (c) => service.prepare(c, "start"));
    expect(render()).toContain("正在準備第 1 章…");
    service.mutate(session, id, (c) => {
      const pkg = store.getPackage(c.chapterIds.start)!;
      pkg.status = "ready";
      store.putPackage(c.id, pkg);
    });
    expect(render()).toContain("開始學習");
  } finally {
    store.db.close();
  }
});

it("previews and confirms a manually requested support topic in a v2 course", async () => {
  const { store, service, session, id } = pendingCourse();
  vi.spyOn(database, "getStore").mockReturnValue(store);
  try {
    service.acceptScope(session, id);
    const original = service.getCourse(session, id);
    const response = await POST(
      new NextRequest("http://localhost:3000/api/branches/preview", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          cookie: `methelia_session=${session}`,
        },
        body: JSON.stringify({
          courseId: id,
          topic: "How directories relate",
          baseRevision: original.revision,
          afterId: "start",
        }),
      }),
    );
    expect(response.status).toBe(200);
    const preview = await response.json();
    expect(preview.nodes[0].environment).toBe("none");
    const confirmed = service.confirmBranch(
      session,
      id,
      preview.id,
      preview.baseRevision,
    );
    expect(confirmed.graph!.nodes).toHaveLength(3);
    expect(confirmed.chapterIds.start).toBe(original.chapterIds.start);
  } finally {
    store.db.close();
  }
});
