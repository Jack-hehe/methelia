import { afterEach, expect, it } from "vitest";
import { Store } from "../src/server/db";
import { LearningService } from "../src/server/service";

const stores: Store[] = [];

function setup() {
  const store = new Store(":memory:");
  stores.push(store);
  const service = new LearningService(store);
  const session = service.session();
  const deleted = service.createCourse(
    session,
    "Course to delete",
    "demo",
    "delete-me",
  );
  const retained = service.createCourse(
    session,
    "Course to keep",
    "demo",
    "keep-me",
  );
  return { store, service, session, deleted, retained };
}

afterEach(() => {
  for (const store of stores.splice(0)) store.db.close();
});

it("deletes one owned course and all of its exact persisted artifacts", () => {
  const { store, service, session, deleted, retained } = setup();
  const activePackageId = Object.values(deleted.chapters)[0].id;
  const supersededPackageId = "superseded_package%_id";
  const retainedPackageId = Object.values(retained.chapters)[0].id;

  store.db
    .prepare("INSERT INTO chapter_packages VALUES(?,?,?)")
    .run(
      supersededPackageId,
      deleted.id,
      JSON.stringify({ ...deleted.chapters.web, id: supersededPackageId }),
    );
  store.db
    .prepare(
      "INSERT INTO generation_jobs(id,course_id,package_id,kind,status) VALUES(?,?,?,?,?)",
    )
    .run("delete-job", deleted.id, supersededPackageId, "speech", "working");
  store.db
    .prepare("INSERT INTO progress_events(course_id,data) VALUES(?,?)")
    .run(deleted.id, JSON.stringify({ node: "web" }));
  store.db
    .prepare("INSERT INTO progress_events(course_id,data) VALUES(?,?)")
    .run(retained.id, JSON.stringify({ node: "web" }));

  const insertAudio = store.db.prepare(
    "INSERT INTO audio_artifacts VALUES(?,?,?)",
  );
  for (const id of [
    activePackageId,
    `page-audio:${activePackageId}:section-a`,
    supersededPackageId,
    `page-audio:${supersededPackageId}:section-a`,
    retainedPackageId,
    `page-audio:${retainedPackageId}:section-a`,
    `page-audio:${supersededPackageId}-neighbor:section-a`,
  ])
    insertAudio.run(id, new Uint8Array([1, 2, 3]), "audio/mpeg");

  expect(service.deleteCourse(session, deleted.id)).toEqual({ deleted: true });

  expect(service.listCourses(session).map((course) => course.id)).toEqual([
    retained.id,
  ]);
  expect(
    store.db
      .prepare("SELECT COUNT(*) AS count FROM courses WHERE id=?")
      .get(deleted.id)?.count,
  ).toBe(0);
  for (const table of [
    "graph_revisions",
    "chapter_packages",
    "generation_jobs",
    "progress_events",
  ]) {
    expect(
      store.db
        .prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE course_id=?`)
        .get(deleted.id)?.count,
      table,
    ).toBe(0);
  }
  expect(
    store.db
      .prepare("SELECT id FROM audio_artifacts")
      .all()
      .map((row) => String(row.id))
      .sort(),
  ).toEqual(
    [
      retainedPackageId,
      `page-audio:${retainedPackageId}:section-a`,
      `page-audio:${supersededPackageId}-neighbor:section-a`,
    ].sort(),
  );
  expect(service.getCourse(session, retained.id).goal).toBe("Course to keep");
});

it("rejects deletion by a different learner without changing either course", () => {
  const { service, session, deleted, retained } = setup();
  const stranger = service.session();

  expect(() => service.deleteCourse(stranger, deleted.id)).toThrow(
    /course not found/i,
  );
  expect(service.listCourses(session).map((course) => course.id)).toEqual([
    retained.id,
    deleted.id,
  ]);
});
