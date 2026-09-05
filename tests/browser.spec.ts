import { expect, test } from "@playwright/test";
test("homepage catalog reveals below the first screen and arrows flank each rail", async ({
  page,
}) => {
  await page.goto("/?home=1");
  await expect(
    page.getByRole("button", { name: "Try a Lesson" }),
  ).toBeEnabled();
  const catalog = page.locator(".home-catalog");
  const reveal = catalog.locator(".catalog-reveal").first();
  expect((await catalog.boundingBox())!.y).toBeGreaterThanOrEqual(1000);
  await expect(reveal).toHaveAttribute("data-reveal", "pending");
  await page.mouse.wheel(0, 700);
  await expect(reveal).toHaveAttribute("data-reveal", "visible");
  const rail = catalog.locator(".rail").first();
  await rail.scrollIntoViewIfNeeded();
  await expect(rail.locator(".rail-prev")).toBeDisabled();
  const viewport = rail.locator(".rail-viewport");
  const left = await rail.locator(".rail-prev").boundingBox();
  const right = await rail.locator(".rail-next").boundingBox();
  const bounds = await viewport.boundingBox();
  expect(left!.x + left!.width).toBeLessThanOrEqual(bounds!.x);
  expect(right!.x).toBeGreaterThanOrEqual(bounds!.x + bounds!.width);
  await rail.locator(".rail-next").click();
  await expect(rail.locator(".rail-prev")).toBeEnabled();
  await viewport.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await expect(rail.locator(".rail-next")).toBeDisabled();
  await page.screenshot({ path: "test-results/home-catalog-desktop.png" });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await rail.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const card = await rail.locator(".course-card").first().boundingBox();
    const view = await viewport.boundingBox();
    expect(Math.abs(card!.width - view!.width)).toBeLessThan(2);
    await page.screenshot({ path: `test-results/home-catalog-${width}.png` });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(".language-trigger").click();
  await page.getByRole("menuitemradio", { name: "繁體中文" }).click();
  await expect(catalog).toContainText("第一個 HTML 檔案");
  await expect(page.locator(".hero-title .sr-only")).toHaveText(
    "網頁設計、技術分析、數位行銷、流體動力學",
  );
  await expect(reveal).toHaveAttribute("data-reveal", "visible");
});

test("brand opens home while Courses always opens explore", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Courses", exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(
    page.getByRole("link", { name: "Courses", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Methelia", exact: true }).click();
  await page.getByRole("button", { name: "Try a Lesson" }).click();
  await expect(
    page.getByRole("button", { name: "使用完整文字模式" }),
  ).toBeVisible();
  const snapshot = await (
    await page.request.post("/api/sessions", { data: {} })
  ).json();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Methelia", exact: true })
    .click();
  await page.getByRole("link", { name: "Methelia", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Try a Lesson" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "使用完整文字模式" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Courses", exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await page.getByRole("link", { name: "Methelia", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Try a Lesson" }),
  ).toBeEnabled();
  const resumed = await (
    await page.request.post("/api/sessions", { data: {} })
  ).json();
  expect(resumed.course.id).toBe(snapshot.course.id);
});

test("homepage is plain light and login is an honest bilingual entry", async ({
  page,
}) => {
  await page.goto("/?home=1");
  await expect(page.locator(".landing-effects")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Log in is coming soon");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.locator(".language-trigger").click();
  await page.getByRole("menuitemradio", { name: "繁體中文" }).click();
  await page.getByRole("button", { name: "登入", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("登入功能即將開放");
  await page.getByRole("button", { name: "知道了" }).click();
});

test("homepage language switches preserve input and persist with keyboard navigation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const chooser = page.locator(".language-trigger");
  await expect(chooser).toHaveText("EN");
  await expect(page.locator(".typed")).toHaveText("Web Design");
  await page.getByRole("textbox").fill("My portfolio / 我的作品");
  await chooser.press("ArrowDown");
  await expect(
    page.getByRole("menuitemradio", { name: "EN", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(chooser).toHaveText("繁體中文");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await expect(page.locator(".typed")).toHaveText("網頁設計");
  await expect(page.getByRole("textbox", { name: "你想學什麼？" })).toHaveValue(
    "My portfolio / 我的作品",
  );
  await expect(page.getByRole("button", { name: "開始學習" })).toBeEnabled();
  await chooser.click();
  await page.keyboard.press("Escape");
  await expect(chooser).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.reload();
  await expect(chooser).toHaveText("繁體中文");
  await chooser.click();
  await page.getByRole("menuitemradio", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".typed")).toHaveText("Web Design");
  await page.reload();
  await expect(chooser).toHaveText("EN");
  await expect(page.locator(".landing .site-footer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Discord/i })).toHaveCount(0);
});

test("homepage language menu fits mobile and desktop in fixed light mode", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    localStorage.setItem("methelia-theme", "dark"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /切換深淺色|Toggle light and dark mode/ }),
  ).toHaveCount(0);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const language of ["zh", "en"]) {
      await page.locator(".language-trigger").click();
      await page
        .getByRole("menuitemradio", {
          name: language === "zh" ? "繁體中文" : "EN",
          exact: true,
        })
        .click();
      {
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          "light",
        );
        await page.locator(".language-trigger").click();
        const menu = await page.getByRole("menu").boundingBox();
        const trigger = await page.locator(".language-trigger").boundingBox();
        expect(menu!.x).toBeGreaterThanOrEqual(0);
        expect(menu!.x + menu!.width).toBeLessThanOrEqual(width);
        expect(menu!.y).toBeGreaterThanOrEqual(trigger!.y + trigger!.height);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `test-results/language-${width}-${language}-light.png`,
        });
        await page.locator(".hero-title").click();
        await expect(page.getByRole("menu")).toHaveCount(0);
      }
    }
  }
});

test("homepage switches animated words without mixing languages", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".typed")).toHaveText("Web Design");
  await page.locator(".language-trigger").click();
  await page.getByRole("menuitemradio", { name: "繁體中文" }).click();
  await expect(page.locator(".typed")).toHaveText("網頁設計");
  // Wait for the word to begin erasing, then change the source list.
  await page.waitForFunction(() => {
    const text = document.querySelector(".typed")?.textContent || "";
    return text.startsWith("網") && text.length < 4;
  });
  await page.locator(".language-trigger").click();
  await page.getByRole("menuitemradio", { name: "EN", exact: true }).click();
  await expect(page.locator(".typed")).toHaveText("Web Design");
});

