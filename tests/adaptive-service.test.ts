import { afterEach, expect, it, vi } from "vitest";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
import type { LearnerProfile } from "../src/core/state";
const profile: LearnerProfile = {
  experience: "第一次",
  purpose: "工作",
  priorKnowledge: "沒有",
  depth: "foundation",
  studyPlan: "每天20分鐘，從例子開始",
};
afterEach(() => vi.unstubAllEnvs());
it("persists intake without enqueuing content; finalization is atomic and repeatable", () => {
  vi.stubEnv("AI_BASE_URL", "http://127.0.0.1:1");
  vi.stubEnv("AI_API_KEY", "test");
  vi.stubEnv("AI_MODEL", "test");
  const store = new Store(":memory:");
  const service = new LearningService(store);
  const session = service.session();
  try {
    const c = service.createCourse(
      session,
      "Linux",
      "live",
      "intake",
      "zh-TW",
      true,
    );
    expect(c.status).toBe("intake");
    expect(
      store.db.prepare("SELECT count(*) as n FROM generation_jobs").get(),
    ).toMatchObject({ n: 0 });
    const draft = service.saveIntake(
      session,
      c.id,
      { experience: "第一次" },
      0,
      false,
    );
    expect(service.getCourse(session, c.id).intake?.answers.experience).toBe(
      "第一次",
    );
    expect(() =>
      service.saveIntake(session, c.id, { purpose: "new" }, 0, false),
    ).toThrow(/conflict/i);
    expect(() =>
      service.saveIntake(service.session(), c.id, profile, 1, true),
    ).toThrow(/not found/i);
    const ready = service.saveIntake(
      session,
      c.id,
      profile,
      draft.intake!.revision,
      true,
    );
    expect(ready.status).toBe("planning");
    expect(
      service.saveIntake(session, c.id, profile, draft.intake!.revision, true)
        .id,
    ).toBe(c.id);
    expect(
      store.db.prepare("SELECT count(*) as n FROM generation_jobs").get(),
    ).toMatchObject({ n: 1 });
  } finally {
    store.db.close();
  }
});
it("preserves main workspace and resumes an independent extension with revision guards", () => {
  const store = new Store(":memory:");
  const s = new LearningService(store);
  const session = s.session();
  try {
    const c = s.createCourse(session, "demo", "demo", "extension");
    const mainEdges = structuredClone(c.graph!.edges);
    const node = {
      ...c.graph!.nodes[0],
      id: "semantic-extension",
      title: "語意標籤延伸",
      objective: "辨識語意標籤的用途",
      kind: "support" as const,
    };
    const p = s.previewExtension(session, c.id, [node], {
      title: node.title,
      depth: "applied",
      reason: "練習語意",
      afterId: "web",
      baseRevision: c.revision,
      returnNodeId: "web",
    });
    s.saveWorkspace(
      session,
      c.id,
      { ...c.workspace.files, "/main.txt": "main work" },
      c.workspace.revision,
    );
    const entered = s.confirmExtension(session, c.id, p.id, c.revision, true);
    expect(entered.graph!.edges).toEqual(mainEdges);
    expect(entered.currentNodeId).toBe(node.id);
    expect(entered.workspace.files["/main.txt"]).toBeUndefined();
    expect(() =>
      s.saveWorkspace(
        session,
        c.id,
        { "/lost.txt": "stale" },
        c.workspace.revision,
      ),
    ).toThrow();
    const edited = s.saveWorkspace(
      session,
      c.id,
      { ...entered.workspace.files, "/extension.txt": "extension work" },
      entered.workspace.revision,
    );
    const back = s.leaveExtension(session, c.id);
    expect(back.currentNodeId).toBe("web");
    expect(back.workspace.files["/main.txt"]).toBe("main work");
    expect(back.workspace.files["/extension.txt"]).toBeUndefined();
    expect(back.workspace.revision).toBeGreaterThan(edited.revision);
    expect(
      s.enterExtension(session, c.id, p.extension!.id).workspace.files[
        "/extension.txt"
      ],
    ).toBe("extension work");
    expect(() => s.advance(session, c.id, "web")).toThrow(/conflict/i);
    expect(() => s.check(session, c.id, "check", 1, "web")).toThrow(
      /conflict/i,
    );
  } finally {
    store.db.close();
  }
});
it("keeps actual node questions after conversation trimming and delayed responses", () => {
  const store = new Store(":memory:");
  const s = new LearningService(store);
  const session = s.session();
  try {
    const c = s.createCourse(session, "demo", "demo", "questions");
    s.appendMessages(session, c.id, [
      { id: "q", role: "user", text: "為什麼用 CSS？", nodeId: "web" },
    ]);
    s.mutate(session, c.id, (c) => {
      c.currentNodeId = "html";
    });
    s.appendMessages(
      session,
      c.id,
      Array.from({ length: 101 }, (_, i) => ({
        id: `m${i}`,
        role: "assistant" as const,
        text: "answer",
        nodeId: "html",
      })),
    );
    s.appendMessages(session, c.id, [
      { id: "late", role: "user", text: "HTML 又是什麼？", nodeId: "web" },
    ]);
    expect(s.getCourse(session, c.id).notes!.web.questions).toEqual([
      "為什麼用 CSS？",
      "HTML 又是什麼？",
    ]);
  } finally {
    store.db.close();
  }
});
it("applies or declines evidence-based difficulty only when advancing to an ungenerated chapter", () => {
  const store = new Store(":memory:");
  const s = new LearningService(store);
  const session = s.session();
  try {
    const initial = s.createCourse(session, "demo", "demo", "adaptive");
    s.mutate(session, initial.id, (c) => {
      c.learningVersion = 1;
      c.learnerProfile = profile;
      c.chapterIds = { web: c.chapterIds.web };
      const pkg = store.getPackage(c.chapterIds.web)!;
      const quiz = pkg.chapter!.sections.find((s) => s.id === "check")!;
      pkg.chapter!.sections = [
        quiz,
        { ...structuredClone(quiz), id: "second" },
      ];
      store.putPackage(c.id, pkg);
    });
    s.check(session, initial.id, "check", 1, "web");
    s.check(session, initial.id, "second", 1, "web");
    const recommended = s.getCourse(session, initial.id);
    expect(recommended.adjustments).toHaveLength(1);
    expect(recommended.chapters.html).toBeUndefined();
    const a = recommended.adjustments![0];
    expect(a.depth).toBe("applied");
    s.keepDifficulty(session, initial.id, a.id, true);
    expect(s.getCourse(session, initial.id).adjustments![0].reverted).toBe(
      true,
    );
    s.keepDifficulty(session, initial.id, a.id, false);
    const next = s.advance(session, initial.id, "web");
    expect(next.graph!.nodes.find((n) => n.id === "html")!.depth).toBe(
      "applied",
    );
    expect(
      next.graph!.nodes.find((n) => n.id === "web")!.depth,
    ).toBeUndefined();
    expect(Object.keys(next.chapters)).toEqual(["web", "html"]);
    expect(() => s.keepDifficulty(session, initial.id, a.id, true)).toThrow(
      /conflict/i,
    );
  } finally {
    store.db.close();
  }
});
it("new courses do not prefetch and record failed attempts without overwriting personal notes", () => {
  const store = new Store(":memory:");
  const s = new LearningService(store);
  const session = s.session();
  try {
    const c = s.createCourse(session, "demo", "demo", "notes");
    s.mutate(session, c.id, (c) => {
      c.learningVersion = 1;
      c.chapterIds = { web: c.chapterIds.web };
      s.prefetch(c);
    });
    expect(Object.keys(s.getCourse(session, c.id).chapters)).toEqual(["web"]);
    s.check(session, c.id, "check", 0);
    expect(s.getCourse(session, c.id).attempts?.[0].passed).toBe(false);
    const n = s.getCourse(session, c.id).notes!.web;
    s.saveNote(session, c.id, "web", "我原本混淆內容與樣式", n.revision);
    s.check(session, c.id, "check", 1);
    expect(s.getCourse(session, c.id).notes!.web.personal).toBe(
      "我原本混淆內容與樣式",
    );
    expect(
      s.getCourse(session, c.id).notes!.web.checkpoints[0].firstPassed,
    ).toBe(false);
  } finally {
    store.db.close();
  }
});
