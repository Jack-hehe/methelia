import { test, expect } from "./fixtures/course-test";
import { answerIntake, startLearning } from "./fixtures/intake-browser";
test("Stop during save prevents a delayed Python execution", async ({
  page,
  baseURL,
}) => {
  test.skip(baseURL !== "http://127.0.0.1:3100");
  await page.goto("/?home=1");
  await page.getByLabel("你想學什麼？").fill("Learn Python");
  await page.locator('form button[type="submit"]').click();
  await answerIntake(page);
  await startLearning(page);
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await page.getByLabel("下一頁", { exact: true }).click();
  let release!: () => void,
    intercepted = false;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/workspace/files", async (route) => {
    intercepted = true;
    await held;
    await route.continue();
  });
  try {
    await page.getByLabel("程式碼編輯器").fill("print('must not run')");
    await page.getByRole("button", { name: "執行 Python" }).click();
    await expect.poll(() => intercepted).toBe(true);
    await page.getByRole("button", { name: "停止", exact: true }).click();
    const saved = page.waitForResponse((r) =>
      r.url().endsWith("/api/workspace/files"),
    );
    release();
    await saved;
    await expect(page.locator(".python-run-status")).toHaveText("已停止");
    await expect(page.getByLabel("Python 標準輸出")).not.toContainText(
      "must not run",
    );
  } finally {
    release();
  }
});

test("reading and illustrated explanations work on desktop and mobile", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(baseURL !== "http://127.0.0.1:3100");
  await page.goto("/?home=1");
  await page
    .getByLabel("你想學什麼？")
    .fill("Explain bread rising illustrated");
  await page.locator('form button[type="submit"]').click();
  await answerIntake(page);
  await startLearning(page);
  await expect(page.locator(".lesson-article")).toBeVisible();
  await expect(page.locator(".lesson-figure li")).toHaveCount(3);
  await expect(page.locator(".lesson-figure li").last()).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(page.locator(".lesson-article button")).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("illustrated-lesson.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".lesson-takeaway")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("illustrated-mobile.png"),
  });
});

test("failed practice shows actual saved code and expected evidence", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(baseURL !== "http://127.0.0.1:3100");
  await page.goto("/?home=1");
  await page.getByLabel("你想學什麼？").fill("Learn Python");
  await page.locator('form button[type="submit"]').click();
  await answerIntake(page);
  await startLearning(page);
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByRole("button", { name: "驗證我的練習" }).click();
  const evidence = page.locator(".check-evidence");
  await expect(evidence).toContainText("print(1 + 2)");
  await expect(evidence).toContainText("print(2 + 3)");
  await expect(evidence).toContainText("並非 Python 執行輸出檢查");
  await page.screenshot({ path: testInfo.outputPath("failed-practice.png") });
});

test("teacher visibly types without audio and preserves learner files", async ({
  page,
}, testInfo) => {
  await page.request.post("/api/sessions", { data: {} });
  const course = await (
    await page.request.post("/api/courses", {
      data: { goal: "Website", mode: "demo", requestId: crypto.randomUUID() },
    })
  ).json();
  await page.goto("/");
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByRole("button", { name: "看老師示範", exact: true }).click();
  const initial = await page.locator(".demo-source").innerText();
  await expect(page.getByLabel("老師正在輸入")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".demo-source")).not.toHaveText(initial);
  await expect(page.locator(".guide-pointer")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("teacher-typing.png") });
  const restored = await (
    await page.request.get(`/api/courses/${course.id}`)
  ).json();
  expect(restored.workspace.files).toEqual(course.workspace.files);
});
