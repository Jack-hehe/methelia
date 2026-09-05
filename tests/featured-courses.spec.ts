import { test, expect, type Page } from "@playwright/test";
import { featuredCourses } from "../src/core/featured/catalog";
import type { Snapshot } from "../src/core/state";

async function enroll(page: Page, id: string, language = "en") {
  const response = await page.request.post("/api/featured", {
    data: { id, language },
  });
  expect(response.ok()).toBe(true);
  const course = (await response.json()) as Snapshot;
  expect(
    (
      await page.request.post(`/api/courses/${course.id}/accept-scope`, {
        data: {},
      })
    ).ok(),
  ).toBe(true);
  return course;
}

async function firstLab(page: Page, course: Snapshot) {
  const chapter = course.chapters[course.currentNodeId].chapter!;
  const section = chapter.sections.find(
    (s) => s.component.type === "lab.experiment",
  );
  expect(section).toBeTruthy();
  expect(
    (
      await page.request.post("/api/progress/events", {
        data: {
          courseId: course.id,
          nodeId: course.currentNodeId,
          sectionId: section!.id,
        },
      })
    ).ok(),
  ).toBe(true);
  await page.goto(`/?course=${course.id}`);
  await expect(page.locator(".laboratory")).toBeVisible();
  return section!;
}

test("English catalog opens geometry and saves keyboard edits across reload", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(baseURL !== "http://127.0.0.1:3100");
  await page.addInitScript(() =>
    localStorage.setItem("methelia-home-language", "en"),
  );
  await page.goto("/?home=1");
  await page.locator('[data-featured="equation-explorer"]').click();
  await page.waitForURL((url) => url.searchParams.has("course"));
  const courseId = new URL(page.url()).searchParams.get("course");
  const course = (await (
    await page.request.get(`/api/courses/${courseId}`)
  ).json()) as Snapshot;
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  const chapter = course.chapters[course.currentNodeId].chapter!;
  const index = chapter.sections.findIndex(
    (s) => s.component.type === "lab.experiment",
  );
  for (let i = 0; i < index; i++)
    await page.getByLabel("Next page", { exact: true }).click();
  const radius = page.getByRole("slider", { name: /Sphere radius/ });
  await expect(radius).toBeVisible();
  await radius.focus();
  await radius.press("End");
  await radius.press("ArrowLeft");
  await expect(radius).toHaveValue("4.9");
  await expect(page.locator('.lab-mission [role="status"]')).toHaveText(
    "Saved",
  );
  await page.reload();
  await expect(page.getByRole("slider", { name: /Sphere radius/ })).toHaveValue(
    "4.9",
  );
  const snapshot = (await (
    await page.request.get(`/api/courses/${course.id}`)
  ).json()) as Snapshot;
  expect(
    snapshot.labWork?.[course.currentNodeId]?.[chapter.sections[index].id]
      ?.radius,
  ).toBeCloseTo(4.9);
  await page
    .getByRole("button", { name: "Watch a control demonstration", exact: true })
    .click();
  await expect(page.locator(".lab-demo-pointer")).toBeVisible();
  await expect(page.getByRole("slider", { name: /Sphere radius/ })).toHaveValue(
    "1",
  );
  await page.getByRole("slider", { name: "View rotation" }).press("ArrowRight");
  await expect(page.getByRole("slider", { name: /Sphere radius/ })).toHaveValue(
    "4.9",
  );
  await expect(page.locator(".lab-demo-pointer")).toHaveCount(0);
  const exported = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download experiment", exact: true })
    .click();
  expect((await exported).suggestedFilename()).toBe("geometry-experiment.json");
  await page.screenshot({ path: testInfo.outputPath("geometry-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("slider", { name: /Sphere radius/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("geometry-mobile.png") });
});

for (const entry of featuredCourses.filter(
  (course) => !["web", "python"].includes(course.kind),
)) {
  test(`real ${entry.kind} laboratory renders and its controls work`, async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(baseURL !== "http://127.0.0.1:3100");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const course = await enroll(page, entry.id);
    await firstLab(page, course);
    await expect(page.locator(`[data-lab="${entry.kind}"]`)).toBeVisible();
    const control = page.locator('.lab-controls input[type="range"]').first();
    if (await control.count()) {
      await control.focus();
      await control.press("ArrowRight");
    }
    await expect(
      page.getByRole("button", { name: "Reset this experiment", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Reset this experiment", exact: true })
      .click();
    await expect(page.locator('.lab-mission [role="status"]')).toHaveText(
      "Saved",
    );
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${entry.kind}.png`) });
  });
}

test("an older tab can load the latest lab work after a save conflict", async ({
  page,
}) => {
  const course = await enroll(page, "equation-explorer");
  const section = await firstLab(page, course);
  const saved = await page.request.put("/api/labs", {
    data: {
      courseId: course.id,
      nodeId: course.currentNodeId,
      sectionId: section.id,
      value: { radius: 4 },
      version: Date.now() + 5000,
    },
  });
  expect(saved.ok()).toBe(true);
  const radius = page.getByRole("slider", { name: "Sphere radius" });
  await radius.press("Home");
  await page
    .getByRole("button", {
      name: "Newer work in another tab. Load latest",
      exact: true,
    })
    .click();
  await expect(radius).toHaveValue("4");
  await expect(page.locator('.lab-mission [role="status"]')).toHaveText(
    "Saved",
  );
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some((k) =>
        k.startsWith("methelia-lab-draft:"),
      ),
    ),
  ).toBe(false);
});
