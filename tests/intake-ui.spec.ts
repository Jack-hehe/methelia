import { expect, test, type Page } from "./fixtures/course-test";
import type { Snapshot } from "../src/core/state";
import { emptyWorkspace } from "../src/core/workspace";
import { intakeFields, type IntakeField } from "../src/core/intake-question";
import { fixtureIntakeQuestion } from "./fixtures/intake-question";
import { answerIntake } from "./fixtures/intake-browser";

function draftCourse(goal = "學會 Linux 管理伺服器"): Snapshot {
  return {
    id: "intake-ui",
    goal,
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
async function mockIntake(page: Page, goal?: string) {
  const state = {
    course: draftCourse(goal),
    finalized: false,
    failQuestion: false,
    failSave: false,
    requested: [] as IntakeField[],
  };
  await page.route("**/api/sessions", (route) =>
    route.fulfill({ json: { course: state.course } }),
  );
  await page.route("**/api/courses/intake-ui", (route) =>
    route.fulfill({ json: state.course }),
  );
  await page.route(
    "**/api/courses/intake-ui/intake/question",
    async (route) => {
      const { field } = route.request().postDataJSON();
      state.requested.push(field);
      if (state.failQuestion) {
        await route.fulfill({
          status: 503,
          json: { error: "問題暫時無法產生" },
        });
        return;
      }
      await route.fulfill({
        json: {
          question: fixtureIntakeQuestion(
            state.course.goal,
            field,
            state.course.intake!.answers,
          ),
        },
      });
    },
  );
  await page.route("**/api/courses/intake-ui/intake", async (route) => {
    if (state.failSave) {
      state.failSave = false;
      await route.fulfill({ status: 503, json: { error: "暫時無法儲存" } });
      return;
    }
    const body = route.request().postDataJSON();
    if (body.baseRevision !== state.course.intake!.revision) {
      await route.fulfill({ status: 409, json: { error: "草稿已更新" } });
      return;
    }
    const answers = { ...state.course.intake!.answers };
    for (const field of intakeFields)
      if (field in body.answers) {
        if (answers[field] !== body.answers[field])
          for (const later of intakeFields.slice(
            intakeFields.indexOf(field) + 1,
          ))
            delete answers[later];
        Object.assign(answers, { [field]: body.answers[field] });
      }
    state.finalized = route.request().method() === "POST";
    state.course = {
      ...state.course,
      intake: { answers, revision: state.course.intake!.revision + 1 },
      status: state.finalized ? "planning" : "intake",
    };
    await route.fulfill({ json: state.course });
  });
  return state;
}

test("single cards preserve drafts, adapt to prior answers and finalize only at the end", async ({
  page,
}) => {
  const state = await mockIntake(page);
  await page.goto("/");
  await expect(page.getByRole("radiogroup")).toHaveCount(1);
  await expect(
    page.getByRole("radio", { name: "還沒用過終端機" }),
  ).toBeVisible();
  await page
    .getByLabel("補充你的回答", { exact: true })
    .fill("用過基本指令，但不熟悉權限");
  await page.reload();
  await expect(page.getByLabel("補充你的回答", { exact: true })).toHaveValue(
    "用過基本指令，但不熟悉權限",
  );
  expect(state.course.intake!.answers).toEqual({});
  await page.getByRole("button", { name: "繼續", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "你最想用Linux完成什麼？" }),
  ).toBeVisible();
  await expect(page.locator("#intake-description")).toContainText(
    "用過基本指令，但不熟悉權限",
  );
  expect(state.finalized).toBe(false);
  await page
    .getByLabel("補充你的回答", { exact: true })
    .fill("管理自己的伺服器");
  await page.getByRole("button", { name: "繼續", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "學習Linux時，哪個部分最需要釐清？" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "上一題", exact: true }).click();
  await expect(page.getByLabel("補充你的回答", { exact: true })).toHaveValue(
    "管理自己的伺服器",
  );
  await page.getByRole("button", { name: "上一題", exact: true }).click();
  await page.getByLabel("補充你的回答", { exact: true }).fill("完全初學");
  await page.getByRole("button", { name: "繼續", exact: true }).click();
  await expect(page.getByLabel("補充你的回答", { exact: true })).toHaveValue(
    "",
  );
  expect(state.course.intake!.answers.purpose).toBeUndefined();
  await answerIntake(page);
  await expect(page.getByRole("radiogroup")).toHaveCount(0);
  expect(state.finalized).toBe(true);
  expect(state.course.intake!.answers.depth).toBe("applied");
});

test("math options differ from Linux; mobile generation and save failures are recoverable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await mockIntake(page, "用直覺理解數學");
  state.failQuestion = true;
  await page.goto("/");
  await expect(
    page.getByRole("alert").filter({ hasText: /暫時/ }),
  ).toContainText("問題暫時無法產生");
  state.failQuestion = false;
  await page.getByRole("button", { name: "重新整理問題", exact: true }).click();
  await page.getByRole("radio", { name: "只學過基礎代數" }).check();
  state.failSave = true;
  await page.getByRole("button", { name: "繼續", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: /暫時/ }),
  ).toContainText("暫時無法儲存");
  await expect(
    page.getByRole("radio", { name: "只學過基礎代數" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "繼續", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "用圖像直觀理解數學架構" }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "學會演算法與計算步驟" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/intake-mobile.png",
    animations: "disabled",
    fullPage: true,
  });
});

