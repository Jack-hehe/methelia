import { expect, it, vi, beforeEach, afterEach } from "vitest";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
import { validateGraph } from "../src/core/protocol";
import { addExtension } from "../src/core/graph";
beforeEach(() => {
  vi.stubEnv("AI_BASE_URL", "https://model.test/v1");
  vi.stubEnv("AI_MODEL", "test-model");
  vi.stubEnv("AI_API_KEY", "test-key");
});
afterEach(() => vi.unstubAllEnvs());

function course(store: Store, service: LearningService) {
  const session = service.session();
  const snapshot = service.createCourse(
    session,
    "Learn Python",
    "live",
    "jump",
    "en",
    true,
  );
  const c = store.getCourse(snapshot.id)!;
  c.status = "ready";
  c.graph = validateGraph({
    schemaVersion: 2,
    title: "Python",
    outcome: "Write a small script",
    nodes: ["a", "b", "c"].map((id, i) => ({
      id,
      title: `Chapter ${id}`,
      objective: `Objective ${id}`,
      minutes: 5,
      kind: "main",
      prerequisites: i ? [["a", "b"][i - 1]] : [],
      environment: "none",
    })),
    edges: [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ],
  });
  c.currentNodeId = "a";
  c.completed = [];
  c.chapterIds = {};
  c.scopeAccepted = true;
  store.putCourse(c);
  return { session, id: c.id };
}

it("moves the learning position ahead without marking the skipped chapters done", () => {
  const store = new Store(":memory:");
  try {
    const service = new LearningService(store);
    const { session, id } = course(store, service);
    expect(store.getCourse(id)?.learningVersion).toBe(1);
    const after = service.jumpTo(session, id, "c");
    expect(after.currentNodeId).toBe("c");
    expect(after.completed).toEqual([]);
    // The target chapter is queued for preparation, so it is reachable.
    expect(Object.keys(after.chapterIds)).toContain("c");
  } finally {
    store.db.close();
  }
});

it("rejects direct jumps into extensions without changing the main workspace", () => {
  const store = new Store(":memory:");
  try {
    const service = new LearningService(store);
    const { session, id } = course(store, service);
    const c = store.getCourse(id)!;
    c.graph = addExtension(
      c.graph!,
      "a",
      [
        {
          id: "support-extra",
          title: "Extra",
          objective: "Explore extra concepts",
          minutes: 5,
          kind: "support",
          prerequisites: ["a"],
          environment: "none",
        },
      ],
      { id: "extension-extra", title: "Extra concepts", depth: "foundation" },
    );
    store.putCourse(c);
    expect(() => service.jumpTo(session, id, "support-extra")).toThrow(/延伸/);
    const after = store.getCourse(id)!;
    expect(after.currentNodeId).toBe("a");
    expect(after.workspace).toEqual(c.workspace);
    expect(after.extensionSession).toBeUndefined();
    expect(after.chapterIds["support-extra"]).toBeUndefined();
  } finally {
    store.db.close();
  }
});

it("lets the learner jump back to a chapter they skipped over", () => {
  const store = new Store(":memory:");
  try {
    const service = new LearningService(store);
    const { session, id } = course(store, service);
    service.jumpTo(session, id, "c");
    const back = service.jumpTo(session, id, "b");
    expect(back.currentNodeId).toBe("b");
    expect(back.completed).toEqual([]);
  } finally {
    store.db.close();
  }
});

it("refuses to jump out of an extension session or to an unknown chapter", () => {
  const store = new Store(":memory:");
  try {
    const service = new LearningService(store);
    const { session, id } = course(store, service);
    expect(() => service.jumpTo(session, id, "nope")).toThrow(/Node not found/);
    const c = store.getCourse(id)!;
    c.extensionSession = {
      extensionId: "ext",
      returnNodeId: "a",
      mainWorkspace: c.workspace,
    };
    store.putCourse(c);
    expect(() => service.jumpTo(session, id, "c")).toThrow(/延伸/);
  } finally {
    store.db.close();
  }
});
