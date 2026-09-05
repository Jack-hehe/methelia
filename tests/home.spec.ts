import { expect, test } from "@playwright/test";

test("the Methelia logo on explore opens the learning home instead of resuming a saved course", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await page.goto("/explore");
  await page.getByRole("link", { name: "Methelia", exact: true }).click();
  // Wait for the saved session, not the temporary landing before it loads.
  await expect(
    page.getByRole("button", { name: "先體驗一堂課" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("textbox", { name: "你想學什麼？" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /I want to learn/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Methelia", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "我的課程", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "我的課程", exact: true }).click();
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
  await expect(
    page.getByRole("button", { name: "先體驗一堂課" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("textbox", { name: "你想學什麼？" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "我的課程", exact: true }).click();
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
