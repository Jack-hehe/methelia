import { test, expect } from "./fixtures/course-test";

for (const language of ["zh-TW", "en"]) {
  test(`guided ${language} HTML lesson exposes the elements named in its narration`, async ({
    page,
  }) => {
    await page.request.post("/api/sessions", { data: {} });
    const course = await (
      await page.request.post("/api/courses", {
        data: {
          goal: "HTML elements",
          mode: "demo",
          requestId: crypto.randomUUID(),
          language,
        },
      })
    ).json();
    await page.goto("/");
    await page
      .getByLabel(language === "en" ? "Next page" : "下一頁", { exact: true })
      .click();
    const controls = page.getByRole("group", {
      name: language === "en" ? "HTML elements" : "HTML 元素",
    });
    const preview = page.frameLocator(
      `iframe[title="${language === "en" ? "Practice website preview" : "實作網站預覽"}"]`,
    );
    for (const tag of ["h1", "p", "button"]) {
      await controls.getByRole("button", { name: tag, exact: true }).click();
      await expect(
        controls.getByRole("button", { name: tag, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(preview.locator(tag).first()).toHaveCSS(
        "outline-style",
        "solid",
      );
      await expect(preview.locator(tag).first()).toHaveCSS(
        "outline-width",
        "3px",
      );
    }
    const workspace = await (
      await page.request.get(`/api/workspace?courseId=${course.id}`)
    ).json();
    expect(workspace.files).toEqual(course.workspace.files);
  });
}
