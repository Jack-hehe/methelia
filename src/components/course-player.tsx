"use client";
import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  MessageCircle,
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
import { nextLearningNode, routeNodes } from "../core/graph";
import { pageIndex, pageTrack, chapterSectionAt } from "../core/lesson-pages";
import { emptyWorkspace, type Workspace } from "../core/workspace";
import { api } from "./api";
import { LessonSection } from "./lesson-section";
import { WorkspacePanel } from "./workspace-panel";
import { LearningMap } from "./learning-map";
import { HelpDrawer } from "./help-drawer";
import { AudioControls } from "./audio-controls";
import type { CheckFeedback } from "../core/check-feedback";
import { usePlaybackChrome } from "./use-playback-chrome";
import chromeStyles from "./player-chrome.module.css";
import { PythonRuntimeProvider } from "./python-runtime-provider";

export function CoursePlayer(props: Parameters<typeof CoursePlayerContent>[0]) {
  const python = Boolean(
    props.course.graph?.nodes.some((n) => n.environment === "python") ||
    Object.values(props.course.chapters).some(
      (p) => p.chapter?.environment === "python",
    ),
  );
  return (
    <PythonRuntimeProvider key={props.course.id} enabled={python}>
      <CoursePlayerContent {...props} />
    </PythonRuntimeProvider>
  );
}

