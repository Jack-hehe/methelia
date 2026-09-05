"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import type { HomeLanguage } from "./home-language";
import type { Snapshot } from "../core/state";
import { featuredCourses } from "../core/featured/catalog";
import { api } from "./api";
import "./featured-catalog.css";
function Cover({ kind, index }: { kind: string; index: number }) {
  return (
    <svg viewBox="0 0 400 220" aria-hidden="true" className="featured-art">
      <defs>
        <pattern
          id={`grid-${index}`}
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 24 0 L 0 0 0 24"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".08"
          />
        </pattern>
      </defs>
      <rect width="400" height="220" fill={`url(#grid-${index})`} />
      {["geometry", "orbit", "ecosystem"].includes(kind) ? (
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="200" cy="110" r="68" />
          <ellipse cx="200" cy="110" rx="28" ry="68" />
          <ellipse
            cx="200"
            cy="110"
            rx="68"
            ry="24"
            transform="rotate(-25 200 110)"
          />
          <ellipse
            cx="200"
            cy="110"
            rx="110"
            ry="32"
            transform="rotate(-25 200 110)"
            strokeDasharray="5 8"
          />
          <circle cx="296" cy="65" r="9" fill="currentColor" />
        </g>
      ) : ["sound", "calculus", "animation"].includes(kind) ? (
        <g fill="none" stroke="currentColor">
          <path d="M45 110 H355 M200 30 V190" strokeOpacity=".25" />
          <path
            d="M45 140 C80 140 85 40 125 65 S170 190 215 130 S265 25 300 85 S340 145 355 90"
            strokeWidth="5"
          />
          <circle cx="215" cy="130" r="8" fill="currentColor" />
          <path d="M160 175 L280 70" strokeDasharray="5 7" />
        </g>
      ) : ["color", "design", "separation"].includes(kind) ? (
        <g opacity=".85">
          <circle cx="169" cy="100" r="58" fill="#e88d76" />
          <circle cx="226" cy="100" r="58" fill="#9682e4" />
          <circle cx="200" cy="145" r="58" fill="#69bdb6" opacity=".8" />
        </g>
      ) : ["web", "python", "data"].includes(kind) ? (
        <g>
          <rect
            x="62"
            y="38"
            width="276"
            height="154"
            rx="12"
            fill="var(--surface,#fff)"
            stroke="currentColor"
          />
          <path d="M62 65 H338" stroke="currentColor" />
          <circle cx="80" cy="52" r="3" fill="currentColor" />
          <rect
            x="82"
            y="85"
            width="82"
            height="85"
            rx="6"
            fill="currentColor"
            opacity=".14"
          />
          <path
            d="M190 95 H300 M190 115 H285 M190 135 H260"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <text
            x="123"
            y="140"
            textAnchor="middle"
            fontSize="36"
            fill="currentColor"
          >
            {kind === "python" ? "Py" : "{ }"}
          </text>
        </g>
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M80 160 L150 65 L245 140 L325 55" />
          <circle cx="80" cy="160" r="22" fill="var(--surface,#fff)" />
          <circle cx="150" cy="65" r="30" fill="currentColor" opacity=".25" />
          <circle cx="245" cy="140" r="38" fill="var(--surface,#fff)" />
          <circle cx="325" cy="55" r="16" fill="currentColor" />
          <path d="M45 190 H355" strokeOpacity=".3" />
        </g>
      )}
    </svg>
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
  const en = language === "en",
    locale = en ? "en" : "zh";
  const [domain, setDomain] = useState("all");
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => setDomain("all"), [language]);
  const domains = Array.from(
    new Set(featuredCourses.map((c) => c.domain[locale])),
  );
  const entries = featuredCourses.filter(
    (c) => domain === "all" || c.domain[locale] === domain,
  );
  async function open(id: string) {
    if (opening) return;
    setOpening(id);
    setError("");
    try {
      const course = await api<Snapshot>("featured", {
        id,
        language: en ? "en" : "zh-TW",
      });
      window.location.assign(`/?course=${encodeURIComponent(course.id)}`);
    } catch {
      setError(
        en
          ? "Unable to open the course. Please try again."
          : "暫時無法開啟課程，請重試。",
      );
      setOpening(null);
    }
  }
  return (
    <section
      className={`catalog featured-catalog ${home ? "home-catalog" : ""}`}
      aria-label={en ? "Featured project courses" : "精選專題課程"}
    >
      {showHeading && (
        <div className="catalog-head">
          <div>
            <p className="eyebrow">
              {en ? "FOLLOW YOUR CURIOSITY" : "從好奇開始"}
            </p>
            <h2>
              {en
                ? "Learn anything you want."
                : "學你想學的任何事。"}
            </h2>
          </div>
          <p>
            {en
              ? "Explore through visuals, animation, and hands-on experiences—one idea at a time."
              : "透過圖像、動畫與親手探索，一步步理解你感興趣的世界。"}
          </p>
        </div>
      )}
      <div
        className="featured-filters"
        aria-label={en ? "Filter by subject" : "依領域篩選"}
      >
        <button
          aria-pressed={domain === "all"}
          onClick={() => setDomain("all")}
        >
          {en ? "All projects" : "所有專題"}{" "}
          <span>{featuredCourses.length}</span>
        </button>
        {domains.map((d) => (
          <button
            key={d}
            aria-pressed={domain === d}
            onClick={() => setDomain(d)}
          >
            {d}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="featured-grid">
        {entries.map((c, i) => (
          <button
            key={c.id}
            className="featured-course"
            data-featured={c.id}
            disabled={opening !== null}
            onClick={() => void open(c.id)}
            style={
              {
                "--course-accent": ["#7161bd", "#227e8b", "#ad7036", "#a15376"][
                  i % 4
                ],
              } as CSSProperties
            }
          >
            <div className="featured-cover">
              <Cover kind={c.kind} index={i} />
              <span className="featured-domain">{c.domain[locale]}</span>
            </div>
            <div className="featured-copy">
              <h3>{c.title[locale]}</h3>
              <p>{c.description[locale]}</p>
              <div className="featured-meta">
                <span>
                  {c.chapters}{" "}
                  {en ? "chapters · Guided project" : "章 · 專題實作"}
                </span>
                {opening === c.id ? (
                  <LoaderCircle size={21} className="spin" />
                ) : (
                  <ArrowUpRight size={23} />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
