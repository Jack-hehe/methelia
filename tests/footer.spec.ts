import { expect, test, type Page } from "./fixtures/course-test";

async function positions(page: Page) {
  const footer = page.getByRole("contentinfo");
  const nav = footer.getByRole("navigation", { name: "課程翻頁" });
  return Promise.all([
    footer.boundingBox(),
    nav.getByRole("button", { name: "上一頁", exact: true }).boundingBox(),
    nav.locator("button, a").last().boundingBox(),
    footer.getByLabel("切換字幕", { exact: true }).boundingBox(),
    footer.getByLabel("切換靜音", { exact: true }).boundingBox(),
    footer.getByLabel("播放速度", { exact: true }).boundingBox(),
    footer.getByLabel("開啟 Learning Map", { exact: true }).boundingBox(),
  ]);
}

for (const width of [1440, 900, 390, 320]) {
  test(`footer positions stay fixed across pages, practice gates and chapters at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "先體驗一堂課" }).click();
    await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByLabel("倒退十秒", { exact: true })).toHaveCount(0);
    // The starter course ships prepared narration, so these are usable as soon
    // as the chapter opens rather than waiting for synthesis.
    for (const name of ["切換字幕", "切換靜音", "播放速度"]) {
      await expect(footer.getByLabel(name, { exact: true })).toBeVisible();
      await expect(footer.getByLabel(name, { exact: true })).toBeEnabled();
    }
    const initial = await positions(page);
    for (let step = 0; step < 2; step++) {
      await page.getByLabel("下一頁", { exact: true }).click();
      await expect(page.getByLabel("頁碼")).toHaveText(`${step + 2} / 3`);
      expect(await positions(page)).toEqual(initial);
    }
    const nextChapter = footer.getByRole("button", { name: /下一章/ });
    await expect(nextChapter).toHaveText("下一章");
    await expect(nextChapter).toBeDisabled();
    await expect(
      footer.getByText("完成本頁練習後，就能進入下一章。", { exact: true }),
    ).toHaveCount(0);
    const prerequisite = page
      .getByRole("main")
      .getByText("完成本頁練習後，就能進入下一章。", { exact: true });
    await expect(prerequisite).toBeInViewport({ ratio: 1 });
    await page.getByRole("button", { name: "CSS：調整外觀樣式" }).click();
    await expect(nextChapter).toBeEnabled();
    expect(await positions(page)).toEqual(initial);
    await page.screenshot({ path: `test-results/fixed-footer-${width}.png` });
    await nextChapter.click();
    await expect(page.getByLabel("頁碼")).toHaveText("1 / 4");
    expect(await positions(page)).toEqual(initial);
    await page.getByLabel("進入全螢幕", { exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
      .toBe(true);
    expect(await positions(page)).toEqual(initial);
  });
}
