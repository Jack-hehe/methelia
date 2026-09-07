import { test, expect } from "./fixtures/course-test";

test("bottom controls span the canvas and keep page navigation visible in practice and fullscreen", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  const slider = page.getByRole("slider", { name: "解說進度" });
  expect((await slider.boundingBox())!.width).toBeGreaterThan(1300);
  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("button", { name: "上一頁", exact: true }),
  ).toBeDisabled();
  await expect(
    footer.getByRole("button", { name: "下一頁", exact: true }),
  ).toHaveText(/下一頁/);
  await footer.getByRole("button", { name: "下一頁", exact: true }).click();
  expect((await slider.boundingBox())!.width).toBeGreaterThan(1300);
  await page.getByRole("button", { name: "進入全螢幕", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  expect((await slider.boundingBox())!.width).toBeGreaterThan(1300);
  await expect(
    footer.getByRole("button", { name: "下一頁", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/bottom-controls-fullscreen.png",
  });
});

test("the last page identifies the next chapter and explains the practice gate", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByLabel("下一頁", { exact: true }).click();
  const next = page.getByRole("button", {
    name: "下一章：HTML 實作：修改個人首頁的主標題",
    exact: true,
  });
  await expect(next).toBeDisabled();
  await expect(
    page.getByText("完成本頁練習後，就能進入下一章。", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "CSS：調整外觀樣式" }).click();
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 4");
});

test("page navigation waits for its save before opening the destination practice", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  let release!: () => void;
  let started!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  const intercepted = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/api/progress/events", async (route) => {
    if (route.request().postDataJSON().sectionId === "structure") {
      started();
      await hold;
    }
    await route.continue();
  });
  await page.getByLabel("下一頁", { exact: true }).click();
  await intercepted;
  const next = page.getByLabel("下一頁", { exact: true });
  try {
    await expect(next).toBeDisabled();
    await expect(
      page.getByRole("region", { name: "Terminal", exact: true }),
    ).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await expect(next).toBeEnabled();
  await expect(
    page.getByRole("region", { name: "Terminal", exact: true }),
  ).toBeVisible();
});

test("CSS color choices update the example and its displayed code", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  await page.locator(".concept-card").filter({ hasText: "CSS" }).click();
  await page.getByRole("button", { name: "綠色按鈕", exact: true }).click();
  await expect(page.locator(".mini-site button")).toHaveCSS(
    "background-color",
    "rgb(35, 133, 107)",
  );
  await expect(page.locator(".code-sticker")).toContainText("#23856b");
  await page.getByRole("button", { name: "紫色按鈕", exact: true }).click();
  await expect(page.locator(".mini-site button")).toHaveCSS(
    "background-color",
    "rgb(115, 85, 201)",
  );
  await expect(page.locator(".code-sticker")).toContainText("#7355c9");
  await page.screenshot({ path: "test-results/plain-language-lesson.png" });
});

test("a prerequisite link returns to the unfinished practice page", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const course = await (
    await page.request.post("/api/courses", {
      data: {
        goal: "Practice navigation",
        mode: "demo",
        requestId: crypto.randomUUID(),
      },
    })
  ).json();
  await page.request.post("/api/progress/check", {
    data: { courseId: course.id, sectionId: "check", answer: 1 },
  });
  await page.request.post(`/api/courses/${course.id}/advance`, { data: {} });
  await page.goto("/");
  await expect(page.locator("[data-section]").first()).toBeVisible();
  for (let i = 0; i < 3; i++)
    await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("4 / 4");
  await expect(page.getByRole("button", { name: /下一章：/ })).toBeDisabled();
  await page
    .getByRole("button", {
      name: /先完成.*動手練習：儲存 Hello Methelia 主標題/,
    })
    .click();
  await expect(page.getByLabel("頁碼")).toHaveText("3 / 4");
  await expect(
    page.getByRole("button", { name: "驗證我的練習", exact: true }),
  ).toBeVisible();
});

test("mobile footer keeps full-width seeking and visible nonoverlapping navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  const footer = page.getByRole("contentinfo");
  expect(
    (await page.getByRole("slider", { name: "解說進度" }).boundingBox())!.width,
  ).toBeGreaterThan(340);
  for (const name of ["上一頁", "下一頁", "開啟 Learning Map", "進入全螢幕"]) {
    const button = footer.getByRole("button", { name, exact: true });
    await expect(button).toBeVisible();
    const bounds = (await button.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  }
  await footer.getByLabel("下一頁", { exact: true }).click();
  await footer.getByLabel("下一頁", { exact: true }).click();
  await expect(footer.getByRole("button", { name: /下一章：/ })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/bottom-controls-mobile.png" });
});