test("explore course groups collapse independently on narrow phones", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() =>
    localStorage.setItem("methelia-home-language", "zh"),
  );
  await page.goto("/explore");
  await expect(page.locator(".page-head, .works")).toHaveCount(0);
  await expect(page.getByText("目前還沒有課程")).toBeVisible();
  const mine = page.locator("summary").filter({ hasText: "我的課程" });
  const discover = page.locator("summary").filter({ hasText: "探索更多課程" });
  await mine.click();
  await expect(page.locator(".my-courses-content")).not.toBeVisible();
  await expect(page.locator(".home-catalog")).toBeVisible();
  await mine.press("Enter");
  await expect(page.locator(".my-courses-content")).toBeVisible();
  await discover.click();
  await expect(page.locator(".home-catalog")).not.toBeVisible();
  await discover.press("Space");
  await expect(page.locator(".home-catalog")).toBeVisible();
  await expect(page.getByRole("button", { name: /Discord/i })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("heading", { name: "探索更多課程" })
    .scrollIntoViewIfNeeded();
  await expect(page.locator(".card-stats")).toHaveCount(23);
  await expect(
    page.locator(".manifesto, .demo-invite, .site-footer"),
  ).toHaveCount(0);
  await page.screenshot({ path: "test-results/courses-groups-mobile.png" });
});

