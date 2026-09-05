"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { homeCopy, type HomeLanguage } from "./home-language";

function Flag({ language }: { language: HomeLanguage }) {
  return language === "zh" ? (
    <svg className="language-flag" viewBox="0 0 30 20" aria-hidden="true">
      <path fill="#fe0000" d="M0 0h30v20H0z" />
      <path fill="#000095" d="M0 0h15v10H0z" />
      <g transform="translate(7.5 5)" fill="white">
        {Array.from({ length: 12 }, (_, i) => (
          <path
            key={i}
            transform={`rotate(${i * 30})`}
            d="M0-4 .65-2.2H-.65Z"
          />
        ))}
        <circle r="2.15" stroke="#000095" strokeWidth=".3" />
      </g>
    </svg>
  ) : (
    <svg className="language-flag" viewBox="0 0 30 20" aria-hidden="true">
      <path fill="white" d="M0 0h30v20H0z" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect
          key={i}
          fill="#b22234"
          y={(i * 40) / 13}
          width="30"
          height={20 / 13}
        />
      ))}
      <path fill="#3c3b6e" d="M0 0h12v10.77H0z" />
      {Array.from({ length: 9 }, (_, row) =>
        Array.from({ length: row % 2 ? 5 : 6 }, (_, col) => (
          <path
            key={`${row}-${col}`}
            fill="white"
            transform={`translate(${1 + col * 2 + (row % 2)},${0.7 + row * 1.16}) scale(.45)`}
            d="M0-1 .224-.309 .951-.309 .363.118 .588.809 0 .382-.588.809-.363.118-.951-.309-.224-.309Z"
          />
        )),
      )}
    </svg>
  );
}

const options = [
  { value: "zh", label: "繁體中文" },
  { value: "en", label: "EN" },
] as const;

export function LanguageMenu({
  language,
  onChange,
}: {
  language: HomeLanguage;
  onChange: (value: HomeLanguage) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    items.current[
      options.findIndex((option) => option.value === language)
    ]?.focus();
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, language]);
  return (
    <div
      className="language-menu"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        className="language-trigger"
        ref={trigger}
        type="button"
        aria-label={homeCopy[language].language}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Flag language={language} />
        <span>{language === "zh" ? "繁體中文" : "EN"}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          id={id}
          className="language-options"
          role="menu"
          aria-label={homeCopy[language].language}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => {
                items.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={language === option.value}
              lang={homeCopy[option.value].lang}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                trigger.current?.focus();
              }}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === "ArrowDown")
                  next = (index + 1) % options.length;
                else if (event.key === "ArrowUp")
                  next = (index + options.length - 1) % options.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = options.length - 1;
                else return;
                event.preventDefault();
                items.current[next]?.focus();
              }}
            >
              <Flag language={option.value} />
              <span>{option.label}</span>
              {language === option.value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
