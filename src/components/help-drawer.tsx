"use client";
import { useEffect, useRef, useState } from "react";
import {
  X,
  ArrowUp,
  Sparkles,
  GitBranch,
  LoaderCircle,
  Check,
} from "lucide-react";
import type { Message, Snapshot } from "../core/state";
import type { LearningNode } from "../core/protocol";
import { api } from "./api";
export function HelpDrawer({
  course,
  sectionId,
  onClose,
  onMessages,
  onPreview,
  onError,
}: {
  course: Snapshot;
  sectionId: string;
  onClose: () => void;
  onMessages: (messages: Message[]) => void;
  onPreview: (nodes: LearningNode[]) => void;
  onError: (error: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    bottom = useRef<HTMLDivElement>(null);
  const [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [excluded, setExcluded] = useState<string[]>([]);
  useEffect(() => {
    ref.current?.showModal();
    return () => {
      ref.current?.close();
    };
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [course.messages, busy]);
  async function send() {
    if (!question.trim()) return;
    setBusy(true);
    try {
      const messages = await api<Message[]>("help/messages", {
        courseId: course.id,
        question,
        sectionId,
      });
      onMessages(messages);
      setQuestion("");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="help-drawer"
      aria-label="小問題"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="panel-heading">
        <div>
          <Sparkles size={19} />
          <strong>留一點空間給好奇心</strong>
        </div>
        <button
          className="icon-button"
          aria-label="關閉小問題"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <div className="help-context">
        <span className="small-dot" />
        正在討論：
        {course.graph?.nodes.find((n) => n.id === course.currentNodeId)?.title}
      </div>
      <div className="help-messages">
        {!course.messages.length && (
          <div className="help-empty">
            <div className="avatar">
              m<span>✦</span>
            </div>
            <h3>卡住也沒關係。</h3>
            <p>
              說說哪一小塊還不太懂。
              <br />
              我們可以一起拆開來看。
            </p>
            <button onClick={() => setQuestion("我不太懂 HTML 和 CSS 的差別")}>
              HTML 和 CSS 的差別是什麼？
            </button>
            <button
              onClick={() =>
                setQuestion("我不懂這個區塊，可以先補一些基礎嗎？")
              }
            >
              可以先補一些基礎嗎？
            </button>
          </div>
        )}
        {course.messages.map((message) => (
          <div key={message.id} className={"chat-message " + message.role}>
            {message.role === "assistant" && (
              <span className="message-label">
                METHELIA {course.mode === "demo" ? "· 示範回覆" : ""}
              </span>
            )}
            <p>{message.text}</p>
            {!!message.nodes?.length && (
              <div className="recommendations">
                <span>
                  <GitBranch size={14} /> 讓理解更扎實一點
                </span>
                {message.nodes.map((node) => (
                  <button
                    key={node.id}
                    className="recommendation"
                    onClick={() =>
                      setExcluded((v) =>
                        v.includes(node.id)
                          ? v.filter((x) => x !== node.id)
                          : [...v, node.id],
                      )
                    }
                  >
                    <span
                      className={
                        "check-box " +
                        (!excluded.includes(node.id) ? "checked" : "")
                      }
                    >
                      {!excluded.includes(node.id) && <Check size={12} />}
                    </span>
                    <span>
                      <strong>{node.title}</strong>
                      <small>{node.objective}</small>
                      <em>約 {node.minutes} 分鐘 · 完成本章後開始</em>
                    </span>
                  </button>
                ))}
                <button
                  className="secondary-button"
                  disabled={message.nodes.every((n) => excluded.includes(n.id))}
                  onClick={() =>
                    onPreview(
                      message.nodes!.filter((n) => !excluded.includes(n.id)),
                    )
                  }
                >
                  預覽補強路徑 <GitBranch size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="thinking">
            <LoaderCircle className="spin" size={16} /> 正在整理你的問題…
          </div>
        )}
        <div ref={bottom} />
      </div>
      <form
        className="help-input"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          placeholder="哪個地方還不太懂？"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={2000}
        />
        <button aria-label="送出問題" disabled={busy || !question.trim()}>
          <ArrowUp size={19} />
        </button>
      </form>
      <p className="help-footnote">
        提問時解說會暫停，你的章節與練習都會保留。
      </p>
    </dialog>
  );
}
