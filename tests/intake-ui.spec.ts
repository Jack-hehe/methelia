import { expect, test } from "./fixtures/course-test";
import type { Snapshot } from "../src/core/state";
import { emptyWorkspace } from "../src/core/workspace";

function draftCourse(): Snapshot {
  return {
    id: "intake-ui",
    goal: "學會 Linux 管理伺服器",
    language: "zh-TW",
    mode: "live",
    status: "intake",
    intake: { answers: {}, revision: 0 },
    graph: null,
    revision: 0,
    currentNodeId: "",
    completed: [],
    chapterIds: {},
    chapters: {},
    progress: {},
    workspace: emptyWorkspace(),
    messages: [],
    preview: null,
    confirmed: {},
    createdAt: 0,
  };
}

test("intake restores a saved draft and only arranges a course after all five answers", async ({
  page,
}) => {
  let course = draftCourse();
  let finalized = false;
  await page.route("**/api/sessions", (route) =>
    route.fulfill({ json: { course } }),
  );
  await page.route("**/api/courses/intake-ui", (route) =>
    route.fulfill({ json: course }),
  );
  await page.route("**/api/courses/intake-ui/intake", async (route) => {
    const body = route.request().postDataJSON();
    if (body.baseRevision !== course.intake!.revision) {
      await route.fulfill({ status: 409, json: { error: "草稿已更新" } });
      return;
    }
    finalized = route.request().method() === "POST";
    course = {
      ...course,
      intake: { answers: body.answers, revision: course.intake!.revision + 1 },
      status: finalized ? "planning" : "intake",
    };
    await route.fulfill({ json: course });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "正在安排你的學習路徑" }),
  ).toBeVisible();
  await expect(page.getByRole("group")).toHaveCount(5);
  await expect(
    page.getByRole("button", { name: "開始安排課程" }),
  ).toBeDisabled();
  await page.getByLabel("經驗補充").fill("用過基本指令，但不熟悉權限");
  // Reload before saving: editing itself must preserve a local draft.
  await page.reload();
  await expect(page.getByLabel("經驗補充")).toHaveValue(
    "用過基本指令，但不熟悉權限",
  );
  expect(course.intake?.answers).toEqual({});
  expect(finalized).toBe(false);
  await page.getByRole("button", { name: "儲存回答" }).click();
  await expect(page.getByRole("status")).toContainText("已儲存");
  await page.reload();
  await expect(page.getByLabel("經驗補充")).toHaveValue(
    "用過基本指令，但不熟悉權限",
  );
  expect(finalized).toBe(false);
  await page.getByLabel("目的補充").fill("管理自己的伺服器");
  await page.getByLabel("已會與卡點補充").fill("會切換目錄，不理解檔案權限");
  await page.getByRole("radio", { name: "能獨立完成實際任務" }).check();
  await page.getByLabel("時間與方式補充").fill("每次 20 分鐘，先從情境開始");
  await page.getByRole("button", { name: "開始安排課程" }).click();
  await expect(page.getByRole("group")).toHaveCount(0);
  expect(finalized).toBe(true);
  expect(course.intake?.answers).toEqual({
    experience: "用過基本指令，但不熟悉權限",
    purpose: "管理自己的伺服器",
    priorKnowledge: "會切換目錄，不理解檔案權限",
    depth: "applied",
    studyPlan: "每次 20 分鐘，先從情境開始",
  });
});

test("a newer server draft takes precedence over stale unsaved local answers", async ({
  page,
}) => {
  const course = draftCourse();
  await page.route("**/api/sessions", (route) =>
    route.fulfill({ json: { course } }),
  );
  await page.route("**/api/courses/intake-ui", (route) =>
    route.fulfill({ json: course }),
  );
  await page.goto("/");
  await page.getByLabel("經驗補充").fill("Older unsaved local answer");
  course.intake = {
    answers: { experience: "Newer answer saved from another tab" },
    revision: 2,
  };
  await page.reload();
  await expect(page.getByLabel("經驗補充")).toHaveValue(
    "Newer answer saved from another tab",
  );
  await expect(
    page.getByRole("button", { name: "儲存回答", exact: true }),
  ).toBeDisabled();
});

test("mobile intake preserves answers after a save failure and supports uncertain answers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let course = draftCourse();
  let failSave = true;
  await page.route("**/api/sessions", (route) =>
    route.fulfill({ json: { course: null } }),
  );
  await page.route("**/api/courses", (route) =>
    route.fulfill({ json: course }),
  );
  await page.route("**/api/courses/intake-ui", (route) =>
    route.fulfill({ json: course }),
  );
  await page.route("**/api/courses/intake-ui/intake", async (route) => {
    if (failSave) {
      failSave = false;
      await route.fulfill({
        status: 503,
        json: { error: "暫時無法儲存，請再試一次" },
      });
      return;
    }
    const body = route.request().postDataJSON();
    course = { ...course, intake: { answers: body.answers, revision: 1 } };
    await route.fulfill({ json: course });
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "你想學什麼？" })
    .fill("學會 Linux 管理伺服器");
  await page.getByRole("button", { name: "開始學習", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "正在安排你的學習路徑" }),
  ).toBeVisible();
  for (const group of [0, 1, 2]) {
    await page
      .getByRole("group")
      .nth(group)
      .getByRole("radio", { name: "不確定", exact: true })
      .check();
  }
  await page.getByRole("button", { name: "不確定，先從基礎開始" }).click();
  await page.getByRole("radio", { name: "不確定，先從簡短實例開始" }).check();
  await expect(
    page.getByRole("button", { name: "開始安排課程" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "儲存回答", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "暫時無法儲存" }),
  ).toBeVisible();
  await expect(page.getByLabel("經驗補充")).toHaveValue("不確定");
  await expect(page.getByRole("radio", { name: "建立基礎理解" })).toBeChecked();
  await page.getByRole("button", { name: "儲存回答", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已儲存");
  await expect(
    page.getByRole("alert").filter({ hasText: "暫時無法儲存" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/intake-mobile.png",
    fullPage: true,
  });
});
