"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ArrowUpRight, BookOpen, Trash2 } from "lucide-react";
import { SiteHeader } from "./site-header";
import { CourseCatalog } from "./course-catalog";
import { api } from "./api";
import type { CourseSummary } from "../core/state";
import { useHomeLanguage } from "./use-home-language";
import { homeCopy } from "./home-language";
import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "./use-theme";
export function Explore() {
  const { language, changeLanguage } = useHomeLanguage();
  const english = language === "en";
  const { dark, toggle } = useTheme();
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = homeCopy[language].lang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [language]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [courseToDelete, setCourseToDelete] = useState<CourseSummary | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let cancelled = false;
    api<{ courses: CourseSummary[] }>("courses")
      .then((result) => {
        if (!cancelled) {
          setCourses(result.courses);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const dialog = deleteDialog.current;
    if (!courseToDelete || !dialog) return;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLButtonElement>("[data-delete-cancel]")?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [courseToDelete]);

  function closeDeleteDialog() {
    if (deleting) return;
    deleteDialog.current?.close();
    setCourseToDelete(null);
    setDeleteError(false);
  }

  async function confirmDelete() {
    if (!courseToDelete || deleting) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      await api<{ deleted: true }>(
        `courses/${encodeURIComponent(courseToDelete.id)}`,
        undefined,
        "DELETE",
      );
      setCourses((current) =>
        current.filter((course) => course.id !== courseToDelete.id),
      );
      deleteDialog.current?.close();
      setCourseToDelete(null);
    } catch {
      setDeleteError(true);
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div className="explore" lang={homeCopy[language].lang}>
      <SiteHeader
        active="explore"
        language={language}
        onLanguageChange={changeLanguage}
        themeControl={
          <ThemeToggle
            dark={dark}
            onToggle={toggle}
            label={english ? "Toggle light and dark mode" : "切換深淺色"}
          />
        }
      />
      <main className="courses-page">
        <h1 className="sr-only">{english ? "Courses" : "課程"}</h1>
        <details className="course-group" open>
          <summary>
            <h2>{english ? "My Courses" : "我的課程"}</h2>
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <div className="my-courses-content">
            {status === "loading" ? (
              <p role="status">
                {english ? "Loading courses…" : "正在載入課程…"}
              </p>
            ) : status === "error" ? (
              <p role="status">
                {english
                  ? "Unable to load courses. Please refresh and try again."
                  : "暫時無法載入課程，請重新整理再試一次。"}
              </p>
            ) : courses.length ? (
              <div className="saved-course-list">
                {courses.map((course) => (
                  <article className="saved-course-entry" key={course.id}>
                    <a
                      className="saved-course"
                      href={`/?course=${encodeURIComponent(course.id)}`}
                    >
                      <span className="saved-course-icon">
                        <BookOpen size={24} aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{course.goal}</strong>
                        <small>
                          {course.status === "planning"
                            ? english
                              ? "Preparing course…"
                              : "課程準備中…"
                            : course.status === "failed"
                              ? english
                                ? "Needs retry"
                                : "需要重試"
                              : english
                                ? "Continue learning"
                                : "繼續學習"}
                        </small>
                      </span>
                      <ArrowUpRight size={18} aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      className="saved-course-delete"
                      aria-label={
                        english
                          ? `Delete course “${course.goal}”`
                          : `刪除課程「${course.goal}」`
                      }
                      onClick={() => {
                        setDeleteError(false);
                        setCourseToDelete(course);
                      }}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="my-courses-empty">
                <p>{english ? "No courses yet" : "目前還沒有課程"}</p>
                <a href="/?home=1">
                  {english ? "Start Learning" : "開始學習"}{" "}
                  <ArrowUpRight size={14} />
                </a>
              </div>
            )}
          </div>
        </details>
        <details className="course-group" open>
          <summary>
            <h2>{english ? "Explore More Courses" : "探索更多課程"}</h2>
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <CourseCatalog home showHeading={false} language={language} />
        </details>
      </main>
      {courseToDelete && (
        <dialog
          className="course-delete-dialog"
          ref={deleteDialog}
          aria-labelledby="course-delete-title"
          aria-describedby="course-delete-description"
          aria-busy={deleting}
          onCancel={(event) => {
            event.preventDefault();
            closeDeleteDialog();
          }}
          onClose={() => {
            if (!deleting) {
              setCourseToDelete(null);
              setDeleteError(false);
            }
          }}
        >
          <span className="course-delete-icon" aria-hidden="true">
            <Trash2 size={22} />
          </span>
          <h2 id="course-delete-title">
            {english
              ? `Delete “${courseToDelete.goal}”?`
              : `刪除「${courseToDelete.goal}」？`}
          </h2>
          <p id="course-delete-description">
            {english
              ? "Deleting this course permanently removes its content, learning progress, workspace files, and audio. This cannot be undone."
              : "刪除此課程將永久移除課程內容、學習進度、工作區檔案和音訊。此動作無法復原。"}
          </p>
          {deleteError && (
            <p className="course-delete-error" role="alert">
              {english
                ? "Unable to delete this course. Please try again."
                : "無法刪除課程，請再試一次。"}
            </p>
          )}
          <div className="course-delete-actions">
            <button
              type="button"
              className="course-delete-cancel"
              data-delete-cancel
              disabled={deleting}
              onClick={closeDeleteDialog}
            >
              {english ? "Cancel" : "取消"}
            </button>
            <button
              type="button"
              className="course-delete-confirm"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting
                ? english
                  ? "Deleting…"
                  : "刪除中…"
                : deleteError
                  ? english
                    ? "Try again"
                    : "再試一次"
                  : english
                    ? "Delete permanently"
                    : "永久刪除"}
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
