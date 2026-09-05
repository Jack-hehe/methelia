"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Terminal,
  ArrowUpRight,
  Check,
  Download,
  MousePointer2,
  Play,
  ArrowRight,
  Code2,
  Folder,
  FileCode,
  ChevronUp,
} from "lucide-react";
import { normalizePath, type Workspace } from "../core/workspace";
import { chapterEnvironment, type Chapter } from "../core/protocol";
import type { Cue } from "../core/narration";
import { guidanceFrame } from "../core/guidance";
import { workspaceChapter } from "../core/lesson-pages";
import { buildPreview } from "../core/preview";
import { api } from "./api";
import { PythonRunner } from "./python-runner";
import "./practice-environments.css";

export function WorkspacePanel({
  courseId,
  workspace,
  chapter: sourceChapter,
  activeSectionId,
  embedded = false,
  cues,
  audioTime,
  audioReady,
  audioPlaying,
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
  activeSectionId: string;
  embedded?: boolean;
  cues: Cue[];
  audioTime: number;
  audioReady: boolean;
  audioPlaying: boolean;
  demonstrating: boolean;
  onDemonstrating: (value: boolean) => void;
  onPlayback: (time: number, play: boolean) => void;
  registerLeave: (save: (() => Promise<void>) | null) => void;
  onChange: (w: Workspace) => void;
  onClose: () => void;
  onError: (e: string) => void;
}) {
  const chapter = useMemo(
    () => workspaceChapter(sourceChapter, activeSectionId),
    [sourceChapter, activeSectionId],
  );
  const environment = chapterEnvironment(sourceChapter);
  const legacyTerminal =
    sourceChapter.schemaVersion === 1 && environment === "web";
  const shellAvailable = environment === "terminal" || legacyTerminal;
  const component = chapter.sections[0]?.component;
  const example = component?.type === "code.editor" ? component : null;
  const defaultPath =
    example && Object.hasOwn(workspace.files, example.path)
      ? example.path
      : Object.keys(workspace.files).find((name) =>
          environment === "python"
            ? name.endsWith(".py")
            : name === "/index.html",
        ) ||
        Object.keys(workspace.files).sort()[0] ||
        null;
  const [path, setPath] = useState<string | null>(
      shellAvailable ? null : defaultPath,
    ),
    [draft, setDraft] = useState(
      shellAvailable ? "" : workspace.files[defaultPath || ""] || "",
    ),
    [baseDraft, setBaseDraft] = useState(
      shellAvailable ? "" : workspace.files[defaultPath || ""] || "",
    ),
    [browserDirectory, setBrowserDirectory] = useState(workspace.cwd),
    [command, setCommand] = useState(""),
    [busy, setBusy] = useState(false),
    [showExample, setShowExample] = useState(false),
    [manualStep, setManualStep] = useState(0),
    [manualDemo, setManualDemo] = useState(false),
    [output, setOutput] = useState(
      "輸入 ls 查看檔案，edit 檔名 開啟編輯器。\n",
    );
  const guides = chapter.sections.filter((s) => s.guide);
  const actionInFlight = useRef(false);
  const suggestions =
    component?.type === "terminal"
      ? component.commands
      : ["ls", `edit ${example?.path.slice(1) || "index.html"}`];
  const manualCues = guides.map((s, i) => ({
    sectionId: s.id,
    start: i * 10,
    end: (i + 1) * 10,
  }));
  const syncedDemo = audioReady && !manualDemo;
  useEffect(() => {
    // Finishing synthesis must not interrupt a manual demonstration.
    if (audioPlaying) setManualDemo(false);
  }, [audioPlaying]);
  const frame = guidanceFrame(
    chapter,
    syncedDemo ? cues : manualCues,
    syncedDemo
      ? audioTime
      : Math.floor(manualStep / 2) * 10 + (manualStep % 2 ? 8 : 1),
  );
  const guide = frame.section?.guide;
  const dirty = path !== null && draft !== baseDraft;
  const practiceFiles = {
    ...workspace.files,
    ...(path ? { [path]: draft } : {}),
  };
  const visibleFiles = demonstrating
    ? frame.files
    : showExample && example
      ? { ...chapter.workspaceSetup, [example.path]: example.example }
      : practiceFiles;
  const pythonEntry =
    demonstrating && guide?.path.endsWith(".py")
      ? guide.path
      : showExample && example?.path.endsWith(".py")
        ? example.path
        : path?.endsWith(".py")
          ? path
          : Object.keys(visibleFiles).find((name) => name.endsWith(".py")) ||
            null;
  const directories = new Set(
    demonstrating || showExample ? ["/"] : workspace.directories,
  );
  for (const name of Object.keys(visibleFiles)) {
    const parts = name.split("/").slice(1, -1);
    for (let i = 1; i <= parts.length; i++)
      directories.add("/" + parts.slice(0, i).join("/"));
  }
  const directory = directories.has(browserDirectory) ? browserDirectory : "/";
  const prefix = directory === "/" ? "/" : directory + "/";
  const children = [...directories]
    .filter((name) => name !== directory)
    .map((name) => ({ name, folder: true }))
    .concat(Object.keys(visibleFiles).map((name) => ({ name, folder: false })))
    .filter(
      ({ name }) =>
        name.startsWith(prefix) && !name.slice(prefix.length).includes("/"),
    )
    .sort(
      (a, b) =>
        Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name),
    );
  const src = useMemo(
    () =>
      buildPreview(
        visibleFiles,
        demonstrating ? frame.previewClick : undefined,
      ),
    [
      demonstrating,
      workspace.files,
      path,
      draft,
      JSON.stringify(frame.files),
      frame.previewClick,
      showExample,
      example,
    ],
  );
  useEffect(() => {
    setBrowserDirectory(workspace.cwd);
  }, [workspace.cwd]);
  useEffect(() => {
    // Never replace an unsaved draft when the page or server snapshot changes.
    if (dirty) return;
    const nextPath = shellAvailable ? path : defaultPath;
    if (nextPath && Object.hasOwn(workspace.files, nextPath)) {
      setPath(nextPath);
      setDraft(workspace.files[nextPath]);
      setBaseDraft(workspace.files[nextPath]);
    }
  }, [activeSectionId, shellAvailable]);
  useEffect(() => {
    if (!dirty && path && Object.hasOwn(workspace.files, path)) {
      setDraft(workspace.files[path]);
      setBaseDraft(workspace.files[path]);
    }
  }, [workspace.revision]);
  useEffect(() => {
    registerLeave(async () => {
      if (actionInFlight.current) throw new Error("正在儲存，請稍候再切換。");
      actionInFlight.current = true;
      setBusy(true);
      try {
        await save();
      } finally {
        actionInFlight.current = false;
        setBusy(false);
      }
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
    if (!demonstrating || !syncedDemo || !guides.length) return;
    const last = cues.find((c) => c.sectionId === guides.at(-1)!.id);
    if (last && audioTime >= last.end) {
      onDemonstrating(false);
      onPlayback(last.end, false);
    }
  }, [audioTime, demonstrating, syncedDemo]);
  async function save() {
    if (!dirty || !path) return workspace;
    if (workspace.files[path] !== baseDraft && workspace.files[path] !== draft)
      throw new Error(
        "檔案已在其他地方更新。你的草稿仍保留在編輯器，請先複製保存後重新載入。",
      );
    const updated = await api<Workspace>(
      "workspace/files",
      { courseId, files: { [path]: draft }, baseRevision: workspace.revision },
      "PUT",
    );
    setBaseDraft(draft);
    onChange(updated);
    return updated;
  }
  async function action(work: () => Promise<void>) {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true);
    try {
      await work();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  }
  async function run() {
    if (!command.trim()) return;
    const input = command.trim();
    if (input === "help") {
      setOutput((v) =>
        (
          v +
          "\n$ help\npwd · ls · cd · mkdir · touch · cat · clear\nedit <檔名> — Methelia 教學編輯器（非系統指令）\n" +
          (legacyTerminal
            ? "python -m http.server 8000 — 教學預覽轉接器\n"
            : "")
        ).slice(-30000),
      );
    } else if (/^edit(?:\s|$)/.test(input)) {
      const file = normalizePath(workspace.cwd, input.slice(4).trim());
      if (!(file in workspace.files))
        throw new Error("找不到檔案。先輸入 ls 查看檔名。");
      setPath(file);
      setDraft(workspace.files[file]);
      setBaseDraft(workspace.files[file]);
      setOutput((v) => (v + `\n${workspace.cwd} $ ${input}\n`).slice(-30000));
    } else {
      const result = await api<{ workspace: Workspace; output: string }>(
        "workspace/commands",
        { courseId, command: input },
      );
      onChange(result.workspace);
      setOutput((v) =>
        input === "clear"
          ? ""
          : `${v}\n${workspace.cwd} $ ${input}\n${result.output}\n`.slice(
              -30000,
            ),
      );
    }
    setCommand("");
  }
  function openFile(file: string) {
    void action(async () => {
      const latest = await save();
      if (!Object.hasOwn(latest.files, file)) throw new Error("找不到檔案。");
      setPath(file);
      setDraft(latest.files[file]);
      setBaseDraft(latest.files[file]);
      setShowExample(false);
      onDemonstrating(false);
      onPlayback(audioTime, false);
    });
  }
  function openDirectory(next: string) {
    if (demonstrating || showExample) {
      setBrowserDirectory(next);
      return;
    }
    void action(async () => {
      await save();
      const result = await api<{ workspace: Workspace; output: string }>(
        "workspace/commands",
        { courseId, command: `cd ${next}` },
      );
      if (result.workspace.cwd !== next)
        throw new Error(result.output || "無法開啟目錄。");
      onChange(result.workspace);
      setBrowserDirectory(next);
    });
  }
  function saveEditor() {
    void action(async () => {
      await save();
      if (shellAvailable) setPath(null);
    });
  }
  function watch() {
    void action(async () => {
      await save();
      setManualStep(0);
      setManualDemo(!audioReady);
      setShowExample(false);
      onDemonstrating(true);
      if (audioReady)
        onPlayback(
          cues.find((c) => c.sectionId === guides[0]?.id)?.start || 0,
          true,
        );
    });
  }
  function tryIt() {
    setShowExample(false);
    onDemonstrating(false);
    onPlayback(audioTime, false);
  }
  if (environment === "none") return null;
  return (
    <section
      className={`practice-studio practice-environment practice-${environment}`}
      aria-label="實作區"
    >
      <div className="studio-toolbar">
        <div className="studio-title">
          <span className="small-dot" />
          <strong>
            {demonstrating
              ? "操作示範"
              : environment === "python"
                ? "Python 練習"
                : shellAvailable
                  ? "Terminal"
                  : "網頁實作"}
          </strong>
        </div>
        <div className="studio-actions">
          {example && (
            <button
              disabled={busy}
              aria-pressed={showExample && !demonstrating}
              onClick={() => {
                onDemonstrating(false);
                onPlayback(audioTime, false);
                setShowExample(true);
              }}
            >
              查看範例
            </button>
          )}
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
            className={!demonstrating && !showExample ? "studio-selected" : ""}
            onClick={tryIt}
          >
            <Code2 size={14} />
            自己試試
          </button>
          {!embedded && (
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
          )}
        </div>
      </div>
      <div className="studio-columns">
        {environment === "python" ? (
          <PythonRunner
            key={`${activeSectionId}:${demonstrating ? "demo" : showExample ? "example" : "practice"}`}
            files={visibleFiles}
            entryPath={pythonEntry}
          />
        ) : environment === "terminal" ? (
          <section
            className="practice-file-browser"
            aria-label="虛擬檔案與目錄"
          >
            <div className="practice-pane-header">
              <strong>
                <Folder size={15} />
                檔案與目錄
              </strong>
              <small>{demonstrating ? "示範副本" : "虛擬工作區"}</small>
            </div>
            <div className="practice-directory">
              <button
                aria-label="上一層目錄"
                disabled={busy || directory === "/"}
                onClick={() =>
                  openDirectory(
                    directory.slice(0, directory.lastIndexOf("/")) || "/",
                  )
                }
              >
                <ChevronUp size={16} />
              </button>
              <code>{directory}</code>
            </div>
            <div className="practice-file-list">
              {children.map(({ name, folder }) => (
                <button
                  key={name}
                  disabled={busy || (!folder && (demonstrating || showExample))}
                  aria-current={path === name ? "true" : undefined}
                  onClick={() =>
                    folder ? openDirectory(name) : openFile(name)
                  }
                >
                  {folder ? <Folder size={17} /> : <FileCode size={17} />}
                  <span>
                    {name.slice(prefix.length)}
                    {folder ? "/" : ""}
                  </span>
                </button>
              ))}
              {!children.length && (
                <p className="practice-empty">這個目錄還沒有檔案。</p>
              )}
            </div>
            <small className="practice-footnote">
              沙箱教學指令與虛擬檔案系統，並非真正的 Linux 作業系統。
            </small>
          </section>
        ) : (
          <div className="studio-browser">
            <div className="studio-browserbar">
              <span className="window-dots">
                <i />
                <i />
                <i />
              </span>
              <span>網頁預覽</span>
              <span className="live-label">
                <i />
                {demonstrating || showExample ? "DEMO" : "LIVE"}
              </span>
            </div>
            <iframe title="實作網站預覽" sandbox="allow-scripts" srcDoc={src} />
          </div>
        )}
        <section
          className="studio-terminal"
          aria-label={shellAvailable ? "Terminal" : "程式碼工作區"}
        >
          <div className="studio-terminalbar">
            <span>
              {shellAvailable ? <Terminal size={16} /> : <Code2 size={16} />}{" "}
              {shellAvailable ? "Terminal" : "檔案編輯器"}{" "}
              <small>{demonstrating ? "示範副本" : "你的工作區"}</small>
            </span>
            <a
              aria-label="匯出作品"
              href={
                "/api/workspace/export?courseId=" + encodeURIComponent(courseId)
              }
            >
              <Download size={16} />
            </a>
          </div>
          {!shellAvailable && !demonstrating && !showExample && (
            <div className="practice-file-tabs" aria-label="工作區檔案">
              {Object.keys(workspace.files)
                .sort()
                .map((file) => (
                  <button
                    key={file}
                    disabled={busy}
                    aria-pressed={path === file}
                    onClick={() => openFile(file)}
                  >
                    {file.slice(1)}
                  </button>
                ))}
            </div>
          )}
          {demonstrating && guide ? (
            <div className="guided-terminal">
              <div className="terminal-demo-label">
                <span className="small-dot" />
                {syncedDemo ? "語音同步示範" : "文字示範"}
              </div>
              {shellAvailable && (
                <p className="demo-command">
                  <span>❯</span> edit {guide.path.slice(1)}
                  <span className="terminal-caret" />
                </p>
              )}
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
                    ? environment === "python"
                      ? "修改完成 → 執行 Python 觀察結果"
                      : "修改完成 → 觀察左側"
                    : `找到「${guide.find}」`}
                </span>
                {!syncedDemo && (
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
          ) : showExample && example ? (
            <div className="terminal-editor">
              <div className="terminal-file-label">
                {example.path}
                <span>唯讀範例 · 不會覆蓋你的檔案</span>
              </div>
              <pre className="prepared-example" aria-label="本頁程式碼範例">
                {example.example}
              </pre>
            </div>
          ) : path ? (
            <div className="terminal-editor">
              <div className="terminal-file-label">
                {path}
                <span>{dirty ? "尚未儲存" : "已儲存"}</span>
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
                    saveEditor();
                  }
                }}
              />
              <div className="terminal-editor-actions">
                <small>
                  {environment === "python"
                    ? "點選執行 Python 查看本次結果"
                    : environment === "web"
                      ? "左側即時預覽"
                      : "虛擬工作區檔案"}{" "}
                  · Ctrl + Enter 儲存
                </small>
                <button disabled={busy} onClick={saveEditor}>
                  {busy
                    ? "儲存中…"
                    : shellAvailable
                      ? "儲存並返回 Terminal"
                      : "儲存檔案"}
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          ) : shellAvailable ? (
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
                {suggestions.map((c) => (
                  <button key={c} disabled={busy} onClick={() => setCommand(c)}>
                    {c}
                  </button>
                ))}
              </div>
              <small className="terminal-disclaimer">
                沙箱教學指令 · help 查看支援指令 · 並非真正的 Linux 作業系統
              </small>
            </div>
          ) : (
            <p className="practice-empty">本節沒有可編輯的檔案。</p>
          )}
        </section>
        {environment === "web" && demonstrating && guide && (
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
