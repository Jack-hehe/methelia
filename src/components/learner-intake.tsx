"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import type { LearnerProfile, Snapshot } from "../core/state";
import {
  intakeFields,
  intakePolicy,
  readIntakeSelection,
  writeIntakeSelection,
  skippedIntakeAnswer,
  type IntakeQuestion,
} from "../core/intake-question";
import { api } from "./api";
import { localizedError } from "../core/language";
import styles from "./learner-intake.module.css";

const draftKey = (id: string) => `methelia-intake-draft:${id}`;
const firstUnanswered = (answers: Partial<LearnerProfile>) => {
  const index = intakeFields.findIndex((field) => !answers[field]?.trim());
  return index < 0 ? intakeFields.length - 1 : index;
};
function readDraft(course: Snapshot) {
  const answers = course.intake?.answers || {};
  const fallback = { answers, step: firstUnanswered(answers), dirty: false };
  try {
    const stored = JSON.parse(
      localStorage.getItem(draftKey(course.id)) || "null",
    );
    if (!stored || stored.baseRevision !== (course.intake?.revision || 0))
      return fallback;
    const step =
      Number.isInteger(stored.step) &&
      stored.step >= 0 &&
      stored.step <= firstUnanswered(answers)
        ? stored.step
        : fallback.step;
    const field = intakeFields[step];
    const value = stored.answers?.[field];
    if (
      typeof value !== "string" ||
      value.length > 800 ||
      (field === "depth" &&
        !["foundation", "applied", "advanced"].includes(value))
    )
      return { ...fallback, step };
    return {
      answers: { ...answers, [field]: value },
      step,
      dirty: value !== answers[field],
    };
  } catch {
    return fallback;
  }
}
function persist(
  id: string,
  baseRevision: number,
  step: number,
  answers: Partial<LearnerProfile>,
) {
  try {
    localStorage.setItem(
      draftKey(id),
      JSON.stringify({ baseRevision, step, answers }),
    );
  } catch {
    /* Server saving also works without browser storage. */
  }
}

