import { expect, type Page } from "./course-test";

/** Answer the real live-course intake without replacing any API boundary. */
export async function answerIntake(page: Page) {
  await expect(
    page.getByRole("heading", { name: "正在安排你的學習路徑" }),
  ).toBeVisible();
  await page.getByLabel("經驗補充").fill("我剛開始接觸這個主題");
  await page.getByLabel("目的補充").fill("希望能完成實際任務並解釋結果");
  await page
    .getByLabel("已會與卡點補充")
    .fill("需要先看例子，再嘗試自己的做法");
  await page.getByRole("radio", { name: "能獨立完成實際任務" }).check();
  await page.getByLabel("時間與方式補充").fill("每次 20 分鐘，從實例開始");
  await page.getByRole("button", { name: "開始安排課程", exact: true }).click();
}
