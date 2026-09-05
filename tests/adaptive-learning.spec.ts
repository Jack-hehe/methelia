import { expect, test, type Page } from "./fixtures/course-test";
import { answerIntake, startLearning } from "./fixtures/intake-browser";
import type { Snapshot } from "../src/core/state";

async function snapshot(page: Page): Promise<Snapshot> {
  const response = await page.request.post("/api/sessions", { data: {} });
  expect(response.ok()).toBe(true);
  return (await response.json()).course;
}

test("live intake, last-node extension, learning evidence and main-route restoration", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(
    baseURL !== "http://127.0.0.1:3100",
    "Requires the isolated local-model acceptance server",
  );
  await page.goto("/?home=1");
  await page
    .getByLabel("你想學什麼？")
    .fill("Build a website with controlled examples");
  await page.getByRole("button", { name: "開始學習", exact: true }).click();
  await expect(page.getByRole("radiogroup")).toBeVisible();
  await page.getByLabel("補充你的回答").fill("I have edited one page before");
  await page.getByRole("button", { name: "儲存回答", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "儲存回答", exact: true }),
  ).toBeDisabled();
  const draft = await snapshot(page);
  expect(draft.status).toBe("intake");
  expect(draft.graph).toBeNull();
  expect(draft.chapterIds).toEqual({});
  await page.reload();
  await expect(page.getByLabel("補充你的回答")).toHaveValue(
    "I have edited one page before",
  );
  await answerIntake(page);
  await startLearning(page);
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  const initial = await snapshot(page);
  expect(initial.learnerProfile?.depth).toBe("applied");
  expect(Object.keys(initial.chapterIds)).toEqual(["web"]);
  expect(initial.graph?.nodes.map((node) => node.id)).toEqual(["web", "html"]);

  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  const map = page.getByRole("dialog", { name: "Learning Map", exact: true });
  await map.locator(".map-node").filter({ hasText: "Next steps" }).click();
  await map.getByRole("button", { name: "新增節點", exact: true }).click();
  await map
    .getByLabel("主題", { exact: true })
    .fill("Compare structured examples");
  await map.getByLabel("想理解到什麼程度？").selectOption("foundation");
  await map.getByRole("button", { name: "預覽", exact: true }).click();
  await expect(map.locator(".map-node.proposed")).toHaveCount(1);
  const preview = await snapshot(page);
  expect(preview.graph).toEqual(initial.graph);
  expect(preview.preview?.afterId).toBe("html");
  await map.getByRole("button", { name: "保留稍後學習", exact: true }).click();
  await expect(map.locator(".branch-confirm")).toHaveCount(0);
  const planned = await snapshot(page);
  expect(planned.graph?.edges).toEqual(initial.graph?.edges);
  expect(planned.graph?.extensions?.[0].anchorId).toBe("html");
  expect(planned.currentNodeId).toBe("web");
  expect(Object.keys(planned.chapterIds)).toEqual(["web"]);
  await map.getByRole("button", { name: "回到課程", exact: true }).click();

  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByLabel("程式碼編輯器").fill("<h1>Welcome</h1>");
  await page.getByRole("button", { name: "驗證我的練習", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "練習完成", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByRole("button", { name: /Observe the change/ }).click();
  await page.getByRole("button", { name: "下一章：Next steps" }).click();
  await expect(page.locator(".breadcrumb strong")).toHaveText("Next steps");
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  const learned = await snapshot(page);
  expect(learned.notes?.web.checkpoints).toHaveLength(2);
  expect(
    learned.attempts?.filter((attempt) => attempt.nodeId === "web"),
  ).toHaveLength(2);

  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByLabel("程式碼編輯器").fill("<h1>My main route</h1>");
  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  await map.locator(".map-node").filter({ hasText: "Next steps" }).click();
  await map.getByRole("button", { name: "進入延伸", exact: true }).click();
  await expect(page.locator(".breadcrumb strong")).toHaveText(
    "Compare structured examples",
  );
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  const entered = await snapshot(page);
  expect(entered.extensionSession?.returnNodeId).toBe("html");
  expect(entered.progress.html.sectionId).toBe(
    entered.chapters.html.chapter!.sections[1].id,
  );
  expect(entered.extensionSession?.mainWorkspace.files["/index.html"]).toBe(
    "<h1>My main route</h1>",
  );
  await page.reload();
  await expect(page.locator(".breadcrumb strong")).toHaveText(
    "Compare structured examples",
  );
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.getByLabel("程式碼編輯器")).toHaveValue("<h1>Hello</h1>");
  await page
    .getByLabel("程式碼編輯器")
    .fill("<h1>Welcome from the branch</h1>");
  await page.getByRole("button", { name: "驗證我的練習", exact: true }).click();
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByRole("button", { name: /Observe the change/ }).click();
  await page
    .getByRole("button", { name: "完成延伸並返回主線", exact: true })
    .click();
  await expect(page.locator(".breadcrumb strong")).toHaveText("Next steps");
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await expect(page.getByLabel("程式碼編輯器")).toHaveValue(
    "<h1>My main route</h1>",
  );
  await page.reload();
  await expect(page.getByLabel("程式碼編輯器")).toHaveValue(
    "<h1>My main route</h1>",
  );
  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  await map.locator(".map-node").filter({ hasText: "Next steps" }).click();
  await expect(map.getByText("已完成延伸", { exact: true })).toBeVisible();
  const restored = await snapshot(page);
  expect(restored.extensionSession).toBeUndefined();
  expect(restored.graph?.edges).toEqual(initial.graph?.edges);
  await page.screenshot({
    path: testInfo.outputPath("adaptive-extension-and-evidence.png"),
  });
});
