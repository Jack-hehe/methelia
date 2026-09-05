"use client";
import { useCourseLanguage, CourseLanguageProvider } from "./course-language";
import { localizedError } from "../core/language";
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
    <CourseLanguageProvider language={props.course.language || "zh-TW"}>
      <PythonRuntimeProvider key={props.course.id} enabled={python}>
        <CoursePlayerContent {...props} />
      </PythonRuntimeProvider>
    </CourseLanguageProvider>
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
  const { t, language, english } = useCourseLanguage();
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
  // A planned course opens on its learning map, which takes the whole screen
  // instead of a lesson canvas; the lesson itself waits behind 開始學習.
  const intro = course.status === "ready" && course.scopeAccepted === false;
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
      else
        onError(
          t(
            "此瀏覽器不支援全螢幕，仍可在網頁內使用。 ",
            "This browser does not support full screen. You can continue in the page.",
          ),
        );
    } catch {
      onError(
        t(
          "無法進入全螢幕，請保留網頁模式或再試一次。",
          "Unable to enter full screen. Continue in the page or try again.",
        ),
      );
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
      onError(localizedError(e, language));
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
    ).catch((e) => onError(localizedError(e, language)));
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
      throw new Error(
        t(
          "正在切換頁面，請稍後再試。",
          "Switching pages. Please try again shortly.",
        ),
      );
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
      onError(localizedError(e, language));
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
        aria-label={t("開啟 Learning Map", "Open learning map")}
        onClick={() => {
          pauseAudio();
          setMap(true);
        }}
      >
        <Network size={17} />
        <span>{t("Learning Map", "Learning map")}</span>
      </button>
      <button
        className="fullscreen-button"
        aria-label={
          fullscreen
            ? t("離開全螢幕", "Exit full screen")
            : t("進入全螢幕", "Enter full screen")
        }
        title={
          fullscreen
            ? t("離開全螢幕", "Exit full screen")
            : t("全螢幕", "Full screen")
        }
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
          <span>{course.graph?.title || t("建立課程", "Create course")}</span>
          <ChevronRight size={13} />
          <strong>{node?.title}</strong>
        </div>
        <div className="header-right">
          {course.mode === "demo" && !course.featuredId && (
            <span className="demo-badge">{t("入門課程", "Starter course")}</span>
          )}
          {themeControl}
          <button
            className="icon-button"
            aria-label={t("小問題", "Ask a question")}
            title={t("小問題", "Ask a question")}
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
            {course.status === "failed"
              ? t("課程生成失敗", "Course generation failed")
              : t("正在規劃課程", "Planning your course")}
          </h1>
          <p>
            {(course.error ? localizedError(course.error, language) : "") ||
              t(
                "先建立學習路徑，再準備章節內容。",
                "Creating the learning path before preparing chapters.",
              )}
          </p>
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
              {t("重新生成", "Generate again")}
            </button>
          )}
          <button
            className="pill-button"
            style={{ width: "auto" }}
            disabled={busy}
            onClick={() => void home()}
          >
            <ArrowLeft size={14} />
            {t("回首頁", "Home")}
          </button>
        </main>
      ) : intro ? null : (
        <>
          <main
            className="lesson-canvas"
            aria-label={t("課程畫布", "Lesson canvas")}
          >
            <div className="canvas-heading">
              <div>
                <span className="canvas-chapter">
                  {review
                    ? t("複習", "Review")
                    : extension
                      ? t(
                          `延伸 ${extension.nodeIds.indexOf(nodeId) + 1} / ${extension.nodeIds.length}`,
                          `Extension ${extension.nodeIds.indexOf(nodeId) + 1} / ${extension.nodeIds.length}`,
                        )
                      : t(
                          `第 ${route.findIndex((n) => n.id === nodeId) + 1} 章`,
                          `Chapter ${route.findIndex((n) => n.id === nodeId) + 1}`,
                        )}{" "}
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
                    <ArrowLeft size={14} />{" "}
                    {t("暫停延伸，返回", "Pause extension and return to")} “
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
                    aria-label={t("小問題", "Ask a question")}
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
                  {pkg?.status === "failed"
                    ? t("章節生成失敗", "Chapter generation failed")
                    : t("正在準備章節", "Preparing chapter")}
                </h2>
                <p>
                  {(pkg?.error ? localizedError(pkg.error, language) : "") ||
                    t("正在準備章節內容。", "Preparing chapter content.")}
                </p>
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
                      {t("重試章節", "Retry chapter")}
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
                            ? t("練習完成", "Practice complete")
                            : t("驗證我的練習", "Check my practice")}
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
                    labContext={{courseId:course.id,nodeId,saved:course.labWork?.[nodeId]?.[sectionId]}}
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
                            <span>
                              {t(
                                "預期包含 / 目標狀態",
                                "Expected content / target state",
                              )}
                            </span>
                            <pre>{checkResult.feedback.expected}</pre>
                          </div>
                        )}
                        {checkResult.feedback.actual !== undefined && (
                          <div>
                            <span>
                              {t("本次檢查的內容", "Content checked")}
                            </span>
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
                      {t("下一章", "Next chapter")} “{nextNode?.title}”:
                      {adjustment.reverted
                        ? t("維持原安排", "Keep original plan")
                        : `${t("建議", "Suggested: ")}${{ foundation: t("先鞏固基礎", "reinforce the foundations first"), applied: t("增加應用練習", "add applied practice"), advanced: t("深入分析原理", "explore the underlying principles") }[adjustment.depth]}`}
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
                      {adjustment.reverted
                        ? t("採用建議安排", "Use suggested plan")
                        : t("維持原安排", "Keep original plan")}
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
                        t(
                          "完成本頁練習後，就能進入下一章。",
                          "Complete this page’s practice to continue to the next chapter.",
                        )
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
                          {t("先完成", "Complete first:")} “
                          {pendingPractice.title}” <ChevronLeft size={12} />
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
                        {pkg.status === "failed"
                          ? t("章節未就緒", "Chapter not ready")
                          : t("章節準備中", "Preparing chapter")}
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
                        {t("改用整章語音", "Use full chapter narration")}
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
                            ? t("啟用語音解說", "Enable narration")
                            : ["failed", "not_requested"].includes(pkg.speech)
                              ? t("準備章節語音", "Prepare chapter narration")
                              : t("語音準備中…", "Preparing narration…")}
                        </button>
                      )
                    )
                  }
                />
                <nav
                  className="lesson-navigation"
                  aria-label={t("課程翻頁", "Lesson navigation")}
                >
                  <div className="page-navigation-buttons">
                    <button
                      className="page-nav-button"
                      aria-label={t("上一頁", "Previous page")}
                      disabled={!canEnter || busy || index === 0}
                      onClick={() => void turnPage(index - 1)}
                    >
                      <ChevronLeft size={17} />{" "}
                      <span>{t("上一頁", "Previous page")}</span>
                    </button>
                    <span
                      className="page-count"
                      aria-label={t("頁碼", "Page number")}
                    >
                      {canEnter
                        ? `${index + 1} / ${chapter!.sections.length}`
                        : "— / —"}
                    </span>
                    {canEnter && lastPage ? (
                      review ? (
                        <button
                          className="page-nav-button page-nav-next"
                          aria-label={t(
                            "回到目前章節",
                            "Return to current chapter",
                          )}
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
                          {t("回到課程", "Return to course")}
                        </button>
                      ) : allDone && !course.extensionSession ? (
                        Object.keys(course.workspace.files).length ? (
                          <a
                            className="page-nav-button page-nav-next"
                            href={`/api/workspace/export?courseId=${course.id}`}
                          >
                            <Download size={16} />
                            {chapterEnvironment(chapter!) === "web"
                              ? t("匯出網站", "Export website")
                              : t("匯出作品", "Export project")}
                          </a>
                        ) : (
                          <span className="page-nav-button">
                            {t("課程已完成", "Course complete")}
                          </span>
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
                              ? t(
                                  `下一章：${nextNode.title}`,
                                  `Next chapter: ${nextNode.title}`,
                                )
                              : course.extensionSession
                                ? t(
                                    "完成延伸並返回主線",
                                    "Finish extension and return to main course",
                                  )
                                : t("完成課程", "Finish course")
                          }
                          title={
                            nextNode
                              ? t(
                                  `下一章：${nextNode.title}`,
                                  `Next chapter: ${nextNode.title}`,
                                )
                              : course.extensionSession
                                ? t(
                                    "完成延伸並返回主線",
                                    "Finish extension and return to main course",
                                  )
                                : t("完成課程", "Finish course")
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
                              ? t("下一章", "Next chapter")
                              : course.extensionSession
                                ? t(
                                    "完成延伸並返回",
                                    "Finish extension and return",
                                  )
                                : t("完成課程", "Finish course")}
                          </span>{" "}
                          <ChevronRight size={15} />
                        </button>
                      )
                    ) : (
                      <button
                        className="page-nav-button page-nav-next"
                        aria-label={t("下一頁", "Next page")}
                        disabled={!canEnter || busy}
                        onClick={() => void turnPage(index + 1)}
                      >
                        <span>{t("下一頁", "Next page")}</span>{" "}
                        <ChevronRight size={17} />
                      </button>
                    )}
                  </div>
                </nav>
              </>
            ) : (
              <span className="canvas-status">
                {t("章節準備中", "Preparing chapter")}
              </span>
            )}
            {!pkg && <div className="canvas-tools">{canvasTools}</div>}
          </footer>
        </>
      )}
      {(map || intro) && course.graph && (
        <LearningMap
          course={course}
          busy={busy}
          intro={
            intro
              ? {
                  themeControl,
                  onLater: () => void home(),
                  onStart: () =>
                    void action(async () =>
                      onChange(
                        await api<Snapshot>(
                          `courses/${course.id}/accept-scope`,
                          {},
                        ),
                      ),
                    ),
                }
              : undefined
          }
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
          onJump={async (id) => {
            // Same teardown as advancing: leave review, save drafts, then move.
            setAutoPlayTarget(undefined);
            setPlaybackRequest(undefined);
            pauseAudio();
            await leaveWorkspace.current?.();
            await progressQueue.current;
            onChange(
              await api<Snapshot>(`courses/${course.id}/jump`, { nodeId: id }),
            );
            setReview(null);
            setPractice(false);
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
                  error instanceof Error
                    ? localizedError(error, language)
                    : t("無法更新學習筆記", "Unable to update learning notes"),
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
