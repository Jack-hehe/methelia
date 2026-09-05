import { test, expect, type Page, type Download } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import type { Snapshot } from "../src/core/state";

async function openFinalChapter(
  page: Page,
  id: string,
  language: "en" | "zh-TW",
) {
  const enrollment = await page.request.post("/api/featured", {
    data: { id, language },
  });
  expect(enrollment.ok()).toBe(true);
  const enrolled = (await enrollment.json()) as Snapshot;
  expect(
    (
      await page.request.post(`/api/courses/${enrolled.id}/accept-scope`, {
        data: {},
      })
    ).ok(),
  ).toBe(true);
  // Complete prerequisite portfolio files through the real service; jumping
  // must preserve the learner's earlier index.html instead of replacing it.
  if (id === "interactive-portfolio") {
    let current = (await (
      await page.request.get(`/api/courses/${enrolled.id}`)
    ).json()) as Snapshot;
    for (let i = 0; i < 4; i++) {
      const sections =
        current.chapters[current.currentNodeId].chapter!.sections;
      const editor = sections.find(
        (s) => s.component.type === "code.editor",
      )!.component;
      const quiz = sections.find(
        (s) => s.component.type === "quiz.choice",
      )!.component;
      if (editor.type !== "code.editor" || quiz.type !== "quiz.choice")
        throw new Error("Missing prerequisite components");
      expect(
        (
          await page.request.put("/api/workspace/files", {
            data: {
              courseId: current.id,
              files: { [editor.path]: editor.example },
              baseRevision: current.workspace.revision,
            },
          })
        ).ok(),
      ).toBe(true);
      for (const [sectionId, answer] of [
        ["build", undefined],
        ["checkpoint", quiz.answer],
      ] as const) {
        const checked = await page.request.post("/api/progress/check", {
          data: {
            courseId: current.id,
            nodeId: current.currentNodeId,
            sectionId,
            ...(answer === undefined ? {} : { answer }),
          },
        });
        expect(checked.ok()).toBe(true);
        expect((await checked.json()).passed).toBe(true);
      }
      const next = await page.request.post(
        `/api/courses/${current.id}/advance`,
        { data: { nodeId: current.currentNodeId } },
      );
      expect(next.ok()).toBe(true);
      current = (await next.json()) as Snapshot;
    }
  }
  const response = await page.request.post(`/api/courses/${enrolled.id}/jump`, {
    data: { nodeId: `${id}-5` },
  });
  expect(response.ok()).toBe(true);
  const course = (await response.json()) as Snapshot;
  expect(
    (
      await page.request.post("/api/progress/events", {
        data: {
          courseId: course.id,
          nodeId: course.currentNodeId,
          sectionId: "build",
        },
      })
    ).ok(),
  ).toBe(true);
  await page.goto(`/?course=${course.id}`);
  const editor = page.getByLabel(
    language === "en" ? "Code editor" : "程式碼編輯器",
    { exact: true },
  );
  await expect(editor).toBeVisible();
  const component = course.chapters[
    course.currentNodeId
  ].chapter!.sections.find((section) => section.id === "build")!.component;
  if (component.type !== "code.editor")
    throw new Error("Missing coding exercise");
  expect(await editor.inputValue()).not.toBe(component.example);
  return { course, editor, example: component.example };
}

async function archive(download: Download) {
  const path = await download.path();
  expect(path).toBeTruthy();
  return Object.fromEntries(
    Object.entries(unzipSync(await readFile(path!))).map(([name, bytes]) => [
      name,
      strFromU8(bytes),
    ]),
  );
}

