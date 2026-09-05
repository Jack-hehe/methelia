import { expect, test, type Page } from "./fixtures/course-test";
import type { Snapshot } from "../src/core/state";

async function createDemo(page: Page, goal: string): Promise<Snapshot> {
  const response = await page.request.post("/api/courses", {
    data: { goal, mode: "demo", requestId: crypto.randomUUID() },
  });
  expect(response.ok()).toBe(true);
  return response.json();
}

test("DELETE removes only the requested owned course and returns no fallback", async ({
  page,
  browser,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const removed = await createDemo(page, "Remove this course");
  const retained = await createDemo(page, "Keep this course");

  const stranger = await browser.newContext();
  try {
    const unauthorized = await stranger.request.delete(
      `/api/courses/${removed.id}`,
    );
    expect(unauthorized.status()).toBe(404);
  } finally {
    await stranger.close();
  }

  const response = await page.request.delete(`/api/courses/${removed.id}`);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ deleted: true });
  expect(
    (await (await page.request.get("/api/courses")).json()).courses.map(
      (course: { id: string }) => course.id,
    ),
  ).toEqual([retained.id]);
  expect((await page.request.get(`/api/courses/${removed.id}`)).status()).toBe(
    404,
  );
  expect((await page.request.get(`/api/courses/${retained.id}`)).status()).toBe(
    200,
  );
  expect(
    (await page.request.delete(`/api/courses/${removed.id}`)).status(),
  ).toBe(404);
});

test("a failed card deletion stays retryable and removes no other card", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const removed = await createDemo(page, "Delete from My Courses");
  const retained = await createDemo(page, "Keep this saved course");
  await page.goto("/explore");
  await page.locator(".language-trigger").click();
  await page.getByRole("menuitemradio", { name: "EN" }).click();

  const removedEntry = page.locator(".saved-course-entry", {
    hasText: removed.goal,
  });
  const removedLink = removedEntry.locator("a.saved-course");
  const deleteButton = removedEntry.getByRole("button", {
    name: `Delete course “${removed.goal}”`,
  });
  await expect(removedLink).toHaveAttribute(
    "href",
    `/?course=${encodeURIComponent(removed.id)}`,
  );
  await deleteButton.click();
  await expect(page).toHaveURL(/\/explore$/);

  const dialog = page.getByRole("dialog", {
    name: `Delete “${removed.goal}”?`,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "permanently removes its content, learning progress, workspace files, and audio",
  );
  const cancel = dialog.getByRole("button", { name: "Cancel" });
  await expect(cancel).toBeFocused();
  await cancel.click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".saved-course-entry")).toHaveCount(2);
  expect((await page.request.get(`/api/courses/${removed.id}`)).status()).toBe(
    200,
  );

  let failedOnce = false;
  await page.route(`**/api/courses/${removed.id}`, async (route) => {
    if (route.request().method() === "DELETE" && !failedOnce) {
      failedOnce = true;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporary failure" }),
      });
      return;
    }
    await route.continue();
  });

  await deleteButton.click();
  await dialog.getByRole("button", { name: "Delete permanently" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Unable to delete this course. Please try again.",
  );
  await expect(dialog).toBeVisible();
  await expect(page.locator(".saved-course-entry")).toHaveCount(2);
  await dialog.getByRole("button", { name: "Try again" }).click();

  await expect(dialog).not.toBeVisible();
  await expect(removedEntry).toHaveCount(0);
  await expect(
    page.locator(".saved-course-entry", { hasText: retained.goal }),
  ).toHaveCount(1);
  expect((await page.request.get(`/api/courses/${removed.id}`)).status()).toBe(
    404,
  );
  expect((await page.request.get(`/api/courses/${retained.id}`)).status()).toBe(
    200,
  );
});

test("the delete control remains visible and accessible in both languages on mobile", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const course = await createDemo(page, "Bilingual mobile course");
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/explore");

  const chineseButton = page.getByRole("button", {
    name: `刪除課程「${course.goal}」`,
  });
  await expect(chineseButton).toBeVisible();
  const box = await chineseButton.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(36);
  expect(box!.height).toBeGreaterThanOrEqual(36);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await chineseButton.click();
  const chineseDialog = page.getByRole("dialog", {
    name: `刪除「${course.goal}」？`,
  });
  await expect(chineseDialog).toContainText("課程內容");
  await expect(chineseDialog).toContainText("學習進度");
  await expect(chineseDialog).toContainText("工作區檔案");
  await expect(chineseDialog).toContainText("音訊");
  await page.keyboard.press("Escape");

  await page.locator(".language-trigger").click();
  await page.getByRole("menuitemradio", { name: "EN" }).click();
  await expect(
    page.getByRole("button", {
      name: `Delete course “${course.goal}”`,
    }),
  ).toBeVisible();
});
