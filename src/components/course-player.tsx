"use client";
import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  MessageCircle,
  Code2,
  Network,
  LoaderCircle,
  ArrowLeft,
  Download,
  Maximize,
  Minimize,
  Volume2,
} from "lucide-react";
import type { Snapshot, Progress, BranchPreview } from "../core/state";
import { chapterEnvironment, type LearningNode } from "../core/protocol";
import { routeNodes } from "../core/graph";
import { pageIndex, pageTrack } from "../core/lesson-pages";
import { api } from "./api";
import { LessonSection } from "./lesson-section";
import { WorkspacePanel } from "./workspace-panel";
import { LearningMap } from "./learning-map";
import { HelpDrawer } from "./help-drawer";
import { AudioControls } from "./audio-controls";
import { SpeechSettings } from "./speech-settings";

export function CoursePlayer({
  course,
  onChange,
  onError,
  onHome,
  themeControl,
}: {
  course: Snapshot;
  onChange: (c: Snapshot) => void;
  onError: (e: string) => void;
  onHome: () => void;
  themeControl: React.ReactNode;
}) {
  const [map, setMap] = useState(false),
    [help, setHelp] = useState(false),
    [practice, setPractice] = useState(false),
    [review, setReview] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [reviewModes, setReviewModes] = useState<Record<string, boolean>>({}),
    [selection, setSelection] = useState({ nodeId: "", sectionId: "" }),
    [demonstrating, setDemonstrating] = useState(false),
    [audioPlaying, setAudioPlaying] = useState(false),
    [audioTime, setAudioTime] = useState(0);
  const [playbackRequest, setPlaybackRequest] = useState<{
    time: number;
    play: boolean;
    id: number;
    packageId: string;
    sectionId: string;
  }>();
  const shell = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const leaveWorkspace = useRef<(() => Promise<void>) | null>(null);
  const progressQueue = useRef<Promise<unknown>>(Promise.resolve());
  const current = useRef(course);
  current.current = course;
  const activeKey = useRef("");
  const leavingPage = useRef(false);
  const seenGuide = useRef("");
  const nodeId = review || course.currentNodeId,
    pkg = course.chapters[nodeId],
    chapter = pkg?.chapter;
  const node = course.graph?.nodes.find((n) => n.id === nodeId);
  const storedProgress: Progress = course.progress[nodeId] || {
    time: 0,
    sectionId: "",
    done: [],
    subtitleOnly: false,
    follow: false,
  };
  const progress =
    review && typeof reviewModes[nodeId] === "boolean"
      ? { ...storedProgress, subtitleOnly: reviewModes[nodeId] }
      : storedProgress;
  const index = chapter
    ? pageIndex(
        chapter,
        selection.nodeId === nodeId ? selection.sectionId : progress.sectionId,
      )
    : 0;
  const section = chapter?.sections[index],
    sectionId = section?.id || "";
  activeKey.current = `${pkg?.id}:${sectionId}`;
  const track = pkg ? pageTrack(pkg, sectionId) : null;
  const canEnter = Boolean(chapter && pkg.status === "ready");
  const environment = chapter
    ? chapterEnvironment(chapter)
    : node?.environment || (course.graph?.schemaVersion === 1 ? "web" : "none");
  const hasWorkspace = environment !== "none";
  const workspacePage =
    section &&
    (["terminal", "code.editor", "file.tree"].includes(
      section.component.type,
    ) ||
      section.template === "workspace");
  const workOpen = Boolean(
    canEnter && hasWorkspace && (practice || workspacePage),
  );
  const route = course.graph ? routeNodes(course.graph) : [];
  const allDone = Boolean(
    course.graph && course.completed.length === course.graph.nodes.length,
  );
  const lastPage = Boolean(chapter && index === chapter.sections.length - 1);
  const nextNodeId = course.graph?.edges.find(
    (edge) => edge.from === nodeId,
  )?.to;
  const nextNode = course.graph?.nodes.find((n) => n.id === nextNodeId);
  const pendingPractice = chapter?.sections.find(
    (s) => s.completion && !progress.done.includes(s.id),
  );

  useEffect(() => {
    leavingPage.current = false;
    setPractice(false);
    setDemonstrating(false);
    setAudioPlaying(false);
    setPlaybackRequest(undefined);
    seenGuide.current = "";
    setAudioTime(track?.start || 0);
    content.current?.scrollTo({ top: 0 });
  }, [pkg?.id, sectionId]);
  useEffect(() => {
    const changed = () =>
      setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (shell.current?.requestFullscreen)
        await shell.current.requestFullscreen();
      else onError("此瀏覽器不支援全螢幕，仍可在網頁內使用。 ");
    } catch {
      onError("無法進入全螢幕，請保留網頁模式或再試一次。");
    }
  }
  function pauseAudio() {
    shell.current?.querySelector("audio")?.pause();
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
  function persist(
    time: number,
    extra: Partial<Progress> = {},
    target = sectionId,
  ) {
    if (review) {
      // Review playback preferences are local; do not move the saved learning cursor.
      if (typeof extra.subtitleOnly === "boolean") {
        const subtitleOnly = extra.subtitleOnly;
        setReviewModes((modes) => ({ ...modes, [nodeId]: subtitleOnly }));
      }
      return Promise.resolve();
    }
    const update = {
      courseId: course.id,
      nodeId,
      time,
      sectionId: target,
      follow: false,
      ...extra,
    };
    const result = progressQueue.current
      .catch(() => {})
      .then(async () => {
        const saved = await api<Progress>("progress/events", update);
        const c = current.current;
        onChange({ ...c, progress: { ...c.progress, [nodeId]: saved } });
      });
    progressQueue.current = result;
    return result;
  }
  function saveAudio(time: number) {
    const key = `${pkg?.id}:${sectionId}`;
    if (leavingPage.current || activeKey.current !== key) return;
    void persist(time).catch((e) => onError((e as Error).message));
  }
  async function turnPage(target: number) {
    if (
      !chapter ||
      target < 0 ||
      target >= chapter.sections.length ||
      target === index ||
      busy ||
      map ||
      help
    )
      return;
    await action(async () => {
      // Native pause/timeupdate events arrive later. They must not enqueue an
      // outgoing-page save behind the explicit destination-page save.
      leavingPage.current = true;
      try {
        pauseAudio();
        await leaveWorkspace.current?.();
        const id = chapter.sections[target].id;
        const start = pageTrack(pkg!, id).start;
        await persist(start, {}, id);
        setSelection({ nodeId, sectionId: id });
        setPractice(false);
        setDemonstrating(false);
      } catch (error) {
        leavingPage.current = false;
        throw error;
      }
    });
  }
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        map ||
        help ||
        !canEnter
      )
        return;
      const target = event.target as HTMLElement;
      if (
        target.closest(
          "input, textarea, select, [contenteditable=true], [role=slider], dialog",
        )
      )
        return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        void turnPage(index + (event.key === "ArrowRight" ? 1 : -1));
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [index, busy, sectionId, map, help, canEnter]);
  function playback(time: number, play: boolean) {
    setAudioTime(time);
    setPlaybackRequest((r) => ({
      time,
      play,
      id: (r?.id || 0) + 1,
      packageId: pkg?.id || "",
      sectionId,
    }));
  }
  function narration(time: number) {
    setAudioTime(time);
    // Guided behavior stays on the selected page. It never turns a page.
    const a = shell.current?.querySelector("audio");
    if (section?.guide && a && !a.paused && seenGuide.current !== sectionId) {
      seenGuide.current = sectionId;
      setPractice(true);
      setDemonstrating(true);
    }
  }
  async function check(id: string, answer?: number) {
    if (review) return false;
    try {
      const result = await api<{ passed: boolean; progress: Progress }>(
        "progress/check",
        { courseId: course.id, sectionId: id, answer },
      );
      const c = current.current;
      onChange({
        ...c,
        progress: { ...c.progress, [nodeId]: result.progress },
      });
      return result.passed;
    } catch (e) {
      onError((e as Error).message);
      return false;
    }
  }
  async function preview(nodes: LearningNode[]) {
    await action(async () => {
      const p = await api<BranchPreview>("branches/preview", {
        courseId: course.id,
        nodes,
      });
      onChange({ ...current.current, preview: p });
      setHelp(false);
      setMap(true);
    });
  }
  async function home() {
    await action(async () => {
      pauseAudio();
      await leaveWorkspace.current?.();
      await progressQueue.current;
      if (document.fullscreenElement === shell.current)
        await document.exitFullscreen();
      onHome();
    });
  }
  async function rebuildSpeech() {
    if (!pkg || busy) throw new Error("請稍後再試。");
    leavingPage.current = true;
    setBusy(true);
    try {
      pauseAudio();
      await leaveWorkspace.current?.();
      await progressQueue.current;
      const next = await api<Snapshot>(`chapters/${pkg.id}/retry`, {
        courseId: course.id,
        nodeId,
        rebuildSpeech: true,
      });
      onChange(next);
    } finally {
      leavingPage.current = false;
      setBusy(false);
    }
  }
  const speechSettings = (
    <SpeechSettings
      pkg={pkg}
      disabled={!canEnter || busy}
      onOpen={pauseAudio}
      onRebuild={rebuildSpeech}
    />
  );
  const nextDisabled =
    busy ||
    Boolean(review) ||
    allDone ||
    Boolean(
      chapter?.sections.some(
        (s) => s.completion && !progress.done.includes(s.id),
      ),
    );

  const canvasTools = (
    <>
      <button
        className="mini-map"
        aria-label="開啟 Learning Map"
        onClick={() => {
          pauseAudio();
          setMap(true);
        }}
      >
        <Network size={17} />
        <span>Learning Map</span>
      </button>
      <button
        className="fullscreen-button"
        aria-label={fullscreen ? "離開全螢幕" : "進入全螢幕"}
        title={fullscreen ? "離開全螢幕" : "全螢幕"}
        onClick={() => void toggleFullscreen()}
      >
        {fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
      </button>
    </>
  );

  return (
    <div
      ref={shell}
      className={
        "course-shell paged-course " + (workOpen ? "with-workspace" : "")
      }
    >
      <header className="course-header">
        <button className="brand" disabled={busy} onClick={() => void home()}>
          Methelia
        </button>
        <div className="breadcrumb">
          <span>{course.graph?.title || "建立課程"}</span>
          <ChevronRight size={13} />
          <strong>{node?.title}</strong>
        </div>
        <div className="header-right">
          {course.mode === "demo" && (
            <span className="demo-badge">體驗課程</span>
          )}
          {themeControl}
          {!fullscreen && speechSettings}
          {hasWorkspace && (
            <button
              className="icon-button"
              aria-label="開啟實作區"
              disabled={!canEnter || busy}
              onClick={() => setPractice(true)}
            >
              <Code2 size={20} />
            </button>
          )}
          <button
            className="help-button"
            disabled={!canEnter}
            onClick={() => {
              pauseAudio();
              setHelp(true);
            }}
          >
            <MessageCircle size={16} /> 小問題
          </button>
        </div>
      </header>
      {course.status !== "ready" ? (
        <main className="preparation">
          {course.status !== "failed" && (
            <LoaderCircle className="spin" size={32} />
          )}
          <h1>
            {course.status === "failed" ? "課程生成失敗" : "正在規劃課程"}
          </h1>
          <p>{course.error || "先建立學習路徑，再準備章節內容。"}</p>
          {course.status === "failed" && (
            <button
              className="primary-button"
              disabled={busy}
              onClick={() =>
                void action(async () =>
                  onChange(
                    await api<Snapshot>(`courses/${course.id}/retry`, {}),
                  ),
                )
              }
            >
              重新生成
            </button>
          )}
          <button className="text-button" onClick={() => void home()}>
            <ArrowLeft size={14} /> 回首頁
          </button>
        </main>
      ) : course.scopeAccepted === false ? (
        <main
          className="preparation scope-confirmation"
          aria-labelledby="scope-heading"
        >
          <h1 id="scope-heading">確認這堂課的學習範圍</h1>
          <p>{course.graph?.scopeNote}</p>
          <p>
            <strong>完成後你能：</strong>
            {course.graph?.outcome}
          </p>
          <ol>
            {route.map((item) => (
              <li key={item.id}>
                {item.title}：{item.objective}
              </li>
            ))}
          </ol>
          <button
            className="primary-button"
            disabled={busy}
            onClick={() =>
              void action(async () =>
                onChange(
                  await api<Snapshot>(`courses/${course.id}/accept-scope`, {}),
                ),
              )
            }
          >
            確認範圍並開始
          </button>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void home()}
          >
            <ArrowLeft size={14} /> 回首頁調整目標
          </button>
        </main>
      ) : (
        <>
          <main className="lesson-canvas" aria-label="課程畫布">
            <div className="canvas-heading">
              <div>
                <span className="canvas-chapter">
                  {review
                    ? "複習"
                    : `第 ${route.findIndex((n) => n.id === nodeId) + 1} 章`}{" "}
                  · {node?.title}
                </span>
                <h1>{canEnter ? section?.title : node?.title}</h1>
              </div>
              {fullscreen && canEnter && (
                <div className="canvas-page-actions">
                  {speechSettings}
                  {hasWorkspace && (
                    <button
                      className="icon-button"
                      aria-label="開啟實作區"
                      disabled={!canEnter || busy}
                      onClick={() => setPractice(true)}
                    >
                      <Code2 size={19} />
                    </button>
                  )}
                  <button
                    className="icon-button"
                    aria-label="小問題"
                    onClick={() => {
                      pauseAudio();
                      setHelp(true);
                    }}
                  >
                    <MessageCircle size={19} />
                  </button>
                </div>
              )}
            </div>
            {!canEnter ? (
              <div className="chapter-gate">
                {pkg?.status !== "failed" && (
                  <LoaderCircle className="spin" size={28} />
                )}
                <h2>
                  {pkg?.status === "failed" ? "章節生成失敗" : "正在準備章節"}
                </h2>
                <p>{pkg?.error || "正在準備章節內容。"}</p>
                <div>
                  {pkg?.status === "failed" && (
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() =>
                        void action(async () =>
                          onChange(
                            await api<Snapshot>(`chapters/${pkg.id}/retry`, {
                              courseId: course.id,
                              nodeId,
                            }),
                          ),
                        )
                      }
                    >
                      重試章節
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div ref={content} className="canvas-content">
                {workOpen ? (
                  <div className="workspace-page" data-section={sectionId}>
                    <p className="workspace-instruction">{section?.body}</p>
                    <WorkspacePanel
                      key={`${pkg!.id}:${sectionId}`}
                      courseId={course.id}
                      chapter={chapter!}
                      activeSectionId={sectionId}
                      embedded={Boolean(workspacePage)}
                      cues={track!.cues}
                      audioTime={audioTime}
                      audioReady={Boolean(
                        track?.ready && !progress.subtitleOnly,
                      )}
                      audioPlaying={audioPlaying}
                      demonstrating={demonstrating}
                      onDemonstrating={setDemonstrating}
                      onPlayback={playback}
                      registerLeave={(save) => {
                        leaveWorkspace.current = save;
                      }}
                      workspace={course.workspace}
                      onChange={(workspace) =>
                        onChange({ ...current.current, workspace })
                      }
                      onClose={() => setPractice(false)}
                      onError={onError}
                    />
                    {section?.completion && (
                      <div className="canvas-check">
                        <button
                          className="primary-button"
                          disabled={
                            progress.done.includes(sectionId) ||
                            Boolean(review) ||
                            busy
                          }
                          onClick={() =>
                            void action(async () => {
                              await leaveWorkspace.current?.();
                              await check(sectionId);
                            })
                          }
                        >
                          {progress.done.includes(sectionId)
                            ? "練習完成"
                            : "驗證我的練習"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <LessonSection
                    schemaVersion={chapter!.schemaVersion}
                    key={`${pkg!.id}:${sectionId}`}
                    section={section!}
                    index={index}
                    hideHeading
                    done={progress.done.includes(sectionId)}
                    files={course.workspace.files}
                    onCheck={check}
                    onPractice={() => setPractice(true)}
                  />
                )}
                {lastPage && !review && !allDone && pendingPractice && (
                  <div
                    id="chapter-prerequisite"
                    className="chapter-prerequisite"
                    role="status"
                  >
                    {pendingPractice.id === sectionId ? (
                      "完成本頁練習後，就能進入下一章。"
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void turnPage(
                            chapter!.sections.findIndex(
                              (s) => s.id === pendingPractice.id,
                            ),
                          )
                        }
                      >
                        先完成「{pendingPractice.title}」{" "}
                        <ChevronLeft size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>
          <footer className="canvas-controls">
            {pkg ? (
              <>
                <AudioControls
                  key={`${pkg.id}:${sectionId}`}
                  pkg={pkg}
                  sectionId={sectionId}
                  progress={progress}
                  paused={map || help || busy}
                  playbackRequest={playbackRequest}
                  onTime={narration}
                  onSave={saveAudio}
                  onError={onError}
                  onPlayingChange={setAudioPlaying}
                  trailingControls={canvasTools}
                  statusControl={
                    !canEnter ? (
                      <span className="audio-preparation-status">
                        {pkg.status === "failed" ? "章節未就緒" : "章節準備中"}
                      </span>
                    ) : (
                      (pkg.speech !== "ready" || progress.subtitleOnly) && (
                        <button
                          className="speech-prepare"
                          disabled={
                            busy ||
                            ["pending", "generating"].includes(pkg.speech)
                          }
                          onClick={() =>
                            void action(async () => {
                              if (pkg.speech === "ready")
                                await persist(track?.start || 0, {
                                  subtitleOnly: false,
                                });
                              else
                                onChange(
                                  await api<Snapshot>(
                                    `chapters/${pkg.id}/retry`,
                                    {
                                      courseId: course.id,
                                      nodeId,
                                    },
                                  ),
                                );
                            })
                          }
                        >
                          <Volume2 size={16} />
                          {pkg.speech === "ready"
                            ? "啟用語音解說"
                            : ["failed", "not_requested"].includes(pkg.speech)
                              ? "準備章節語音"
                              : "語音準備中…"}
                        </button>
                      )
                    )
                  }
                />
                <nav className="lesson-navigation" aria-label="課程翻頁">
                  <div className="page-navigation-buttons">
                    <button
                      className="page-nav-button"
                      aria-label="上一頁"
                      disabled={!canEnter || busy || index === 0}
                      onClick={() => void turnPage(index - 1)}
                    >
                      <ChevronLeft size={17} /> <span>上一頁</span>
                    </button>
                    <span className="page-count" aria-label="頁碼">
                      {canEnter
                        ? `${index + 1} / ${chapter!.sections.length}`
                        : "— / —"}
                    </span>
                    {canEnter && lastPage ? (
                      review ? (
                        <button
                          className="page-nav-button page-nav-next"
                          aria-label="回到目前章節"
                          disabled={busy}
                          onClick={() =>
                            void action(async () => {
                              pauseAudio();
                              await leaveWorkspace.current?.();
                              await progressQueue.current;
                              setReview(null);
                            })
                          }
                        >
                          回到課程
                        </button>
                      ) : allDone ? (
                        Object.keys(course.workspace.files).length ? (
                          <a
                            className="page-nav-button page-nav-next"
                            href={`/api/workspace/export?courseId=${course.id}`}
                          >
                            <Download size={16} />
                            {chapterEnvironment(chapter!) === "web"
                              ? "匯出網站"
                              : "匯出作品"}
                          </a>
                        ) : (
                          <span className="page-nav-button">課程已完成</span>
                        )
                      ) : (
                        <button
                          className="page-nav-button page-nav-next"
                          disabled={nextDisabled}
                          aria-describedby={
                            pendingPractice ? "chapter-prerequisite" : undefined
                          }
                          aria-label={
                            nextNode ? `下一章：${nextNode.title}` : "完成課程"
                          }
                          title={
                            nextNode ? `下一章：${nextNode.title}` : "完成課程"
                          }
                          onClick={() =>
                            void action(async () => {
                              pauseAudio();
                              await leaveWorkspace.current?.();
                              await progressQueue.current;
                              onChange(
                                await api<Snapshot>(
                                  `courses/${course.id}/advance`,
                                  {},
                                ),
                              );
                            })
                          }
                        >
                          <span>{nextNode ? "下一章" : "完成課程"}</span>{" "}
                          <ChevronRight size={15} />
                        </button>
                      )
                    ) : (
                      <button
                        className="page-nav-button page-nav-next"
                        aria-label="下一頁"
                        disabled={!canEnter || busy}
                        onClick={() => void turnPage(index + 1)}
                      >
                        <span>下一頁</span> <ChevronRight size={17} />
                      </button>
                    )}
                  </div>
                </nav>
              </>
            ) : (
              <span className="canvas-status">章節準備中</span>
            )}
            {!pkg && <div className="canvas-tools">{canvasTools}</div>}
          </footer>
        </>
      )}
      {map && course.graph && (
        <LearningMap
          course={course}
          busy={busy}
          onClose={() => setMap(false)}
          onAdd={async (topic) => {
            const preview = await api<BranchPreview>("branches/preview", {
              courseId: course.id,
              topic,
              baseRevision: course.revision,
              afterId: course.currentNodeId,
            });
            onChange({ ...current.current, preview });
          }}
          onCancelPreview={async () => {
            onChange(
              await api<Snapshot>("branches/cancel", {
                courseId: course.id,
                previewId: course.preview!.id,
              }),
            );
          }}
          onReview={(id) =>
            void action(async () => {
              pauseAudio();
              await leaveWorkspace.current?.();
              await progressQueue.current;
              setReview(id);
              setPractice(false);
              setMap(false);
            })
          }
          onConfirm={async () => {
            const p = course.preview!;
            onChange(
              await api<Snapshot>("branches/confirm", {
                courseId: course.id,
                previewId: p.id,
                baseRevision: p.baseRevision,
              }),
            );
          }}
        />
      )}
      {help && (
        <HelpDrawer
          course={course}
          sectionId={sectionId}
          onClose={() => setHelp(false)}
          onMessages={(messages) => onChange({ ...current.current, messages })}
          onPreview={(nodes) => void preview(nodes)}
          onError={onError}
        />
      )}
    </div>
  );
}
