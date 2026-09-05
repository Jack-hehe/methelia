import { expect, test } from "./fixtures/course-test";
import type { Snapshot } from "../src/core/state";

test("a saved extension preserves the main route and returns to the saved page", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  const before = (
    await (await page.request.post("/api/sessions", { data: {} })).json()
  ).course as Snapshot;
  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  const map = page.getByRole("dialog", { name: "Learning Map", exact: true });
  await map.getByRole("button", { name: "新增節點", exact: true }).click();
  await map
    .getByRole("textbox", { name: "主題", exact: true })
    .fill("網頁背後的資料傳遞");
  await map.getByRole("button", { name: "預覽", exact: true }).click();
  await map.getByRole("button", { name: "保留稍後學習", exact: true }).click();
  const saved = (await (
    await page.request.get(`/api/courses/${before.id}`)
  ).json()) as Snapshot;
  expect(saved.currentNodeId).toBe(before.currentNodeId);
  expect(saved.graph!.edges).toEqual(before.graph!.edges);
  expect(saved.graph!.extensions).toHaveLength(1);
  await map
    .locator(".map-node")
    .filter({ hasText: "網頁背後的資料傳遞" })
    .click();
  await map.getByRole("button", { name: "進入延伸", exact: true }).click();
  await expect(map).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /暫停延伸，返回/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /暫停延伸，返回/ }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  const returned = (await (
    await page.request.get(`/api/courses/${before.id}`)
  ).json()) as Snapshot;
  expect(returned.currentNodeId).toBe(before.currentNodeId);
  expect(returned.extensionSession).toBeUndefined();
  expect(returned.workspace.files).toEqual(before.workspace.files);
  expect(returned.progress[before.currentNodeId].sectionId).toBe(
    before.progress[before.currentNodeId].sectionId,
  );
});

test("map keeps node information accessible without the deferred notes editor", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  const map = page.getByRole("dialog", { name: "Learning Map", exact: true });
  await map.locator(".map-node.current").click();
  await expect(map.getByText("預計學習內容", { exact: true })).toBeVisible();
  await expect(map.getByLabel("個人心得", { exact: true })).toHaveCount(0);
  await map.getByRole("button", { name: "回到課程", exact: true }).click();
  await page.reload();
  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  await map.locator(".map-node.current").click();
  await expect(map.getByText("預計學習內容", { exact: true })).toBeVisible();
});
