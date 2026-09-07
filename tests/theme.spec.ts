import { test, expect } from "@playwright/test";

test("stored dark mode is applied before application JavaScript loads", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("methelia-theme", "dark"),
  );
  await page.route("**/_next/**/*.js*", (route) => route.abort());
  for (const path of ["/?home=1", "/explore"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  }
});

test("hydration and navigation never overwrite the stored dark choice with light", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("methelia-theme", "dark");
    (window as any).__themeResets = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (
          record.type === "attributes" &&
          record.attributeName === "data-theme"
        ) {
          (window as any).__themeResets.push(record.oldValue);
        }
      }
    });
    observer.observe(document, {
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["data-theme"],
    });
  });
  for (const path of ["/?home=1", "/explore", "/?home=1"]) {
    await page.goto(path);
    const toggle = page.getByRole("button", {
      name: /切換深淺色|Toggle.*(?:theme|mode)|Switch.*theme/i,
    });
    await expect(toggle).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const changes: string[] = await page.evaluate(
      () => (window as any).__themeResets,
    );
    const firstDark = changes.indexOf("dark");
    if (firstDark >= 0) expect(changes.slice(firstDark)).not.toContain("light");
  }
});