for (const language of ["en", "zh-TW"] as const) {
  const en = language === "en";
  test(`portfolio final project has real interaction and localized output (${language})`, async ({
    page,
    baseURL,
  }) => {
    test.skip(baseURL !== "http://127.0.0.1:3100");
    const { editor, example } = await openFinalChapter(
      page,
      "interactive-portfolio",
      language,
    );
    await editor.fill(example);
    await page
      .getByRole("button", {
        name: en ? "Check my practice" : "驗證我的練習",
        exact: true,
      })
      .click();
    const preview = page.frameLocator(
      `iframe[title="${en ? "Practice website preview" : "實作網站預覽"}"]`,
    );
    await expect(preview.getByRole("heading", { level: 1 })).toHaveText(
      en ? "My portfolio" : "我的作品集",
    );
    const contact = preview.getByRole("button", {
      name: en ? "Show contact" : "顯示聯絡資訊",
      exact: true,
    });
    await expect(contact).toHaveAttribute("aria-expanded", "false");
    await contact.focus();
    await contact.press("Enter");
    await expect(contact).toHaveAttribute("aria-expanded", "true");
    await expect(preview.locator("#message")).toHaveText(
      en ? "Contact: hello@example.com" : "聯絡信箱：hello@example.com",
    );
    const download = page.waitForEvent("download");
    await page
      .getByRole("link", {
        name: en ? "Export project" : "匯出作品",
        exact: true,
      })
      .click();
    const files = await archive(await download);
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        "index.html",
        "layout.css",
        "interaction.js",
        "responsive.css",
        "accessibility.js",
      ]),
    );
    expect(files["accessibility.js"]).toContain(
      "setAttribute('aria-expanded', 'false')",
    );
    expect(files["index.html"]).toContain(en ? "My portfolio" : "我的作品集");
  });

  test(`real Pyodide generates escaped localized HTML and downloadable ZIP (${language})`, async ({
    page,
    baseURL,
  }) => {
    test.skip(baseURL !== "http://127.0.0.1:3100");
    test.setTimeout(120000);
    let wasmLoads = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/pyodide.asm.wasm")) wasmLoads++;
    });
    const { editor, example } = await openFinalChapter(
      page,
      "python-data-website",
      language,
    );
    await editor.fill(example);
    const run = page.getByRole("button", {
      name: en ? "Run Python" : "執行 Python",
      exact: true,
    });
    await expect(run).toBeEnabled({ timeout: 60000 });
    await run.click();
    await expect(page.locator(".python-run-status")).toHaveText(
      en ? "Execution complete" : "執行完成",
      { timeout: 60000 },
    );
    expect(wasmLoads).toBeGreaterThan(0);
    const title = en
      ? "Python generated website preview"
      : "Python 產生的網站預覽";
    const frame = page.locator(`iframe[title="${title}"]`);
    await expect(frame).toHaveAttribute("sandbox", "allow-scripts");
    const preview = page.frameLocator(`iframe[title="${title}"]`);
    await expect(preview.getByRole("heading", { level: 1 })).toHaveText(
      en ? "My projects" : "我的作品",
    );
    await expect(preview.locator("article")).toHaveCount(2);
    await expect(preview.locator("article").first()).toContainText(
      en ? "Research <draft>" : "研究 <draft>",
    );
    await expect(preview.locator("draft")).toHaveCount(0);
    await expect(
      page.getByLabel(en ? "Python standard output" : "Python 標準輸出", {
        exact: true,
      }),
    ).toContainText(
      en ? "Verified and generated index.html" : "已驗證並產生 index.html",
    );
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: en ? "Download ZIP" : "下載 ZIP",
        exact: true,
      })
      .click();
    const files = await archive(await download);
    expect(files["index.html"]).toContain("&lt;draft&gt;");
    expect(files["index.html"]).toContain(en ? 'lang="en"' : 'lang="zh-Hant"');
    expect(Object.keys(files).some((name) => name.endsWith(".py"))).toBe(false);
    const originalLoads = wasmLoads;
    await page
      .getByLabel(en ? "Previous page" : "上一頁", { exact: true })
      .click();
    await page.getByLabel(en ? "Next page" : "下一頁", { exact: true }).click();
    await expect(page.locator(`iframe[title="${title}"]`)).toBeVisible();
    expect(wasmLoads).toBe(originalLoads);
  });
}

test("text adventure replays winning and losing routes in actual Python", async ({
  page,
  baseURL,
}) => {
  test.skip(baseURL !== "http://127.0.0.1:3100");
  test.setTimeout(120000);
  const { editor, example } = await openFinalChapter(
    page,
    "python-text-adventure",
    "en",
  );
  await editor.fill(example);
  const run = page.getByRole("button", { name: "Run Python", exact: true });
  await expect(run).toBeEnabled({ timeout: 60000 });
  await run.click();
  await expect(page.locator(".python-run-status")).toHaveText(
    "Execution complete",
    { timeout: 60000 },
  );
  await expect(
    page.getByLabel("Python standard output", { exact: true }),
  ).toContainText("'escaped': True");
  await editor.fill(
    example.replace(
      "result = run(['take key', 'open door'])",
      "result = run(['open door'])",
    ),
  );
  await run.click();
  await expect(page.locator(".python-run-status")).toHaveText(
    "Execution complete",
    { timeout: 60000 },
  );
  await expect(
    page.getByLabel("Python standard output", { exact: true }),
  ).toContainText("'escaped': False");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download ZIP", exact: true }).click();
  const files = await archive(await download);
  expect(JSON.parse(files["adventure-result.json"])).toEqual({
    has_key: false,
    escaped: false,
  });
});
