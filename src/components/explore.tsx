"use client";
import { useEffect, useState } from "react";
import { ChevronDown, ArrowUpRight, BookOpen } from "lucide-react";
import { SiteHeader } from "./site-header";
import { CourseCatalog } from "./course-catalog";
import { api } from "./api";
import type { Snapshot } from "../core/state";
import { useHomeLanguage } from "./use-home-language";
import { homeCopy } from "./home-language";
export function Explore() {
  const { language, changeLanguage } = useHomeLanguage();
  const english = language === "en";
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = homeCopy[language].lang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [language]);
  const [course, setCourse] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  useEffect(() => {
    let cancelled = false;
    api<{ course: Snapshot | null }>("sessions", {})
      .then((result) => {
        if (!cancelled) {
          setCourse(result.course);
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
  return (
    <div className="explore" lang={homeCopy[language].lang}>
      <SiteHeader
        active="explore"
        language={language}
        onLanguageChange={changeLanguage}
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
            ) : course ? (
              <a className="saved-course" href="/">
                <span className="saved-course-icon">
                  <BookOpen size={24} />
                </span>
                <span>
                  <strong>{course.goal}</strong>
                  <small>
                    {english
                      ? "Current course · Continue learning"
                      : "目前的學習課程 · 繼續學習"}
                  </small>
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
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
    </div>
  );
}
