import { test, expect } from "./fixtures/course-test";
import { answerIntake, startLearning } from "./fixtures/intake-browser";

// Run with playwright.general.config.ts: live API/worker against a local model double.
test.beforeEach(async ({ baseURL }) => {
  test.skip(
    baseURL !== "http://127.0.0.1:3100",
    "Requires the isolated general-course acceptance server",
  );
});

for (const goal of [
  "Build a website",
  "Learn Python",
  "Learn Linux files",
  "Explain bread rising",
]) {
  test(`${goal}: generate, practice, and restore`, async ({ page }) => {
    await page.goto("/?home=1");
    await page.getByLabel("你想學什麼？").fill(goal);
    await page.locator('form button[type="submit"]').click();
    await answerIntake(page);
    const pages = goal.includes("bread") ? 4 : 3;
    // Every course opens on its map, with the whole route laid out.
    const map = page.getByRole("dialog", { name: "Learning Map", exact: true });
    await expect(map.locator(".map-node").first()).toBeVisible();
    if (goal.includes("Linux")) {
      // A scope caveat survives a reload, before anything has been entered.
      await page.reload();
      await expect(
        page.getByText("受限虛擬檔案環境，不支援安裝套件或系統程序。"),
      ).toBeVisible();
    }
    await startLearning(page);
    await expect(page.getByLabel("頁碼")).toHaveText(`1 / ${pages}`);
    await page.getByLabel("下一頁", { exact: true }).click();
    await expect(page.getByLabel("頁碼")).toHaveText(`2 / ${pages}`);
    if (goal.includes("bread")) {
      await expect(page.getByLabel("開啟實作區", { exact: true })).toHaveCount(
        0,
      );
      await page.getByRole("button", { name: /Effect/ }).click();
      await expect(page.getByText("The observable result.")).toBeVisible();
    } else {
      if (goal.includes("Linux")) {
        await page.getByLabel("終端機指令").fill("mkdir notes");
        await page.getByLabel("終端機指令").press("Enter");
        await expect(
          page
            .getByLabel("虛擬檔案與目錄")
            .getByRole("button", { name: /notes/ }),
        ).toBeVisible();
      } else {
        const python = goal.includes("Python");
        await expect(page.getByLabel("終端機指令")).toHaveCount(0);
        await page
          .getByLabel("程式碼編輯器")
          .fill(python ? "print(2 + 3)" : "<h1>Welcome</h1>");
        if (python) {
          await page.getByRole("button", { name: "執行 Python" }).click();
          await expect(page.getByLabel("Python 標準輸出")).toHaveText("5\n", {
            timeout: 60000,
          });
          // Running a program supplies feedback, never completion evidence.
          await expect(
            page.getByRole("button", { name: "驗證我的練習" }),
          ).toBeEnabled();
        } else {
          await expect(
            page
              .frameLocator('iframe[title="實作網站預覽"]')
              .getByRole("heading", { name: "Welcome" }),
          ).toBeVisible();
        }
      }
      await page.getByRole("button", { name: "驗證我的練習" }).click();
      await expect(
        page.getByRole("button", { name: "練習完成", exact: true }),
      ).toBeDisabled();
      await page.reload();
      await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
      await expect(
        page.getByRole("button", { name: "練習完成", exact: true }),
      ).toBeDisabled();
      if (!goal.includes("Linux"))
        await expect(page.getByLabel("程式碼編輯器")).toHaveValue(
          goal.includes("Python") ? "print(2 + 3)" : "<h1>Welcome</h1>",
        );
    }
    await page.getByLabel("下一頁", { exact: true }).click();
    await page.getByRole("button", { name: /Observe the change/ }).click();
    await expect(
      page.getByText("Compare the starting state with the result."),
    ).toBeVisible();
    if (goal.includes("bread")) {
      await page.getByLabel("下一頁", { exact: true }).click();
      await page
        .getByRole("button", {
          name: /Keep the recipe and time equal; change only temperature/,
        })
        .click();
      await expect(
        page.getByText(
          "Changing only temperature makes the comparison informative.",
        ),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "下一章：Next steps" }).click();
    await expect(page.getByLabel("頁碼")).toHaveText(`1 / ${pages}`);
    await expect(page.locator(".breadcrumb strong")).toHaveText("Next steps");
    await page.reload();
    await expect(page.locator(".breadcrumb strong")).toHaveText("Next steps");
  });
}

test("Python runner stops, bounds execution and output, then runs a fresh program", async ({
  page,
}, testInfo) => {
  await page.goto("/?home=1");
  await page.getByLabel("你想學什麼？").fill("Learn Python");
  await page.locator('form button[type="submit"]').click();
  await answerIntake(page);
  await startLearning(page);
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await page.getByLabel("下一頁", { exact: true }).click();
  const editor = page.getByLabel("程式碼編輯器");
  const run = page.getByRole("button", { name: "執行 Python" });
  const status = page.locator(".python-run-status");
  const error = page.locator(".python-error");
  await editor.fill("import sys, io\nsys.stdout = io.StringIO()");
  await run.click();
  await expect(status).toHaveText("執行完成", { timeout: 60000 });
  await editor.fill("print(5)");
  await run.click();
  await expect(page.getByLabel("Python 標準輸出")).toHaveText("5\n");
  await editor.fill("while True: pass");
  await run.click();
  await expect(status).toHaveText("執行中…", { timeout: 60000 });
  await page.getByRole("button", { name: "停止", exact: true }).click();
  await expect(status).toHaveText("已停止");
  await run.click();
  await expect(error).toContainText("執行超過 10 秒", { timeout: 30000 });
  await editor.fill("print('x' * 21000)");
  await run.click();
  await expect(error).toContainText(/輸出|Output limit/);
  expect(
    (await page.getByLabel("Python 標準輸出").innerText()).length,
  ).toBeLessThanOrEqual(20000);
  await editor.fill("print(2 + 3)");
  await run.click();
  await expect(status).toHaveText("執行完成");
  await expect(page.getByLabel("Python 標準輸出")).toHaveText("5\n");
  const warmStart = Date.now();
  await editor.fill("print(7 + 8)");
  await run.click();
  await expect(page.getByLabel("Python 標準輸出")).toHaveText("15\n", {
    timeout: 3000,
  });
  console.log(`Warm Python run including save/UI: ${Date.now() - warmStart}ms`);
  await editor.fill("print(2 + 3)");
  await run.click();
  await expect(page.getByLabel("Python 標準輸出")).toHaveText("5\n");
  await expect(
    page.getByRole("button", { name: "驗證我的練習" }),
  ).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("python-practice.png") });
});