test("newer saved answers replace stale local drafts", async ({ page }) => {
  const state = await mockIntake(page);
  await page.goto("/");
  await page
    .getByLabel("補充你的回答", { exact: true })
    .fill("Older local answer");
  state.course.intake = {
    answers: { experience: "Newer server answer" },
    revision: 2,
  };
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "你最想用Linux完成什麼？" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "上一題", exact: true }).click();
  await expect(page.getByLabel("補充你的回答", { exact: true })).toHaveValue(
    "Newer server answer",
  );
});

test("shows genuine preparation before revealing a single question", async ({
  page,
}) => {
  await mockIntake(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/courses/intake-ui/intake/question",
    async (route) => {
      await held;
      await route.fallback();
    },
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "正在整理適合你的問題" }),
  ).toBeVisible();
  await expect(page.getByRole("radiogroup")).toHaveCount(0);
  const loading = await page
    .getByRole("heading", { name: "正在整理適合你的問題" })
    .boundingBox();
  expect(
    Math.abs(
      loading!.y + loading!.height / 2 - page.viewportSize()!.height / 2,
    ),
  ).toBeLessThan(100);
  await expect(page.locator("form")).toHaveCSS("border-top-width", "0px");
  await page.screenshot({
    path: "test-results/intake-loading-open.png",
    animations: "disabled",
  });
  release();
  await expect(page.getByRole("radiogroup")).toBeVisible();
  await page.screenshot({
    path: "test-results/intake-desktop.png",
    animations: "disabled",
    fullPage: true,
  });
});

test("multiple selections and skipped questions survive reload and finalize", async ({
  page,
}) => {
  const state = await mockIntake(page, "用直覺理解數學");
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "跳過", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("radio", { name: "只學過基礎代數" }).check();
  await page.getByRole("button", { name: "繼續", exact: true }).click();
  const first = page.getByRole("checkbox", { name: "用圖像直觀理解數學架構" });
  const second = page.getByRole("checkbox", { name: "學會演算法與計算步驟" });
  await first.check();
  await second.check();
  await first.uncheck();
  await first.check();
  await page.getByLabel("補充你的回答", { exact: true }).fill("想理解原因");
  await page.reload();
  await expect(first).toBeChecked();
  await expect(second).toBeChecked();
  await expect(page.getByLabel("補充你的回答", { exact: true })).toHaveValue(
    "想理解原因",
  );
  await page.getByRole("button", { name: "繼續", exact: true }).click();
  await page.getByRole("button", { name: "跳過", exact: true }).click();
  await expect(page.locator('input[name="depth"]')).toHaveCount(3);
  await page.reload();
  await page.locator('input[name="depth"][value="applied"]').check();
  await page.getByRole("button", { name: "繼續", exact: true }).click();
  await page.getByRole("button", { name: "跳過", exact: true }).click();
  await expect(page.locator("#intake-question")).toHaveCount(0);
  expect(state.finalized).toBe(true);
  expect(
    JSON.parse(state.course.intake!.answers.purpose!).selected,
  ).toHaveLength(2);
  expect(state.course.intake!.answers.priorKnowledge).toContain("Skipped");
  expect(state.course.intake!.answers.studyPlan).toContain("Skipped");
});

for (const size of [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 1366, height: 768 },
]) {
  test(`five choices fit the viewport at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await mockIntake(page);
    await page.route("**/api/courses/intake-ui/intake/question", (route) => {
      const question = fixtureIntakeQuestion("Linux", "experience");
      question.options.push(
        {
          label: "有試過 Linux 的基本網路設定",
          value: "network",
          description: "",
        },
        {
          label: "曾用 Linux 部署過自己的網站",
          value: "deployment",
          description: "",
        },
      );
      return route.fulfill({ json: { question } });
    });
    await page.goto("/");
    await expect(page.getByRole("radio")).toHaveCount(5);
    await expect(
      page.getByRole("button", { name: "繼續", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    for (const radio of await page.getByRole("radio").all())
      await expect(radio.locator("..")).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        width: document.documentElement.scrollWidth,
      })),
    ).toEqual({ height: size.height, width: size.width });
    await page.screenshot({
      path: `test-results/intake-fit-${size.width}.png`,
      animations: "disabled",
    });
  });
}

test("cancel is available during preparation and removes only the current draft", async ({
  page,
}) => {
  await mockIntake(page);
  let cancelled = false;
  await page.route("**/api/courses/intake-ui/intake/cancel", (route) => {
    cancelled = true;
    return route.fulfill({ json: { deleted: true } });
  });
  await page.route("**/api/courses/intake-ui/intake/question", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "取消製作", exact: true }).click();
  await page.getByRole("button", { name: "繼續設定", exact: true }).click();
  expect(cancelled).toBe(false);
  await page.getByRole("button", { name: "取消製作", exact: true }).click();
  await page.getByRole("button", { name: "確認取消", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "你想學什麼？" }),
  ).toBeVisible();
  expect(cancelled).toBe(true);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("methelia-intake-draft:intake-ui"),
    ),
  ).toBeNull();
});
