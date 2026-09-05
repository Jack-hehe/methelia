"use client";
import { useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, LoaderCircle } from "lucide-react";
import { SiteHeader } from "./site-header";
import { useTypewriter } from "./use-typewriter";

const SUBJECTS = [
  "網頁設計",
  "CSS 排版",
  "互動動畫",
  "JavaScript",
  "響應式版面",
] as const;

const IDEAS = [
  "我想從零開始，做一個屬於自己的網站",
  "我想學會 CSS 排版",
  "我想讓網頁上的按鈕動起來",
  "我想做一個放作品的個人網頁",
  "我想看懂別人的網頁是怎麼寫的",
] as const;

export function Landing({
  goal,
  onGoalChange,
  busy,
  ready,
  onStart,
  onDemo,
  onMyCourses,
  themeControl,
}: {
  goal: string;
  onGoalChange: (value: string) => void;
  busy: boolean;
  ready: boolean;
  onStart: () => void;
  onDemo: () => void;
  onMyCourses?: () => void;
  themeControl: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const subject = useTypewriter({ words: SUBJECTS, startMs: 600 });
  // Ideas are inspiration, never input: they only reach the placeholder, and
  // they stop the moment the field is in use so they never fight the writer.
  const idea = useTypewriter({
    words: IDEAS,
    typeMs: 95,
    eraseMs: 45,
    holdMs: 2600,
    gapMs: 520,
    startMs: 320,
    enabled: !focused && goal.length === 0,
  });

  return (
    <div className="landing">
      <SiteHeader themeControl={themeControl} onMyCourses={onMyCourses} />

      <main className="landing-main">
        <h1 className="hero-title">
          <span className="title-line">
            I want to{" "}
            <span className="learn-word">
              learn<span className="word-star">✳</span>
            </span>
          </span>
          <span className="title-line title-typed">
            <span className="typed">{subject.text}</span>
            <span className={"cursor" + (subject.idle ? " is-idle" : "")} />
          </span>
          <span className="sr-only">{SUBJECTS.join("、")}</span>
        </h1>

        <form
          className={"goal-box" + (focused ? " is-focused" : "")}
          onSubmit={(e) => {
            e.preventDefault();
            onStart();
          }}
        >
          <label className="sr-only" htmlFor="goal">
            你想學什麼？
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
            >
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <>
                  建立課程 <ArrowUpRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="demo-line">
          <button
            className="text-button"
            onClick={onDemo}
            disabled={busy || !ready}
          >
            先體驗一堂課 <ArrowRight size={14} />
          </button>
          <small>固定示範課程 · 不需 API key</small>
        </div>
      </main>

      <footer className="site-footer">
        <span>METHELIA / EARLY ACCESS</span>
      </footer>
    </div>
  );
}
