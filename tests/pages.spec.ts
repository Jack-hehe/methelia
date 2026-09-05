import { test, expect } from "./fixtures/course-test";

function silentWave(seconds: number) {
  const samples = 8000 * seconds;
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
  return wav;
}

test("legacy page audio retains independent tracks, pauses at the end and autoplays on navigation", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const course = await (
    await page.request.post("/api/courses", {
      data: {
        goal: "Page audio",
        mode: "demo",
        requestId: crypto.randomUUID(),
      },
    })
  ).json();
  const pkg = course.chapters.web;
  course.graph.nodes.find((node: { id: string }) => node.id === "html").title =
    "用 HTML 建立第一個網站：標籤、元素與頁面結構";
  pkg.speech = "ready";
  const ids = ["languages", "structure", "check"];
  pkg.pageAudio = Object.fromEntries(
    ids.map((sectionId, i) => [
      sectionId,
      {
        status: "ready",
        cues: [{ sectionId, start: 0, end: 4 }],
        captions: [{ sectionId, start: 0, end: 4, text: `第 ${i + 1} 頁解說` }],
      },
    ]),
  );
  await page.route("**/api/sessions", async (route) => {
    const snapshot = await (await route.fetch()).json();
    snapshot.course.chapters.web = pkg;
    snapshot.course.graph = course.graph;
    await route.fulfill({ json: snapshot });
  });
  // Reload now reads the pinned course ID. Keep the prepared-audio fixture
  // consistent at both read boundaries without making a paid TTS request.
  await page.route(`**/api/courses/${course.id}`, async (route) => {
    const snapshot = await (await route.fetch()).json();
    snapshot.chapters.web = pkg;
    snapshot.graph = course.graph;
    await route.fulfill({ json: snapshot });
  });
  await page.route("**/api/progress/events", async (route) => {
    // A slow page save keeps the outgoing media mounted long enough to deliver pause events.
    await new Promise((resolve) => setTimeout(resolve, 100));
    await route.continue();
  });
  const requested: string[] = [];
  await page.route("**/api/audio/*", (route) => {
    requested.push(
      new URL(route.request().url()).searchParams.get("sectionId") || "",
    );
    const wav = silentWave(4);
    const range = route
      .request()
      .headers()
      .range?.match(/bytes=(\d+)-(\d*)/);
    if (!range) return route.fulfill({ contentType: "audio/wav", body: wav });
    const start = Number(range[1]);
    const end = range[2]
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
  await expect(audio).toHaveAttribute(
    "src",
    `/api/audio/${pkg.id}?sectionId=languages`,
  );
  await expect(page.locator(".subtitle-line")).toHaveText("第 1 頁解說");
  await page.getByLabel("播放解說", { exact: true }).click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(false);
  await audio.evaluate((a: HTMLAudioElement) => {
    a.currentTime = 3.7;
  });
  await expect
    .poll(() =>
      audio.evaluate((a: HTMLAudioElement) => ({
        paused: a.paused,
        time: a.currentTime,
        duration: a.duration,
        ended: a.ended,
        seeking: a.seeking,
        ready: a.readyState,
      })),
    )
    .toEqual({
      paused: true,
      time: 4,
      duration: 4,
      ended: true,
      seeking: false,
      ready: 4,
    });
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(audio).toHaveAttribute(
    "src",
    `/api/audio/${pkg.id}?sectionId=structure`,
  );
  await expect(page.locator(".subtitle-line")).toHaveText("第 2 頁解說");
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.readyState))
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(false);
  // Retain the actual old media element, to verify unmount also stops it.
  const oldAudio = await audio.elementHandle();
  await page.getByLabel("下一頁", { exact: true }).click();
  expect(await oldAudio!.evaluate((a: HTMLAudioElement) => a.paused)).toBe(
    true,
  );
  await expect(audio).toHaveAttribute(
    "src",
    `/api/audio/${pkg.id}?sectionId=check`,
  );
  await expect(page.locator(".subtitle-line")).toHaveText("第 3 頁解說");
  await page.getByLabel("暫停解說", { exact: true }).click();
  await audio.evaluate((a: HTMLAudioElement) => {
    a.currentTime = 0;
  });
  // All controls stay usable with real media enabled, including narrow tablets
  // with media controls fixed on the right and navigation in its own slot.
  for (const width of [
    1440, 1024, 1001, 900, 801, 800, 769, 768, 700, 651, 650, 390, 361, 360,
    320,
  ]) {
    await page.setViewportSize({ width, height: 900 });
    const footer = page.getByRole("contentinfo");
    const navigation = (await page
      .getByRole("navigation", { name: "課程翻頁" })
      .boundingBox())!;
    const tools = (await footer.locator(".canvas-tools").boundingBox())!;
    const transport = (await footer.locator(".audio-transport").boundingBox())!;
    const rewind = footer.getByLabel("倒退十秒", { exact: true });
    await expect(rewind).toBeVisible();
    const rewindBounds = (await rewind.boundingBox())!;
    expect(rewindBounds.x).toBeGreaterThanOrEqual(transport.x);
    expect(rewindBounds.x + rewindBounds.width).toBeLessThanOrEqual(
      transport.x + transport.width,
    );
    expect(transport.x + transport.width).toBeLessThanOrEqual(
      transport.y + transport.height > navigation.y ? navigation.x : tools.x,
    );
    expect(navigation.x + navigation.width).toBeLessThanOrEqual(
      navigation.y < tools.y + tools.height ? tools.x : width,
    );
    const map = (await footer
      .getByLabel("開啟 Learning Map", { exact: true })
      .boundingBox())!;
    let previousRight = tools.x;
    for (const name of ["切換字幕", "切換靜音", "播放速度"]) {
      const control = footer.getByLabel(name, { exact: true });
      await expect(control).toBeVisible();
      const bounds = (await control.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(previousRight);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(map.x);
      previousRight = bounds.x + bounds.width;
    }
    expect(tools.x + tools.width).toBeLessThanOrEqual(width);
    expect(
      (await footer.getByRole("slider", { name: "解說進度" }).boundingBox())!
        .width,
    ).toBeGreaterThan(width - 70);
    const subtitle = (await page.locator(".subtitle-line").boundingBox())!;
    expect(subtitle.y).toBeLessThan((await footer.boundingBox())!.y);
    // Captions are an independent overlay and must not reserve content space.
    await expect(page.locator(".subtitle-line")).toHaveCSS(
      "pointer-events",
      "none",
    );
    await page.screenshot({ path: `test-results/audio-footer-${width}.png` });
  }
  const footer = page.getByRole("contentinfo");
  const fixedBounds = await footer.boundingBox();
  await expect(
    footer.getByLabel("播放速度", { exact: true }),
  ).toHaveAccessibleDescription("目前速度 1 倍");
  await footer.getByLabel("切換字幕", { exact: true }).click();
  await expect(page.locator(".subtitle-line")).toHaveCount(0);
  expect(await footer.boundingBox()).toEqual(fixedBounds);
  await footer.getByLabel("切換字幕", { exact: true }).click();
  await footer.getByLabel("切換靜音", { exact: true }).click();
  expect(await audio.evaluate((a: HTMLAudioElement) => a.muted)).toBe(true);
  await footer.getByLabel("切換靜音", { exact: true }).click();
  expect(await audio.evaluate((a: HTMLAudioElement) => a.muted)).toBe(false);
  await footer.getByLabel("播放速度", { exact: true }).click();
  expect(await audio.evaluate((a: HTMLAudioElement) => a.playbackRate)).toBe(
    1.25,
  );
  await expect(
    footer.getByLabel("播放速度", { exact: true }),
  ).toHaveAccessibleDescription("目前速度 1.25 倍");
  expect(await footer.boundingBox()).toEqual(fixedBounds);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.readyState))
    .toBeGreaterThanOrEqual(2);
  expect(
    await audio.evaluate((a: HTMLAudioElement) => ({
      time: a.currentTime,
      paused: a.paused,
    })),
  ).toEqual({ time: 0, paused: true });
  expect(new Set(requested)).toEqual(new Set(ids));
  // Let serialized saves drain before checking the persisted page, not only local selection.
  await expect
    .poll(
      async () =>
        (await (await page.request.post("/api/sessions", { data: {} })).json())
          .course.progress.web.sectionId,
    )
    .toBe("check");
  await page.reload();
  await expect(page.getByLabel("頁碼")).toHaveText("3 / 3");
  await expect(audio).toHaveAttribute(
    "src",
    `/api/audio/${pkg.id}?sectionId=check`,
  );
});

