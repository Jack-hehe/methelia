import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
import { generateIntakeQuestion } from "../src/server/model";
import {
  validateIntakeQuestion,
  type IntakeField,
} from "../src/core/intake-question";

let store: Store, service: LearningService, session: string;
const question = (field: IntakeField = "experience") => ({
  field,
  title: field === "experience" ? "How have you used Linux paths?" : `What ${field} should this Linux course address?`,
  description: "Choose your starting point.",
  options: [
    "Never used paths",
    "Navigated folders",
    "Written shell scripts",
  ].map((value) => ({ value, label: value, description: "" })),
  placeholder: "Describe your experience",
});
const reply = (value: unknown) =>
  Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });
beforeEach(() => {
  store = new Store(":memory:");
  service = new LearningService(store);
  session = service.session();
  vi.stubEnv("AI_BASE_URL", "https://model.test/v1");
  vi.stubEnv("AI_API_KEY", "test");
  vi.stubEnv("AI_MODEL", "test");
  vi.stubEnv("METHELIA_AI_DAILY_REQUESTS", "");
  vi.stubEnv("RENDER", "false");
});
afterEach(() => {
  store.db.close();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const course = () =>
  service.createCourse(session, "Linux paths", "live", "intake", "en", true);
it("passes previous questions and repairs a repeated question before showing it", async () => {
  const c = course();
  vi.stubGlobal("fetch", async () => reply(question()));
  await service.generateIntakeQuestion(session, c.id, "experience", 0);
  service.saveIntake(session, c.id, { experience: "Never used paths" }, 0, false);
  let calls = 0;
  vi.stubGlobal("fetch", async (_url: unknown, options: RequestInit) => {
    const input = JSON.parse(JSON.parse(String(options.body)).messages[1].content).input;
    expect(input.previousQuestions).toEqual([question()]);
    calls++;
    return reply(calls === 1
      ? { ...question("purpose"), title: question().title }
      : question("purpose"));
  });
  const result = await service.generateIntakeQuestion(session, c.id, "purpose", 1);
  expect(calls).toBe(2);
  expect(result.title).toBe(question("purpose").title);
});
it("deduplicates concurrent generation across service instances and persists a reload cache without revision or jobs", async () => {
  const fetch = vi.fn(async () => reply(question()));
  vi.stubGlobal("fetch", fetch);
  const c = course();
  const results = await Promise.all([
    service.generateIntakeQuestion(session, c.id, "experience", 0),
    new LearningService(store).generateIntakeQuestion(
      session,
      c.id,
      "experience",
      0,
    ),
  ]);
  expect(results[0]).toEqual(results[1]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(
    await service.generateIntakeQuestion(session, c.id, "experience", 0),
  ).toEqual(question());
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(service.getCourse(session, c.id).intake?.revision).toBe(0);
  expect(
    store.db.prepare("SELECT count(*) AS n FROM generation_jobs").get(),
  ).toEqual({ n: 0 });
});
it("rejects ownership, revision and prerequisite violations before spending generation", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const c = course();
  await expect(
    service.generateIntakeQuestion(service.session(), c.id, "experience", 0),
  ).rejects.toThrow(/not found/);
  await expect(
    service.generateIntakeQuestion(session, c.id, "experience", 3),
  ).rejects.toThrow(/conflict/);
  await expect(
    service.generateIntakeQuestion(session, c.id, "purpose", 0),
  ).rejects.toThrow(/前面/);
  expect(fetch).not.toHaveBeenCalled();
});
it("discards stale in-flight output and allows retry after a generation failure", async () => {
  let resolve!: (value: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    ),
  );
  const c = course();
  const pending = service.generateIntakeQuestion(
    session,
    c.id,
    "experience",
    0,
  );
  service.saveIntake(session, c.id, { experience: "Known" }, 0, false);
  resolve(reply(question()));
  await expect(pending).rejects.toThrow(/conflict/);
  expect(service.getCourse(session, c.id).intake?.questions).toBeUndefined();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValue(reply(question())),
  );
  await expect(
    service.generateIntakeQuestion(session, c.id, "experience", 1),
  ).rejects.toThrow("Unavailable");
  expect(
    await service.generateIntakeQuestion(session, c.id, "experience", 1),
  ).toEqual(question());
});
it("invalidates dependent saved answers and questions while preserving explicit patch answers", async () => {
  vi.stubGlobal("fetch", async () => reply(question()));
  const c = course();
  await service.generateIntakeQuestion(session, c.id, "experience", 0);
  service.saveIntake(
    session,
    c.id,
    {
      experience: "Beginner",
      purpose: "Work",
      priorKnowledge: "None",
      depth: "foundation",
      studyPlan: "Short",
    },
    0,
    false,
  );
  vi.stubGlobal("fetch", async () => reply(question("purpose")));
  await service.generateIntakeQuestion(session, c.id, "purpose", 1);
  const changed = service.saveIntake(
    session,
    c.id,
    { experience: "Experienced", purpose: "Research" },
    1,
    false,
  );
  expect(changed.intake?.answers).toEqual({
    experience: "Experienced",
    purpose: "Research",
  });
  expect(changed.intake?.questions?.experience).toBeDefined();
  expect(changed.intake?.questions?.purpose).toBeUndefined();
});
it("uses saved context and bounded model output; invalid output fails rather than providing generic questions", async () => {
  const fetch = vi.fn(async (_url: unknown, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    expect(body.max_tokens).toBe(1200);
    expect(JSON.parse(body.messages[1].content).input).toMatchObject({
      task: "intake-question",
      field: "purpose",
      goal: "Linear algebra",
      language: "en",
      answers: { experience: "Matrices" },
      multiple: true,
      optional: false,
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    return reply(question("experience"));
  });
  vi.stubGlobal("fetch", fetch);
  await expect(
    generateIntakeQuestion("Linear algebra", "en", "purpose", {
      experience: "Matrices",
    }),
  ).rejects.toThrow(/重試/);
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("requires distinct meaningful options and canonical depth choices", () => {
  expect(() =>
    validateIntakeQuestion(
      { ...question(), options: Array(3).fill(question().options[0]) },
      "experience",
    ),
  ).toThrow(/distinct/);
  expect(() => validateIntakeQuestion(question("depth"), "depth")).toThrow(
    /Depth/,
  );
  const q = {
    ...question("depth"),
    options: ["foundation", "applied", "advanced"].map((value) => ({
      value,
      label: `Math ${value}`,
      description: "",
    })),
  };
  expect(validateIntakeQuestion(q, "depth")).toEqual(q);
});

it("cancels only an owned intake at the current revision and rejects late generated output", async () => {
  const c = course();
  let finish!: (value: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    ),
  );
  const pending = service.generateIntakeQuestion(
    session,
    c.id,
    "experience",
    0,
  );
  expect(() => service.deleteCourse(service.session(), c.id, 0)).toThrow();
  expect(() => service.deleteCourse(session, c.id, 1)).toThrow(/conflict/);
  expect(service.deleteCourse(session, c.id, 0)).toEqual({ deleted: true });
  finish(reply(question()));
  await expect(pending).rejects.toThrow(/not found/);
  expect(service.latest(session)).toBeNull();
  const other = course();
  service.store.transaction(() => {
    const saved = service.store.getCourse(other.id)!;
    saved.status = "planning";
    service.store.putCourse(saved);
  });
  expect(() => service.deleteCourse(session, other.id, 0)).toThrow(/conflict/);
});
