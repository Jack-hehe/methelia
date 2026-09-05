"use client";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { Snapshot } from "../core/state";
import { api } from "./api";
import { CoursePlayer } from "./course-player";
import { Landing } from "./landing";
import { useHomeLanguage } from "./use-home-language";
import { homeCopy, homeError } from "./home-language";
import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "./use-theme";

export function LearningApp() {
  const initialized = useRef(false);
  const [sessionStatus, setSessionStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [course, setCourse] = useState<Snapshot | null>(null),
    [busy, setBusy] = useState(false),
    [goal, setGoal] = useState(""),
    [error, setError] = useState(""),
    [home, setHome] = useState(false);
  const { language, changeLanguage } = useHomeLanguage();
  const copy = homeCopy[language];
  const { dark, toggle } = useTheme();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void restoreSession();
  }, []);

  async function restoreSession() {
    setSessionStatus("loading");
    setError("");
    const params = new URLSearchParams(window.location.search);
    const wantsHome = params.has("home");
    const wantsDemo = !wantsHome && params.has("demo");
    const courseId = params.get("course");
    setHome(wantsHome);
    try {
      const result = await api<{ course: Snapshot | null }>("sessions", {});
      const restored =
        courseId && !wantsDemo
          ? await api<Snapshot>("courses/" + encodeURIComponent(courseId))
          : result.course;
      setCourse(restored);
      if (wantsDemo) {
        const url = new URL(window.location.href);
        url.searchParams.delete("demo");
        window.history.replaceState(
          null,
          "",
          url.pathname + url.search + url.hash,
        );
        await start("demo");
      } else if (restored) {
        showHome(wantsHome, restored.id);
      }
      setSessionStatus("ready");
    } catch {
      setSessionStatus("error");
    }
  }

  useEffect(() => {
    if (!course || course.status === "failed") return;
    const pending =
      course.status === "planning" ||
      Object.values(course.chapters).some(
        (p) =>
          ["queued", "generating"].includes(p.status) ||
          ["pending", "generating"].includes(p.speech),
      );
    if (!pending) return;
    let cancelled = false;
    const timer = setInterval(
      () =>
        api<Snapshot>("courses/" + course.id)
          .then((c) => {
            if (!cancelled) setCourse(c);
          })
          .catch((e) => setError(e.message)),
      2000,
    );
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [course]);

  function showHome(value: boolean, courseId = course?.id) {
    const url = new URL(window.location.href);
    url.searchParams.delete("demo");
    if (courseId) url.searchParams.set("course", courseId);
    else url.searchParams.delete("course");
    if (value) url.searchParams.set("home", "1");
    else url.searchParams.delete("home");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    setHome(value);
  }

  async function start(mode: "demo" | "live") {
    setBusy(true);
    setError("");
    try {
      const c = await api<Snapshot>("courses", {
        goal: mode === "demo" ? "體驗：從零打造我的第一個網站" : goal,
        mode,
        requestId: crypto.randomUUID(),
        language: mode === "demo" || language === "zh" ? "zh-TW" : "en",
      });
      setCourse(c);
      showHome(false, c.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const showingLanding = sessionStatus === "ready" && (!course || home);

  useEffect(() => {
    if (!showingLanding) return;
    const previous = document.documentElement.lang;
    document.documentElement.lang = copy.lang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [showingLanding, copy.lang]);

  // A session that has not loaded is not evidence that no course exists.
  // Keep both SSR and the first client render neutral until the destination is known.
  if (sessionStatus !== "ready") {
    return (
      <main
        className="app-entry"
        lang={copy.lang}
        aria-busy={sessionStatus === "loading"}
      >
        {sessionStatus === "error" ? (
          <>
            <p role="alert">{copy.restoreError}</p>
            <button
              className="secondary-button"
              onClick={() => void restoreSession()}
            >
              {copy.retry}
            </button>
            <a href="/explore">{copy.courses}</a>
          </>
        ) : (
          <div role="status">
            <LoaderCircle className="spin" size={24} aria-hidden="true" />
            <span className="sr-only">{copy.loading}</span>
          </div>
        )}
      </main>
    );
  }

  return (
    <>
      {error && (
        <div
          className="toast"
          role="alert"
          lang={showingLanding ? copy.lang : undefined}
        >
          <span>{showingLanding ? homeError(error, language) : error}</span>
          <button
            aria-label={showingLanding ? copy.dismiss : "關閉訊息"}
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {course && !home ? (
        <CoursePlayer
          course={course}
          onChange={setCourse}
          onError={setError}
          onHome={() => showHome(true)}
          themeControl={<ThemeToggle dark={dark} onToggle={toggle} />}
        />
      ) : (
        <Landing
          homeHref={
            course
              ? `/?home=1&course=${encodeURIComponent(course.id)}`
              : undefined
          }
          language={language}
          onLanguageChange={changeLanguage}
          goal={goal}
          onGoalChange={setGoal}
          busy={busy}
          ready={sessionStatus === "ready"}
          onStart={() => void start("live")}
          onDemo={() => void start("demo")}
          onMyCourses={course ? () => showHome(false) : undefined}
          themeControl={
            <ThemeToggle
              dark={dark}
              onToggle={toggle}
              label={
                language === "en" ? "Toggle light and dark mode" : "切換深淺色"
              }
            />
          }
        />
      )}
    </>
  );
}
