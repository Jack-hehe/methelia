import { expect, test, type Locator, type Page } from "./fixtures/course-test";

async function openMap(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  return page.getByRole("dialog", { name: "Learning Map", exact: true });
}

async function drag(
  page: Page,
  from: { x: number; y: number },
  dx: number,
  dy: number,
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 15 });
  await page.mouse.up();
}

async function expectSidebar(map: Locator) {
  const detail = map.locator(".node-detail");
  await expect(detail).toBeInViewport({ ratio: 1 });
  const panel = (await detail.boundingBox())!;
  const bounds = (await map.boundingBox())!;
  expect(panel.x + panel.width).toBeCloseTo(bounds.x + bounds.width, 0);
  expect(panel.y + panel.height).toBeCloseTo(bounds.y + bounds.height, 0);
  expect(panel.width).toBeGreaterThanOrEqual(280);
  await expect(map.getByLabel("收起節點資訊", { exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  if (bounds.width > 800) {
    const canvas = (await map.locator(".map-canvas").boundingBox())!;
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(panel.x);
  }
  return panel;
}

test("panning across node labels never selects text and leaves topic input selection usable", async ({
  page,
}) => {
  const map = await openMap(page);
  const canvas = (await map.locator(".map-canvas").boundingBox())!;
  const first = (await map.locator(".map-node strong").first().boundingBox())!;
  const second = (await map.locator(".map-node strong").nth(1).boundingBox())!;
  const start = { x: canvas.x + 10, y: first.y + first.height / 2 };
  await drag(page, start, second.x + second.width / 2 - start.x, 0);
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
  expect(
    (await map.locator(".map-node strong").first().boundingBox())!.x,
  ).toBeGreaterThan(first.x + 100);
  const dragNode = map.locator(".map-node").first();
  const initialNode = (await dragNode.boundingBox())!;
  await drag(page, { x: initialNode.x + 30, y: initialNode.y + 30 }, 40, 25);
  expect((await dragNode.boundingBox())!.x - initialNode.x).toBeCloseTo(40, 0);
  await expect(map.locator(".node-detail")).toHaveCount(0);
  await map.getByRole("button", { name: "新增節點", exact: true }).click();
  const input = map.getByRole("textbox", { name: "主題", exact: true });
  await input.fill("HTML 表單");
  await input.press("ControlOrMeta+a");
  expect(
    await input.evaluate((el: HTMLInputElement) => [
      el.selectionStart,
      el.selectionEnd,
    ]),
  ).toEqual([0, 7]);
  await input.press("Backspace");
  await expect(input).toHaveValue("");
});

test("sidebar toggles independently and stays fixed across node selection, dragging and zoom", async ({
  page,
}) => {
  const map = await openMap(page);
  const node = map.locator(".map-node").nth(1);
  const detail = map.locator(".node-detail");
  await expect(detail).toHaveCount(0);
  const originalCanvas = await map.locator(".map-canvas").boundingBox();
  await node.click();
  await expect(detail.getByRole("heading")).toHaveText("用 HTML 建立骨架");
  const before = await expectSidebar(map);
  const a = (await node.boundingBox())!;
  await drag(page, { x: a.x + a.width / 2, y: a.y + a.height / 2 }, 70, 40);
  const dragged = (await node.boundingBox())!;
  expect(dragged.x - a.x).toBeCloseTo(70, 0);
  expect(dragged.y - a.y).toBeCloseTo(40, 0);
  expect(await expectSidebar(map)).toEqual(before);
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
  const canvas = (await map.locator(".map-canvas").boundingBox())!;
  await drag(page, { x: canvas.x + 20, y: canvas.y + 25 }, 40, 25);
  expect(await expectSidebar(map)).toEqual(before);
  await map.getByLabel("縮小", { exact: true }).click();
  expect(await expectSidebar(map)).toEqual(before);
  await map.locator(".map-node").nth(2).click();
  await expect(detail).toHaveCount(1);
  await expect(detail.getByRole("heading")).toHaveText("CSS：顏色與間距");
  expect(await expectSidebar(map)).toEqual(before);
  await page.mouse.click(canvas.x + 20, canvas.y + 25);
  await expect(detail).toBeVisible();
  await map.getByLabel("收起節點資訊", { exact: true }).click();
  await expect(detail).toHaveCount(0);
  expect(await map.locator(".map-canvas").boundingBox()).toEqual(
    originalCanvas,
  );
  await map.getByLabel("展開節點資訊", { exact: true }).click();
  await expect(detail.getByRole("heading")).toHaveText("CSS：顏色與間距");
  await map.getByLabel("收起節點資訊", { exact: true }).click();
  await node.focus();
  await node.press("Enter");
  expect(await expectSidebar(map)).toEqual(before);
  await page.screenshot({ path: "test-results/map-sidebar-desktop.png" });
});

test("all nodes update the same sidebar and panning the selected node offscreen keeps its details", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const map = await openMap(page);
  const detail = map.locator(".node-detail");
  await map.locator(".map-node").last().click();
  await expect(map.locator(".map-node").last()).toBeInViewport({ ratio: 1 });
  await map.getByLabel("顯示完整路徑", { exact: true }).click();
  const bounds = await expectSidebar(map);
  for (const node of await map.locator(".map-node").all()) {
    const title = await node.locator("strong").innerText();
    await node.click();
    await expect(detail.getByRole("heading")).toHaveText(title);
    await expect(detail).toHaveCount(1);
    expect(await expectSidebar(map)).toEqual(bounds);
  }
  const canvas = (await map.locator(".map-canvas").boundingBox())!;
  await drag(page, { x: 20, y: canvas.y + 30 }, -1200, 0);
  expect(await expectSidebar(map)).toEqual(bounds);
  await drag(page, { x: 20, y: canvas.y + 30 }, 1200, 0);
  expect(await expectSidebar(map)).toEqual(bounds);
});

test("an open sidebar keeps the selected node visible when crossing from overlay to desktop layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 900 });
  const map = await openMap(page);
  const node = map.locator(".map-node").last();
  await node.click();
  await expectSidebar(map);
  await page.setViewportSize({ width: 801, height: 900 });
  await expectSidebar(map);
  await expect(node).toBeInViewport({ ratio: 1 });
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(node).toBeInViewport({ ratio: 1 });
});

test("canceling a selected preview node leaves the sidebar toggle usable", async ({
  page,
}) => {
  const map = await openMap(page);
  await map.getByRole("button", { name: "新增節點", exact: true }).click();
  await map
    .getByRole("textbox", { name: "主題", exact: true })
    .fill("HTML 表單");
  await map.getByRole("button", { name: "預覽", exact: true }).click();
  await map.getByLabel("顯示完整路徑", { exact: true }).click();
  await map.locator(".map-node.proposed").click();
  await map.getByRole("button", { name: "取消新增", exact: true }).click();
  await map.getByLabel("展開節點資訊", { exact: true }).click();
  await expect(map.locator(".node-detail").getByRole("heading")).toHaveText(
    "認識網站的三種語言",
  );
  await expectSidebar(map);
});

for (const width of [390, 320]) {
  test(`sidebar remains readable and its toggle stays reachable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const map = await openMap(page);
    const node = map.locator(".map-node").first();
    await node.click();
    const detail = map.locator(".node-detail");
    await expectSidebar(map);
    await map.getByLabel("收起節點資訊", { exact: true }).click();
    await expect(detail).toHaveCount(0);
    await map.getByLabel("放大", { exact: true }).click();
    await node.click();
    await expectSidebar(map);
    await page.setViewportSize({ width: width + 30, height: 844 });
    await expectSidebar(map);
    await page.screenshot({ path: `test-results/map-sidebar-${width}.png` });
    await map.getByLabel("收起節點資訊", { exact: true }).click();
    await expect(detail).toHaveCount(0);
  });
}
