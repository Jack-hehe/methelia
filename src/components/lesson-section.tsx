"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Code2,
  Braces,
  Palette,
  Lightbulb,
  Terminal as TerminalIcon,
} from "lucide-react";
import type { Section } from "../core/protocol";
import { buildPreview } from "../core/preview";
import "./teaching-templates.css";
export function LessonSection({
  schemaVersion,
  section,
  index,
  done,
  files,
  onCheck,
  onPractice,
  hideHeading = false,
}: {
  schemaVersion: 1 | 2;
  section: Section;
  index: number;
  done: boolean;
  files: Record<string, string>;
  onCheck: (id: string, answer?: number) => Promise<boolean>;
  onPractice: () => void;
  hideHeading?: boolean;
}) {
  const [selected, setSelected] = useState(0),
    [exampleClicked, setExampleClicked] = useState(false),
    [exampleColor, setExampleColor] = useState("#7355c9"),
    [answer, setAnswer] = useState<number | null>(null),
    [feedback, setFeedback] = useState(""),
    [checking, setChecking] = useState(false);
  const c = section.component;
  const webTrio =
    c.type === "concept.canvas" &&
    (c.variant === "web.languages" ||
      // Preserve already-saved v1 lessons. New protocols require an explicit variant.
      (schemaVersion === 1 &&
        !c.variant &&
        c.cards.map((card) => card.title.toLowerCase()).join(",") ===
          "html,css,javascript")) &&
    c.cards.length === 3;
  const sequence =
    c.type === "steps.sequence"
      ? c.steps
      : c.type === "diagram.flow"
        ? c.items.map((item) => ({ title: item.label, body: item.description }))
        : null;
  async function check(value?: number) {
    setChecking(true);
    setFeedback("");
    try {
      setAnswer(value ?? null);
      const passed = await onCheck(section.id, value);
      setFeedback(
        passed ? "練習完成" : "再試一次，觀察一下上面的說明或儲存你的修改。",
      );
    } catch {
      setFeedback("暫時無法驗證，請再試一次。");
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
      {!hideHeading && (
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
      )}
      {!hideHeading && <h2>{section.title}</h2>}
      <p className="section-body">{section.body}</p>
      {c.type === "lesson.article" && (
        <article className="lesson-article">
          <div className="lesson-prose">
            {c.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          {c.figure && (
            <figure className="lesson-figure">
              <ol>
                {c.figure.items.map((item, i) => (
                  <li key={i} style={{ animationDelay: `${i * 180}ms` }}>
                    <span className="figure-marker">{i + 1}</span>
                    <strong>{item.label}</strong>
                    <p>{item.description}</p>
                    {i < c.figure!.items.length - 1 && (
                      <ArrowRight aria-hidden="true" className="figure-arrow" />
                    )}
                  </li>
                ))}
              </ol>
              <figcaption>{c.figure.caption}</figcaption>
            </figure>
          )}
          <aside className="lesson-takeaway">
            <Lightbulb size={20} />
            <div>
              <strong>本頁重點</strong>
              <p>{c.takeaway}</p>
            </div>
          </aside>
        </article>
      )}
      {c.type === "concept.canvas" &&
        !webTrio &&
        section.intent === "explain" && (
          <div className="lesson-reading-cards">
            {c.cards.map((card, i) => (
              <article key={i}>
                <span className="teaching-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        )}
      {c.type === "concept.canvas" &&
        (webTrio || section.intent !== "explain") && (
          <div className={webTrio ? "concept-board" : "teaching-concept"}>
            <div
              className={webTrio ? "concept-cards" : "teaching-concept-cards"}
              role="group"
              aria-label="選擇概念"
            >
              {c.cards.map((card, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={selected === i}
                  aria-controls={`concept-detail-${section.id}`}
                  onClick={() => {
                    setSelected(i);
                    setExampleClicked(false);
                  }}
                  className={
                    (webTrio ? "concept-card " : "teaching-concept-card ") +
                    card.accent +
                    (selected === i ? " selected" : "")
                  }
                >
                  <span
                    className={webTrio ? "concept-icon" : "teaching-number"}
                  >
                    {webTrio ? (
                      i === 0 ? (
                        <Code2 />
                      ) : i === 1 ? (
                        <Palette />
                      ) : (
                        <Braces />
                      )
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <strong>{card.title}</strong>
                  {webTrio ? (
                    <span>
                      {i === 0
                        ? "放什麼內容"
                        : i === 1
                          ? "長什麼樣子"
                          : "點了會怎樣"}
                    </span>
                  ) : (
                    <ArrowUpRight size={16} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
            {webTrio && (
              <div
                className={"concept-stage stage-" + c.cards[selected].accent}
              >
                <div className="mini-browser">
                  <div className="mini-browser-bar">
                    <i />
                    <i />
                    <i />
                    <span>your-idea.web</span>
                  </div>
                  <div className={"mini-site state-" + selected}>
                    <span className="mini-eyebrow">網頁範例</span>
                    <h3>我的網站</h3>
                    <div className="mini-lines">
                      <span />
                      <span />
                    </div>
                    <button
                      style={
                        selected === 0
                          ? undefined
                          : { background: exampleColor }
                      }
                      onClick={() => {
                        if (selected === 2) setExampleClicked(true);
                      }}
                    >
                      {exampleClicked ? "你好！" : "點擊按鈕"}{" "}
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
                <div className="concept-example-tools">
                  {selected === 1 && (
                    <div
                      className="color-choices"
                      role="group"
                      aria-label="試試按鈕顏色"
                    >
                      <span>試試換色</span>
                      {[
                        { label: "紫色按鈕", color: "#7355c9" },
                        { label: "綠色按鈕", color: "#23856b" },
                      ].map((option) => (
                        <button
                          key={option.color}
                          aria-label={option.label}
                          aria-pressed={exampleColor === option.color}
                          style={{ background: option.color }}
                          onClick={() => setExampleColor(option.color)}
                        >
                          {exampleColor === option.color && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="code-sticker">
                    {selected === 0
                      ? "<h1>我的網站</h1>"
                      : selected === 1
                        ? `button { background: ${exampleColor}; }`
                        : 'button.textContent = "你好！";'}
                  </div>
                </div>
              </div>
            )}
            <div
              id={`concept-detail-${section.id}`}
              className={
                webTrio ? "concept-caption" : "teaching-concept-detail"
              }
              aria-live="polite"
            >
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
      {sequence && (
        <div
          className={
            "teaching-sequence " +
            (c.type === "diagram.flow" ? "teaching-flow" : "teaching-steps")
          }
        >
          <ol className="teaching-sequence-list" aria-label={section.title}>
            {sequence.map((step, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={
                    "teaching-sequence-item" +
                    (selected === i ? " selected" : "")
                  }
                  aria-pressed={selected === i}
                  aria-controls={`sequence-detail-${section.id}`}
                  onClick={() => setSelected(i)}
                >
                  <span className="teaching-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <strong>{step.title}</strong>
                  {c.type === "steps.sequence" && (
                    <span className="teaching-step-summary">{step.body}</span>
                  )}
                </button>
                {c.type === "diagram.flow" && i < sequence.length - 1 && (
                  <ArrowRight
                    className="teaching-flow-arrow"
                    size={18}
                    aria-hidden="true"
                  />
                )}
              </li>
            ))}
          </ol>
          <div
            className="teaching-sequence-detail"
            id={`sequence-detail-${section.id}`}
            aria-live="polite"
          >
            <span className="teaching-detail-count">
              {selected + 1} / {sequence.length}
            </span>
            <h3>{sequence[selected].title}</h3>
            <p>{sequence[selected].body}</p>
            <div className="teaching-sequence-controls" aria-label="切換步驟">
              <button
                type="button"
                disabled={selected === 0}
                onClick={() => setSelected(selected - 1)}
              >
                上一步
              </button>
              <button
                type="button"
                disabled={selected === sequence.length - 1}
                onClick={() => setSelected(selected + 1)}
              >
                下一步 <ArrowRight size={15} />
              </button>
            </div>
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
            <TerminalIcon size={16} /> 教學 Terminal
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
