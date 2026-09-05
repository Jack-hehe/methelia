"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import type { LearnerProfile, Snapshot } from "../core/state";
import { api } from "./api";
import styles from "./learner-intake.module.css";

const fields = [
  "experience",
  "purpose",
  "priorKnowledge",
  "depth",
  "studyPlan",
] as const;

function draftKey(courseId: string) {
  return `methelia-intake-draft:${courseId}`;
}

function readLocalDraft(course: Snapshot): Partial<LearnerProfile> | null {
  try {
    const stored = JSON.parse(
      localStorage.getItem(draftKey(course.id)) || "null",
    );
    if (
      !stored ||
      stored.baseRevision !== (course.intake?.revision || 0) ||
      !stored.answers ||
      typeof stored.answers !== "object"
    )
      return null;
    const result: Partial<LearnerProfile> = { ...course.intake?.answers };
    for (const field of fields) {
      const value = stored.answers[field];
      if (field === "depth") {
        if (["foundation", "applied", "advanced"].includes(value))
          result.depth = value;
      } else if (typeof value === "string" && value.length <= 800) {
        result[field] = value;
      }
    }
    return result;
  } catch {
    return null;
  }
}

function clearLocalDraft(courseId: string) {
  try {
    localStorage.removeItem(draftKey(courseId));
  } catch {
    /* Server save remains available when browser storage is disabled. */
  }
}