test("code pages expose their prepared example without overwriting learner files", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const course = await (
    await page.request.post("/api/courses", {
      data: {
        goal: "Code example",
        mode: "demo",
        requestId: crypto.randomUUID(),
      },
    })
  ).json();
  const pkg = course.chapters.web;
  pkg.chapter.sections[0] = {
    id: "languages",
    title: "修改標題",
    body: "參考範例修改 h1。",
    intent: "explain",
    template: "workspace",
    component: {
      type: "code.editor",
      path: "/index.html",
      language: "html",
      example: "<h1>Prepared example</h1>",
    },
  };
  course.progress.web.subtitleOnly = true;
  await page.route("**/api/sessions", (route) =>
    route.fulfill({ json: { course } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "查看範例", exact: true }).click();
  await expect(page.getByLabel("本頁程式碼範例")).toHaveText(
    "<h1>Prepared example</h1>",
  );
  await page.getByRole("button", { name: "自己試試", exact: true }).click();
  await page.getByLabel("終端機指令").fill("edit index.html");
  await page.getByLabel("終端機指令").press("Enter");
  await expect(page.getByLabel("程式碼編輯器")).toHaveValue(
    course.workspace.files["/index.html"],
  );
});

test("a failed next-page audio load cannot restore the outgoing page in saved progress", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const course = await (
    await page.request.post("/api/courses", {
      data: {
        goal: "Audio page save race",
        mode: "demo",
        requestId: crypto.randomUUID(),
      },
    })
  ).json();
  const pkg = course.chapters.web;
  pkg.speech = "ready";
  pkg.pageAudio = Object.fromEntries(
    ["languages", "structure", "check"].map((sectionId) => [
      sectionId,
      {
        status: "ready",
        cues: [{ sectionId, start: 0, end: 4 }],
        captions: [],
      },
    ]),
  );
  await page.route("**/api/sessions", async (route) => {
    const snapshot = await (await route.fetch()).json();
    snapshot.course.chapters.web = pkg;
    await route.fulfill({ json: snapshot });
  });
  await page.route("**/api/audio/*", (route) =>
    new URL(route.request().url()).searchParams.get("sectionId") === "languages"
      ? route.fulfill({ contentType: "audio/wav", body: silentWave(4) })
      : route.abort("failed"),
  );
  // Delay the destination save so native pause/timeupdate tasks run before navigation commits.
  await page.route("**/api/progress/events", async (route) => {
    if (route.request().postDataJSON().sectionId === "structure")
      await new Promise((resolve) => setTimeout(resolve, 200));
    await route.continue();
  });
  await page.goto("/");
  await page.getByLabel("播放解說", { exact: true }).click();
  await expect
    .poll(() =>
      page.locator("audio").evaluate((a: HTMLAudioElement) => a.currentTime),
    )
    .toBeGreaterThan(0.1);
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(
    page.getByText("語音無法播放，請重整後重試。", { exact: true }),
  ).toBeVisible();
  // The page has no metadata events to accidentally overwrite an outgoing pause save.
  await page.waitForTimeout(400);
  const saved = await (
    await page.request.post("/api/sessions", { data: {} })
  ).json();
  expect(saved.course.progress.web.sectionId).toBe("structure");
  await page.reload();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
});

