import { expect, test, type Page } from "@playwright/test";
async function englishOnly(page: Page) {
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/[\u3400-\u9fff]/u);
  const labels = await page
    .locator("[aria-label], [title], [placeholder]")
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => n.getBoundingClientRect().width > 0)
        .map((n) =>
          [
            n.getAttribute("aria-label"),
            n.getAttribute("title"),
            n.getAttribute("placeholder"),
          ].join(" "),
        )
        .join("\n"),
    );
  expect(labels).not.toMatch(/[\u3400-\u9fff]/u);
}
test("English demo stays English through lessons, map, practice and help", async ({
  page,
  baseURL,
}) => {
  test.skip(
    baseURL !== "http://127.0.0.1:3100",
    "Requires isolated API server",
  );
  await page.goto("/?home=1");
  await page.getByRole("button", { name: "Try a Lesson", exact: true }).click();
  await expect(page.getByLabel("Page number", { exact: true })).toHaveText(
    "1 / 3",
  );
  await englishOnly(page);
  await page.getByLabel("Open learning map", { exact: true }).click();
  await englishOnly(page);
  await page
    .getByRole("button", { name: "Return to course", exact: true })
    .click();
  await page.getByLabel("Next page", { exact: true }).click();
  await englishOnly(page);
  await page
    .getByLabel("Terminal command", { exact: true })
    .fill("edit index.html");
  await page.getByLabel("Terminal command", { exact: true }).press("Enter");
  await expect(page.getByLabel("Code editor", { exact: true })).toBeVisible();
  await englishOnly(page);
  await page.getByLabel("Ask a question", { exact: true }).click();
  await englishOnly(page);
  const response = await page.request.post("/api/sessions", { data: {} });
  const { course } = await response.json();
  expect(course.language).toBe("en");
});
test("English live intake persists English through generation and reload", async ({
  page,
  baseURL,
}) => {
  test.skip(
    baseURL !== "http://127.0.0.1:3100",
    "Requires isolated API server",
  );
  await page.goto("/?home=1");
  await page
    .getByLabel("What do you want to learn?", { exact: true })
    .fill("Build a website");
  await page
    .getByRole("button", { name: "Start Exploring", exact: true })
    .click();
  for (let i = 0; i < 5; i++) {
    await expect(page.locator("#intake-question")).toBeVisible();
    await englishOnly(page);
    await page.locator("fieldset input").first().check();
    if (i === 4) {
      await page
        .getByRole("button", { name: "Create the first chapter", exact: true })
        .click();
      break;
    }
    const title = await page.locator("#intake-question").textContent();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("#intake-question")).not.toHaveText(title!);
  }
  // A new course opens on the learning map, not straight into the chapter.
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await expect(page.getByLabel("Page number", { exact: true })).toHaveText(
    "1 / 3",
  );
  await englishOnly(page);
  await page.reload();
  await expect(page.getByLabel("Page number", { exact: true })).toHaveText(
    "1 / 3",
  );
  await englishOnly(page);
});