function CoursePlayerContent({
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
  const [reviewWorkspace, setReviewWorkspace] = useState<Workspace | null>(
    null,
  );
  const [autoPlayTarget, setAutoPlayTarget] = useState<{
    courseId: string;
    nodeId: string;
    sectionId?: string;
  }>();
  const playbackSequence = useRef(0);
  const shell = useRef<HTMLDivElement>(null);
  const [captionTarget, setCaptionTarget] = useState<HTMLDivElement | null>(
    null,
  );
  const evidencePanel = useRef<HTMLDivElement>(null);
  const [checkResult, setCheckResult] = useState<{
    key: string;
    feedback: CheckFeedback;
    passed: boolean;
  } | null>(null);
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
  const chapterAudio = pkg?.narrationMode === "chapter" && !pkg.pageAudio;
  const node = course.graph?.nodes.find((n) => n.id === nodeId);
  const displayedWorkspace = review
    ? (reviewWorkspace ?? emptyWorkspace())
    : course.workspace;
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
  const chromeHidden = usePlaybackChrome(
    shell,
    audioPlaying && !map && !help && !busy,
    `${pkg?.id}:${sectionId}`,
  );
  activeKey.current = `${pkg?.id}:${sectionId}`;
  useEffect(() => {
    if (checkResult?.key === activeKey.current)
      evidencePanel.current?.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
  }, [checkResult]);
  const track = pkg ? pageTrack(pkg, sectionId) : null;
  const canEnter = Boolean(chapter && pkg.status === "ready");
  const environment = chapter
    ? chapterEnvironment(chapter)
    : node?.environment || (course.graph?.schemaVersion === 1 ? "web" : "none");
  const hasWorkspace = environment !== "none";
  const workspacePage =
    section &&
    (Boolean(section.guide) ||
      ["terminal", "code.editor", "file.tree"].includes(
        section.component.type,
      ) ||
      section.template === "workspace");
  const workOpen = Boolean(
    canEnter && hasWorkspace && (practice || workspacePage),
  );
  const route = course.graph ? routeNodes(course.graph) : [];
  const allDone = Boolean(
    route.length && route.every((item) => course.completed.includes(item.id)),
  );
  const lastPage = Boolean(chapter && index === chapter.sections.length - 1);
  const extension = course.graph?.extensions?.find(
    (item) => item.id === course.extensionSession?.extensionId,
  );
  const nextNode = course.graph
    ? nextLearningNode(
        course.graph,
        nodeId,
        course.extensionSession?.extensionId,
      )
    : undefined;
  const adjustment =
    !review &&
    course.adjustments?.find(
      (item) =>
        item.fromNodeId === nodeId &&
        item.nodeId === nextNode?.id &&
        !course.chapterIds[item.nodeId],
    );
  const pendingPractice = chapter?.sections.find(
    (s) => s.completion && !progress.done.includes(s.id),
  );

  useEffect(() => {
    leavingPage.current = false;
    setPractice(false);
    setDemonstrating(false);
    seenGuide.current = "";
    setAudioTime(track?.start || 0);
    content.current?.scrollTo({ top: 0 });
  }, [pkg?.id, sectionId]);
  useEffect(() => {
    setPlaybackRequest(undefined);
    setAudioPlaying(false);
  }, [pkg?.id]);
  useEffect(() => {
    if (
      !autoPlayTarget ||
      autoPlayTarget.courseId !== course.id ||
      autoPlayTarget.nodeId !== nodeId ||
      !chapter ||
      !pkg ||
      busy ||
      map ||
      help
    )
      return;
    const id = autoPlayTarget.sectionId || chapter.sections[0].id;
    const targetTrack = pageTrack(pkg, id);
    if (!targetTrack.ready || progress.subtitleOnly) return;
    setSelection({ nodeId, sectionId: id });
    setPlaybackRequest({
      time: targetTrack.start,
      play: true,
      id: ++playbackSequence.current,
      packageId: pkg.id,
      sectionId: id,
    });
    setAutoPlayTarget(undefined);
  }, [
    autoPlayTarget,
    pkg,
    chapter,
    nodeId,
    course.id,
    busy,
    map,
    help,
    progress.subtitleOnly,
  ]);
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
    void persist(
      time,
      {},
      chapterAudio ? chapterSectionAt(pkg, time) : sectionId,
    ).catch((e) => onError((e as Error).message));
  }
  async function turnPage(target: number) {
    if (
      !chapter ||
      target < 0 ||
      target >= chapter.sections.length ||
      target === index ||
      busy ||
      leavingPage.current ||
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
        setAutoPlayTarget({ courseId: course.id, nodeId, sectionId: id });
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
      id: ++playbackSequence.current,
      packageId: pkg?.id || "",
      sectionId,
    }));
  }
  function narration(time: number) {
    setAudioTime(time);
    const a = shell.current?.querySelector("audio");
    if (section?.guide && a && !a.paused && seenGuide.current !== sectionId) {
      seenGuide.current = sectionId;
      setPractice(true);
      setDemonstrating(true);
    }
  }
  async function navigateAudio(time: number, _play = false, natural = false) {
    if (!pkg || !chapter || leavingPage.current)
      throw new Error("正在切換頁面，請稍後再試。");
    const target = chapterSectionAt(pkg, time);
    leavingPage.current = true;
    try {
      if (!natural) {
        pauseAudio();
        setAutoPlayTarget(undefined);
        setPlaybackRequest(undefined);
      }
      if (target !== sectionId) await leaveWorkspace.current?.();
      await persist(time, {}, target);
      setSelection({ nodeId, sectionId: target });
      setAudioTime(time);
      if (target !== sectionId) {
        setPractice(false);
        setDemonstrating(false);
      }
    } finally {
      leavingPage.current = false;
    }
  }
  async function check(id: string, answer?: number) {
    if (review) return false;
    try {
      const key = activeKey.current;
      const result = await api<{
        passed: boolean;
        progress: Progress;
        feedback: CheckFeedback;
        notes?: Snapshot["notes"];
        adjustments?: Snapshot["adjustments"];
      }>("progress/check", {
        courseId: course.id,
        nodeId,
        sectionId: id,
        answer,
      });
      setCheckResult({ key, feedback: result.feedback, passed: result.passed });
      const c = current.current;
      onChange({
        ...c,
        progress: { ...c.progress, [nodeId]: result.progress },
        notes: result.notes ?? c.notes,
        adjustments: result.adjustments ?? c.adjustments,
      });
      return result.passed;
    } catch (e) {
      onError((e as Error).message);
      return false;
    }
  }
  async function preview(nodes: LearningNode[]) {
    await action(async () => {
      const c = current.current;
      const p = await api<BranchPreview>("extensions/preview", {
        courseId: course.id,
        nodes,
        afterId: c.currentNodeId,
        baseRevision: c.revision,
        depth: "foundation",
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
  async function saveLearningPosition() {
    leavingPage.current = true;
    const time =
      shell.current?.querySelector("audio")?.currentTime ?? audioTime;
    pauseAudio();
    await leaveWorkspace.current?.();
    // The selected page is authoritative, including before speech has cues.
    // Mapping time zero through an ungenerated track would lose the saved page.
    if (canEnter) await persist(time, {}, sectionId);
    await progressQueue.current;
  }
  async function switchLearningRoute(
    work: () => Promise<Snapshot>,
    closeMap = true,
    autoPlay = false,
  ) {
    try {
      await saveLearningPosition();
      const saved = await work();
      const returningToMain = Boolean(
        course.extensionSession && !saved.extensionSession,
      );
      setAutoPlayTarget(
        autoPlay &&
          !returningToMain &&
          saved.currentNodeId !== course.currentNodeId
          ? { courseId: saved.id, nodeId: saved.currentNodeId }
          : undefined,
      );
      current.current = saved;
      onChange(saved);
      setReview(null);
      setSelection({ nodeId: "", sectionId: "" });
      setPractice(false);
      setCheckResult(null);
      if (closeMap) setMap(false);
    } finally {
      leavingPage.current = false;
    }
  }
  async function leaveExtension() {
    await action(() =>
      switchLearningRoute(() =>
        api<Snapshot>("extensions/leave", { courseId: course.id }),
      ),
    );
  }
  const nextDisabled =
    busy ||
    Boolean(review) ||
    (allDone && !course.extensionSession) ||
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
        `course-shell paged-course ${chromeStyles.shell} ${chromeHidden ? chromeStyles.hidden : ""} ` +
        (workOpen ? "with-workspace" : "")
      }
      data-controls-hidden={chromeHidden}
    >
      <div ref={setCaptionTarget} className={chromeStyles.captionLayer} />
      <header className="course-header" inert={chromeHidden}>
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
          <button
            className="icon-button"
            aria-label="小問題"
            title="小問題"
            disabled={!canEnter}
            onClick={() => {
              pauseAudio();
              setHelp(true);
            }}
          >
            <MessageCircle size={19} />
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
                    : extension
                      ? `延伸 ${extension.nodeIds.indexOf(nodeId) + 1} / ${extension.nodeIds.length}`
                      : `第 ${route.findIndex((n) => n.id === nodeId) + 1} 章`}{" "}
                  · {node?.title}
                </span>
                <h1>{canEnter ? section?.title : node?.title}</h1>
                {course.extensionSession && (
                  <button
                    className="text-button"
                    disabled={
                      busy ||
                      ["queued", "generating"].includes(pkg?.status ?? "")
                    }
                    onClick={() => void leaveExtension()}
                  >
                    <ArrowLeft size={14} /> 暫停延伸，返回「
                    {
                      course.graph?.nodes.find(
                        (n) => n.id === course.extensionSession?.returnNodeId,
                      )?.title
                    }
                    」
                  </button>
                )}
              </div>
              {fullscreen && canEnter && (
                <div className="canvas-page-actions">
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
                      key={`${pkg!.id}:${sectionId}:${review ? "review" : "learning"}`}
                      courseId={course.id}
                      localReview={Boolean(review)}
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
                      workspace={displayedWorkspace}
                      onChange={(workspace) => {
                        if (review) setReviewWorkspace(workspace);
                        else onChange({ ...current.current, workspace });
                      }}
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
                    files={displayedWorkspace.files}
                    onCheck={check}
                    onPractice={() => setPractice(true)}
                  />
                )}
                {checkResult?.key === activeKey.current &&
                  checkResult.feedback &&
                  !(
                    checkResult.passed &&
                    section?.component.type === "quiz.choice"
                  ) && (
                    <div
                      ref={evidencePanel}
                      className={
                        "check-evidence " +
                        (checkResult.passed ? "passed" : "needs-work")
                      }
                      role="status"
                    >
                      <strong>{checkResult.feedback.message}</strong>
                      <div className="check-evidence-columns">
                        {checkResult.feedback.expected !== undefined && (
                          <div>
                            <span>預期包含 / 目標狀態</span>
                            <pre>{checkResult.feedback.expected}</pre>
                          </div>
                        )}
                        {checkResult.feedback.actual !== undefined && (
                          <div>
                            <span>本次檢查的內容</span>
                            <pre>{checkResult.feedback.actual}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                {lastPage && adjustment && (
                  <div className="chapter-prerequisite" role="status">
                    <p>{adjustment.reason}</p>
                    <p>
                      下一章「{nextNode?.title}」：
                      {adjustment.reverted
                        ? "維持原安排"
                        : `建議${{ foundation: "先鞏固基礎", applied: "增加應用練習", advanced: "深入分析原理" }[adjustment.depth]}`}
                    </p>
                    <button
                      disabled={busy}
                      aria-pressed={Boolean(adjustment.reverted)}
                      onClick={() =>
                        void action(async () =>
                          onChange(
                            await api<Snapshot>(
                              `courses/${course.id}/difficulty`,
                              {
                                adjustmentId: adjustment.id,
                                keep: !adjustment.reverted,
                              },
                            ),
                          ),
                        )
                      }
                    >
                      {adjustment.reverted ? "採用建議安排" : "維持原安排"}
                    </button>
                  </div>
                )}
                {lastPage &&
                  !review &&
                  (!allDone || course.extensionSession) &&
                  pendingPractice && (
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
          <footer className="canvas-controls" inert={chromeHidden}>
            {pkg ? (
              <>
                <AudioControls
                  captionTarget={captionTarget}
                  key={chapterAudio ? pkg.id : `${pkg.id}:${sectionId}`}
                  pkg={pkg}
                  sectionId={sectionId}
                  progress={progress}
                  paused={map || help || busy}
                  playbackRequest={playbackRequest}
                  onTime={narration}
                  onNavigate={chapterAudio ? navigateAudio : undefined}
                  onSave={saveAudio}
                  onError={onError}
                  onPlayingChange={setAudioPlaying}
                  trailingControls={canvasTools}
                  statusControl={
                    !canEnter ? (
                      <span className="audio-preparation-status">
                        {pkg.status === "failed" ? "章節未就緒" : "章節準備中"}
                      </span>
                    ) : !chapterAudio &&
                      !review &&
                      !["pending", "generating"].includes(pkg.speech) ? (
                      <button
                        className="speech-prepare"
                        disabled={busy}
                        onClick={() =>
                          void action(async () => {
                            await saveLearningPosition();
                            try {
                              onChange(
                                await api<Snapshot>(
                                  `chapters/${pkg.id}/retry`,
                                  {
                                    courseId: course.id,
                                    nodeId,
                                    rebuildSpeech: true,
                                  },
                                ),
                              );
                            } finally {
                              leavingPage.current = false;
                            }
                          })
                        }
                      >
                        改用整章語音
                      </button>
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
                              setAutoPlayTarget(undefined);
                              setPlaybackRequest(undefined);
                            })
                          }
                        >
                          回到課程
                        </button>
                      ) : allDone && !course.extensionSession ? (
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
                            nextNode
                              ? `下一章：${nextNode.title}`
                              : course.extensionSession
                                ? "完成延伸並返回主線"
                                : "完成課程"
                          }
                          title={
                            nextNode
                              ? `下一章：${nextNode.title}`
                              : course.extensionSession
                                ? "完成延伸並返回主線"
                                : "完成課程"
                          }
                          onClick={() =>
                            void action(() =>
                              switchLearningRoute(
                                () =>
                                  api<Snapshot>(
                                    `courses/${course.id}/advance`,
                                    {
                                      nodeId,
                                    },
                                  ),
                                true,
                                true,
                              ),
                            )
                          }
                        >
                          <span>
                            {nextNode
                              ? "下一章"
                              : course.extensionSession
                                ? "完成延伸並返回"
                                : "完成課程"}
                          </span>{" "}
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
          onAdd={async (topic, afterId, depth) => {
            const preview = await api<BranchPreview>("extensions/preview", {
              courseId: course.id,
              topic,
              depth,
              baseRevision: current.current.revision,
              afterId,
            });
            onChange({ ...current.current, preview });
          }}
          onEnterExtension={async (extensionId) =>
            switchLearningRoute(() =>
              api<Snapshot>("extensions/enter", {
                courseId: course.id,
                extensionId,
              }),
            )
          }
          onSaveNote={async (nodeId, personal, baseRevision) => {
            const saved = await api<Snapshot>(
              `courses/${course.id}/notes/${nodeId}`,
              { personal, baseRevision },
              "PUT",
            );
            onChange({ ...current.current, notes: saved.notes });
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
              setAutoPlayTarget(undefined);
              setPlaybackRequest(undefined);
              pauseAudio();
              await leaveWorkspace.current?.();
              await progressQueue.current;
              const c = current.current;
              const reviewedExtension = c.graph?.extensions?.find((item) =>
                item.nodeIds.includes(id),
              );
              const activeExtension = c.extensionSession?.extensionId;
              const sourceWorkspace = reviewedExtension
                ? reviewedExtension.id === activeExtension
                  ? c.workspace
                  : (c.extensionWorkspaces?.[reviewedExtension.id] ??
                    emptyWorkspace())
                : c.extensionSession
                  ? c.extensionSession.mainWorkspace
                  : c.workspace;
              setReviewWorkspace(structuredClone(sourceWorkspace));
              setReview(id);
              setPractice(false);
              setMap(false);
            })
          }
          onLeaveExtension={async () => {
            await leaveExtension();
            setReview(null);
            setMap(false);
          }}
          onResume={() =>
            void action(async () => {
              // Leaving review mode, not entering it: progress saves again.
              setAutoPlayTarget(undefined);
              setPlaybackRequest(undefined);
              pauseAudio();
              await leaveWorkspace.current?.();
              await progressQueue.current;
              setReview(null);
              setPractice(false);
              setMap(false);
            })
          }
          onConfirm={async (enterNow = false) => {
            const p = course.preview!;
            const confirm = () =>
              api<Snapshot>(
                p.extension ? "extensions/confirm" : "branches/confirm",
                {
                  courseId: course.id,
                  previewId: p.id,
                  baseRevision: p.baseRevision,
                  ...(p.extension ? { enterNow } : {}),
                },
              );
            if (p.extension && enterNow) await switchLearningRoute(confirm);
            else onChange(await confirm());
          }}
        />
      )}
      {help && (
        <HelpDrawer
          course={course}
          sectionId={sectionId}
          onClose={() => setHelp(false)}
          onMessages={(messages) => {
            onChange({ ...current.current, messages });
            void api<Snapshot>(`courses/${course.id}`)
              .then((saved) =>
                onChange({ ...current.current, notes: saved.notes }),
              )
              .catch((error) =>
                onError(
                  error instanceof Error ? error.message : "無法更新學習筆記",
                ),
              );
          }}
          onPreview={(nodes) => void preview(nodes)}
          onError={onError}
        />
      )}
    </div>
  );
}