test("review can enable prepared narration and keeps its draft isolated from the current chapter", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const created = await (
    await page.request.post("/api/courses", {
      data: {
        goal: "Review mode",
        mode: "demo",
        requestId: crypto.randomUUID(),
      },
    })
  ).json();
  await page.request.post("/api/progress/check", {
    data: { courseId: created.id, sectionId: "check", answer: 1 },
  });
  const course = await (
    await page.request.post(`/api/courses/${created.id}/advance`, { data: {} })
  ).json();
  course.progress.html.subtitleOnly = true;
  course.progress.web = {
    ...course.progress.web,
    subtitleOnly: true,
    sectionId: "check",
  };
  course.chapters.web.speech = "ready";
  course.chapters.web.pageAudio = {
    check: {
      status: "ready",
      cues: [{ sectionId: "check", start: 0, end: 4 }],
      captions: [],
    },
  };
  await page.route("**/api/sessions", (route) =>
    route.fulfill({ json: { course } }),
  );
  await page.route("**/api/audio/*", (route) =>
    route.fulfill({ contentType: "audio/wav", body: silentWave(4) }),
  );
  await page.goto("/");
  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  await page
    .locator(".map-node")
    .filter({ hasText: "認識網站的三種語言" })
    .click();
  await page.getByRole("button", { name: "複習這一章" }).click();
  await page.getByRole("button", { name: "啟用語音解說" }).click();
  await expect(page.getByLabel("播放解說", { exact: true })).toBeEnabled();
  await page.getByLabel("上一頁", { exact: true }).click();
  await page.getByLabel("終端機指令").fill("edit index.html");
  await page.getByLabel("終端機指令").press("Enter");
  await page.getByLabel("程式碼編輯器").fill("<h1>Review draft</h1>");
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByRole("button", { name: "回到目前章節" }).click();
  await expect(
    page.getByRole("heading", { name: "用 HTML 建立骨架", exact: true }),
  ).toBeVisible();
  const workspace = await (
    await page.request.get(`/api/workspace?courseId=${course.id}`)
  ).json();
  expect(workspace.files["/index.html"]).toBe(
    course.workspace.files["/index.html"],
  );
});

