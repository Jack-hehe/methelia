"use client";
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
      setMessages((previous) => ({ ...previous, [id]: "個人筆記已保存" }));
    } catch (error) {
      setMessages((previous) => ({
        ...previous,
        [id]:
          error instanceof Error
            ? error.message
            : "保存失敗，內容仍保留，請重試",
      }));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className={styles.notes} aria-label="節點學習筆記">
      <h4>實際學習紀錄</h4>
      {note ? (
        <>
          {note.packageId && (
            <p className={styles.source}>依據這一章的內容與實際作答整理</p>
          )}
          {note.summary.map((section, index) => (
            <div key={`${index}-${section.title}`}>
              <h5>{section.title}</h5>
              <p>{section.body}</p>
            </div>
          ))}
          {!!note.checkpoints.length && (
            <>
              <h5>練習證據</h5>
              <ul>
                {note.checkpoints.map((check) => (
                  <li key={check.sectionId}>
                    {check.title}：{check.attempts} 次作答；
                    {check.firstPassed
                      ? "首次作答通過"
                      : check.lastPassed
                        ? "重試後通過"
                        : "待複習"}
                    {!!check.records?.length && (
                      <details>
                        <summary>查看作答與訂正</summary>
                        {check.records.map((record, index) => (
                          <div key={index}>
                            <p>
                              第 {index + 1} 次：
                              {record.passed ? "通過" : "尚未通過"}
                              {record.usedHelp ? " · 本章曾提問" : ""}
                            </p>
                            {record.actual && (
                              <p>
                                當時的答案／內容：
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
                                驗證條件：
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
                作答紀錄不等同已獨立掌握；提示與訂正需一併考量。
              </p>
            </>
          )}
          {!!note.questions.length && (
            <>
              <h5>你提出的問題</h5>
              <ul>
                {note.questions.map((question, index) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <p>尚無實際學習紀錄；上方為預計學習內容。</p>
      )}
      <label htmlFor="node-personal-note">個人心得</label>
      <textarea
        id="node-personal-note"
        value={text}
        rows={5}
        maxLength={10000}
        readOnly={!onSave}
        placeholder="記下自己的理解、例子或待釐清的問題"
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
          紀錄已有更新，你的草稿仍保留。
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
            以目前版本保存草稿
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
          {saving ? "保存中…" : "保存個人筆記"}
        </button>
      )}
      {messages[nodeId] && <p role="status">{messages[nodeId]}</p>}
    </section>
  );
}
