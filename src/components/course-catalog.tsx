"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeLanguage } from "./home-language";
export type Tone = "violet" | "blue" | "amber";

export const TONES: Record<Tone, CSSProperties> = {
  violet: {
    "--tint": "var(--tint-violet)",
    "--accent": "var(--violet)",
  } as CSSProperties,
  blue: {
    "--tint": "var(--tint-blue)",
    "--accent": "var(--blue)",
  } as CSSProperties,
  amber: {
    "--tint": "var(--tint-amber)",
    "--accent": "var(--amber)",
  } as CSSProperties,
};

type Chapter = { title: string; lessons: number; level: string };
type Track = {
  name: string;
  tagline: string;
  tone: Tone;
  glyph: string;
  chapters: Chapter[];
};

/* Ordered like a contents page: foundations first, then build. */
const TRACKS: Track[] = [
  {
    name: "HTML",
    tagline: "網頁的骨架",
    tone: "violet",
    glyph: "</>",
    chapters: [
      { title: "第一個 HTML 檔案", lessons: 5, level: "入門" },
      { title: "標題、段落與文字", lessons: 7, level: "入門" },
      { title: "連結與圖片", lessons: 6, level: "入門" },
      { title: "清單與表格", lessons: 8, level: "入門" },
      { title: "表單與輸入欄位", lessons: 9, level: "進階" },
      { title: "語意標籤與文件結構", lessons: 7, level: "進階" },
      { title: "無障礙的基本功", lessons: 8, level: "進階" },
    ],
  },
  {
    name: "CSS",
    tagline: "讓它變好看",
    tone: "blue",
    glyph: "{ }",
    chapters: [
      { title: "選擇器與樣式表", lessons: 6, level: "入門" },
      { title: "顏色、字體與間距", lessons: 8, level: "入門" },
      { title: "盒模型與空間感", lessons: 7, level: "入門" },
      { title: "Flexbox 排版", lessons: 10, level: "進階" },
      { title: "Grid 版面", lessons: 11, level: "進階" },
      { title: "響應式與斷點", lessons: 9, level: "進階" },
      { title: "過場與動畫", lessons: 8, level: "進階" },
      { title: "設計變數與深色模式", lessons: 7, level: "精通" },
    ],
  },
  {
    name: "JavaScript",
    tagline: "讓它動起來",
    tone: "amber",
    glyph: "( )",
    chapters: [
      { title: "變數與資料型別", lessons: 7, level: "入門" },
      { title: "條件判斷與迴圈", lessons: 9, level: "入門" },
      { title: "函式與作用域", lessons: 8, level: "入門" },
      { title: "操作 DOM", lessons: 11, level: "進階" },
      { title: "事件與互動", lessons: 10, level: "進階" },
      { title: "表單驗證", lessons: 8, level: "進階" },
      { title: "用 fetch 取資料", lessons: 9, level: "精通" },
      { title: "把作品發佈出去", lessons: 6, level: "精通" },
    ],
  },
];

const total = TRACKS.reduce((n, t) => n + t.chapters.length, 0);

const ENGLISH = [
  {
    tagline: "The structure of the web",
    titles: [
      "Your first HTML file",
      "Headings, paragraphs and text",
      "Links and images",
      "Lists and tables",
      "Forms and inputs",
      "Semantic tags and document structure",
      "Accessibility essentials",
    ],
  },
  {
    tagline: "Bring your design to life",
    titles: [
      "Selectors and stylesheets",
      "Colors, typography and spacing",
      "The box model",
      "Flexbox layout",
      "Grid layout",
      "Responsive design and breakpoints",
      "Transitions and animation",
      "Design tokens and dark mode",
    ],
  },
  {
    tagline: "Make it interactive",
    titles: [
      "Variables and data types",
      "Conditions and loops",
      "Functions and scope",
      "Working with the DOM",
      "Events and interaction",
      "Form validation",
      "Fetching data",
      "Publishing your project",
    ],
  },
];
const EN_TRACKS: Track[] = TRACKS.map((track, i) => ({
  ...track,
  tagline: ENGLISH[i].tagline,
  chapters: track.chapters.map((chapter, j) => ({
    ...chapter,
    title: ENGLISH[i].titles[j],
    level:
      chapter.level === "入門"
        ? "Beginner"
        : chapter.level === "進階"
          ? "Intermediate"
          : "Advanced",
  })),
}));

function Reveal({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current!;
    if (!enabled || !("IntersectionObserver" in window)) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    const show = () => {
      element.dataset.reveal = "visible";
      observer.disconnect();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) show();
      },
      { rootMargin: "0px 0px -40px 0px", threshold: 0 },
    );
    if (element.getBoundingClientRect().top >= innerHeight - 40) {
      element.dataset.reveal = "pending";
      observer.observe(element);
    }
    const motion = () => {
      if (reduced.matches) show();
    };
    element.addEventListener("focusin", show);
    reduced.addEventListener("change", motion);
    return () => {
      observer.disconnect();
      element.removeEventListener("focusin", show);
      reduced.removeEventListener("change", motion);
    };
  }, [enabled]);
  if (!enabled) return <>{children}</>;
  return (
    <div className="catalog-reveal" ref={root}>
      {children}
    </div>
  );
}