export function LearnerIntake({
  course,
  onChange,
  onHome,
  themeControl,
}: {
  course: Snapshot;
  onChange: (course: Snapshot) => void;
  onHome: () => void;
  themeControl: ReactNode;
}) {
  const english = course.language === "en";
  const [localDraft] = useState(() => readLocalDraft(course));
  const [answers, setAnswers] = useState<Partial<LearnerProfile>>(
    localDraft || course.intake?.answers || {},
  );
  const [revision, setRevision] = useState(course.intake?.revision || 0);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(Boolean(localDraft));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const complete = fields.every((field) => answers[field]?.trim());
  const answered = fields.filter((field) => answers[field]?.trim()).length;
  const questions = english
    ? ([
        {
          key: "experience",
          title: "How much experience do you have with this goal?",
          label: "Experience details",
          options: [
            "Starting from scratch",
            "Tried the basics",
            "Already use it regularly",
            "Not sure",
          ],
        },
        {
          key: "purpose",
          title: "What would you like to do with what you learn?",
          label: "Purpose details",
          options: [
            "Solve an everyday problem",
            "Use it at work or in a project",
            "Prepare for an exam",
            "Explore my interests",
            "Not sure",
          ],
        },
        {
          key: "priorKnowledge",
          title: "What do you already know, and where do you get stuck?",
          label: "Knowledge and obstacles details",
          options: [
            "Everything is new to me",
            "I know the terms but need practice",
            "I can do the basics but get stuck on harder tasks",
            "Not sure",
          ],
        },
        {
          key: "depth",
          title: "How deeply would you like to learn?",
          label: "Learning depth",
          options: [],
        },
        {
          key: "studyPlan",
          title: "How much time do you have, and how would you like to start?",
          label: "Time and approach details",
          options: [
            "10 minutes at a time; start with examples",
            "20–30 minutes; learn by doing",
            "45 minutes or more; understand the principles",
            "Not sure; start with a short practical example",
          ],
        },
      ] as const)
    : ([
        {
          key: "experience",
          title: "對這個學習目標，你目前有多少經驗？",
          label: "經驗補充",
          options: [
            "完全從零開始",
            "試過一些基本操作",
            "已經經常使用",
            "不確定",
          ],
        },
        {
          key: "purpose",
          title: "學會之後，你最想拿來做什麼？",
          label: "目的補充",
          options: [
            "解決日常問題",
            "用在工作或專案",
            "準備考試",
            "探索興趣",
            "不確定",
          ],
        },
        {
          key: "priorKnowledge",
          title: "你已經會哪些內容？最容易卡在哪裡？",
          label: "已會與卡點補充",
          options: [
            "都是新內容",
            "聽過名詞，但缺少練習",
            "會基本操作，複雜任務容易卡住",
            "不確定",
          ],
        },
        {
          key: "depth",
          title: "你希望學到什麼程度？",
          label: "學習深度",
          options: [],
        },
        {
          key: "studyPlan",
          title: "每次可以花多久？想從哪種方式開始？",
          label: "時間與方式補充",
          options: [
            "每次 10 分鐘，從例子開始",
            "每次 20–30 分鐘，邊做邊學",
            "每次 45 分鐘以上，先理解原理",
            "不確定，先從簡短實例開始",
          ],
        },
      ] as const);

  function update<K extends keyof LearnerProfile>(
    key: K,
    value: LearnerProfile[K],
  ) {
    const next = { ...answers, [key]: value };
    // Persist in the input event, before a refresh can interrupt an effect or request.
    try {
      localStorage.setItem(
        draftKey(course.id),
        JSON.stringify({ answers: next, baseRevision: revision }),
      );
    } catch {
      /* Explicit server saving still works without browser storage. */
    }
    setAnswers(next);
    setDirty(true);
    setSaved(false);
  }

  async function save(finalize = false, leave = false) {
    if (saving.current || (finalize && !complete)) return;
    if (leave && !dirty) {
      onHome();
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await api<Snapshot>(
        `courses/${course.id}/intake`,
        { answers, baseRevision: revision },
        finalize ? "POST" : "PUT",
      );
      setRevision(next.intake?.revision || 0);
      setAnswers(next.intake?.answers || answers);
      clearLocalDraft(course.id);
      setDirty(false);
      setSaved(true);
      onChange(next);
      if (leave) onHome();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function reload() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      const latest = await api<Snapshot>(`courses/${course.id}`);
      setAnswers(latest.intake?.answers || {});
      setRevision(latest.intake?.revision || 0);
      clearLocalDraft(course.id);
      setDirty(false);
      setSaved(true);
      setError("");
      onChange(latest);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <main className={styles.shell} lang={english ? "en" : "zh-TW"}>
      <header className={styles.header}>
        <button
          className={styles.back}
          onClick={() => void save(false, true)}
          disabled={busy}
        >
          <ArrowLeft size={17} aria-hidden="true" />
          {english ? "Save and return home" : "儲存並回首頁"}
        </button>
        <span className={styles.brand}>methelia</span>
        {themeControl}
      </header>
      <div className={styles.content}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>
            {english ? "A course that starts with you" : "從你的起點出發"}
          </span>
          <h1>
            {english ? "Arranging your learning path" : "正在安排你的學習路徑"}
          </h1>
          <p>
            {english
              ? "Five short questions help us choose a useful starting point. Your answers can be brief, and “not sure” is fine."
              : "先用五個小問題了解你，讓第一章從合適的地方開始。回答可以很簡短，不確定也沒關係。"}
          </p>
          <div className={styles.goal}>
            <span>{english ? "Your goal" : "你的學習目標"}</span>
            <strong>{course.goal}</strong>
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(true);
          }}
        >
          <div className={styles.questions}>
            {questions.map((question, index) => (
              <fieldset
                key={question.key}
                className={styles.question}
                disabled={busy}
              >
                <legend>
                  <span className={styles.number}>{index + 1}</span>
                  {question.title}
                </legend>
                {question.key === "depth" ? (
                  <>
                    <div className={styles.options}>
                      {(
                        [
                          [
                            "foundation",
                            english
                              ? "Build a solid foundation"
                              : "建立基礎理解",
                          ],
                          [
                            "applied",
                            english
                              ? "Complete practical tasks independently"
                              : "能獨立完成實際任務",
                          ],
                          [
                            "advanced",
                            english
                              ? "Analyze principles and complex problems"
                              : "深入原理與複雜問題",
                          ],
                        ] as const
                      ).map(([value, label]) => (
                        <label className={styles.option} key={value}>
                          <input
                            type="radio"
                            name="depth"
                            value={value}
                            checked={answers.depth === value}
                            onChange={() => update("depth", value)}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={styles.unsure}
                      onClick={() => update("depth", "foundation")}
                    >
                      {english
                        ? "Not sure — start with a foundation"
                        : "不確定，先從基礎開始"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className={styles.options}>
                      {question.options.map((option) => (
                        <label className={styles.option} key={option}>
                          <input
                            type="radio"
                            name={question.key}
                            checked={answers[question.key] === option}
                            onChange={() => update(question.key, option)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    <label className={styles.detail}>
                      <span>
                        {question.label}
                        <small>
                          {english
                            ? " · optional; edit a choice or write your own answer"
                            : " · 可補充、修改選項或直接回答"}
                        </small>
                      </span>
                      <textarea
                        aria-label={question.label}
                        rows={2}
                        maxLength={800}
                        value={answers[question.key] || ""}
                        onChange={(event) =>
                          update(question.key, event.target.value)
                        }
                        placeholder={
                          english
                            ? "A sentence or two is enough…"
                            : "一兩句就好…"
                        }
                      />
                    </label>
                  </>
                )}
              </fieldset>
            ))}
          </div>
          {error && (
            <div className={styles.error} role="alert">
              <p>{error}</p>
              <button
                type="button"
                className={styles.unsure}
                disabled={busy}
                onClick={() => void reload()}
              >
                {english
                  ? "Reload saved answers (replaces these edits)"
                  : "重新載入已存回答（取代目前編輯）"}
              </button>
            </div>
          )}
          <footer className={styles.actions}>
            <div className={styles.status} role="status" aria-live="polite">
              {busy ? (
                <>
                  <LoaderCircle size={16} className="spin" aria-hidden="true" />
                  {english ? "Saving your answers…" : "正在儲存回答…"}
                </>
              ) : saved ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  {english
                    ? "Saved. You can return to this page anytime."
                    : "已儲存，之後可回到這裡繼續。"}
                </>
              ) : (
                <>
                  {english
                    ? `${answered} of 5 answered${dirty ? " · Unsaved changes" : ""}`
                    : `已回答 ${answered} / 5 題${dirty ? " · 尚未儲存" : ""}`}
                </>
              )}
            </div>
            <div className={styles.buttons}>
              <button
                type="button"
                className={styles.save}
                disabled={busy || !dirty}
                onClick={() => void save()}
              >
                {english ? "Save answers" : "儲存回答"}
              </button>
              <button
                type="submit"
                className={styles.submit}
                disabled={busy || !complete}
              >
                {english ? "Arrange my course" : "開始安排課程"}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
            <p className={styles.hint}>
              {english
                ? "Course creation starts after you submit all five answers."
                : "五題回答完成並送出後，才會開始規劃課程與製作第一章。"}
            </p>
          </footer>
        </form>
      </div>
    </main>
  );
}
