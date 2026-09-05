import { expect, test } from "@playwright/test";
test("homepage catalog reveals below the first screen and arrows flank each rail", async ({
  page,
}) => {
  await page.goto("/?home=1");
  await expect(page.getByRole("button", { name: "Try a Lesson" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("textbox", { name: "What do you want to learn?" }),
  ).toBeVisible();
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
