import { afterEach, expect, it } from "vitest";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";
import { featuredCourses } from "../src/core/featured-courses";
const stores: Store[] = [];
afterEach(() => {
  for (const s of stores.splice(0)) s.db.close();
});
it("enrolls immediately, resumes without overwriting work and isolates learners", () => {
  const store = new Store(":memory:");
  stores.push(store);
  const service = new LearningService(store);
  const session = service.session();
  const id = featuredCourses.find((c) => c.kind === "geometry")!.id;
  const course = service.createFeatured(session, id, "en");
  expect(course.status).toBe("ready");
  expect(course.featuredId).toBe(id);
  const node = course.currentNodeId;
  const section = course.chapters[node].chapter!.sections.find(
    (s) => s.component.type === "lab.experiment",
  )!;
  service.saveLab(session, course.id, node, section.id, { radius: 3 });
  expect(
    service.createFeatured(session, id, "en").labWork?.[node]?.[section.id],
  ).toEqual({ radius: 3 });
  const other = service.session();
  expect(service.createFeatured(other, id, "en").id).not.toBe(course.id);
  expect(() =>
    service.saveLab(other, course.id, node, section.id, { radius: 4 }),
  ).toThrow();
  expect(() =>
    service.saveLab(session, course.id, node, "unknown", { radius: 3 }),
  ).toThrow();
  expect(() => service.createFeatured(session, "not-a-course", "en")).toThrow();
});