test("language comparison resets its interactive result when changing language", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  await page.locator(".concept-card").filter({ hasText: "JavaScript" }).click();
  const example = page.locator(".mini-site button");
  await example.click();
  await expect(example).toContainText("你好！");
  await page.locator(".concept-card").filter({ hasText: "HTML" }).click();
  await expect(example).toContainText("點擊按鈕");
});

test("shows one page, navigates explicitly and enters/exits fullscreen", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /先體驗一堂課/ }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  await expect(page.getByLabel("課程老師", { exact: true })).toHaveCount(0);
  await expect(page.locator("[data-section]")).toHaveCount(1);
  await expect(page.locator("[data-section]")).toHaveAttribute(
    "data-section",
    "languages",
  );
  await expect(page.getByLabel("上一頁", { exact: true })).toBeDisabled();
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.locator("[data-section]")).toHaveAttribute(
    "data-section",
    "structure",
  );
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-section]")).toHaveAttribute(
    "data-section",
    "check",
  );
  await expect(page.getByRole("button", { name: /下一章：/ })).toBeDisabled();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("[data-section]")).toHaveAttribute(
    "data-section",
    "structure",
  );
  await page.getByLabel("進入全螢幕", { exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await expect(page.getByLabel("課程老師", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "小問題", exact: true }).click();
  await expect(page.getByPlaceholder("哪個地方還不太懂？")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("region", { name: "Terminal", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/course-fullscreen.png" });
  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "回到課程" }).click();
  await page.getByLabel("離開全螢幕", { exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(false);
  await page.reload();
  await expect(page.locator("[data-section]")).toHaveAttribute(
    "data-section",
    "structure",
  );
});

test("terminal page has one preview and one terminal, saves edits on page navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /先體驗一堂課/ }).click();
  await expect(page.locator("[data-section]").first()).toBeVisible();
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Terminal", exact: true }),
  ).toHaveCount(1);
  await expect(page.locator('iframe[title="實作網站預覽"]')).toHaveCount(1);
  const input = page.getByRole("textbox", { name: "終端機指令" });
  await input.fill("edit index.html");
  await input.press("ArrowLeft");
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await input.press("Enter");
  await page
    .getByRole("textbox", { name: "程式碼編輯器" })
    .fill("<h1>Saved on page turn</h1>");
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.locator("[data-section]")).toHaveAttribute(
    "data-section",
    "check",
  );
  const snapshot = await (
    await page.request.post("/api/sessions", { data: {} })
  ).json();
  expect(snapshot.course.workspace.files["/index.html"]).toBe(
    "<h1>Saved on page turn</h1>",
  );
});
