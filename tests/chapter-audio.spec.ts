import { test, expect, type Page } from "./fixtures/course-test";
import type { Chapter, Graph } from "../src/core/protocol";
import type { PackageState, Progress, Snapshot } from "../src/core/state";
import { emptyWorkspace } from "../src/core/workspace";

// Native browser media playback, without a speech provider or encoded fixture.
function silentWav(seconds: number) {
  const sampleRate = 8000;
  const size = seconds * sampleRate * 2;
  const wav = Buffer.alloc(44 + size);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + size, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(size, 40);
  return wav;
}

test("playing chrome hides after idle, expands canvas, and returns on movement or page pause", async ({
  page,
}) => {
  await mockChapterCourse(page);
  const shell = page.locator(".course-shell");
  const canvas = page.getByRole("main", { name: "課程畫布" });
  const original = (await canvas.boundingBox())!.height;
  const caption = page.locator(".subtitle-line");
  const captionBounds = await caption.boundingBox();
  await page.getByRole("button", { name: "播放解說", exact: true }).click();
  await page.mouse.move(500, 240);
  await expect(shell).toHaveAttribute("data-controls-hidden", "true", {
    timeout: 3500,
  });
  await expect(page.locator(".canvas-controls")).toHaveAttribute("inert", "");
  await expect(page.locator(".subtitle-line")).toBeVisible();
  await expect(caption).toBeInViewport();
  expect(await caption.boundingBox()).toEqual(captionBounds);
  await expect(page.locator(".canvas-controls .subtitle-line")).toHaveCount(0);
  await expect
    .poll(async () => (await canvas.boundingBox())!.height)
    .toBeGreaterThan(original + 50);
  await page.mouse.move(510, 250);
  await expect(shell).toHaveAttribute("data-controls-hidden", "false");
  await expect(page.locator("audio")).toHaveJSProperty("paused", false);
  await expect(page.locator("audio")).toHaveJSProperty("paused", true, {
    timeout: 2500,
  });
  await expect(shell).toHaveAttribute("data-controls-hidden", "false");
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
});

