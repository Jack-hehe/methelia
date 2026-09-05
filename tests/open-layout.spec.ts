import { test, expect } from "./fixtures/course-test";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";

test("open lesson layout gives content most of the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 867 });
  const store = new Store(":memory:");
  const service = new LearningService(store);
  const course = service.createCourse(
    service.session(),
    "認識網站",
    "demo",
    "layout",
  );
  store.db.close();
  await page.route("**/api/sessions", (route) =>
    route.fulfill({ json: { course } }),
  );
  await page.route(`**/api/courses/${course.id}`, (route) =>
    route.fulfill({ json: course }),
  );
  await page.goto("/");
  const canvas = page.locator(".lesson-canvas");
  await expect(canvas).toHaveCSS("border-top-width", "0px");
  await expect(canvas).toHaveCSS("border-radius", "0px");
  expect((await canvas.boundingBox())!.width).toBe(1920);
  expect(
    (await page.locator(".canvas-heading").boundingBox())!.height,
  ).toBeLessThan(80);
  await expect(page.locator(".canvas-content")).toBeVisible();
  await page.screenshot({
    path: "test-results/open-lesson.png",
    animations: "disabled",
  });
});

for (const kind of ["reading", "quiz"] as const) {
  test(`${kind} content uses the middle of the screen with readable type`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const store = new Store(":memory:");
    const service = new LearningService(store);
    const course = service.createCourse(
      service.session(),
      "版面檢查",
      "demo",
      kind,
    );
    const chapter = course.chapters.web.chapter!;
    if (kind === "reading") {
      chapter.sections[0].component = {
        type: "concept.canvas",
        cards: [
          {
            title: "h1",
            body: "這一頁最重要的標題，放在 <h1> 和 </h1> 中間。先試著替它換個名字。",
            accent: "amber",
          },
          {
            title: "p",
            body: "要放一段介紹，就用 p。文字寫在 <p> 和 </p> 中間。",
            accent: "blue",
          },
          {
            title: "button",
            body: "button 會做出可以按的按鈕；裡面的文字，就是按鈕上顯示的字。",
            accent: "violet",
          },
        ],
      };
      chapter.sections[0].title = "用 HTML 建立骨架";
    } else {
      chapter.sections[0].component = chapter.sections.find(
        (s) => s.component.type === "quiz.choice",
      )!.component;
    }
    store.db.close();
    await page.route("**/api/sessions", (route) =>
      route.fulfill({ json: { course } }),
    );
    await page.route(`**/api/courses/${course.id}`, (route) =>
      route.fulfill({ json: course }),
    );
    await page.goto("/");
    const target = page.locator(
      kind === "reading" ? ".lesson-reading-cards" : ".quiz",
    );
    await expect(target).toBeVisible();
    const box = (await target.boundingBox())!;
    const surface = (await page.locator(".canvas-content").boundingBox())!;
    expect(
      Math.abs(box.y + box.height / 2 - surface.y - surface.height / 2),
    ).toBeLessThan(90);
    const font = await page
      .locator(kind === "reading" ? ".lesson-reading-cards p" : ".quiz-option")
      .first()
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(font).toBeGreaterThanOrEqual(18);
    await page.screenshot({
      path: `test-results/balanced-${kind}.png`,
      animations: "disabled",
    });
  });
}
