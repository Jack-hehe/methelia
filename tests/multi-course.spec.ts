import { expect, test, type Page } from "./fixtures/course-test";
import type { Snapshot } from "../src/core/state";

async function createDemo(page: Page, goal: string): Promise<Snapshot> {
  const response = await page.request.post("/api/courses", {
    data: { goal, mode: "demo", requestId: crypto.randomUUID() },
  });
  expect(response.ok()).toBe(true);
  return response.json();
}

test("the course list returns every owned course newest first without lesson or workspace payloads", async ({
  page,
  browser,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const first = await createDemo(page, "First website");
  const second = await createDemo(page, "Second website");
  const response = await page.request.get("/api/courses");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).courses).toEqual([
    {
      id: second.id,
      goal: "Second website",
      status: "ready",
      createdAt: second.createdAt,
    },
    {
      id: first.id,
      goal: "First website",
      status: "ready",
      createdAt: first.createdAt,
    },
  ]);
  const stranger = await browser.newContext();
  try {
    const empty = await stranger.request.get(response.url());
    expect(empty.status()).toBe(200);
    expect(await empty.json()).toEqual({ courses: [] });
    const hidden = await stranger.request.get(`${response.url()}/${first.id}`);
    expect(hidden.status()).toBe(404);
  } finally {
    await stranger.close();
  }
});

test("each saved card restores its own page and files even after newer courses are created", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const first = await createDemo(page, "First website");
  const progress = await page.request.post("/api/progress/events", {
    data: {
      courseId: first.id,
      nodeId: "web",
      sectionId: "structure",
      time: 3,
    },
  });
  expect(progress.ok()).toBe(true);
  const files = await page.request.put("/api/workspace/files", {
    data: {
      courseId: first.id,
      files: { "/index.html": "First course work" },
      baseRevision: first.workspace.revision,
    },
  });
  expect(files.ok()).toBe(true);
  const second = await createDemo(page, "Second website");

  await page.goto("/explore");
  await expect(page.locator(".saved-course")).toHaveCount(2);
  await expect(page.locator(".saved-course").first()).toContainText(
    "Second website",
  );
  const firstCard = page.locator(".saved-course", { hasText: "First website" });
  await expect(firstCard).toHaveAttribute("href", `/?course=${first.id}`);
  await firstCard.click();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await page.reload();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await page.getByRole("button", { name: "Methelia", exact: true }).click();
  await expect(page.locator(".landing")).toBeVisible();
  await page.getByRole("link", { name: "Methelia", exact: true }).click();
  await expect(page.locator(".landing")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "我的課程", exact: true }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");

  await page.goto("/explore");
  await page.locator(".saved-course", { hasText: "Second website" }).click();
  await expect(page).toHaveURL(new RegExp(`course=${second.id}`));
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("3 / 3");
  await page.reload();
  await expect(page.getByLabel("頁碼")).toHaveText("3 / 3");

  const savedFirst: Snapshot = await (
    await page.request.get(`/api/courses/${first.id}`)
  ).json();
  expect(savedFirst.progress.web.sectionId).toBe("structure");
  expect(savedFirst.workspace.files["/index.html"]).toBe("First course work");
  const savedSecond: Snapshot = await (
    await page.request.get(`/api/courses/${second.id}`)
  ).json();
  expect(savedSecond.workspace.files["/index.html"]).toBe(
    second.workspace.files["/index.html"],
  );
});

test("an unavailable course link never silently opens the latest course", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  await createDemo(page, "Available course");
  await page.goto("/?course=missing-course");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "無法載入",
  );
  await expect(page.locator("[data-section], .landing")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "課程", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "課程", exact: true }).click();
  await expect(page.locator(".saved-course")).toHaveCount(1);
});

test("multiple saved cards stay readable in light and dark mode on desktop and mobile", async ({
  page,
}, testInfo) => {
  await page.request.post("/api/sessions", { data: {} });
  await createDemo(
    page,
    "從零開始製作我的第一個網站，練習 HTML 結構、CSS 樣式與 JavaScript 互動",
  );
  await createDemo(page, "My second website");
  await createDemo(page, "A".repeat(120));
  await page.goto("/explore");
  const cards = page.locator(".saved-course");
  await expect(cards).toHaveCount(3);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      if (theme === "dark") await page.getByLabel("切換深淺色").click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      for (const card of await cards.all()) {
        const box = await card.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(250);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      if (width !== 320)
        await page.screenshot({
          path: testInfo.outputPath(`courses-${width}-${theme}.png`),
        });
      if (theme === "dark") await page.getByLabel("切換深淺色").click();
    }
  }
});

test("creating a course from a selected course's home pins the new course for reload", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const first = await createDemo(page, "Original course");
  await page.goto(`/?home=1&course=${first.id}`);
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  const { course }: { course: Snapshot } = await (
    await page.request.post("/api/sessions", { data: {} })
  ).json();
  expect(course.id).not.toBe(first.id);
  await expect(page).toHaveURL(new RegExp(`course=${course.id}`));
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await page.goto("/explore");
  await expect(page.locator(".saved-course")).toHaveCount(2);
});
