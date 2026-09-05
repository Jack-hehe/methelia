"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Code2,
  Braces,
  Palette,
  Lightbulb,
  Terminal as TerminalIcon,
} from "lucide-react";
import type { Section } from "../core/protocol";
import { buildPreview } from "../core/preview";
export function LessonSection({
  section,
  index,
  done,
  files,
  onCheck,
  onPractice,
}: {
  section: Section;
  index: number;
  done: boolean;
  files: Record<string, string>;
  onCheck: (id: string, answer?: number) => Promise<boolean>;
  onPractice: () => void;
}) {
  const [selected, setSelected] = useState(0),
    [answer, setAnswer] = useState<number | null>(null),
    [feedback, setFeedback] = useState(""),
    [checking, setChecking] = useState(false);
  const c = section.component;
  const webTrio =
    c.type === "concept.canvas" &&
    c.cards.length === 3 &&
    c.cards.map((card) => card.title.toLowerCase()).join(",") ===
      "html,css,javascript";
  async function check(value?: number) {
    setChecking(true);
    try {
      setAnswer(value ?? null);
      const passed = await onCheck(section.id, value);
      setFeedback(
        passed ? "練習完成" : "再試一次，觀察一下上面的說明或儲存你的修改。",
      );
    } finally {
      setChecking(false);
    }
  }
  return (
    <section
      id={"section-" + section.id}
      className={
        "lesson-section template-" +
        section.template +
        " " +
        (done ? "section-complete" : "")
      }
      data-section={section.id}
    >
      <div className="section-kicker">
        <span>{String(index + 1).padStart(2, "0")}</span>
        {
          {
            explain: "UNDERSTAND",
            demonstrate: "EXPLORE",
            practice: "YOUR TURN",
            check: "CHECK YOUR UNDERSTANDING",
          }[section.intent]
        }
        {done && <Check size={15} />}
      </div>
      <h2>{section.title}</h2>
      <p className="section-body">{section.body}</p>
      {c.type === "concept.canvas" && (
        <div className="concept-board">
          <div className="concept-cards">
            {c.cards.map((card, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={
                  "concept-card " +
                  card.accent +
                  (selected === i ? " selected" : "")
                }
              >
                <span className="concept-icon">
                  {i === 0 ? <Code2 /> : i === 1 ? <Palette /> : <Braces />}
                </span>
                <strong>{card.title}</strong>
                <span>
                  {!webTrio
                    ? `EXPLORE / ${String(i + 1).padStart(2, "0")}`
                    : i === 0
                      ? "01 / STRUCTURE"
                      : i === 1
                        ? "02 / STYLE"
                        : "03 / BEHAVIOR"}
                </span>
              </button>
            ))}
          </div>
          {webTrio && (
            <div className={"concept-stage stage-" + c.cards[selected].accent}>
              <div className="mini-browser">
                <div className="mini-browser-bar">
                  <i />
                  <i />
                  <i />
                  <span>your-idea.web</span>
                </div>
                <div className={"mini-site state-" + selected}>
                  <span className="mini-eyebrow">A SPACE FOR YOUR IDEAS</span>
                  <h3>
                    Make something
                    <br />
                    <em>yours.</em>
                  </h3>
                  <div className="mini-lines">
                    <span />
                    <span />
                  </div>
                  <button
                    onClick={(e) => {
                      if (selected === 2)
                        e.currentTarget.textContent = "Hello, creator! ✨";
                    }}
                  >
                    Say hello <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
              <div className="code-sticker">
                {selected === 0
                  ? "<h1>你的好點子</h1>"
                  : selected === 1
                    ? "color: your-personality;"
                    : 'idea.addEventListener("click")'}
              </div>
            </div>
          )}
          <div className="concept-caption">
            <Lightbulb size={18} />
            <div>
              <strong>
                {c.cards[selected].title}
                {webTrio ? " 的工作" : ""}
              </strong>
              <p>{c.cards[selected].body}</p>
            </div>
            <span>
              {selected + 1} / {c.cards.length}
            </span>
          </div>
        </div>
      )}
      {c.type === "dom.explorer" && (
        <div className="dom-board">
          <div className="dom-code">
            <span className="file-label">index.html</span>
            <code>&lt;main&gt;</code>
            {c.elements.map((element, i) => (
              <button
                key={i}
                className={selected === i ? "active" : ""}
                onClick={() => setSelected(i)}
              >
                <span>&lt;{element.tag}&gt;</span>
                <span>{element.label}</span>
                <span>&lt;/{element.tag}&gt;</span>
              </button>
            ))}
            <code>&lt;/main&gt;</code>
          </div>
          <div className="dom-details">
            <span className="pill">&lt;{c.elements[selected].tag}&gt;</span>
            <h3>{c.elements[selected].label}</h3>
            <p>{c.elements[selected].description}</p>
            <span className="quiet">點選左側的標籤，看看它的意義。</span>
          </div>
        </div>
      )}
      {c.type === "quiz.choice" && (
        <div className="quiz">
          <h3>{c.question}</h3>
          <div className="quiz-options">
            {c.options.map((option, i) => (
              <button
                key={option}
                disabled={done || checking}
                onClick={() => void check(i)}
                className={
                  (done && i === c.answer
                    ? "correct "
                    : answer === i
                      ? "chosen "
                      : "") + "quiz-option"
                }
              >
                <span>
                  {done && i === c.answer ? (
                    <Check size={16} />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                {option}
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          {done && <p className="quiz-explanation">{c.explanation}</p>}
        </div>
      )}
      {c.type === "code.editor" && (
        <div className="code-example">
          <div>
            <span>{c.path}</span>
            <button onClick={onPractice}>
              開啟實作區 <ArrowUpRight size={14} />
            </button>
          </div>
          <pre>
            <code>{c.example}</code>
          </pre>
        </div>
      )}
      {c.type === "terminal" && (
        <div className="terminal-example">
          <span>
            <TerminalIcon size={16} /> 網站練習 Terminal
          </span>
          {c.commands.map((command) => (
            <button key={command} onClick={onPractice}>
              <b>$</b> {command}
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      )}
      {c.type === "file.tree" && (
        <div className="file-list">
          {Object.keys(files).map((file) => (
            <button key={file} onClick={onPractice}>
              <Code2 size={16} />
              {file}
            </button>
          ))}
        </div>
      )}
      {c.type === "browser.preview" && (
        <div className="inline-preview">
          <div className="mini-browser-bar">
            <i />
            <i />
            <i />
            <span>你的網站 · 即時預覽</span>
          </div>
          <iframe
            title="課程網站預覽"
            sandbox="allow-scripts"
            srcDoc={buildPreview(files)}
          />
        </div>
      )}
      {section.completion && c.type !== "quiz.choice" && (
        <div className="practice-check">
          <button
            className="primary-button"
            disabled={done || checking}
            onClick={() => void check()}
          >
            {done ? (
              <>
                <Check size={16} /> 已完成練習
              </>
            ) : (
              "驗證我的練習"
            )}
          </button>
          <span>先在實作區儲存修改，再回來驗證。</span>
        </div>
      )}
      {feedback && (
        <p className={done ? "feedback success" : "feedback"} role="status">
          {feedback}
        </p>
      )}
    </section>
  );
}