test("courses toolbar matches home and shares language and login behavior", async ({
  page,
}) => {
  await page.goto("/?home=1");
  await expect(
    page.getByRole("button", { name: "Try a Lesson" }),
  ).toBeEnabled();
  const layout = () =>
    page.locator(".site-header").evaluate((el) =>
      [...el.children].map((child) => {
        const r = child.getBoundingClientRect();
        return [r.x, r.y, r.width, r.height];
      }),
    );
  const homeLayout = await layout();
  await page.getByRole("link", { name: "Courses", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Courses" })).toBeVisible();
  const coursesLayout = await layout();
  coursesLayout.forEach((bounds, i) =>
    bounds.forEach((value, j) =>
      expect(Math.abs(value - homeLayout[i][j])).toBeLessThan(3),
    ),
  );
  await expect(
    page.getByRole("link", { name: "View source on GitHub" }),
  ).toHaveAttribute("href", "https://github.com/Jack-hehe/methelia");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Log in is coming soon");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Choose language" }).click();
  await page.getByRole("menuitemradio", { name: "繁體中文" }).click();
  await expect(page.getByRole("heading", { name: "我的課程" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "登入", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "選擇語言" })).toHaveText(
    "繁體中文",
  );
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "選擇語言" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.screenshot({
      path: "test-results/courses-toolbar-" + width + ".png",
    });
    await page.keyboard.press("Escape");
  }
  await page.getByRole("link", { name: "Methelia", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "先體驗一堂課" }),
  ).toBeVisible();
});
test("text fields have no nested square focus border", async ({ page }) => {
  await page.goto("/");
  const goal = page.getByRole("textbox", {
    name: "What do you want to learn?",
  });
  await goal.focus();
  await expect(goal).toHaveCSS("box-shadow", "none");
  await expect(goal).toHaveCSS("outline-style", "none");
  await page.getByRole("button", { name: "Try a Lesson" }).click();
  await page.getByRole("button", { name: "使用完整文字模式" }).click();
  await page.getByRole("button", { name: "小問題" }).click();
  const question = page.getByPlaceholder("哪個地方還不太懂？");
  await question.focus();
  await expect(question).toHaveCSS("box-shadow", "none");
  await page.keyboard.press("Escape");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "開啟實作區" })
    .click();
  const command = page.getByPlaceholder("輸入指令…");
  await command.focus();
  await expect(command).toHaveCSS("box-shadow", "none");
  await command.fill("edit index.html");
  await command.press("Enter");
  const editor = page.getByRole("textbox", { name: "程式碼編輯器" });
  await editor.focus();
  await expect(editor).toHaveCSS("box-shadow", "none");
  await expect(page.getByRole("button", { name: "切換深淺色" })).toHaveCount(0);
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
  await page.getByRole("button", { name: "使用完整文字模式" }).click();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "開啟實作區" })
    .click();
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
  await page.getByRole("button", { name: "Try a Lesson" }).click();
  await page.getByRole("button", { name: "使用完整文字模式" }).click();
  const snapshot = await (
    await page.request.post("/api/sessions", { data: {} })
  ).json();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "開啟實作區" })
    .click();
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
    page.getByRole("button", { name: "Try a Lesson" }),
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
  pkg.cues = [
    { sectionId: "languages", start: 0, end: 1 },
    { sectionId: "structure", start: 1, end: 7 },
    { sectionId: "check", start: 7, end: 10 },
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
  await expect(
    page.getByRole("button", { name: "自己試試", exact: true }),
  ).toHaveClass(/studio-selected/);
  await expect(
    preview.getByRole("heading", { name: "我的第一個網站" }),
  ).toBeVisible();
  await page.route("**/api/courses/*/advance", async (route) => {
    const response = await route.fetch();
    const next = await response.json();
    const chapter = next.chapters[next.currentNodeId];
    chapter.speech = "ready";
    chapter.cues = chapter.chapter.sections.map(
      (s: { id: string }, i: number) => ({
        sectionId: s.id,
        start: i * 3,
        end: (i + 1) * 3,
      }),
    );
    await route.fulfill({ json: next });
  });
  await page.getByRole("button", { name: "關閉實作區" }).click();
  await page.getByRole("button", { name: "CSS：調整外觀樣式" }).click();
  await page.getByRole("button", { name: "繼續下一章" }).click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.readyState))
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBe(0);
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(true);
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
test("learn, inspect map, practice, add branch, and resume", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Try a Lesson" }).click();
  await page.getByRole("button", { name: "使用完整文字模式" }).click();
  await expect(
    page.getByRole("heading", { name: "一個網站，三種默契" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "開啟 Learning Map" }).click();
  await expect(
    page.getByRole("dialog", { name: "Learning Map" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Learning Map" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "CSS：調整外觀樣式" }).click();
  await expect(page.getByText("練習完成", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "小問題" }).click();
  await page.getByPlaceholder("哪個地方還不太懂？").fill("我不懂 HTML 標籤");
  await page.getByRole("button", { name: "送出問題" }).click();
  await page.getByRole("button", { name: "預覽補強路徑" }).click();
  await page.getByRole("button", { name: "加入學習路徑" }).click();
  await expect(page.getByText("HTML 標籤與元素").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "繼續下一章" }).click();
  await page.getByRole("button", { name: "使用完整文字模式" }).click();
  await expect(
    page.getByRole("heading", { name: "HTML 標籤與元素", exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "開啟實作區" })
    .click();
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
  await page
    .getByRole("banner")
    .getByRole("button", { name: "開啟實作區" })
    .click();
  await page.getByPlaceholder("輸入指令…").fill("edit index.html");
  await page.getByPlaceholder("輸入指令…").press("Enter");
  await expect(page.getByRole("textbox", { name: "程式碼編輯器" })).toHaveValue(
    "<h1>Hello Methelia</h1>",
  );
  await page.screenshot({
    path: "test-results/course-desktop.png",
    fullPage: true,
  });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({
    path: "test-results/course-light.png",
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
  await page.getByRole("button", { name: "Try a Lesson" }).click();
  await page.getByRole("button", { name: "使用完整文字模式" }).click();
  const map = page.getByRole("button", { name: "開啟 Learning Map" });
  expect((await map.boundingBox())!.x).toBeGreaterThan(1100);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "開啟實作區" })
    .click();
  const preview = page.locator('iframe[title="實作網站預覽"]');
  const terminal = page.getByRole("region", { name: "Terminal" });
  const left = (await preview.boundingBox())!;
  const right = (await terminal.boundingBox())!;
  expect(left.x + left.width).toBeLessThanOrEqual(right.x + 1);
  expect(right.width).toBeGreaterThan(600);
  await page.getByRole("button", { name: "看老師示範", exact: true }).click();
  await expect(
    page.getByText("文字示範 · 尚無語音", { exact: true }),
  ).toBeVisible();
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
    page.getByRole("button", { name: "Try a Lesson" }),
  ).toBeEnabled();
  await page.screenshot({ path: "test-results/landing-desktop.png" });
  await page.getByRole("button", { name: "Try a Lesson" }).click();
  await page.getByRole("button", { name: "使用完整文字模式" }).click();
  await expect(
    page.getByRole("heading", { name: "一個網站，三種默契" }),
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
