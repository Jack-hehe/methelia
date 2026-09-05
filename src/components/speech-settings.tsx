"use client";
import { useCourseLanguage } from "./course-language";
import { localizedError } from "../core/language";
import { useId, useRef, useState } from "react";
import { AudioLines, LoaderCircle } from "lucide-react";
import type { PackageState } from "../core/state";

export function SpeechSettings({
  pkg,
  disabled,
  onOpen,
  onRebuild,
}: {
  pkg?: PackageState;
  disabled: boolean;
  onOpen: () => void;
  onRebuild: () => Promise<void>;
}) {
  const { t, language, english } = useCourseLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId(),
    descriptionId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preparing = pkg && ["pending", "generating"].includes(pkg.speech);
  async function rebuild() {
    if (busy || preparing) return;
    setBusy(true);
    setError("");
    try {
      await onRebuild();
      dialog.current?.close();
    } catch (error) {
      setError(
        error instanceof Error
          ? localizedError(error, language)
          : t(
              "無法重建語音，請稍後再試。",
              "Unable to rebuild narration. Please try again later.",
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="icon-button"
        aria-label={t("章節語音", "Chapter narration")}
        title={t("章節語音", "Chapter narration")}
        disabled={disabled}
        onClick={() => {
          setError("");
          onOpen();
          dialog.current?.showModal();
        }}
      >
        <AudioLines size={20} />
      </button>
      <dialog
        ref={dialog}
        className="speech-dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={busy}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <h2 id={titleId}>{t("章節語音", "Chapter narration")}</h2>
        <p id={descriptionId}>
          {t(
            "使用目前設定的老師，重新產生本章所有分頁語音。會使用 ElevenLabs 額度，課程內容與實作檔案不變。",
            "Regenerate narration for every page in this chapter using the current teacher settings. This uses ElevenLabs credits. Course content and project files stay the same.",
          )}
        </p>
        {preparing && (
          <p role="status">
            {t(
              "本章語音準備中，完成後才能重建。",
              "Chapter narration is being prepared. Wait for it to finish before rebuilding.",
            )}
          </p>
        )}
        {pkg?.speechProfile && (
          <p>
            {t("本章語言：", "Chapter language:")}
            {pkg.speechProfile.languageCode === "zh"
              ? t("中文", "Chinese")
              : pkg.speechProfile.languageCode === "en"
                ? t("英文", "English")
                : t("自動辨識（舊版語音）", "Auto-detected (legacy narration)")}
            。
            {pkg.speechProfile.model === "eleven_multilingual_v2" &&
              t(
                "目前這份語音使用的模型不支援指定語言；重建後才會套用新的語音設定。",
                "The model used for this narration does not support a specified language. Rebuild it to apply the new voice settings.",
              )}
          </p>
        )}
        {error && (
          <p className="speech-dialog-error" role="alert">
            {error}
          </p>
        )}
        <div className="speech-dialog-actions">
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => dialog.current?.close()}
            autoFocus
          >
            {t("取消", "Cancel")}
          </button>
          <button
            className="primary-button"
            disabled={busy || Boolean(preparing)}
            onClick={() => void rebuild()}
          >
            {busy && <LoaderCircle size={16} className="spin" />}
            {busy
              ? t("提交中…", "Submitting…")
              : t("重建章節語音", "Rebuild chapter narration")}
          </button>
        </div>
      </dialog>
    </>
  );
}
