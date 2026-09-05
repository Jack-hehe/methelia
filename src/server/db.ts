import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Course, PackageState } from "../core/state";
export class Store {
  db: DatabaseSync;
  constructor(
    path = resolve(process.env.METHELIA_DATA_DIR || ".data", "methelia.sqlite"),
  ) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS learner_sessions(id TEXT PRIMARY KEY, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS courses(id TEXT PRIMARY KEY, session_id TEXT NOT NULL, request_id TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(session_id,request_id));
      CREATE TABLE IF NOT EXISTS graph_revisions(course_id TEXT NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(course_id,revision));
      CREATE TABLE IF NOT EXISTS chapter_packages(id TEXT PRIMARY KEY, course_id TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS generation_jobs(id TEXT PRIMARY KEY, course_id TEXT NOT NULL, package_id TEXT, kind TEXT NOT NULL, status TEXT NOT NULL, lease INTEGER NOT NULL DEFAULT 0, error TEXT);
      CREATE TABLE IF NOT EXISTS audio_artifacts(id TEXT PRIMARY KEY, audio BLOB NOT NULL, content_type TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS progress_events(id INTEGER PRIMARY KEY AUTOINCREMENT, course_id TEXT NOT NULL, data TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS courses_session ON courses(session_id);
    `);
  }
  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec("COMMIT");
      return value;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  getCourse(id: string): Course | null {
    const row = this.db
      .prepare("SELECT data FROM courses WHERE id=?")
      .get(id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  }
  putCourse(course: Course) {
    this.db
      .prepare(
        "INSERT INTO courses VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(
        course.id,
        course.sessionId,
        course.requestId,
        JSON.stringify(course),
      );
  }
  getPackage(id: string): PackageState | null {
    const row = this.db
      .prepare("SELECT data FROM chapter_packages WHERE id=?")
      .get(id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  }
  putPackage(courseId: string, pkg: PackageState) {
    this.db
      .prepare(
        "INSERT INTO chapter_packages VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(pkg.id, courseId, JSON.stringify(pkg));
  }
  revision(course: Course) {
    this.db
      .prepare("INSERT INTO graph_revisions VALUES(?,?,?)")
      .run(course.id, course.revision, JSON.stringify(course.graph));
  }
  enqueue(
    id: string,
    courseId: string,
    kind: string,
    packageId: string | null = null,
  ) {
    this.db
      .prepare(
        "INSERT OR IGNORE INTO generation_jobs(id,course_id,package_id,kind,status) VALUES(?,?,?,?,'queued')",
      )
      .run(id, courseId, packageId, kind);
  }
}
let instance: Store | undefined;
export const getStore = () => (instance ??= new Store());
