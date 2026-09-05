import { test, expect } from "./fixtures/course-test";
import { answerIntake, startLearning } from "./fixtures/intake-browser";
import type { Snapshot } from "../src/core/state";

test("a generated course can jump ahead and return without completing skipped work", async ({
  page,
  baseURL,
}) => {
  test.skip(
    baseURL !== "http://127.0.0.1:3100",
    "Requires the isolated model double",
  );
  await page.goto("/?home=1");
  await page.getByLabel("你想學什麼？").fill("Build a website");
  await page.locator('form button[type="submit"]').click();
  await answerIntake(page);
  await startLearning(page);
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  const { course }: { course: Snapshot } = await (
    await page.request.post("/api/sessions", { data: {} })
  ).json();
  expect(course.learningVersion).toBe(1);
  const [first, second] = course.graph!.nodes;
  for (const node of [second, first]) {
    await page.getByLabel("開啟 Learning Map", { exact: true }).click();
    const map = page.getByRole("dialog", { name: "Learning Map", exact: true });
    await map
      .locator(".map-node")
      .filter({ has: page.locator("strong", { hasText: node.title }) })
      .click();
    await map.getByRole("button", { name: "跳到這一章", exact: true }).click();
    await expect(map).not.toBeVisible();
    await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
    const current: Snapshot = await (
      await page.request.get(`/api/courses/${course.id}`)
    ).json();
    expect(current.currentNodeId).toBe(node.id);
    expect(current.completed).toEqual([]);
    expect(current.progress[first.id].done).toEqual([]);
  }
});
