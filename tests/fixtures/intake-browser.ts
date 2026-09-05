import { expect, type Page } from "./course-test";

/** Complete each generated card through the real intake API. */
export async function answerIntake(page: Page) {
  for (let step = 0; step < 5; step++) {
    await expect(page.locator("#intake-question")).toBeVisible();
    if (await page.locator('input[name="depth"][value="applied"]').count()) {
      await page.locator('input[name="depth"][value="applied"]').check();
    } else {
      await page
        .getByLabel("補充你的回答", { exact: true })
        .fill("每次 20 分鐘，從實例開始，希望能完成實際任務並解釋結果");
    }
    const finish = page.getByRole("button", {
      name: "開始製作第一章",
      exact: true,
    });
    if (await finish.count()) {
      await finish.click();
      return;
    }
    const previousTitle = await page.locator("#intake-question").textContent();
    await page.getByRole("button", { name: "繼續", exact: true }).click();
    await expect(page.locator("#intake-question")).not.toHaveText(
      previousTitle || "",
    );
  }
}