export function LearnerIntake({
  course,
  onChange,
  onHome,
  onCancel,
  themeControl,
}: {
  course: Snapshot;
  onChange: (course: Snapshot) => void;
  onHome: () => void;
  onCancel: () => void;
  themeControl: ReactNode;
}) {
  const english = course.language === "en";
  const [initial] = useState(() => readDraft(course));
  const [answers, setAnswers] = useState<Partial<LearnerProfile>>(
    initial.answers,
  );
  const [step, setStep] = useState(initial.step);
  const [revision, setRevision] = useState(course.intake?.revision || 0);
  const [dirty, setDirty] = useState(initial.dirty);
  const [question, setQuestion] = useState<IntakeQuestion | null>(null);
  const [preparing, setPreparing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [retry, setRetry] = useState(0);
  const saving = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const cancelDialog = useRef<HTMLDialogElement>(null);
  const cancelled = useRef(false);
  const field = intakeFields[step];
  const activeQuestion = question?.field === field ? question : null;
  const policy = intakePolicy(field);
  const selection = readIntakeSelection(
    answers[field],
    activeQuestion?.options || [],
  );
  const locked = busy || preparing;
  const answered = intakeFields.filter((key) => answers[key]?.trim()).length;

  useEffect(() => {
    let current = true;
    setPreparing(true);
    setQuestion(null);
    setQuestionError("");
    void api<{ question: IntakeQuestion }>(
      `courses/${course.id}/intake/question`,
      { field, baseRevision: revision },
    )
      .then((result) => {
        if (current && !cancelled.current) setQuestion(result.question);
      })
      .catch((cause: unknown) => {
        if (current) setQuestionError(localizedError(cause, course.language));
      })
      .finally(() => {
        if (current) setPreparing(false);
      });
    return () => {
      current = false;
    };
  }, [course.id, field, revision, retry]);

  useEffect(() => {
    if (activeQuestion && !preparing)
      heading.current?.focus({ preventScroll: true });
  }, [activeQuestion, preparing]);

  function update(value: string) {
    if (value.length > 800) {
      setError(
        english ? "Please shorten your answer." : "回答較長，請稍微精簡一下。",
      );
      return;
    }
    const next = { ...answers, [field]: value };
    setAnswers(next);
    setDirty(true);
    setError("");
    persist(course.id, revision, step, next);
  }

  async function save(action: "stay" | "next" | "back" | "home", skip = false) {
    if (
      saving.current ||
      preparing ||
      (action === "next" && !skip && !answers[field]?.trim()) ||
      (skip && !policy.optional)
    )
      return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      let nextAnswers = skip
        ? { ...answers, [field]: skippedIntakeAnswer }
        : answers;
      let nextRevision = revision;
      if (dirty || skip) {
        const next = await api<Snapshot>(
          `courses/${course.id}/intake`,
          { answers: { [field]: nextAnswers[field] }, baseRevision: revision },
          "PUT",
        );
        // Earlier edits invalidate dependent answers; only trust the returned snapshot.
        nextAnswers = next.intake?.answers || {};
        nextRevision = next.intake?.revision || 0;
        setAnswers(nextAnswers);
        setRevision(nextRevision);
        setDirty(false);
        persist(course.id, nextRevision, step, nextAnswers);
        onChange(next);
      }
      if (action === "next" && step === intakeFields.length - 1) {
        const next = await api<Snapshot>(
          `courses/${course.id}/intake`,
          { answers: nextAnswers, baseRevision: nextRevision },
          "POST",
        );
        try {
          localStorage.removeItem(draftKey(course.id));
        } catch {
          /* Optional storage. */
        }
        onChange(next);
      } else if (action === "home") {
        onHome();
      } else {
        const destination =
          action === "next"
            ? Math.min(step + 1, firstUnanswered(nextAnswers))
            : action === "back"
              ? Math.max(0, step - 1)
              : step;
        setStep(destination);
        persist(course.id, nextRevision, destination, nextAnswers);
      }
    } catch (cause) {
      setError(localizedError(cause, course.language));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function reload() {
    if (saving.current || preparing) return;
    saving.current = true;
    setBusy(true);
    try {
      const latest = await api<Snapshot>(`courses/${course.id}`);
      const latestAnswers = latest.intake?.answers || {};
      const latestRevision = latest.intake?.revision || 0;
      const latestStep = firstUnanswered(latestAnswers);
      setAnswers(latestAnswers);
      setRevision(latestRevision);
      setStep(latestStep);
      setDirty(false);
      setError("");
      setRetry((value) => value + 1);
      persist(course.id, latestRevision, latestStep, latestAnswers);
      onChange(latest);
    } catch (cause) {
      setError(localizedError(cause, course.language));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function cancel() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      await api(`courses/${course.id}/intake/cancel`, {
        baseRevision: revision,
      });
      cancelled.current = true;
      try {
        localStorage.removeItem(draftKey(course.id));
      } catch {
        /* Optional storage. */
      }
      onCancel();
    } catch (cause) {
      cancelDialog.current?.close();
      setError(localizedError(cause, course.language));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <main
      className={styles.shell}
      lang={english ? "en" : "zh-TW"}
      data-preparing={preparing}
    >
      <header className={styles.header}>
        <button
          className={styles.back}
          onClick={() => void save("home")}
          disabled={locked}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {english ? "Save and return home" : "儲存並回首頁"}
        </button>
        <button
          className={styles.cancel}
          disabled={busy}
          onClick={() => cancelDialog.current?.showModal()}
        >
          {english ? "Cancel creation" : "取消製作"}
        </button>
        {themeControl}
      </header>
      <div className={styles.content}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>
            {english
              ? "A path shaped around you"
              : "從你的起點，找到學習的方向"}
          </span>
          <p className={styles.goal}>{course.goal}</p>
          <div
            className={styles.progress}
            aria-label={
              english
                ? `Question ${step + 1} of 5`
                : `第 ${step + 1} 題，共 5 題`
            }
          >
            {intakeFields.map((key, index) => (
              <span
                key={key}
                className={`${styles.marker} ${index === step ? styles.current : ""} ${answers[key]?.trim() && index !== step ? styles.complete : ""}`}
                aria-current={index === step ? "step" : undefined}
              >
                {index < step && answers[key]?.trim() ? (
                  <Check size={11} aria-hidden="true" />
                ) : null}
              </span>
            ))}
            <span className={styles.count}>
              {String(step + 1).padStart(2, "0")} <span>/ 05</span>
            </span>
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save("next");
          }}
          className={styles.card}
          aria-busy={locked}
        >
          {preparing ? (
            <div className={styles.preparing} role="status">
              <span className={styles.orbit}>
                <LoaderCircle size={29} aria-hidden="true" />
              </span>
              <h1>
                {english
                  ? "Finding your next question"
                  : "正在整理適合你的問題"}
              </h1>
              <p>
                {english
                  ? "Connecting your learning goal with what you have shared."
                  : "結合你想學的主題與剛才的回答，找到更適合你的起點。"}
              </p>
            </div>
          ) : activeQuestion ? (
            <fieldset className={styles.question} disabled={busy} key={field}>
              <h1 ref={heading} tabIndex={-1} id="intake-question">
                {activeQuestion.title}
              </h1>
              <p id="intake-description" className={styles.description}>
                {activeQuestion.description}
              </p>
              <div
                className={styles.options}
                role={policy.multiple ? "group" : "radiogroup"}
                aria-labelledby="intake-question"
                aria-describedby="intake-description"
              >
                {activeQuestion.options.map((option, index) => (
                  <label className={styles.option} key={option.value}>
                    <input
                      type={policy.multiple ? "checkbox" : "radio"}
                      name={field}
                      value={option.value}
                      checked={
                        policy.multiple
                          ? selection.selected.includes(option.value)
                          : answers[field] === option.value
                      }
                      onChange={() =>
                        policy.multiple
                          ? update(
                              writeIntakeSelection(
                                selection.selected.includes(option.value)
                                  ? selection.selected.filter(
                                      (value) => value !== option.value,
                                    )
                                  : [...selection.selected, option.value],
                                selection.detail,
                              ),
                            )
                          : update(option.value)
                      }
                    />
                    <span className={styles.optionIndex} aria-hidden="true">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className={styles.optionCopy}>
                      <strong>{option.label}</strong>
                      {option.description && <span>{option.description}</span>}
                    </span>
                    <span className={styles.selected} aria-hidden="true">
                      <Check size={15} />
                    </span>
                  </label>
                ))}
              </div>
              {field === "depth" ? (
                <button
                  type="button"
                  className={styles.unsure}
                  onClick={() => update("foundation")}
                >
                  {english
                    ? "Not sure — start with a foundation"
                    : "不確定，先從基礎開始"}
                </button>
              ) : (
                <label className={styles.detail}>
                  <span>
                    {english ? "Add your own answer" : "補充你的回答"}
                    <small>
                      {english ? "Optional" : "也可以直接寫下你的想法"}
                    </small>
                  </span>
                  <textarea
                    aria-label={
                      english ? "Add your own answer" : "補充你的回答"
                    }
                    rows={2}
                    maxLength={800}
                    value={
                      policy.multiple
                        ? selection.detail
                        : answers[field] === skippedIntakeAnswer
                          ? ""
                          : answers[field] || ""
                    }
                    placeholder={activeQuestion.placeholder}
                    onChange={(event) =>
                      update(
                        policy.multiple
                          ? writeIntakeSelection(
                              selection.selected,
                              event.target.value,
                            )
                          : event.target.value,
                      )
                    }
                  />
                </label>
              )}
            </fieldset>
          ) : null}
          {(error || questionError) && (
            <div className={styles.error} role="alert">
              <p>{error || questionError}</p>
              {questionError && (
                <button
                  type="button"
                  onClick={() => setRetry((value) => value + 1)}
                  disabled={locked}
                >
                  {english ? "Try again" : "重新整理問題"}
                </button>
              )}
              <button
                type="button"
                onClick={() => void reload()}
                disabled={locked}
              >
                {english
                  ? "Reload saved answers (replaces these edits)"
                  : "重新載入已存回答（取代目前編輯）"}
              </button>
            </div>
          )}
          <footer className={styles.actions}>
            <button
              type="button"
              className={styles.previous}
              disabled={locked || step === 0}
              onClick={() => void save("back")}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {english ? "Previous" : "上一題"}
            </button>
            <div className={styles.buttons}>
              {policy.optional && (
                <button
                  type="button"
                  className={styles.save}
                  disabled={locked}
                  onClick={() => void save("next", true)}
                >
                  {english ? "Skip" : "跳過"}
                </button>
              )}
              <button
                type="button"
                className={styles.save}
                disabled={locked || !dirty}
                onClick={() => void save("stay")}
              >
                {english ? "Save answers" : "儲存回答"}
              </button>
              <button
                type="submit"
                className={styles.submit}
                disabled={locked || !activeQuestion || !answers[field]?.trim()}
              >
                {busy ? (
                  <LoaderCircle
                    size={16}
                    className={styles.spinner}
                    aria-hidden="true"
                  />
                ) : null}
                {step === 4
                  ? english
                    ? "Create the first chapter"
                    : "開始製作第一章"
                  : english
                    ? "Continue"
                    : "繼續"}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </footer>
        </form>
        <p className={styles.hint} role="status">
          {policy.multiple
            ? english
              ? "Choose one or more · "
              : "可多選 · "
            : ""}
          {busy
            ? english
              ? "Saving your answers…"
              : "正在儲存回答…"
            : dirty
              ? english
                ? "Your draft is kept on this device."
                : "草稿已保留在這個裝置。"
              : english
                ? `${answered} of 5 answered · Your course begins after the final step.`
                : `已回答 ${answered} / 5 題 · 完成後開始製作第一章。`}
        </p>
      </div>
      <dialog
        ref={cancelDialog}
        className={styles.cancelDialog}
        aria-labelledby="cancel-title"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <h2 id="cancel-title">
          {english ? "Cancel this course?" : "取消這次製作？"}
        </h2>
        <p>
          {english
            ? "This unfinished draft will be removed. Your other courses will stay."
            : "這次尚未完成的回答與草稿會移除，其他課程會保留。"}
        </p>
        <div className={styles.buttons}>
          <button
            type="button"
            disabled={busy}
            onClick={() => cancelDialog.current?.close()}
          >
            {english ? "Keep going" : "繼續設定"}
          </button>
          <button
            type="button"
            className={styles.submit}
            disabled={busy}
            onClick={() => void cancel()}
          >
            {english ? "Confirm cancellation" : "確認取消"}
          </button>
        </div>
      </dialog>
    </main>
  );
}
