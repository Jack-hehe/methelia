import { expect, test } from "@playwright/test";
import type { Snapshot } from "../src/core/state";

test("finishing speech preparation preserves a manual demonstration until playback starts", async ({
  page,
}) => {
  await page.request.post("/api/sessions", { data: {} });
  const course: Snapshot = await (
    await page.request.post("/api/courses", {
      data: {
        goal: "Narration handoff",
        mode: "demo",
        requestId: crypto.randomUUID(),
      },
    })
  ).json();
  const pkg = course.chapters.web;
  pkg.speech = "generating";
  course.progress.web.sectionId = "structure";
  await page.route("**/api/sessions", (route) =>
    route.fulfill({ json: { course } }),
  );
  await page.route(`**/api/courses/${course.id}`, (route) =>
    route.fulfill({ json: course }),
  );
  // Keep synthesis external: serve a valid silent WAV as the prepared track.
  const wav = Buffer.alloc(44 + 8000 * 10 * 2);
  wav.write("RIFF");
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
  wav.writeUInt32LE(wav.length - 44, 40);
  await page.route("**/api/audio/*", (route) =>
    route.fulfill({ contentType: "audio/wav", body: wav }),
  );
  await page.goto("/");
  await page.getByLabel("開啟實作區", { exact: true }).click();
  await page.getByRole("button", { name: "看老師示範", exact: true }).click();
  await page.getByRole("button", { name: "看修改結果" }).click();
  const preview = page.frameLocator('iframe[title="實作網站預覽"]');
  await expect(
    preview.getByRole("heading", { name: "Hello Methelia" }),
  ).toBeVisible();
  const footer = page.getByRole("contentinfo");
  const fixedPositions = () =>
    Promise.all([
      footer.boundingBox(),
      footer.getByRole("navigation", { name: "課程翻頁" }).boundingBox(),
      footer.getByRole("group", { name: "解說設定" }).boundingBox(),
      footer.getByLabel("開啟 Learning Map", { exact: true }).boundingBox(),
    ]);
  const preparingPositions = await fixedPositions();
  pkg.pageAudio = {
    structure: {
      status: "ready",
      cues: [{ sectionId: "structure", start: 0, end: 10 }],
      captions: [],
    },
  };
  pkg.speech = "ready";
  const play = page.getByLabel("播放解說", { exact: true });
  await expect(play).toBeEnabled();
  expect(await fixedPositions()).toEqual(preparingPositions);
  await expect(page.getByRole("button", { name: "再看一次" })).toBeVisible();
  await expect(
    preview.getByRole("heading", { name: "Hello Methelia" }),
  ).toBeVisible();
  expect(
    await page
      .locator("audio")
      .evaluate((audio: HTMLAudioElement) => audio.paused),
  ).toBe(true);
  await play.click();
  await expect(page.getByText("語音同步示範", { exact: true })).toBeVisible();
  await page.getByLabel("暫停解說", { exact: true }).click();
  await expect(page.getByText("語音同步示範", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "再看一次" })).toHaveCount(0);
});

test("prepared demo opens directly, resumes its page and enters the next chapter without requesting speech", async ({
  page,
}) => {
  const retries: string[] = [];
  await page.route("**/api/chapters/*/retry", (route) => {
    retries.push(route.request().url());
    return route.abort();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await expect(page.locator("[data-section]")).toHaveAttribute(
    "data-section",
    "languages",
  );
  await expect(page.locator(".chapter-gate")).toHaveCount(0);
  await expect(
    page.getByRole("contentinfo").getByRole("button", { name: "準備章節語音" }),
  ).toBeEnabled();
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await page.reload();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByRole("button", { name: "CSS：調整外觀樣式" }).click();
  await page.getByRole("button", { name: /下一章：/ }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 4");
  await expect(page.locator(".chapter-gate")).toHaveCount(0);
  expect(retries).toEqual([]);
});

for (const speech of ["pending", "generating", "failed"] as const) {
  test(`saved content stays interactive while speech is ${speech}`, async ({
    page,
  }) => {
    await page.request.post("/api/sessions", { data: {} });
    const course: Snapshot = await (
      await page.request.post("/api/courses", {
        data: {
          goal: "Entry regression",
          mode: "demo",
          requestId: crypto.randomUUID(),
        },
      })
    ).json();
    const pkg = course.chapters.web;
    pkg.speech = speech;
    // A prepared first track must not enable partial-chapter narration.
    pkg.pageAudio = {
      languages: {
        status: "ready",
        cues: [{ sectionId: "languages", start: 0, end: 4 }],
        captions: [],
      },
    };
    await page.route("**/api/sessions", (route) =>
      route.fulfill({ json: { course } }),
    );
    await page.route(`**/api/courses/${course.id}`, (route) =>
      route.fulfill({ json: course }),
    );
    const retries: string[] = [];
    await page.route("**/api/chapters/*/retry", (route) => {
      retries.push(route.request().url());
      return route.abort();
    });
    await page.goto("/");
    await expect(page.locator("[data-section]")).toHaveAttribute(
      "data-section",
      "languages",
    );
    await expect(page.locator(".chapter-gate")).toHaveCount(0);
    await expect(page.locator("audio")).toHaveCount(0);
    await expect(page.getByLabel("播放解說", { exact: true })).toBeDisabled();
    await page
      .locator(".concept-card")
      .filter({ hasText: "JavaScript" })
      .click();
    await page.locator(".mini-site button").click();
    await expect(page.locator(".mini-site button")).toContainText("你好！");
    await page.getByLabel("下一頁", { exact: true }).click();
    await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
    expect(retries).toEqual([]);
  });
}

for (const status of ["generating", "failed"] as const) {
  test(`unprepared ${status} content retains its preparation gate`, async ({
    page,
  }) => {
    await page.request.post("/api/sessions", { data: {} });
    const course: Snapshot = await (
      await page.request.post("/api/courses", {
        data: {
          goal: "Content gate",
          mode: "demo",
          requestId: crypto.randomUUID(),
        },
      })
    ).json();
    course.chapters.web.status = status;
    course.chapters.web.chapter = null;
    course.chapters.web.speech = "pending";
    course.chapters.web.error =
      status === "failed" ? "章節內容產生失敗" : undefined;
    course.progress.web.subtitleOnly = true;
    await page.route("**/api/sessions", (route) =>
      route.fulfill({ json: { course } }),
    );
    await page.route(`**/api/courses/${course.id}`, (route) =>
      route.fulfill({ json: course }),
    );
    await page.goto("/");
    await expect(page.locator(".chapter-gate")).toBeVisible();
    await expect(page.getByLabel("上一頁", { exact: true })).toBeVisible();
    await expect(page.getByLabel("上一頁", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("下一頁", { exact: true })).toBeVisible();
    await expect(page.getByLabel("下一頁", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("切換字幕", { exact: true })).toBeVisible();
    await expect(page.getByLabel("切換字幕", { exact: true })).toBeDisabled();
    await expect(page.locator("[data-section]")).toHaveCount(0);
    await expect(page.getByLabel("開啟實作區", { exact: true })).toBeDisabled();
    if (status === "failed") {
      await expect(
        page.getByRole("button", { name: "重試章節" }),
      ).toBeEnabled();
    }
  });
}
