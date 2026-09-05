import { expect, test } from "@playwright/test";

for (const language of ["en", "zh"]) {
  test(`the ${language} learning prompt matches its rotating subject and keeps word emphasis`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?home=1");
    await page.locator(".language-trigger").click();
    await page
      .getByRole("menuitemradio", {
        name: language === "en" ? "EN" : "繁體中文",
        exact: true,
      })
      .click();
    const title = page.locator(".hero-title");
    const prompt = title.locator(".title-line").first();
    const subject = title.locator(".typed");
    const emphasis = prompt.locator(".learn-word");
    await expect(subject).toHaveText(
      language === "en" ? "Web Design" : "網頁設計",
    );
    await expect(emphasis).toContainText(language === "en" ? "learn" : "學習");
    await expect(emphasis.locator(".word-star")).toBeVisible();
    await expect(emphasis).toHaveCSS("font-style", "italic");

    for (const width of [1440, 800, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const reference = await subject.evaluate((element) => {
        const style = getComputedStyle(element);
        return { size: style.fontSize, weight: style.fontWeight };
      });
      await expect(prompt).toHaveCSS("font-size", reference.size);
      await expect(prompt).toHaveCSS("font-weight", reference.weight);
      await expect(emphasis).toHaveCSS("font-size", reference.size);
      await expect(emphasis).toHaveCSS("font-weight", reference.weight);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/home-typography-${language}-${width}.png`,
      });
    }

    for (const theme of ["dark", "light"]) {
      await page
        .getByRole("button", { name: /Toggle light and dark mode|切換深淺色/ })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const accent = await title.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--violet").trim(),
      );
      await expect(emphasis).toHaveCSS(
        "color",
        await page.evaluate((color) => {
          const element = document.createElement("span");
          element.style.color = color;
          document.body.append(element);
          const resolved = getComputedStyle(element).color;
          element.remove();
          return resolved;
        }, accent),
      );
    }
  });
}
