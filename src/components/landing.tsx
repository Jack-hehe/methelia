"use client";
import { useState } from "react";
import { Play, ArrowUpRight, LoaderCircle } from "lucide-react";
import { SiteHeader } from "./site-header";
import { useTypewriter } from "./use-typewriter";
import { homeCopy, type HomeLanguage } from "./home-language";
import { CourseCatalog } from "./course-catalog";

export function Landing({
  goal,
  onGoalChange,
  busy,
  ready,
  onStart,
  onDemo,
  onMyCourses,
  themeControl,
  language,
  onLanguageChange,
}: {
  goal: string;
  onGoalChange: (value: string) => void;
  busy: boolean;
  ready: boolean;
  onStart: () => void;
  onDemo: () => void;
  onMyCourses?: () => void;
  themeControl: React.ReactNode;
  language: HomeLanguage;
  onLanguageChange: (language: HomeLanguage) => void;
}) {
  const copy = homeCopy[language];
  const [focused, setFocused] = useState(false);
  const subject = useTypewriter({ words: copy.subjects, startMs: 600 });
  // Ideas are inspiration, never input: they only reach the placeholder, and
  // they stop the moment the field is in use so they never fight the writer.
  const idea = useTypewriter({
    words: copy.ideas,
    typeMs: 95,
    eraseMs: 45,
    holdMs: 2600,
    gapMs: 520,
    startMs: 320,
    enabled: !focused && goal.length === 0,
  });

  return (
    <div className="landing" lang={copy.lang}>
      <div className="landing-hero">
        <SiteHeader
          language={language}
          onLanguageChange={onLanguageChange}
          themeControl={themeControl}
        />

        <main className="landing-main">
          <h1 className="hero-title">
            <span className="title-line">
              {language === "en" ? "I want to " : "我想"}
              <span className="learn-word">
                {language === "en" ? "learn" : "學習"}
                <span className="word-star" aria-hidden="true">
                  ✳
                </span>
              </span>
            </span>
            <span className="title-line title-typed">
              <span className="typed">{subject.text}</span>
              <span className={"cursor" + (subject.idle ? " is-idle" : "")} />
            </span>
            <span className="sr-only">
              {copy.subjects.join(language === "zh" ? "、" : ", ")}
            </span>
          </h1>

          <form
            className={"goal-box" + (focused ? " is-focused" : "")}
            onSubmit={(e) => {
              e.preventDefault();
              onStart();
            }}
          >
            <label className="sr-only" htmlFor="goal">
              {copy.goal}
            </label>
            <textarea
              id="goal"
              value={goal}
              onChange={(e) => onGoalChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={idea.text}
              maxLength={1500}
              required
            />
            <div className="goal-bottom">
              <button
                className="primary-button"
                disabled={busy || !ready || !goal.trim()}
                type="submit"
                aria-label={copy.start}
                aria-busy={busy}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <>
                    {copy.start} <ArrowUpRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="demo-line">
            <button
              className="lesson-button"
              onClick={onDemo}
              disabled={busy || !ready}
            >
              <Play size={14} aria-hidden="true" /> <span>{copy.demo}</span>
            </button>
            {onMyCourses && (
              <button
                className="text-button"
                onClick={onMyCourses}
                disabled={busy || !ready}
              >
                {language === "en" ? "Continue learning" : "我的課程"}
              </button>
            )}
            <small>
              {language === "en"
                ? "Prebuilt website demo"
                : "預先製作的網站範例"}
            </small>
          </div>
        </main>
      </div>
      <CourseCatalog language={language} home />
    </div>
  );
}
