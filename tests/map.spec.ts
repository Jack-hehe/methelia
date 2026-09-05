import { test, expect, type Page } from "@playwright/test";
import type { Snapshot } from "../src/core/state";

async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  return (await (await page.request.post("/api/sessions", { data: {} })).json())
    .course as Snapshot;
}

test("adding a topic stays in the map and changes the graph only after confirmation", async ({
  page,
}) => {
  const before = await start(page);
  const map = page.getByRole("dialog", { name: "Learning Map", exact: true });
  await map.getByRole("button", { name: "新增節點", exact: true }).click();
  await expect(map).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "小問題", exact: true }),
  ).toHaveCount(0);
  const topic = map.getByRole("textbox", { name: "主題", exact: true });
  await expect(topic).toBeFocused();
  await topic.fill("HTML 標籤與元素");
  await map.getByRole("button", { name: "預覽", exact: true }).click();
  await expect(map.locator(".map-node.proposed")).toContainText(
    "HTML 標籤與元素",
  );
  const staged = (await (
    await page.request.get(`/api/courses/${before.id}`)
  ).json()) as Snapshot;
  expect(staged.graph).toEqual(before.graph);
  expect(staged.messages).toEqual(before.messages);
  await map.getByRole("button", { name: "確認新增", exact: true }).click();
  await expect(
    map.getByRole("button", { name: "新增節點", exact: true }),
  ).toBeVisible();
  const saved = (await (
    await page.request.get(`/api/courses/${before.id}`)
  ).json()) as Snapshot;
  expect(saved.graph!.nodes).toHaveLength(6);
  const added = saved.graph!.nodes.find((n) => n.title === "HTML 標籤與元素")!;
  expect(saved.graph!.edges).toContainEqual({ from: "web", to: added.id });
  expect(saved.graph!.edges).toContainEqual({ from: added.id, to: "html" });
  expect(saved.chapters.web).toEqual(before.chapters.web);
  expect(saved.workspace).toEqual(before.workspace);
  expect(saved.progress.web).toEqual(before.progress.web);
  expect(saved.currentNodeId).toBe("web");
});

test("canceling a node form or preview leaves the graph unchanged in mobile fullscreen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const before = await start(page);
  await page.getByRole("button", { name: "回到課程", exact: true }).click();
  await page.getByLabel("進入全螢幕", { exact: true }).click();
  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  const map = page.getByRole("dialog", { name: "Learning Map", exact: true });
  await map.getByRole("button", { name: "新增節點", exact: true }).click();
  await map
    .getByRole("textbox", { name: "主題", exact: true })
    .fill("HTML 標籤");
  await page.keyboard.press("Escape");
  await expect(map).toBeVisible();
  await expect(
    map.getByRole("textbox", { name: "主題", exact: true }),
  ).toHaveCount(0);
  await map.getByRole("button", { name: "新增節點", exact: true }).click();
  await map
    .getByRole("textbox", { name: "主題", exact: true })
    .fill("HTML 標籤");
  for (const name of ["取消", "預覽"]) {
    const bounds = (await map
      .getByRole("button", { name, exact: true })
      .boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  }
  await page.screenshot({ path: "test-results/map-add-mobile.png" });
  await map.getByRole("button", { name: "預覽", exact: true }).click();
  await map.getByRole("button", { name: "取消新增", exact: true }).click();
  await expect(
    map.getByRole("button", { name: "新增節點", exact: true }),
  ).toBeVisible();
  const saved = (await (
    await page.request.get(`/api/courses/${before.id}`)
  ).json()) as Snapshot;
  expect(saved.graph).toEqual(before.graph);
  expect(saved.preview).toBeNull();
  expect(saved.messages).toEqual(before.messages);
  await page.reload();
  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  await expect(map.locator(".map-node.proposed")).toHaveCount(0);
});

test("a failed node preview keeps the topic and an inline retryable error", async ({
  page,
}) => {
  await start(page);
  await page.route("**/api/branches/preview", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "預覽暫時無法使用" },
    }),
  );
  const map = page.getByRole("dialog", { name: "Learning Map", exact: true });
  await map.getByRole("button", { name: "新增節點", exact: true }).click();
  const topic = map.getByRole("textbox", { name: "主題", exact: true });
  await topic.fill("HTML 表單");
  await map.getByRole("button", { name: "預覽", exact: true }).click();
  await expect(map.getByRole("alert")).toHaveText("預覽暫時無法使用");
  await expect(topic).toHaveValue("HTML 表單");
  await page.unroute("**/api/branches/preview");
  await map.getByRole("button", { name: "預覽", exact: true }).click();
  await expect(map.locator(".map-node.proposed")).toContainText("HTML 表單");
});

for (const action of ["confirm", "cancel"] as const) {
  test(`a failed ${action} keeps the preview and displays its error inside the map`, async ({
    page,
  }) => {
    await start(page);
    const map = page.getByRole("dialog", { name: "Learning Map", exact: true });
    await map.getByRole("button", { name: "新增節點", exact: true }).click();
    await map
      .getByRole("textbox", { name: "主題", exact: true })
      .fill("HTML 標籤");
    await map.getByRole("button", { name: "預覽", exact: true }).click();
    await page.route(`**/api/branches/${action}`, (route) =>
      route.fulfill({
        status: 409,
        json: { error: "節點預覽已更新" },
      }),
    );
    const button = map.getByRole("button", {
      name: action === "confirm" ? "確認新增" : "取消新增",
      exact: true,
    });
    await button.click();
    await expect(map.getByRole("alert")).toHaveText("節點預覽已更新");
    await expect(map.locator(".map-node.proposed")).toHaveCount(1);
    await page.unroute(`**/api/branches/${action}`);
    await button.click();
    await expect(map.locator(".map-node.proposed")).toHaveCount(0);
  });
}

test("topic previews reject empty input, stale cursors, and other sessions", async ({
  page,
  playwright,
}) => {
  const course = await start(page);
  const data = {
    courseId: course.id,
    topic: "HTML 表單",
    baseRevision: course.revision,
    afterId: "web",
  };
  expect(
    (
      await page.request.post("/api/branches/preview", {
        data: { ...data, topic: "   " },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/branches/preview", {
        data: { ...data, baseRevision: 0 },
      })
    ).status(),
  ).toBe(409);
  const other = await playwright.request.newContext({
    baseURL: new URL(page.url()).origin,
  });
  try {
    expect((await other.post("/api/branches/preview", { data })).status()).toBe(
      404,
    );
  } finally {
    await other.dispose();
  }
  const proposed = await (
    await page.request.post("/api/branches/preview", { data })
  ).json();
  expect(proposed.nodes[0].title).toBe("HTML 表單");
  expect(
    (
      await page.request.post("/api/branches/cancel", {
        data: { courseId: course.id, previewId: "stale-preview" },
      })
    ).status(),
  ).toBe(409);
  const saved = await (
    await page.request.get(`/api/courses/${course.id}`)
  ).json();
  expect(saved.preview.id).toBe(proposed.id);
});