function Rail({
  track,
  language,
  home,
}: {
  track: Track;
  language: HomeLanguage;
  home: boolean;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    // 2px of slack: sub-pixel scroll widths never reach the exact maximum.
    const sync = () => {
      setAtStart(el.scrollLeft <= 2);
      setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 2);
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  function go(direction: number) {
    const el = viewport.current;
    if (el)
      el.scrollBy({
        left: direction * el.clientWidth,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }
  const previous = (
    <button
      className="rail-btn rail-prev"
      aria-label={
        language === "zh"
          ? "上一批 " + track.name + " 章節"
          : "Previous " + track.name + " chapters"
      }
      disabled={atStart}
      onClick={() => go(-1)}
    >
      <ChevronLeft size={17} />
    </button>
  );
  const next = (
    <button
      className="rail-btn rail-next"
      aria-label={
        language === "zh"
          ? "下一批 " + track.name + " 章節"
          : "Next " + track.name + " chapters"
      }
      disabled={atEnd}
      onClick={() => go(1)}
    >
      <ChevronRight size={17} />
    </button>
  );

  return (
    <section className="rail">
      <div className="rail-head">
        <div className="rail-title">
          <h3>{track.name}</h3>
          <span>{track.tagline}</span>
        </div>
        <div className="rail-nav">
          <span className="rail-count">
            {track.chapters.length} {language === "zh" ? "個章節" : "chapters"}
          </span>
          {!home && (
            <>
              {previous}
              {next}
            </>
          )}
        </div>
      </div>
      <div className={home ? "rail-stage" : undefined}>
        {home && previous}
        <div
          className="rail-viewport"
          ref={viewport}
          tabIndex={0}
          aria-label={track.name + (language === "zh" ? " 章節" : " chapters")}
        >
          {track.chapters.map((chapter, i) => (
            <article
              className="course-card"
              key={i}
              style={
                {
                  "--reveal-delay": `${Math.min(i, 2) * 70}ms`,
                } as CSSProperties
              }
            >
              <span className="card-thumb" style={TONES[track.tone]}>
                <span className="card-no">
                  CH {String(i + 1).padStart(2, "0")}
                </span>
                <span className="card-glyph">{track.glyph}</span>
              </span>
              <span className="card-title">{chapter.title}</span>
              <span className="card-meta">
                {chapter.lessons} {language === "zh" ? "小節" : "lessons"} ·{" "}
                {chapter.level}
              </span>
              <div className="card-stats">
                <span
                  title={
                    language === "zh"
                      ? "瀏覽次數尚無資料"
                      : "View count unavailable"
                  }
                  aria-label={
                    language === "zh"
                      ? "瀏覽次數尚無資料"
                      : "View count unavailable"
                  }
                >
                  <span aria-hidden="true">👁️</span> —
                </span>
                <span
                  title={
                    language === "zh"
                      ? "儲存次數尚無資料"
                      : "Save count unavailable"
                  }
                  aria-label={
                    language === "zh"
                      ? "儲存次數尚無資料"
                      : "Save count unavailable"
                  }
                >
                  <span aria-hidden="true">🔖</span> —
                </span>
              </div>
            </article>
          ))}
        </div>
        {home && next}
      </div>
    </section>
  );
}

export function CourseCatalog({
  language = "zh",
  home = false,
  showHeading = true,
}: {
  language?: HomeLanguage;
  home?: boolean;
  showHeading?: boolean;
}) {
  const tracks = language === "en" ? EN_TRACKS : TRACKS;
  return (
    <section
      className={"catalog" + (home ? " home-catalog" : "")}
      aria-label={language === "en" ? "Course catalog" : "課程章節"}
    >
      {showHeading && (
        <Reveal enabled={home}>
          <div className="catalog-head">
            <div>
              {!home && (
                <p className="eyebrow">
                  <span className="small-dot" /> COURSE CATALOG
                </p>
              )}
              <h2>{language === "en" ? "Featured Courses" : "精選課程"}</h2>
            </div>
            {!home && (
              <p>
                {language === "en"
                  ? `Three tracks, ${total} chapter ideas. These cards illustrate planned topics; choose “Try a Lesson” for the working five-chapter demo.`
                  : `三條主線、${total} 個章節構想。下方卡片展示規劃方向；可操作的五章範例請使用「先體驗一堂課」。`}
              </p>
            )}
          </div>
        </Reveal>
      )}
      {tracks.map((track) => (
        <Reveal enabled={home} key={track.name}>
          <Rail track={track} language={language} home={home} />
        </Reveal>
      ))}
    </section>
  );
}
