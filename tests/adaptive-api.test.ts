import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
import { POST, PUT } from "../src/app/api/[...path]/route";

const state = vi.hoisted(() => ({
  store: null as Store | null,
  extension: vi.fn(),
  intakeQuestion: vi.fn(),
}));
vi.mock("../src/server/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/server/db")>()),
  getStore: () => state.store!,
}));
vi.mock("../src/server/model", () => ({
  modelConfigured: () => true,
  generateExtension: state.extension,
  generateHelp: vi.fn(),
  generateIntakeQuestion: state.intakeQuestion,
}));
let service: LearningService, session: string;
beforeEach(() => {
  state.store = new Store(":memory:");
  service = new LearningService(state.store);
  session = service.session();
  state.extension.mockReset();
  state.intakeQuestion.mockReset();
  vi.stubEnv("METHELIA_DEMO_PASSWORD", "");
  vi.stubEnv("RENDER", "false");
  vi.stubEnv("METHELIA_ALLOWED_ORIGINS", "");
  vi.stubEnv("RENDER_EXTERNAL_URL", "");
  vi.stubEnv("AI_API_KEY", "test");
  vi.stubEnv("AI_BASE_URL", "https://model.test/v1");
  vi.stubEnv("AI_MODEL", "test");
});
afterEach(() => {
  state.store!.db.close();
  vi.unstubAllEnvs();
});
async function request(
  path: string,
  body: unknown,
  method = "POST",
  cookie = session,
) {
  return (method === "PUT" ? PUT : POST)(
    new NextRequest(`http://localhost/api/${path}`, {
      method,
      headers: {
        host: "localhost",
        origin: "http://localhost",
        cookie: `methelia_session=${cookie}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
}
it("creates live courses in intake and separates saved answers from finalization", async () => {
  const response = await request("courses", {
    goal: "Linux",
    mode: "live",
    requestId: "new",
  });
  expect(response.status).toBe(200);
  const c = await response.json();
  expect(c.status).toBe("intake");
  expect(
    state.store!.db.prepare("SELECT count(*) as n FROM generation_jobs").get(),
  ).toMatchObject({ n: 0 });
  const profile = {
    experience: "None",
    purpose: "Files",
    priorKnowledge: "None",
    depth: "foundation",
    studyPlan: "Examples",
  };
  const saved = await request(
    `courses/${c.id}/intake`,
    { answers: profile, baseRevision: 0 },
    "PUT",
  );
  expect((await saved.json()).status).toBe("intake");
  const finalized = await request(`courses/${c.id}/intake`, {
    answers: profile,
    baseRevision: 1,
  });
  expect((await finalized.json()).status).toBe("planning");
  expect(
    state.store!.db.prepare("SELECT count(*) as n FROM generation_jobs").get(),
  ).toMatchObject({ n: 1 });
});
it("rejects foreign and stale extension requests before invoking the planner", async () => {
  const c = service.createCourse(session, "demo", "demo", "ready");
  service.mutate(session, c.id, (c) => {
    c.mode = "live";
    c.learningVersion = 1;
  });
  const body = {
    courseId: c.id,
    topic: "Nested structure",
    depth: "applied",
    afterId: c.currentNodeId,
    baseRevision: c.revision,
  };
  expect(
    (await request("extensions/preview", body, "POST", service.session()))
      .status,
  ).toBe(404);
  expect(
    (await request("extensions/preview", { ...body, baseRevision: 999 }))
      .status,
  ).toBe(409);
  expect(state.extension).not.toHaveBeenCalled();
});
it("rechecks revision after planning so a delayed response cannot save stale extension state", async () => {
  const c = service.createCourse(session, "demo", "demo", "race");
  service.mutate(session, c.id, (c) => {
    c.mode = "live";
    c.learningVersion = 1;
  });
  state.extension.mockImplementation(async () => {
    service.mutate(session, c.id, (c) => {
      c.revision++;
    });
    return {
      title: "Nested structure",
      reason: "Explore the anchor concept.",
      nodes: [
        {
          id: "support-extra-42",
          title: "Nesting",
          objective: "Explain nesting",
          kind: "support",
          minutes: 5,
          prerequisites: [c.currentNodeId],
          environment: "none",
          depth: "applied",
          summary: "Nested structures",
          keyConcepts: ["Nesting"],
          misconceptions: [],
          assessment: "Identify nested elements",
        },
      ],
    };
  });
  const response = await request("extensions/preview", {
    courseId: c.id,
    topic: "Nested structure",
    depth: "applied",
    afterId: c.currentNodeId,
    baseRevision: c.revision,
  });
  expect(state.extension).toHaveBeenCalledOnce();
  expect(response.status).toBe(409);
  expect(service.getCourse(session, c.id).preview).toBeNull();
});
it("persists personal notes with conflict protection through the API", async () => {
  const c = service.createCourse(session, "demo", "demo", "note");
  const response = await request(
    `courses/${c.id}/notes/${c.currentNodeId}`,
    { personal: "My own explanation", baseRevision: 0 },
    "PUT",
  );
  expect(response.status).toBe(200);
  expect(
    service.getCourse(session, c.id).notes?.[c.currentNodeId].personal,
  ).toBe("My own explanation");
  expect(
    (
      await request(
        `courses/${c.id}/notes/${c.currentNodeId}`,
        { personal: "stale", baseRevision: 0 },
        "PUT",
      )
    ).status,
  ).toBe(409);
});
it("generates and caches authorized intake questions with strict request validation", async () => {
  const c = service.createCourse(
    session,
    "Linux",
    "live",
    "questions",
    "en",
    true,
  );
  const question = {
    field: "experience",
    title: "Used Linux paths?",
    description: "",
    placeholder: "Your experience",
    options: ["Never", "Folders", "Scripts"].map((value) => ({
      value,
      label: value,
      description: "",
    })),
  };
  state.intakeQuestion.mockResolvedValue(question);
  const path = `courses/${c.id}/intake/question`;
  const body = { field: "experience", baseRevision: 0 };
  expect((await request(path, body, "POST", service.session())).status).toBe(
    404,
  );
  expect((await request(path, { ...body, baseRevision: 1 })).status).toBe(409);
  expect((await request(path, { ...body, field: "unknown" })).status).toBe(400);
  expect(
    (await request(path, { ...body, answers: { experience: "unsaved" } }))
      .status,
  ).toBe(400);
  expect((await request(path, { ...body, field: "purpose" })).status).toBe(400);
  expect(state.intakeQuestion).not.toHaveBeenCalled();
  expect(await (await request(path, body)).json()).toEqual({ question });
  expect(await (await request(path, body)).json()).toEqual({ question });
  expect(state.intakeQuestion).toHaveBeenCalledTimes(1);
  expect(service.getCourse(session, c.id).intake?.revision).toBe(0);
});

it("cancels intake through the API while preserving other courses", async () => {
  const keep = service.createCourse(session, "Existing course", "demo", "keep");
  const draft = service.createCourse(
    session,
    "Linux",
    "live",
    "cancel",
    "zh-TW",
    true,
  );
  const path = `courses/${draft.id}/intake/cancel`;
  expect((await request(path, { baseRevision: 1 })).status).toBe(409);
  expect(
    (await request(path, { baseRevision: 0 }, "POST", service.session()))
      .status,
  ).toBe(404);
  const response = await request(path, { baseRevision: 0 });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ deleted: true });
  expect(service.listCourses(session).map((c) => c.id)).toEqual([keep.id]);
});
