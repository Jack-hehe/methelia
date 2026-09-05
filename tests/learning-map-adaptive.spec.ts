import { expect, test } from "./fixtures/course-test";

test("the map explains status on demand and can extend the final selected node", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  const map = page.getByRole("dialog", { name: "Learning Map", exact: true });
  const legend = map.getByLabel("地圖狀態說明", { exact: true });
  await expect(
    map.getByText("補強／延伸支線（虛線）", { exact: true }),
  ).not.toBeVisible();
  await legend.focus();
  await legend.press("Enter");
  await expect(
    map.getByText("補強／延伸支線（虛線）", { exact: true }),
  ).toBeVisible();
  await legend.press("Enter");
  const last = map.locator(".map-node").last();
  const title = await last.locator("strong").innerText();
  await last.click();
  await expect(
    map.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(map.getByText("預計學習內容", { exact: true })).toBeVisible();
  await map.getByRole("button", { name: "從這裡延伸" }).click();
  await expect(
    map.getByText(`從「${title}」延伸`, { exact: true }),
  ).toBeVisible();
  await expect(map.getByLabel("想理解到什麼程度？")).toHaveValue("applied");
  await map.getByLabel("想理解到什麼程度？").selectOption("advanced");
  await map
    .getByRole("textbox", { name: "主題", exact: true })
    .fill("進一步分析這個概念");
  await expect(
    map.getByRole("button", { name: "預覽", exact: true }),
  ).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(map.getByLabel("想理解到什麼程度？")).toBeInViewport({
    ratio: 1,
  });
  await expect(
    map.getByRole("button", { name: "預覽", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: "test-results/adaptive-map-mobile.png" });
});
