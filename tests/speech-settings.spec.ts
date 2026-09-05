import { test, expect } from "./fixtures/course-test";
test("chapter speech rebuild requires confirmation and preserves the lesson on cancellation or failure", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  let requests = 0;
  await page.route("**/api/chapters/*/retry", async (route) => {
    requests++;
    expect(route.request().postDataJSON()).toMatchObject({
      nodeId: "web",
      rebuildSpeech: true,
    });
    await route.fulfill({
      status: 503,
      json: { error: "語音服務暫時無法使用" },
    });
  });
  await page.getByRole("button", { name: "章節語音", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "章節語音", exact: true });
  await expect(dialog).toContainText("ElevenLabs");
  await expect(dialog).toContainText("額度");
  expect(requests).toBe(0);
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(requests).toBe(0);
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await page.getByRole("button", { name: "章節語音", exact: true }).click();
  await dialog
    .getByRole("button", { name: "重建章節語音", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("暫時無法使用");
  expect(requests).toBe(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "章節語音", exact: true }),
  ).toBeFocused();
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
});