for (const width of [1440, 390]) {
  test(`captions overlay content without changing layout at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockChapterCourse(page);
    const caption = page.locator(".subtitle-line");
    await expect(caption).toBeVisible();
    await expect(caption).toBeInViewport();
    const canvas = page.getByRole("main", { name: "課程畫布" });
    const geometry = () =>
      canvas.evaluate((element) => ({
        height: element.getBoundingClientRect().height,
        top: element.getBoundingClientRect().top,
        scrollHeight: element.scrollHeight,
      }));
    const before = await geometry();
    await page.getByRole("button", { name: "切換字幕" }).click();
    await expect(caption).toHaveCount(0);
    expect(await geometry()).toEqual(before);
    await page.getByRole("button", { name: "切換字幕" }).click();
    await expect(caption).toBeVisible();
    expect(await geometry()).toEqual(before);
    await expect(page.locator(".canvas-controls .subtitle-line")).toHaveCount(
      0,
    );
    expect(
      await caption.evaluate(
        (element) => getComputedStyle(element).pointerEvents,
      ),
    ).toBe("none");
  });
}

test("keyboard interaction keeps playback controls accessible", async ({
  page,
}) => {
  await mockChapterCourse(page);
  const play = page.getByRole("button", { name: "播放解說", exact: true });
  await play.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2800);
  await expect(page.locator(".course-shell")).toHaveAttribute(
    "data-controls-hidden",
    "false",
  );
  await expect(
    page.getByRole("button", { name: "暫停解說", exact: true }),
  ).toBeFocused();
});

function chapterPackage(nodeId: string, cueEndOffset = 0): PackageState {
  const sections: Chapter["sections"] = [0, 1, 2].map((index) => ({
    id: `${nodeId}-page-${index + 1}`,
    title: `段落 ${index + 1}`,
    body: `這是第 ${index + 1} 個解說段落。`,
    intent: "explain",
    template: "narrative",
    component: {
      type: "lesson.article",
      paragraphs: ["同一段章節解說會隨時間切換學習頁面。"],
      takeaway: "每個頁面對應整章音軌中的一段。",
    },
  }));
  const cues = sections.map((section, index) => ({
    sectionId: section.id,
    start: index * 4,
    end: (index + 1) * 4 - cueEndOffset,
  }));
  return {
    id: `audio-${nodeId}`,
    nodeHash: nodeId,
    narrationMode: "chapter",
    status: "ready",
    speech: "ready",
    chapter: {
      schemaVersion: 2,
      environment: "none",
      nodeId,
      title: nodeId === "first" ? "第一章" : "第二章",
      objective: "測試整章解說與頁面同步。",
      sections,
      script: sections.map((s) => ({ sectionId: s.id, text: s.body })),
      workspaceSetup: {},
    },
    cues,
    captions: cues.map((cue, index) => ({ ...cue, text: `字幕 ${index + 1}` })),
  };
}

async function mockChapterCourse(page: Page, cueEndOffset = 0) {
  const graph: Graph = {
    schemaVersion: 2,
    title: "整章語音測試",
    nodes: ["first", "second"].map((id, index) => ({
      id,
      title: index ? "第二章" : "第一章",
      objective: "章節語音同步",
      minutes: 1,
      kind: "main",
      environment: "none",
      prerequisites: index ? ["first"] : [],
    })),
    edges: [{ from: "first", to: "second" }],
  };
  const progress = (node: string): Progress => ({
    time: 0,
    sectionId: `${node}-page-1`,
    done: [],
    subtitleOnly: false,
    follow: false,
  });
  const course: Snapshot = {
    id: "chapter-audio-course",
    goal: "章節音軌測試",
    mode: "live",
    status: "ready",
    language: "zh-TW",
    scopeAccepted: true,
    graph,
    revision: 1,
    currentNodeId: "first",
    completed: [],
    chapterIds: { first: "audio-first", second: "audio-second" },
    chapters: {
      first: chapterPackage("first", cueEndOffset),
      second: chapterPackage("second", cueEndOffset),
    },
    progress: { first: progress("first"), second: progress("second") },
    workspace: emptyWorkspace(),
    messages: [],
    preview: null,
    confirmed: {},
    createdAt: 0,
  };
  let ready = false;
  let polls = 0;
  const audioUrls = new Set<string>();
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/audio/")) {
      audioUrls.add(
        new URL(route.request().url()).pathname +
          new URL(route.request().url()).search,
      );
      const wav = silentWav(12);
      const range = route.request().headers().range;
      const match = range && /^bytes=(\d+)-(\d*)$/.exec(range);
      const start = match ? Number(match[1]) : 0;
      const end = match?.[2]
        ? Math.min(Number(match[2]), wav.length - 1)
        : wav.length - 1;
      // Match the real audio endpoint: Chromium needs byte-range responses to
      // expose a seekable range, even when the complete WAV fits in memory.
      await route.fulfill({
        status: match ? 206 : 200,
        contentType: "audio/wav",
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Length": String(end - start + 1),
          ...(match
            ? { "Content-Range": `bytes ${start}-${end}/${wav.length}` }
            : {}),
        },
        body: wav.subarray(start, end + 1),
      });
    } else if (path === "/api/sessions") {
      await route.fulfill({ json: { course } });
    } else if (path === "/api/progress/events") {
      const update = route.request().postDataJSON();
      const saved = { ...course.progress[update.nodeId], ...update };
      course.progress[update.nodeId] = saved;
      await route.fulfill({ json: saved });
    } else if (path.endsWith("/advance")) {
      course.completed = ["first"];
      course.currentNodeId = "second";
      course.chapters.second.speech = "generating";
      await route.fulfill({ json: course });
    } else if (path === `/api/courses/${course.id}`) {
      polls++;
      if (ready) course.chapters.second.speech = "ready";
      await route.fulfill({ json: course });
    } else {
      await route.fulfill({
        status: 404,
        json: { error: `Unexpected test API: ${path}` },
      });
    }
  });
  await page.goto("/");
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await expect(
    page.getByRole("button", { name: "播放解說", exact: true }),
  ).toBeEnabled();
  return {
    audioUrls,
    progress: (node: string) => course.progress[node],
    allowNextAudio: () => {
      ready = true;
    },
    polls: () => polls,
  };
}

test("chapter navigation autoplays at absolute cues and retains one audio element", async ({
  page,
}) => {
  const fixture = await mockChapterCourse(page);
  const audio = page.locator("audio");
  await expect(audio).toHaveCount(1);
  await expect(page.locator("[data-page-marker]")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "第 2 頁：段落 2，0:04", exact: true }),
  ).toBeEnabled();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(true);
  await audio.evaluate((a) => {
    a.dataset.originalAudio = "true";
  });
  await expect(page.getByRole("slider", { name: "解說進度" })).toHaveAttribute(
    "max",
    "12",
  );

  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await expect(
    page.getByRole("button", { name: "暫停解說", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThanOrEqual(4);
  await expect(audio).toHaveAttribute("data-original-audio", "true");
  await expect(audio).toHaveAttribute("src", "/api/audio/audio-first");
  expect([...fixture.audioUrls]).toEqual(["/api/audio/audio-first"]);

  await page.getByLabel("上一頁", { exact: true }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(false);
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeLessThan(4);
  await expect(audio).toHaveAttribute("data-original-audio", "true");
});

test("natural playback pauses on this page; next autoplays and seeking selects a paused page", async ({
  page,
}) => {
  await mockChapterCourse(page);
  const audio = page.locator("audio");
  await audio.evaluate((a: HTMLAudioElement) => {
    a.currentTime = 3.7;
    a.dataset.originalAudio = "true";
  });
  await page.getByRole("button", { name: "播放解說", exact: true }).click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(true);
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(3.9);
  expect(
    await audio.evaluate((a: HTMLAudioElement) => a.currentTime),
  ).toBeLessThan(4);
  await expect(page.locator(".subtitle-line")).toHaveText("字幕 1");
  await page.getByRole("button", { name: "播放解說", exact: true }).click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeLessThan(1);
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(false);
  await expect(audio).toHaveAttribute("data-original-audio", "true");
  await expect(page.locator(".subtitle-line")).toHaveText("字幕 2");

  const slider = page.getByRole("slider", { name: "解說進度" });
  const bounds = (await slider.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width * 0.5,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.15,
    bounds.y + bounds.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(true);
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeLessThan(4);
  await expect(audio).toHaveAttribute("data-original-audio", "true");
  await expect(page.locator(".subtitle-line")).toHaveText("字幕 1");
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(1);
  await page
    .getByRole("button", { name: "第 3 頁：段落 3，0:08", exact: true })
    .click();
  await expect(page.getByLabel("頁碼")).toHaveText("3 / 3");
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBe(8);
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(true);
});

test("page boundary timer pauses without timeupdate and preserves the saved section", async ({
  page,
}) => {
  const fixture = await mockChapterCourse(page);
  const audio = page.locator("audio");
  await audio.evaluate((a: HTMLAudioElement) => {
    a.addEventListener(
      "timeupdate",
      (event) => event.stopImmediatePropagation(),
      true,
    );
    a.currentTime = 3.6;
    a.playbackRate = 1.5;
  });
  await page.getByRole("button", { name: "播放解說", exact: true }).click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(3.9);
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(true);
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await expect.poll(() => fixture.progress("first").time).toBeGreaterThan(3.9);
  expect(fixture.progress("first").time).toBeLessThan(4);
  expect(fixture.progress("first").sectionId).toBe("first-page-1");
});

test("paused chapter seeks retain their exact time in alignment gaps", async ({
  page,
}) => {
  const fixture = await mockChapterCourse(page, 1);
  const audio = page.locator("audio");
  const slider = page.getByRole("slider", { name: "解說進度" });
  await slider.evaluate((input: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(input, "3.5");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(audio).toHaveJSProperty("currentTime", 3.5);
  await expect(audio).toHaveJSProperty("paused", true);
  // Explicitly deliver the native event after the navigation has completed.
  await audio.evaluate((a) => a.dispatchEvent(new Event("timeupdate")));
  await expect(slider).toHaveValue("3.5");
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  await expect.poll(() => fixture.progress("first").time).toBe(3.5);
  expect(fixture.progress("first").sectionId).toBe("first-page-1");
  await page.getByRole("button", { name: "播放解說", exact: true }).click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeLessThan(1);
  await expect(audio).toHaveJSProperty("paused", false);
});

test("next chapter remembers autoplay while its narration is still preparing", async ({
  page,
}) => {
  const fixture = await mockChapterCourse(page);
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByLabel("下一頁", { exact: true }).click();
  await expect(page.getByLabel("頁碼")).toHaveText("3 / 3");
  await page
    .getByRole("button", { name: "下一章：第二章", exact: true })
    .click();
  await expect(page.locator(".breadcrumb strong")).toHaveText("第二章");
  await expect.poll(fixture.polls, { timeout: 10000 }).toBeGreaterThan(0);
  await expect(
    page.getByRole("button", { name: "播放解說", exact: true }),
  ).toBeDisabled();
  fixture.allowNextAudio();
  await expect(
    page.getByRole("button", { name: "暫停解說", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.locator("audio")).toHaveAttribute(
    "src",
    "/api/audio/audio-second",
  );
  await expect
    .poll(() =>
      page.locator("audio").evaluate((a: HTMLAudioElement) => a.paused),
    )
    .toBe(false);
  await expect(page.getByLabel("頁碼")).toHaveText("1 / 3");
  expect([...fixture.audioUrls]).toEqual([
    "/api/audio/audio-first",
    "/api/audio/audio-second",
  ]);
});
