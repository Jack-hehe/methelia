import { expect, test } from "./fixtures/course-test";

test("the Methelia logo on explore opens the learning home instead of resuming a saved course", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await page.goto("/explore");
  await page.getByRole("link", { name: "Methelia", exact: true }).click();
  // The explicit home destination must remain home after session restoration.
  await expect(page.getByRole("button", { name: "先體驗一堂課" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("textbox", { name: "你想學什麼？" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /我想學習/ })).toBeVisible();
  await page.getByRole("link", { name: "Methelia", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "課程", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("link", { name: "課程", exact: true }).click();
  await page.locator(".saved-course").click();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await page.reload();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
});

test("the course logo returns home and stays there after refreshing while retaining progress", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await page.getByRole("button", { name: "Methelia", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "你想學什麼？" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "先體驗一堂課" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("textbox", { name: "你想學什麼？" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "課程", exact: true }).click();
  await page.locator(".saved-course").click();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
});

test("starting a new demo from the explicit home still enters and resumes that course", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Methelia", exact: true }).click();
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await page.reload();
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
});
