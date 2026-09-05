import { expect, test } from "./fixtures/course-test";
test("explore labels illustrative content and stays usable on narrow phones", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/explore");
  await expect(
    page.getByText("課程構想 · 尚未開放", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "開始學習", exact: true }).click();
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]")).toHaveAttribute(
    "data-section",
    "languages",
  );
});
test("text fields have no nested square focus border", async ({ page }) => {
  await page.goto("/");
  const goal = page.getByRole("textbox", { name: "你想學什麼？" });
  await goal.focus();
  await expect(goal).toHaveCSS("box-shadow", "none");
  await expect(goal).toHaveCSS("outline-style", "none");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  await page.getByRole("button", { name: "小問題" }).click();
  const question = page.getByPlaceholder("哪個地方還不太懂？");
  await question.focus();
  await expect(question).toHaveCSS("box-shadow", "none");
  await page.keyboard.press("Escape");
  await page.getByLabel("下一頁", { exact: true }).click();
  const command = page.getByPlaceholder("輸入指令…");
  await command.focus();
  await expect(command).toHaveCSS("box-shadow", "none");
  await command.fill("edit index.html");
  await command.press("Enter");
  const editor = page.getByRole("textbox", { name: "程式碼編輯器" });
  await editor.focus();
  await expect(editor).toHaveCSS("box-shadow", "none");
  await page.getByRole("button", { name: "切換深淺色" }).click();
  await editor.focus();
  await expect(editor).toHaveCSS("box-shadow", "none");
});
test("JavaScript demonstration shows the result of a real preview button click", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  let course = await (
    await page.request.post("/api/courses", {
      data: {
        goal: "JS guidance",
        mode: "demo",
        requestId: crypto.randomUUID(),
      },
    })
  ).json();
  await page.request.post("/api/progress/check", {
    data: { courseId: course.id, sectionId: "check", answer: 1 },
  });
  course = await (
    await page.request.post(`/api/courses/${course.id}/advance`, { data: {} })
  ).json();
  for (const path of ["/index.html", "/style.css"]) {
    await page.request.put("/api/workspace/files", {
      data: {
        courseId: course.id,
        baseRevision: course.workspace.revision,
        files: {
          [path]:
            course.workspace.files[path] +
            (path.endsWith("css")
              ? "\n/* #23856b */"
              : "\n<!-- Hello Methelia -->"),
        },
      },
    });
    await page.request.post("/api/progress/check", {
      data: { courseId: course.id, sectionId: "practice" },
    });
    course = await (
      await page.request.post(`/api/courses/${course.id}/advance`, { data: {} })
    ).json();
  }
  expect(course.currentNodeId).toBe("js");
  await page.goto("/");
  await expect(page.locator("[data-section]").first()).toBeVisible();
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByRole("button", { name: "看老師示範", exact: true }).click();
  await page.getByRole("button", { name: "看修改結果" }).click();
  await expect(
    page
      .frameLocator('iframe[title="實作網站預覽"]')
      .getByRole("heading", { name: "Hello Methelia" }),
  ).toBeVisible();
});
test("leaving practice for home saves the current editor draft", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  const snapshot = await (
    await page.request.post("/api/sessions", { data: {} })
  ).json();
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByPlaceholder("輸入指令…").fill("edit index.html");
  await page.getByPlaceholder("輸入指令…").press("Enter");
  await page
    .getByRole("textbox", { name: "程式碼編輯器" })
    .fill("<h1>Keep my draft</h1>");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Methelia" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "你想學什麼？" }),
  ).toBeVisible();
  const workspace = await (
    await page.request.get("/api/workspace?courseId=" + snapshot.course.id)
  ).json();
  expect(workspace.files["/index.html"]).toBe("<h1>Keep my draft</h1>");
});
test("prepared audio drives demonstration, pause, seek, replay, and learner handoff", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const response = await page.request.post("/api/courses", {
    data: {
      goal: "Audio clock test",
      mode: "demo",
      requestId: crypto.randomUUID(),
    },
  });
  const course = await response.json();
  const pkg = course.chapters.web;
  pkg.speech = "ready";
  delete pkg.pageAudio;
  pkg.cues = [
    { sectionId: "languages", start: 0, end: 1 },
    { sectionId: "structure", start: 1, end: 7 },
    { sectionId: "check", start: 7, end: 10 },
  ];
  pkg.captions = [
    { sectionId: "languages", text: "先認識網站。", start: 0, end: 1 },
    { sectionId: "structure", text: "我們先找到標題。", start: 1, end: 4 },
    { sectionId: "structure", text: "左側畫面已更新。", start: 4, end: 7 },
    { sectionId: "check", text: "現在換你試試。", start: 7, end: 10 },
  ];
  await page.route("**/api/sessions", (route) =>
    route.fulfill({ json: { course } }),
  );
  // Test-only silent WAV: validates the browser media clock, not Fish voice quality.
  const samples = 8000 * 12;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  await page.route("**/api/audio/*", (route) => {
    const range = route
      .request()
      .headers()
      .range?.match(/bytes=(\d+)-(\d*)/);
    if (!range)
      return route.fulfill({
        contentType: "audio/wav",
        body: wav,
        headers: { "Accept-Ranges": "bytes" },
      });
    const start = Number(range[1]),
      end = range[2]
        ? Math.min(Number(range[2]), wav.length - 1)
        : wav.length - 1;
    return route.fulfill({
      status: 206,
      contentType: "audio/wav",
      body: wav.subarray(start, end + 1),
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${wav.length}`,
      },
    });
  });
  await page.goto("/");
  const audio = page.locator("audio");
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.readyState))
    .toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: "播放解說" }).click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(false);
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(true);
  await expect(page.locator("[data-section]")).toHaveAttribute(
    "data-section",
    "languages",
  );
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(false);
  expect(
    await audio.evaluate((a: HTMLAudioElement) => a.currentTime),
  ).toBeGreaterThanOrEqual(1);
  await expect(
    page.getByRole("region", { name: "實作區", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "暫停解說" }).click();
  await audio.evaluate((a: HTMLAudioElement) => {
    a.currentTime = 6;
  });
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBe(6);
  await expect(page.locator(".subtitle-line")).toHaveText("左側畫面已更新。");
  await page.getByRole("button", { name: "切換字幕" }).click();
  await expect(page.locator(".subtitle-line")).toHaveCount(0);
  await page.getByRole("button", { name: "切換字幕" }).click();
  await expect(page.locator(".subtitle-line")).toHaveText("左側畫面已更新。");
  const preview = page.frameLocator('iframe[title="實作網站預覽"]');
  await expect(
    preview.getByRole("heading", { name: "Hello Methelia" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "看老師示範", exact: true }).click();
  await expect(
    preview.getByRole("heading", { name: "我的第一個網站" }),
  ).toBeVisible();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(false);
  await audio.evaluate((a: HTMLAudioElement) => {
    a.currentTime = 7.2;
  });
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(true);
  await expect(page.locator("[data-section]")).toHaveAttribute(
    "data-section",
    "structure",
  );
  await page.getByRole("button", { name: "自己試試", exact: true }).click();
  await expect(
    preview.getByRole("heading", { name: "我的第一個網站" }),
  ).toBeVisible();
  await page.route("**/api/courses/*/advance", async (route) => {
    const response = await route.fetch();
    const next = await response.json();
    const chapter = next.chapters[next.currentNodeId];
    chapter.speech = "ready";
    delete chapter.pageAudio;
    chapter.cues = chapter.chapter.sections.map(
      (s: { id: string }, i: number) => ({
        sectionId: s.id,
        start: i * 3,
        end: (i + 1) * 3,
      }),
    );
    await route.fulfill({ json: next });
  });
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByRole("button", { name: "CSS：調整外觀樣式" }).click();
  await page.getByRole("button", { name: /下一章：/ }).click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.readyState))
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(false);
  expect(
    await audio.evaluate((a: HTMLAudioElement) => a.currentTime),
  ).toBeLessThan(3);
  await expect(
    page.getByRole("region", { name: "實作區", exact: true }),
  ).toHaveCount(0);
});
test("chapter and workspace reads enforce session ownership", async ({
  request,
  playwright,
  baseURL,
}) => {
  await request.post("/api/sessions", { data: {} });
  const created = await request.post("/api/courses", {
    data: {
      goal: "API contract test",
      mode: "demo",
      requestId: crypto.randomUUID(),
    },
  });
  expect(created.ok()).toBe(true);
  const course = await created.json();
  const chapterId = course.chapterIds.web;
  const chapter = await request.get("/api/chapters/" + chapterId);
  expect(chapter.status()).toBe(200);
  expect((await chapter.json()).chapter.nodeId).toBe("web");
  const status = await request.get(`/api/chapters/${chapterId}/status`);
  expect((await status.json()).status).toBe("ready");
  const ws = await request.get("/api/workspace?courseId=" + course.id);
  expect((await ws.json()).files["/index.html"]).toContain("<h1>");
  const other = await playwright.request.newContext({
    baseURL,
  });
  try {
    expect((await other.get("/api/chapters/" + chapterId)).status()).toBe(404);
  } finally {
    await other.dispose();
  }
});
test("learn, inspect map, enter an optional extension, practice and resume", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "HTML、CSS、JavaScript 的分工" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "開啟 Learning Map" }).click();
  await expect(
    page.getByRole("dialog", { name: "Learning Map" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Learning Map" })).toHaveCount(
    0,
  );
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByRole("button", { name: "CSS：調整外觀樣式" }).click();
  await expect(page.getByText("練習完成", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "小問題" }).click();
  await page.getByPlaceholder("哪個地方還不太懂？").fill("我不懂 HTML 標籤");
  await page.getByRole("button", { name: "送出問題" }).click();
  await page.getByRole("button", { name: "預覽補強路徑" }).click();
  await page.getByRole("button", { name: "現在進入", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Learning Map" })).toHaveCount(
    0,
  );
  await expect(page.locator("[data-section]").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /HTML 標籤與元素/ }).first(),
  ).toBeVisible();
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByPlaceholder("輸入指令…").fill("edit index.html");
  await page.getByPlaceholder("輸入指令…").press("Enter");
  const editor = page.getByRole("textbox", { name: "程式碼編輯器" });
  await editor.fill("<h1>Hello Methelia</h1>");
  await page.getByRole("button", { name: "儲存並返回 Terminal" }).click();
  await page.getByPlaceholder("輸入指令…").fill("cat index.html");
  await page.getByPlaceholder("輸入指令…").press("Enter");
  await expect(page.locator(".terminal-output")).toContainText(
    "<h1>Hello Methelia</h1>",
  );
  await expect(
    page
      .frameLocator('iframe[title="實作網站預覽"]')
      .getByRole("heading", { name: "Hello Methelia" }),
  ).toBeVisible();
  await page.reload();
  await page.getByPlaceholder("輸入指令…").fill("edit index.html");
  await page.getByPlaceholder("輸入指令…").press("Enter");
  await expect(page.getByRole("textbox", { name: "程式碼編輯器" })).toHaveValue(
    "<h1>Hello Methelia</h1>",
  );
  await page.screenshot({
    path: "test-results/course-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "切換深淺色" }).click();
  await page.screenshot({
    path: "test-results/course-dark.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("practice has left live preview, right terminal, and an isolated guided demonstration", async ({
  page,
}) => {
  const duplicateKeys: string[] = [];
  page.on("console", (m) => {
    if (m.text().includes("same key")) duplicateKeys.push(m.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  const map = page.getByRole("button", { name: "開啟 Learning Map" });
  expect((await map.boundingBox())!.x).toBeGreaterThan(1100);
  await page.getByLabel("下一頁", { exact: true }).click();
  const preview = page.locator('iframe[title="實作網站預覽"]');
  const terminal = page.getByRole("region", { name: "Terminal" });
  const left = (await preview.boundingBox())!;
  const right = (await terminal.boundingBox())!;
  expect(left.x + left.width).toBeLessThanOrEqual(right.x + 1);
  expect(right.width).toBeGreaterThan(450);
  await page.getByRole("button", { name: "看老師示範", exact: true }).click();
  await expect(page.getByText("文字示範", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "看修改結果" }).click();
  await expect(
    preview.contentFrame().getByRole("heading", { name: "Hello Methelia" }),
  ).toBeVisible();
  await expect
    .poll(async () => (await page.locator(".guide-pointer").boundingBox())!.x)
    .toBeLessThan(right.x);
  await page.screenshot({ path: "test-results/guided-practice.png" });
  await page.getByRole("button", { name: "自己試試", exact: true }).click();
  await expect(
    preview.contentFrame().getByRole("heading", { name: "我的第一個網站" }),
  ).toBeVisible();
  await page.getByPlaceholder("輸入指令…").fill("edit index.html");
  await page.getByPlaceholder("輸入指令…").press("Enter");
  const editor = page.getByRole("textbox", { name: "程式碼編輯器" });
  await editor.fill("<h1>My live website</h1>");
  // Preview responds before saving, not after a second Run/refresh action.
  await expect(
    preview.contentFrame().getByRole("heading", { name: "My live website" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "儲存並返回 Terminal" }).click();
  await page.getByRole("button", { name: "看老師示範", exact: true }).click();
  await page.getByRole("button", { name: "自己試試", exact: true }).click();
  await expect(
    preview.contentFrame().getByRole("heading", { name: "My live website" }),
  ).toBeVisible();
  expect((await map.boundingBox())!.x).toBeGreaterThan(1100);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(terminal).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/practice-mobile.png" });
  expect(duplicateKeys).toEqual([]);
});
test("light landing and mobile lesson remain usable with an opaque map", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "先體驗一堂課" }),
  ).toBeEnabled();
  await page.screenshot({ path: "test-results/landing-desktop.png" });
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "HTML、CSS、JavaScript 的分工" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/lesson-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "開啟 Learning Map" }).click();
  await expect(page.getByRole("dialog", { name: "Learning Map" })).toHaveCSS(
    "background-color",
    "rgb(250, 249, 246)",
  );
  const originalScroll = await page.evaluate(() => window.scrollY);
  await expect(page.locator("html")).toHaveCSS("overflow", "hidden");
  await page.mouse.move(200, 250);
  await page.mouse.wheel(0, 400);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(originalScroll);
  await page.screenshot({ path: "test-results/map-desktop.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/lesson-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
