import { test as base, expect } from "@playwright/test";

// Course UI remains Chinese; home UI tests exercise the English default separately.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      if (window !== window.top) return;
      if (!localStorage.getItem("methelia-home-language")) {
        localStorage.setItem("methelia-home-language", "zh");
      }
    });
    await use(page);
  },
});
export { expect };
export type { Page, Locator } from "@playwright/test";
