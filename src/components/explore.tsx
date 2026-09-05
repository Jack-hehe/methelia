"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { SiteHeader } from "./site-header";
import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "./use-theme";

/* Placeholder showcase content. These are illustrative figures for the
   browse surface, not records from the database. */

type Tone = "violet" | "blue" | "amber";

const TONES: Record<Tone, CSSProperties> = {
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

const WORKS: { title: string; author: string; stack: string; tone: Tone }[] = [
  {
    title: "咖啡廳的一頁式菜單",
    author: "Yuki",
    stack: "HTML + CSS",
    tone: "violet",
  },
  {
    title: "攝影作品集",
    author: "Ren",
    stack: "HTML + CSS + JS",
    tone: "blue",
  },
  { title: "讀書筆記網站", author: "小柏", stack: "HTML + CSS", tone: "amber" },
  {
    title: "會動的互動式履歷",
    author: "Nina",
    stack: "HTML + CSS + JS",
    tone: "blue",
  },
  {
    title: "樂團巡演資訊頁",
    author: "阿哲",
    stack: "HTML + CSS",
    tone: "violet",
  },
  {
    title: "每日習慣追蹤器",
    author: "Mei",
    stack: "HTML + CSS + JS",
    tone: "amber",
  },
];

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
    tagline: "內容結構",
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
    tagline: "樣式與排版",
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
    tagline: "事件與互動",
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

function Rail({ track }: { track: Track }) {
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
      el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  return (
    <section className="rail">
      <div className="rail-head">
        <div className="rail-title">
          <h3>{track.name}</h3>
          <span>{track.tagline}</span>
        </div>
        <div className="rail-nav">
          <span className="rail-count">{track.chapters.length} 個章節</span>
          <button
            className="rail-btn"
            aria-label={"上一批 " + track.name + " 章節"}
            disabled={atStart}
            onClick={() => go(-1)}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="rail-btn"
            aria-label={"下一批 " + track.name + " 章節"}
            disabled={atEnd}
            onClick={() => go(1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="rail-viewport" ref={viewport}>
        {track.chapters.map((chapter, i) => (
          <article className="course-card" key={chapter.title}>
            <span className="card-thumb" style={TONES[track.tone]}>
              <span className="card-no">
                CH {String(i + 1).padStart(2, "0")}
              </span>
              <span className="card-glyph">{track.glyph}</span>
            </span>
            <span className="card-title">{chapter.title}</span>
            <span className="card-meta">
              {chapter.lessons} 小節 · {chapter.level}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Explore() {
  const { dark, toggle } = useTheme();
  return (
    <div className="explore">
      <SiteHeader
        themeControl={<ThemeToggle dark={dark} onToggle={toggle} />}
        active="explore"
      />

      <main>
        <div className="page-head">
          <h1>課程與作品</h1>
          <p>作品與課程皆為介面示意，非真實學員作品或已開放課程。</p>
        </div>

        <section className="works">
          <div className="works-grid">
            {WORKS.map((work) => (
              <article className="work-card" key={work.title}>
                <span className="work-thumb" style={TONES[work.tone]}>
                  <span className="work-chrome">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="work-canvas">
                    <span className="wc-bar wc-bar--wide" />
                    <span className="wc-hero" />
                    <span className="wc-row">
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className="wc-bar wc-bar--narrow" />
                  </span>
                </span>
                <span className="work-title">{work.title}</span>
                <span className="work-meta">
                  by {work.author} · {work.stack}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="catalog">
          <div className="catalog-head">
            <div>
              <h2>學習路徑示意</h2>
            </div>
            <p>3 條路徑 · {total} 個章節示意</p>
          </div>
          {TRACKS.map((track) => (
            <Rail track={track} key={track.name} />
          ))}
        </section>

        <section className="demo-invite">
          <div className="demo-card">
            <h2>體驗課程</h2>
            <p>5 個章節 · 包含實作與補強節點</p>
            <a className="text-button" href="/?demo=1">
              先體驗一堂課 <ArrowRight size={16} />
            </a>
            <small>固定示範課程 · 不需 API key</small>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>METHELIA / EARLY ACCESS</span>
      </footer>
    </div>
  );
}
