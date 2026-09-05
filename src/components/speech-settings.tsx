"use client";
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
        error instanceof Error ? error.message : "無法重建語音，請稍後再試。",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="icon-button"
        aria-label="章節語音"
        title="章節語音"
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
        <h2 id={titleId}>章節語音</h2>
        <p id={descriptionId}>
          使用目前設定的老師，重新產生本章所有分頁語音。會使用 ElevenLabs
          額度，課程內容與實作檔案不變。
        </p>
        {preparing && <p role="status">本章語音準備中，完成後才能重建。</p>}
        {pkg?.speechProfile && (
          <p>
            本章語言：
            {pkg.speechProfile.languageCode === "zh"
              ? "中文"
              : pkg.speechProfile.languageCode === "en"
                ? "英文"
                : "自動辨識（舊版語音）"}
            。
            {pkg.speechProfile.model === "eleven_multilingual_v2" &&
              "目前這份語音使用的模型不支援指定語言；重建後才會套用新的語音設定。"}
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
            取消
          </button>
          <button
            className="primary-button"
            disabled={busy || Boolean(preparing)}
            onClick={() => void rebuild()}
          >
            {busy && <LoaderCircle size={16} className="spin" />}
            {busy ? "提交中…" : "重建章節語音"}
          </button>
        </div>
      </dialog>
    </>
  );
}
