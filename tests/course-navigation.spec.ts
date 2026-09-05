import { expect, test } from "./fixtures/course-test";

test("opening a saved course never renders the learning home while its session loads", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const response = await page.request.post("/api/courses", {
    data: {
      goal: "Navigation regression",
      mode: "demo",
      requestId: crypto.randomUUID(),
    },
  });
  expect(response.ok()).toBe(true);
  await page.goto("/explore");
  await expect(page.locator(".saved-course")).toBeVisible();
  await page.addInitScript(() => {
    if (window !== window.top) return;
    new MutationObserver(() => {
      if (document.querySelector(".landing")) {
        document.documentElement.dataset.observedLanding = "true";
      }
    }).observe(document, { childList: true, subtree: true });
  });

  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = () => {};
  const pending = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route("**/api/sessions", async (route) => {
    requested();
    await gate;
    await route.continue();
  });
  try {
    await page.locator(".saved-course").click();
    await pending;
    await expect(page.locator(".landing")).toHaveCount(0, { timeout: 1000 });
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-observed-landing",
      "true",
    );
    release();
    await expect(page.locator("[data-section]")).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-observed-landing",
      "true",
    );
    await page.getByLabel("下一頁", { exact: true }).click();
    await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
    await page.reload();
    await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-observed-landing",
      "true",
    );
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("a failed session restore offers retry instead of treating the saved course as missing", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const response = await page.request.post("/api/courses", {
    data: {
      goal: "Restore retry",
      mode: "demo",
      requestId: crypto.randomUUID(),
    },
  });
  expect(response.ok()).toBe(true);
  await page.goto("/explore");
  await expect(page.locator(".saved-course")).toBeVisible();
  await page.route("**/api/sessions", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Temporary session failure" },
    }),
  );
  await page.locator(".saved-course").click();
  await expect(
    page.getByRole("button", { name: "重試", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".landing")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "無法載入",
  );
  await page.unroute("**/api/sessions");
  await page.getByRole("button", { name: "重試", exact: true }).click();
  await expect(page.locator("[data-section]")).toBeVisible();
  await expect(page.locator(".landing")).toHaveCount(0);
  const restored = await (
    await page.request.post("/api/sessions", { data: {} })
  ).json();
  expect(restored.course.id).toBe((await response.json()).id);
});
