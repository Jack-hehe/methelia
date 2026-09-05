"use client";
import { useCourseLanguage } from "./course-language";
import { localizedError } from "../core/language";
import { useState } from "react";
import type { NodeNote } from "../core/state";
import styles from "./learning-map.module.css";

type Draft = { text: string; revision: number };

export function LearningNodeNotes({
  nodeId,
  note,
  onSave,
}: {
  nodeId: string;
  note?: NodeNote;
  onSave?: (nodeId: string, text: string, revision: number) => Promise<void>;
}) {
  const { t, language, english } = useCourseLanguage();
  // Drafts are keyed by node, so polling and selecting another node cannot replace unsaved text.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const draft = drafts[nodeId];
  const text = draft?.text ?? note?.personal ?? "";
  const changed = Boolean(draft && draft.text !== (note?.personal ?? ""));
  async function save() {
    if (!onSave || saving || !draft) return;
    const id = nodeId,
      submitted = draft;
    setSaving(true);
    setMessages((previous) => ({ ...previous, [id]: "" }));
    try {
      await onSave(id, submitted.text, submitted.revision);
      setDrafts((previous) => {
        // Preserve typing made while the save request was in flight.
        const current = previous[id];
        if (current !== submitted)
          return {
            ...previous,
            [id]: { ...current, revision: submitted.revision + 1 },
          };
        const next = { ...previous };
        delete next[id];
        return next;
      });
      setMessages((previous) => ({
        ...previous,
        [id]: t("個人筆記已保存", "Personal notes saved"),
      }));
    } catch (error) {
      setMessages((previous) => ({
        ...previous,
        [id]:
          error instanceof Error
            ? localizedError(error, language)
            : t(
                "保存失敗，內容仍保留，請重試",
                "Save failed. Your draft is preserved. Please try again.",
              ),
      }));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      className={styles.notes}
      aria-label={t("節點學習筆記", "Node learning notes")}
    >
      <h4>{t("實際學習紀錄", "Learning record")}</h4>
      {note ? (
        <>
          {note.packageId && (
            <p className={styles.source}>
              {t(
                "依據這一章的內容與實際作答整理",
                "Based on this chapter’s content and your actual answers",
              )}
            </p>
          )}
          {note.summary.map((section, index) => (
            <div key={`${index}-${section.title}`}>
              <h5>{section.title}</h5>
              <p>{section.body}</p>
            </div>
          ))}
          {!!note.checkpoints.length && (
            <>
              <h5>{t("練習證據", "Practice evidence")}</h5>
              <ul>
                {note.checkpoints.map((check) => (
                  <li key={check.sectionId}>
                    {check.title}:{" "}
                    {t(
                      `${check.attempts} 次作答；`,
                      `${check.attempts} attempts; `,
                    )}
                    {check.firstPassed
                      ? t("首次作答通過", "Passed on first attempt")
                      : check.lastPassed
                        ? t("重試後通過", "Passed after retrying")
                        : t("待複習", "Needs review")}
                    {!!check.records?.length && (
                      <details>
                        <summary>
                          {t("查看作答與訂正", "View answers and corrections")}
                        </summary>
                        {check.records.map((record, index) => (
                          <div key={index}>
                            <p>
                              {t(
                                `第 ${index + 1} 次：`,
                                `Attempt ${index + 1}: `,
                              )}
                              {record.passed
                                ? t("通過", "Passed")
                                : t("尚未通過", "Not yet passed")}
                              {record.usedHelp
                                ? t(
                                    " · 本章曾提問",
                                    " · Asked for help in this chapter",
                                  )
                                : ""}
                            </p>
                            {record.actual && (
                              <p>
                                {t(
                                  "當時的答案／內容：",
                                  "Submitted answer / content:",
                                )}
                                <code
                                  style={{
                                    whiteSpace: "pre-wrap",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {record.actual}
                                </code>
                              </p>
                            )}
                            {record.expected && (
                              <p>
                                {t("驗證條件：", "Check criteria:")}
                                <code
                                  style={{
                                    whiteSpace: "pre-wrap",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {record.expected}
                                </code>
                              </p>
                            )}
                          </div>
                        ))}
                      </details>
                    )}
                  </li>
                ))}
              </ul>
              <p className={styles.source}>
                {t(
                  "作答紀錄不等同已獨立掌握；提示與訂正需一併考量。",
                  "Answer records alone do not establish independent mastery; consider hints and corrections too.",
                )}
              </p>
            </>
          )}
          {!!note.questions.length && (
            <>
              <h5>{t("你提出的問題", "Your questions")}</h5>
              <ul>
                {note.questions.map((question, index) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <p>
          {t(
            "尚無實際學習紀錄；上方為預計學習內容。",
            "No learning record yet. The planned content is shown above.",
          )}
        </p>
      )}
      <label htmlFor="node-personal-note">
        {t("個人心得", "Personal reflections")}
      </label>
      <textarea
        id="node-personal-note"
        value={text}
        rows={5}
        maxLength={10000}
        readOnly={!onSave}
        placeholder={t(
          "記下自己的理解、例子或待釐清的問題",
          "Write down your understanding, examples, or questions to clarify",
        )}
        onChange={(event) => {
          const value = event.target.value;
          setDrafts((previous) => ({
            ...previous,
            [nodeId]: {
              text: value,
              revision: previous[nodeId]?.revision ?? note?.revision ?? 0,
            },
          }));
          setMessages((previous) => ({ ...previous, [nodeId]: "" }));
        }}
      />
      {draft && draft.revision !== (note?.revision ?? 0) && changed && (
        <p role="status">
          {t(
            "紀錄已有更新，你的草稿仍保留。",
            "The record has been updated. Your draft is preserved.",
          )}
          <button
            type="button"
            className="text-button"
            onClick={() =>
              setDrafts((previous) => ({
                ...previous,
                [nodeId]: {
                  ...previous[nodeId],
                  revision: note?.revision ?? 0,
                },
              }))
            }
          >
            {t("以目前版本保存草稿", "Save draft against the current version")}
          </button>
        </p>
      )}
      {onSave && (
        <button
          type="button"
          className="text-button"
          disabled={!changed || saving}
          onClick={() => void save()}
        >
          {saving
            ? t("保存中…", "Saving…")
            : t("保存個人筆記", "Save personal notes")}
        </button>
      )}
      {messages[nodeId] && <p role="status">{messages[nodeId]}</p>}
    </section>
  );
}
