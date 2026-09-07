import { expect, test } from "@playwright/test";
test("the featured catalog sits below the fold, centres its head and levels every row", async ({
  page,
}) => {
  await page.goto("/?home=1");
  await expect(
    page.getByRole("textbox", { name: "What do you want to learn?" }),
  ).toBeVisible();
  const catalog = page.locator(".home-catalog");
  expect((await catalog.boundingBox())!.y).toBeGreaterThanOrEqual(1000);
  await expect(catalog.locator(".featured-course")).toHaveCount(20);

  // The head is centred, so eyebrow, title and subtitle share the container's
  // axis. They previously kept the two-column rules and sat off to the left.
  const offsets = await catalog.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const centre = box.x + box.width / 2;
    const head = el.querySelector(".catalog-head")!;
    return [".eyebrow", "h2", "p"].map((selector) => {
      // Measure the text itself: a block can be centred while its ink is not.
      const range = document.createRange();
      range.selectNodeContents(head.querySelector(selector)!);
      const ink = range.getBoundingClientRect();
      return Math.round(ink.x + ink.width / 2 - centre);
    });
  });
  for (const offset of offsets) expect(Math.abs(offset)).toBeLessThanOrEqual(2);

  // Titles wrap to one or two lines depending on language, so the chapter line
  // has to be pushed to the card's floor for a row to read as a row.
  const ragged = await catalog.evaluate((el) => {
    const rows: Record<number, number[]> = {};
    for (const card of el.querySelectorAll(".featured-course")) {
      const top = Math.round(card.getBoundingClientRect().y);
      const meta = card
        .querySelector(".featured-meta")!
        .getBoundingClientRect();
      (rows[top] ||= []).push(Math.round(meta.y));
    }
    return Object.values(rows).filter(
      (row) => Math.max(...row) - Math.min(...row) > 1,
    ).length;
  });
  expect(ragged).toBe(0);

  await catalog.locator(".featured-course").first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/home-catalog-desktop.png" });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `test-results/home-catalog-${width}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(".language-trigger").click();
  await page.getByRole("menuitemradio", { name: "繁體中文" }).click();
  await expect(catalog.locator(".featured-course").first()).toContainText(
    "用 HTML 與 CSS 打造可互動的作品集網頁",
  );
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
  await expect(page.locator("[data-section]")).toBeVisible();
  const snapshot = await (
    await page.request.post("/api/sessions", { data: {} })
  ).json();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Methelia", exact: true })
    .click();
  await page.getByRole("link", { name: "Methelia", exact: true }).click();
  await expect(page.getByRole("button", { name: "Try a Lesson" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "使用完整文字模式" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Courses", exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await page.getByRole("link", { name: "Methelia", exact: true }).click();
  // A learner who already has a course gets the goal box, not the demo button.
  await expect(
    page.getByRole("textbox", { name: "What do you want to learn?" }),
  ).toBeVisible();
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
  const header = page.getByRole("banner");
  await header
    .getByRole("button", { name: "Get started", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Welcome to Methelia");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.locator(".language-trigger").click();
  await page.getByRole("menuitemradio", { name: "繁體中文" }).click();
  // Scoped to the header: the goal form's submit button shares this label.
  await header.getByRole("button", { name: "開始學習", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("歡迎來到 Methelia");
  await page.getByRole("button", { name: "探索課程" }).click();
  await expect(page).toHaveURL(/\/explore$/);
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
  await expect(
    page.getByRole("main").getByRole("button", { name: "開始學習" }),
  ).toBeEnabled();
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

test("homepage language menu fits mobile and desktop in the stored dark mode", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    localStorage.setItem("methelia-theme", "dark"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /切換深淺色|Toggle light and dark mode/ }),
  ).toBeVisible();
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
          "dark",
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
          path: `test-results/language-${width}-${language}-dark.png`,
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
  await expect(page.locator(".featured-course")).toHaveCount(20);
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
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Welcome to Methelia");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Choose language" }).click();
  await page.getByRole("menuitemradio", { name: "繁體中文" }).click();
  await expect(page.getByRole("heading", { name: "我的課程" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "開始學習", exact: true }),
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
