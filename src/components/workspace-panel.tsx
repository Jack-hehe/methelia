"use client";
import { useEffect, useMemo, useState } from "react";
import {
  X,
  Terminal,
  ArrowUpRight,
  Check,
  Download,
  MousePointer2,
  Play,
  ArrowRight,
} from "lucide-react";
import { normalizePath, type Workspace } from "../core/workspace";
import type { Chapter } from "../core/protocol";
import type { Cue } from "../core/narration";
import { guidanceFrame } from "../core/guidance";
import { buildPreview } from "../core/preview";
import { api } from "./api";

export function WorkspacePanel({
  courseId,
  workspace,
  chapter,
  cues,
  audioTime,
  audioReady,
  demonstrating,
  onDemonstrating,
  onPlayback,
  registerLeave,
  onChange,
  onClose,
  onError,
}: {
  courseId: string;
  workspace: Workspace;
  chapter: Chapter;
  cues: Cue[];
  audioTime: number;
  audioReady: boolean;
  demonstrating: boolean;
  onDemonstrating: (value: boolean) => void;
  onPlayback: (time: number, play: boolean) => void;
  registerLeave: (save: (() => Promise<void>) | null) => void;
  onChange: (w: Workspace) => void;
  onClose: () => void;
  onError: (e: string) => void;
}) {
  const [path, setPath] = useState<string | null>(null),
    [draft, setDraft] = useState(""),
    [command, setCommand] = useState(""),
    [busy, setBusy] = useState(false),
    [manualStep, setManualStep] = useState(0),
    [output, setOutput] = useState(
      "Methelia website workspace\n\n先用 ls 查看檔案，再用 edit index.html 修改標題。\n左側預覽會即時回應你的修改。\n",
    );
  const guides = chapter.sections.filter((s) => s.guide);
  const manualCues = guides.map((s, i) => ({
    sectionId: s.id,
    start: i * 10,
    end: (i + 1) * 10,
  }));
  const frame = guidanceFrame(
    chapter,
    audioReady ? cues : manualCues,
    audioReady
      ? audioTime
      : Math.floor(manualStep / 2) * 10 + (manualStep % 2 ? 8 : 1),
  );
  const guide = frame.section?.guide;
  const dirty = path !== null && draft !== workspace.files[path];
  const src = useMemo(
    () =>
      buildPreview(
        demonstrating
          ? frame.files
          : { ...workspace.files, ...(path ? { [path]: draft } : {}) },
        demonstrating ? frame.previewClick : undefined,
      ),
    [
      demonstrating,
      workspace.files,
      path,
      draft,
      JSON.stringify(frame.files),
      frame.previewClick,
    ],
  );
  const practice = chapter.sections.find((s) => s.intent === "practice");
  useEffect(() => {
    registerLeave(async () => {
      if (busy) throw new Error("正在儲存，請稍候再切換。");
      await save();
    });
    return () => registerLeave(null);
  }, [path, draft, workspace.revision, busy]);
  useEffect(() => {
    const block = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", block);
    return () => window.removeEventListener("beforeunload", block);
  }, [dirty]);
  useEffect(() => {
    if (!demonstrating || !audioReady || !guides.length) return;
    const last = cues.find((c) => c.sectionId === guides.at(-1)!.id);
    if (last && audioTime >= last.end) {
      onDemonstrating(false);
      onPlayback(last.end, false);
    }
  }, [audioTime, demonstrating, audioReady]);
  async function save() {
    if (!dirty || !path) return workspace;
    const updated = await api<Workspace>(
      "workspace/files",
      { courseId, files: { [path]: draft }, baseRevision: workspace.revision },
      "PUT",
    );
    onChange(updated);
    return updated;
  }
  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await work();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function run() {
    if (!command.trim()) return;
    const input = command.trim();
    if (input === "help") {
      setOutput(
        (v) =>
          v +
          "\n$ help\npwd · ls · cd · mkdir · touch · cat · clear\nedit <檔名> — Methelia 教學編輯器（非系統指令）\npython -m http.server 8000 — 教學預覽轉接器\n",
      );
    } else if (/^edit(?:\s|$)/.test(input)) {
      const file = normalizePath(workspace.cwd, input.slice(4).trim());
      if (!(file in workspace.files))
        throw new Error("找不到檔案。先輸入 ls 查看檔名。");
      setPath(file);
      setDraft(workspace.files[file]);
      setOutput((v) => v + `\n${workspace.cwd} $ ${input}\n`);
    } else {
      const result = await api<{ workspace: Workspace; output: string }>(
        "workspace/commands",
        { courseId, command: input },
      );
      onChange(result.workspace);
      setOutput((v) =>
        input === "clear"
          ? ""
          : `${v}\n${workspace.cwd} $ ${input}\n${result.output}\n`,
      );
    }
    setCommand("");
  }
  function watch() {
    void action(async () => {
      await save();
      setPath(null);
      setManualStep(0);
      onDemonstrating(true);
      if (audioReady)
        onPlayback(
          cues.find((c) => c.sectionId === guides[0]?.id)?.start || 0,
          true,
        );
    });
  }
  function tryIt() {
    onDemonstrating(false);
    onPlayback(audioTime, false);
  }
  return (
    <section className="practice-studio" aria-label="實作區">
      <div className="studio-toolbar">
        <div className="studio-title">
          <span className="small-dot" />
          <strong>Learning by doing</strong>
          <span>{chapter.title}</span>
        </div>
        <div className="studio-actions">
          {guides.length > 0 && (
            <button
              disabled={busy}
              className={demonstrating ? "studio-selected" : ""}
              onClick={watch}
            >
              <Play size={14} />
              看老師示範
            </button>
          )}
          <button
            disabled={busy}
            className={!demonstrating ? "studio-selected" : ""}
            onClick={tryIt}
          >
            <Terminal size={14} />
            自己試試
          </button>
          <button
            className="icon-button"
            disabled={busy}
            aria-label="關閉實作區"
            onClick={() =>
              void action(async () => {
                await save();
                onDemonstrating(false);
                onClose();
              })
            }
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="studio-columns">
        <div className="studio-browser">
          <div className="studio-browserbar">
            <span className="window-dots">
              <i />
              <i />
              <i />
            </span>
            <span>your-first-website.local</span>
            <span className="live-label">
              <i />
              {demonstrating ? "DEMO" : "LIVE"}
            </span>
          </div>
          <iframe title="實作網站預覽" sandbox="allow-scripts" srcDoc={src} />
          <div className="studio-coach" aria-live="polite">
            <div className="coach-avatar">
              m<span>✦</span>
            </div>
            <div>
              <span className="eyebrow">
                {demonstrating
                  ? "01 / WATCH & UNDERSTAND"
                  : "02 / MAKE IT YOURS"}
              </span>
              <strong>
                {demonstrating
                  ? frame.section?.title
                  : "換你把這一步，變成自己的能力"}
              </strong>
              <p>
                {demonstrating
                  ? frame.target === "preview"
                    ? "看看左側的變化，再想想：剛剛修改的是內容、樣式，還是行為？"
                    : "跟著游標看右側。只改一個地方，保留其他程式碼。"
                  : practice?.body ||
                    "輸入 edit index.html，把 h1 裡的文字換成你的標題。觀察左側變化，再儲存並返回課程。"}
              </p>
            </div>
          </div>
        </div>
        <section className="studio-terminal" aria-label="Terminal">
          <div className="studio-terminalbar">
            <span>
              <Terminal size={16} /> Terminal{" "}
              <small>{demonstrating ? "示範副本" : "你的工作區"}</small>
            </span>
            <a
              aria-label="匯出網站"
              href={"/api/workspace/export?courseId=" + courseId}
            >
              <Download size={16} />
            </a>
          </div>
          {demonstrating && guide ? (
            <div className="guided-terminal">
              <div className="terminal-demo-label">
                <span className="small-dot" />
                {audioReady ? "語音同步示範" : "文字示範 · 尚無語音"}
              </div>
              <p className="demo-command">
                <span>❯</span> edit {guide.path.slice(1)}
                <span className="terminal-caret" />
              </p>
              <div className="terminal-file-label">
                {guide.path}
                <span>示範不會儲存到你的作品</span>
              </div>
              <pre className="demo-source">
                {frame.files[guide.path]?.split("\n").map((line, i) => (
                  <span
                    className={
                      line.includes(
                        frame.target === "preview"
                          ? guide.replacement
                          : guide.find,
                      )
                        ? "demo-highlight"
                        : ""
                    }
                    key={i}
                  >
                    <i>{i + 1}</i>
                    {line}
                    {"\n"}
                  </span>
                ))}
              </pre>
              <div className="guide-footer">
                <span>
                  {frame.target === "preview" ? (
                    <Check size={15} />
                  ) : (
                    <MousePointer2 size={15} />
                  )}
                  {frame.target === "preview"
                    ? "修改完成 → 觀察左側"
                    : `找到「${guide.find}」`}
                </span>
                {!audioReady && (
                  <button
                    onClick={() => {
                      if (manualStep < guides.length * 2 - 1)
                        setManualStep((s) => s + 1);
                      else setManualStep(0);
                    }}
                  >
                    {manualStep % 2 === 0
                      ? "看修改結果"
                      : manualStep < guides.length * 2 - 1
                        ? "下一個步驟"
                        : "再看一次"}
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : path ? (
            <div className="terminal-editor">
              <div className="terminal-file-label">
                edit {path}
                <span>{dirty ? "即時預覽 · 尚未儲存" : "已儲存"}</span>
              </div>
              <textarea
                aria-label="程式碼編輯器"
                value={draft}
                spellCheck={false}
                disabled={busy}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    void action(async () => {
                      await save();
                      setPath(null);
                    });
                  }
                }}
              />
              <div className="terminal-editor-actions">
                <small>編輯時左側即時更新 · Ctrl + Enter 儲存</small>
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      await save();
                      setPath(null);
                    })
                  }
                >
                  {busy ? "儲存中…" : "儲存並返回 Terminal"}
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="studio-shell">
              <pre className="terminal-output">{output}</pre>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(run);
                }}
              >
                <span>❯</span>
                <input
                  aria-label="終端機指令"
                  placeholder="輸入指令…"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={busy}
                />
                <button disabled={busy} aria-label="執行指令">
                  <ArrowRight size={17} />
                </button>
              </form>
              <div className="terminal-suggestions">
                {["ls", "edit index.html", "edit style.css"].map((c) => (
                  <button key={c} disabled={busy} onClick={() => setCommand(c)}>
                    {c}
                  </button>
                ))}
              </div>
              <small className="terminal-disclaimer">
                教學終端機 · 輸入 help 查看支援指令 · 不執行主機 Shell
              </small>
            </div>
          )}
        </section>
        {demonstrating && guide && (
          <div
            aria-hidden="true"
            className={"guide-pointer guide-at-" + frame.target}
          >
            <MousePointer2 size={27} fill="currentColor" />
            <span>
              {frame.target === "preview" ? "看這裡的變化" : "跟我做一次"}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
