import { expect, test } from "./fixtures/course-test";
import type { Snapshot } from "../src/core/state";
import { demoChapter } from "../src/core/fixtures";
import { emptyWorkspace } from "../src/core/workspace";

for (const context of [
  "extension-from-main",
  "main-from-extension",
  "active-extension",
] as const) {
  test(`review isolates workspace: ${context}`, async ({ page }) => {
    await page.request.post("/api/sessions", { data: {} });
    const response = await page.request.post("/api/courses", {
      data: {
        goal: "Review workspace",
        mode: "demo",
        requestId: crypto.randomUUID(),
      },
    });
    const original = (await response.json()) as Snapshot;
    const course = structuredClone(original);
    const source = course.graph!.nodes.find((n) => n.id === "html")!;
    const extNode = {
      ...source,
      id: "review-extension",
      title: "Completed extension",
      kind: "support" as const,
    };
    course.graph!.nodes.push(extNode);
    const activeExtensionNode = {
      ...extNode,
      id: "active-extension-next",
      title: "Current extension step",
    };
    if (context === "active-extension")
      course.graph!.nodes.push(activeExtensionNode);
    course.graph!.extensions = [
      {
        id: "review-branch",
        anchorId: "html",
        nodeIds:
          context === "active-extension"
            ? [extNode.id, activeExtensionNode.id]
            : [extNode.id],
        title: "Extension work",
        depth: "applied",
      },
    ];
    const mainFiles = { "/index.html": "<h1>Main saved work</h1>" };
    const extensionFiles = { "/index.html": "<h1>Extension saved work</h1>" };
    const activeFiles = { "/index.html": "<h1>Active extension work</h1>" };
    course.workspace = {
      ...emptyWorkspace(),
      files: context === "extension-from-main" ? mainFiles : activeFiles,
    };
    course.extensionWorkspaces = {
      ["review-branch"]: { ...emptyWorkspace(), files: extensionFiles },
    };
    course.currentNodeId =
      context === "extension-from-main"
        ? "css"
        : context === "active-extension"
          ? activeExtensionNode.id
          : extNode.id;
    course.extensionSession =
      context === "extension-from-main"
        ? undefined
        : {
            extensionId: "review-branch",
            returnNodeId: "css",
            mainWorkspace: { ...emptyWorkspace(), files: mainFiles },
          };
    const target = context === "main-from-extension" ? source : extNode;
    const chapter = demoChapter(target);
    course.completed = ["web", "html", extNode.id];
    course.chapters = {
      ...course.chapters,
      [target.id]: {
        ...original.chapters.web,
        id: `review-${target.id}`,
        chapter,
        status: "ready",
        speech: "not_requested",
        pageAudio: undefined,
      },
    };
    course.progress[target.id] = {
      time: 0,
      sectionId: "demonstration",
      done: [],
      subtitleOnly: false,
      follow: false,
    };
    if (context === "active-extension") {
      course.chapters[activeExtensionNode.id] = {
        ...course.chapters[target.id],
        id: "active-extension-package",
        chapter: demoChapter(activeExtensionNode),
      };
      course.progress[activeExtensionNode.id] = {
        ...course.progress[target.id],
      };
    }
    await page.route("**/api/sessions", (route) =>
      route.fulfill({ json: { course } }),
    );
    await page.route(`**/api/courses/${course.id}`, (route) =>
      route.fulfill({ json: course }),
    );
    const mutations: string[] = [];
    await page.route("**/api/workspace/**", (route) => {
      mutations.push(route.request().url());
      return route.abort();
    });
    await page.goto("/");
    await page.getByLabel("開啟 Learning Map", { exact: true }).click();
    const map = page.getByRole("dialog", { name: "Learning Map", exact: true });
    await map
      .locator(".map-node")
      .filter({ has: page.locator("strong", { hasText: target.title }) })
      .click();
    await map.getByRole("button", { name: "複習這一章" }).click();
    await page.getByLabel("終端機指令").fill("edit index.html");
    await page.getByLabel("終端機指令").press("Enter");
    const expected =
      context === "extension-from-main"
        ? extensionFiles
        : context === "main-from-extension"
          ? mainFiles
          : activeFiles;
    await expect(page.getByLabel("程式碼編輯器")).toHaveValue(
      expected["/index.html"],
    );
    await page
      .getByLabel("程式碼編輯器")
      .fill("<h1>Local review experiment</h1>");
    await page.getByLabel("程式碼編輯器").press("ControlOrMeta+s");
    await page.getByLabel("終端機指令").fill("mkdir review-only");
    await page.getByLabel("終端機指令").press("Enter");
    await expect(page.getByLabel("終端機指令")).toHaveValue("");
    await page.getByLabel("終端機指令").fill("ls");
    await page.getByLabel("終端機指令").press("Enter");
    await expect(page.locator(".terminal-output")).toContainText(
      "review-only/",
    );
    await expect(
      page.getByText("複習副本 · 修改不會保存到作品", { exact: true }),
    ).toBeVisible();
    expect(mutations).toEqual([]);
    const unchanged = (await (
      await page.request.get(`/api/courses/${original.id}`)
    ).json()) as Snapshot;
    expect(unchanged.workspace).toEqual(original.workspace);
  });
}

test("resuming the current map node saves actual workspace edits instead of opening a review copy", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先體驗一堂課" }).click();
  await page.getByLabel("下一頁", { exact: true }).click();
  await page.getByLabel("終端機指令").fill("edit index.html");
  await page.getByLabel("終端機指令").press("Enter");
  await page.getByLabel("程式碼編輯器").fill("<h1>Keep my current work</h1>");
  await page.getByLabel("開啟 Learning Map", { exact: true }).click();
  const map = page.getByRole("dialog", { name: "Learning Map", exact: true });
  await map.locator(".map-node.current").click();
  await expect(map.getByRole("button", { name: "複習這一章" })).toHaveCount(0);
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/workspace/files") &&
      response.request().method() === "PUT",
  );
  await map.getByRole("button", { name: "回到這一課", exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await expect(map).toHaveCount(0);
  await expect(page.getByLabel("頁碼")).toHaveText("2 / 3");
  await expect(
    page.getByText("複習副本 · 修改不會保存到作品", { exact: true }),
  ).toHaveCount(0);
  const resumed = (
    await (await page.request.post("/api/sessions", { data: {} })).json()
  ).course as Snapshot;
  expect(resumed.workspace.files["/index.html"]).toBe(
    "<h1>Keep my current work</h1>",
  );
  await page.reload();
  await page.getByLabel("終端機指令").fill("edit index.html");
  await page.getByLabel("終端機指令").press("Enter");
  await expect(page.getByLabel("程式碼編輯器")).toHaveValue(
    "<h1>Keep my current work</h1>",
  );
});
