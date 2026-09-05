"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
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
  const [course, setCourse] = useState<Snapshot | null>(null),
    [ready, setReady] = useState(false),
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
    // The explore route's demo card hands off through the URL, so that button
    // means exactly what the one on the landing means.
    const params = new URLSearchParams(window.location.search);
    const wantsHome = params.has("home");
    const wantsDemo = !wantsHome && params.has("demo");
    setHome(wantsHome);
    if (wantsDemo)
      window.history.replaceState(null, "", window.location.pathname);
    api<{ course: Snapshot | null }>("sessions", {})
      .then((r) => {
        setCourse(r.course);
        if (wantsDemo) void start("demo");
      })
      .catch((e) => setError(e.message))
      .finally(() => setReady(true));
  }, []);

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

  function showHome(value: boolean) {
    const url = new URL(window.location.href);
    url.searchParams.delete("demo");
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
      });
      setCourse(c);
      showHome(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const showingLanding = !course || home;

  useEffect(() => {
    if (!showingLanding) return;
    const previous = document.documentElement.lang;
    document.documentElement.lang = copy.lang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [showingLanding, copy.lang]);

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
          language={language}
          onLanguageChange={changeLanguage}
          goal={goal}
          onGoalChange={setGoal}
          busy={busy}
          ready={ready}
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
