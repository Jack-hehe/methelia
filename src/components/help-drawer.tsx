"use client";
import { useCourseLanguage } from "./course-language";
import { localizedError } from "../core/language";
import { useEffect, useRef, useState } from "react";
import {
  PanelRightClose,
  ArrowUp,
  MessageCircle,
  GitBranch,
  LoaderCircle,
  Check,
  Copy,
} from "lucide-react";
import type { Message, Snapshot } from "../core/state";
import type { LearningNode } from "../core/protocol";
import { api } from "./api";
import { RichText } from "./rich-text";
const MIN_WIDTH = 320,
  MAX_WIDTH = 720,
  DEFAULT_WIDTH = 440,
  WIDTH_KEY = "methelia:help-width";
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
  const { t, language, english } = useCourseLanguage();
  const ref = useRef<HTMLDialogElement>(null),
    bottom = useRef<HTMLDivElement>(null),
    field = useRef<HTMLTextAreaElement>(null),
    dragging = useRef(false);
  const [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [excluded, setExcluded] = useState<string[]>([]),
    // The learner's own line, shown before the reply lands.
    [pending, setPending] = useState(""),
    [copied, setCopied] = useState(""),
    [width, setWidth] = useState(() => {
      try {
        const stored = Number(localStorage.getItem(WIDTH_KEY));
        if (stored >= MIN_WIDTH && stored <= MAX_WIDTH) return stored;
      } catch {}
      return DEFAULT_WIDTH;
    });
  useEffect(() => {
    // show(), not showModal(): the lesson behind stays readable and clickable.
    ref.current?.show();
    field.current?.focus();
    return () => {
      ref.current?.close();
    };
  }, []);
  useEffect(() => {
    // A non-modal dialog never receives cancel, so Escape is handled here.
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !dragging.current) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [course.messages, busy, pending]);
  async function send() {
    const text = question.trim();
    if (!text || busy) return;
    setPending(text);
    setQuestion("");
    setBusy(true);
    try {
      const messages = await api<Message[]>("help/messages", {
        courseId: course.id,
        question: text,
        sectionId,
      });
      onMessages(messages);
      setPending("");
    } catch (e) {
      // Hand the question back rather than losing what was typed.
      setPending("");
      setQuestion(text);
      onError(localizedError(e, language));
    } finally {
      setBusy(false);
    }
  }
  async function copy(message: Message) {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(message.id);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      onError(
        t(
          "這個瀏覽器不允許複製，請手動選取文字。",
          "This browser does not allow copying. Please select the text manually.",
        ),
      );
    }
  }
  function startResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
  }
  function moveResize(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setWidth(
      Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, window.innerWidth - event.clientX),
      ),
    );
  }
  function endResize(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    try {
      localStorage.setItem(WIDTH_KEY, String(width));
    } catch {}
  }
  return (
    <dialog
      ref={ref}
      className="help-drawer"
      aria-label={t("小問題", "Ask a question")}
      style={{ width }}
    >
      <div
        className="help-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label={t("調整側欄寬度", "Resize sidebar")}
        onPointerDown={startResize}
        onPointerMove={moveResize}
        onPointerUp={endResize}
        onPointerCancel={endResize}
      />
      <div className="panel-heading">
        <div>
          <MessageCircle size={19} />
          <strong>{t("小問題", "Ask a question")}</strong>
        </div>
        <button
          className="icon-button"
          aria-label={t("收合小問題", "Close questions")}
          title={t("收合側欄", "Collapse sidebar")}
          onClick={onClose}
        >
          <PanelRightClose size={18} />
        </button>
      </div>
      <div className="help-context">
        <span className="small-dot" />
        {course.graph?.nodes.find((n) => n.id === course.currentNodeId)?.title}
      </div>
      <div className="help-messages">
        {course.messages.map((message) => (
          <div key={message.id} className={"chat-message " + message.role}>
            {message.role === "assistant" && (
              <span className="message-label">
                METHELIA{" "}
                {course.mode === "demo" ? t("· 示範回覆", "· Demo reply") : ""}
              </span>
            )}
            {message.role === "assistant" ? (
              <div className="rich-text">
                <RichText text={message.text} />
              </div>
            ) : (
              <p>{message.text}</p>
            )}
            {message.role === "assistant" && (
              <div className="message-actions">
                <button
                  className="icon-button"
                  aria-label={t("複製回覆", "Copy reply")}
                  title={
                    copied === message.id
                      ? t("已複製", "Copied")
                      : t("複製回覆", "Copy reply")
                  }
                  onClick={() => void copy(message)}
                >
                  {copied === message.id ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            )}
            {!!message.nodes?.length && (
              <div className="recommendations">
                <span>
                  <GitBranch size={14} />
                  {t("建議節點", "Suggested nodes")}
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
                      <em>
                        {t(
                          `約 ${node.minutes} 分鐘 · 完成本章後開始`,
                          `About ${node.minutes} min · Starts after this chapter`,
                        )}
                      </em>
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
                  {t("預覽補強路徑", "Preview reinforcement path")}
                  <GitBranch size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
        {pending && (
          <div className="chat-message user is-pending">
            <p>{pending}</p>
          </div>
        )}
        {busy && (
          <div className="thinking">
            <LoaderCircle className="spin" size={16} />
            {t("回覆中…", "Replying…")}
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
          ref={field}
          placeholder={t(
            "哪個地方還不太懂？（Enter 送出，Shift+Enter 換行）",
            "What needs clarification? (Enter to send, Shift+Enter for a new line)",
          )}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            // isComposing keeps Enter from sending while an IME candidate is open.
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void send();
            }
          }}
          maxLength={2000}
        />
        <button
          aria-label={t("送出問題", "Send question")}
          disabled={busy || !question.trim()}
        >
          <ArrowUp size={19} />
        </button>
      </form>
    </dialog>
  );
}
