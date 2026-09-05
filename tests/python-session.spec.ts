import { test, expect } from "./fixtures/course-test";
import { answerIntake, startLearning } from "./fixtures/intake-browser";

test("Python prewarms on the reading page and keeps its interpreter and scoped output across navigation", async ({
  page,
  baseURL,
}) => {
  test.skip(baseURL !== "http://127.0.0.1:3100");
  test.setTimeout(90000);
  let wasmLoads = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/pyodide.asm.wasm")) wasmLoads++;
  });
  await page.goto("/?home=1");
  await page.getByLabel("你想學什麼？").fill("Learn Python");
  await page.locator('form button[type="submit"]').click();
  await answerIntake(page);
  await startLearning(page);
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  // The first page has no PythonRunner view; its course already owns the runtime.
  await expect.poll(() => wasmLoads, { timeout: 60000 }).toBe(1);
  const iframe = page.locator('iframe[title="隔離的 Python 執行環境"]');
  await expect(iframe).toHaveCount(1);
  const original = await iframe.elementHandle();
  await page.getByLabel("下一頁", { exact: true }).click();
  // A normal learner mistake must not pay the interpreter startup cost again.
  await page.getByLabel("程式碼編輯器").fill("print(");
  await page.getByRole("button", { name: "執行 Python", exact: true }).click();
  await expect(page.locator(".python-error")).toContainText("SyntaxError", {
    timeout: 60000,
  });
  await expect(
    page.getByRole("button", { name: "執行 Python", exact: true }),
  ).toBeEnabled();
  expect(wasmLoads).toBe(1);
  await page.getByLabel("程式碼編輯器").fill("print('persistent session')");
  await page.getByRole("button", { name: "執行 Python", exact: true }).click();
  await expect(page.getByLabel("Python 標準輸出")).toHaveText(
    "persistent session\n",
    { timeout: 60000 },
  );
  await page.getByLabel("上一頁", { exact: true }).click();
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.getByLabel("Python 標準輸出")).toHaveText(
    "persistent session\n",
  );
  expect(
    await iframe.evaluate((element, old) => element === old, original),
  ).toBe(true);
  expect(wasmLoads).toBe(1);
  // A submitted snapshot can finish while the view is absent, then appear on return.
  await page
    .getByLabel("程式碼編輯器")
    .fill("import time\ntime.sleep(2)\nprint('finished away')");
  await page.getByRole("button", { name: "執行 Python", exact: true }).click();
  await expect(page.locator(".python-run-status")).toHaveText("執行中…");
  await page.getByLabel("上一頁", { exact: true }).click();
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.getByLabel("Python 標準輸出")).toHaveText(
    "finished away\n",
    { timeout: 10000 },
  );
  expect(wasmLoads).toBe(1);
});
