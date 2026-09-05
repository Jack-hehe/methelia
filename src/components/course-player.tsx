"use client";
import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  MessageCircle,
  Code2,
  Network,
  ArrowUpRight,
  Sparkles,
  LoaderCircle,
  ArrowLeft,
  Check,
  Download,
  Focus,
} from "lucide-react";
import type { Snapshot, Progress, BranchPreview } from "../core/state";
import type { LearningNode } from "../core/protocol";
import { routeNodes } from "../core/graph";
import { api } from "./api";
import { LessonSection } from "./lesson-section";
import { WorkspacePanel } from "./workspace-panel";
import { LearningMap } from "./learning-map";
import { HelpDrawer } from "./help-drawer";
import { AudioControls } from "./audio-controls";
export function CoursePlayer({
  course,
  onChange,
  onError,
  onHome,
}: {
  course: Snapshot;
  onChange: (c: Snapshot) => void;
  onError: (e: string) => void;
  onHome: () => void;
}) {
  const [map, setMap] = useState(false),
    [help, setHelp] = useState(false),
    [practice, setPractice] = useState(false),
    [review, setReview] = useState<string | null>(null),
    [activeSection, setActiveSection] = useState(""),
    [follow, setFollow] = useState(true),
    [busy, setBusy] = useState(false);
  const [demonstrating, setDemonstrating] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [playbackRequest, setPlaybackRequest] = useState<{
    time: number;
    play: boolean;
    id: number;
    packageId: string;
  }>();
  const leaveWorkspace = useRef<(() => Promise<void>) | null>(null);
  const seenGuide = useRef("");
  function playback(time: number, play: boolean) {
    setAudioTime(time);
    setPlaybackRequest((r) => ({
      time,
      play,
      id: (r?.id || 0) + 1,
      packageId: pkg?.id || "",
    }));
  }
  const current = useRef(course);
  current.current = course;
  const nodeId = review || course.currentNodeId,
    pkg = course.chapters[nodeId],
    node = course.graph?.nodes.find((n) => n.id === nodeId);
  const progress = course.progress[nodeId] || {
    time: 0,
    sectionId: "",
    done: [],
    subtitleOnly: false,
    follow: true,
  };
  const chapter = pkg?.chapter;
  const canEnter = Boolean(
    chapter && (pkg.speech === "ready" || progress.subtitleOnly),
  );
  const route = course.graph ? routeNodes(course.graph) : [];
  const allDone =
    course.graph && course.completed.length === course.graph.nodes.length;
  useEffect(() => {
    setFollow(progress.follow);
    setActiveSection(progress.sectionId);
    window.scrollTo(0, 0);
    setPractice(false);
    setDemonstrating(false);
    setAudioTime(progress.time);
    setPlaybackRequest(undefined);
    seenGuide.current = "";
  }, [nodeId]);
  useEffect(() => {
    const manual = () => setFollow(false);
    window.addEventListener("wheel", manual, { passive: true });
    window.addEventListener("touchmove", manual, { passive: true });
    return () => {
      window.removeEventListener("wheel", manual);
      window.removeEventListener("touchmove", manual);
    };
  }, []);
  useEffect(() => {
    if (!canEnter || !chapter) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setActiveSection(entry.target.getAttribute("data-section") || "");
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    document
      .querySelectorAll("[data-section]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [canEnter, nodeId]);
  useEffect(() => {
    if (!canEnter) return;
    const id = progress.sectionId;
    if (id)
      requestAnimationFrame(() =>
        document
          .getElementById("section-" + id)
          ?.scrollIntoView({ block: "start" }),
      );
  }, [canEnter, nodeId]);
  async function persist(time: number, extra: Partial<Progress> = {}) {
    try {
      const result = await api<Progress>("progress/events", {
        courseId: course.id,
        nodeId,
        time,
        sectionId: activeSection,
        follow,
        ...extra,
      });
      const c = current.current;
      onChange({ ...c, progress: { ...c.progress, [nodeId]: result } });
    } catch (e) {
      onError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!canEnter) return;
    const timer = setTimeout(
      () => void persist(current.current.progress[nodeId]?.time || 0),
      1200,
    );
    return () => clearTimeout(timer);
  }, [activeSection, follow]);
  async function action(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
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
  function narration(time: number) {
    setAudioTime(time);
    const cue = pkg?.cues.find((c) => time >= c.start && time < c.end);
    if (
      follow &&
      cue &&
      chapter?.sections.find((s) => s.id === cue.sectionId)?.guide &&
      seenGuide.current !== cue.sectionId
    ) {
      seenGuide.current = cue.sectionId;
      setPractice(true);
      setDemonstrating(true);
    }
    if (cue && follow && cue.sectionId !== activeSection) {
      setActiveSection(cue.sectionId);
      document.getElementById("section-" + cue.sectionId)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
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
  return (
    <div className={"course-shell " + (practice ? "with-workspace" : "")}>
      <header className="course-header">
        <button
          className="brand"
          disabled={busy}
          onClick={() =>
            void action(async () => {
              await leaveWorkspace.current?.();
              onHome();
            })
          }
        >
          Methelia
        </button>
        <div className="breadcrumb">
          <span>{course.graph?.title || "正在規劃你的課程"}</span>
          <ChevronRight size={13} />
          <strong>{node?.title || "建立學習路徑"}</strong>
        </div>
        <div className="header-right">
          {course.mode === "demo" && (
            <span className="demo-badge">體驗課程</span>
          )}
          <button
            className="icon-button"
            aria-label="開啟實作區"
            disabled={!canEnter}
            onClick={() => {
              setFollow(false);
              setPractice(true);
            }}
          >
            <Code2 size={20} />
          </button>
          <button
            className="help-button"
            disabled={!canEnter}
            onClick={() => setHelp(true)}
          >
            <MessageCircle size={16} /> 小問題
          </button>
        </div>
      </header>
      <div className="course-progress">
        <span
          style={{
            width: `${course.graph ? (course.completed.length / course.graph.nodes.length) * 100 : 0}%`,
          }}
        />
      </div>
      {course.status !== "ready" ? (
        <main className="preparation">
          <div className="preparation-orbit">
            {course.status === "failed" ? (
              <Sparkles size={35} />
            ) : (
              <LoaderCircle className="spin" size={35} />
            )}
          </div>
          <span className="eyebrow">YOUR PATH IS TAKING SHAPE</span>
          <h1>
            {course.status === "failed"
              ? "還差一步，重新試試"
              : "正在把好奇心，變成學習路徑"}
          </h1>
          <p>
            {course.error ||
              "先規劃完整 Course Graph，再為你準備第一個互動章節。"}
          </p>
          <span className="goal-quote">「{course.goal}」</span>
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
          <button className="text-button" onClick={onHome}>
            <ArrowLeft size={14} /> 回到學習首頁
          </button>
        </main>
      ) : (
        <>
          <main className="lesson-main">
            <div className="lesson-heading">
              <div className="lesson-topline">
                <span className="eyebrow">
                  {review
                    ? "REVISIT & REFLECT"
                    : node?.kind === "support"
                      ? "A LITTLE EXTRA UNDERSTANDING"
                      : `CHAPTER ${String(route.findIndex((n) => n.id === nodeId) + 1).padStart(2, "0")} / YOUR FIRST WEBSITE`}
                </span>
                <span className="reading-time">約 {node?.minutes} 分鐘</span>
              </div>
              <h1>{node?.title}</h1>
              <p>{node?.objective}</p>
              <div className="narrator-row">
                <div className="avatar">
                  m<span>✦</span>
                </div>
                <div>
                  <strong>和 Methelia 一起，慢慢弄懂。</strong>
                  <span>
                    {review
                      ? "複習模式 · 保留主線進度"
                      : course.mode === "demo"
                        ? "示範課程 · 完整互動體驗"
                        : "為你的目標生成的互動章節"}
                  </span>
                </div>
                {canEnter &&
                  pkg &&
                  (pkg.speech === "failed" || progress.subtitleOnly) && (
                    <button
                      className="text-button"
                      disabled={
                        busy || ["pending", "generating"].includes(pkg.speech)
                      }
                      onClick={() => {
                        if (pkg.speech === "ready")
                          void persist(progress.time, { subtitleOnly: false });
                        else
                          void action(async () =>
                            onChange(
                              await api<Snapshot>(`chapters/${pkg.id}/retry`, {
                                courseId: course.id,
                                nodeId,
                              }),
                            ),
                          );
                      }}
                    >
                      {pkg.speech === "ready"
                        ? "啟用語音解說"
                        : pkg.speech === "failed"
                          ? "準備章節語音"
                          : "語音準備中…"}
                    </button>
                  )}
                {canEnter && (
                  <button
                    className={
                      follow ? "follow-button following" : "follow-button"
                    }
                    onClick={() => {
                      setFollow(true);
                      narration(progress.time);
                    }}
                  >
                    <Focus size={14} /> 跟隨解說
                  </button>
                )}
              </div>
            </div>
            {!canEnter ? (
              <div className="chapter-gate">
                <div className="gate-icon">
                  {pkg?.status === "failed" || pkg?.speech === "failed" ? (
                    <Sparkles size={28} />
                  ) : (
                    <LoaderCircle className="spin" size={28} />
                  )}
                </div>
                <h2>
                  {pkg?.status === "failed"
                    ? "這一章需要重新準備"
                    : pkg?.speech === "failed"
                      ? "完整章節已就緒"
                      : "正在準備這一小章"}
                </h2>
                <p>
                  {pkg?.error ||
                    "正在一次準備好解說、互動與語音，完成後就能流暢地開始。"}
                </p>
                <div>
                  {pkg?.status === "ready" && pkg.speech === "failed" && (
                    <button
                      className="primary-button"
                      onClick={() => void persist(0, { subtitleOnly: true })}
                    >
                      使用完整文字模式 <ArrowRightIcon />
                    </button>
                  )}
                  {(pkg?.status === "failed" || pkg?.speech === "failed") && (
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
                      重試{pkg?.status === "ready" ? "語音" : "章節"}
                    </button>
                  )}
                </div>
                <small>章節內容準備完成後才開始，學習途中不插入新內容。</small>
              </div>
            ) : (
              <div className="lesson-document">
                {chapter!.sections.map((section, i) => (
                  <LessonSection
                    key={nodeId + section.id}
                    section={section}
                    index={i}
                    done={progress.done.includes(section.id)}
                    files={course.workspace.files}
                    onCheck={check}
                    onPractice={() => setPractice(true)}
                  />
                ))}
                <div className="chapter-end">
                  <span>✳</span>
                  <h2>
                    {allDone
                      ? "你的第一個網站，準備好了。"
                      : "每理解一點，都離目標更近。"}
                  </h2>
                  <p>
                    {allDone
                      ? "把檔案帶走，繼續做出屬於你的作品。"
                      : "完成本章練習，再走向學習路徑的下一步。"}
                  </p>
                  {allDone && (
                    <a
                      className="primary-button"
                      href={"/api/workspace/export?courseId=" + course.id}
                    >
                      <Download size={16} /> 匯出我的網站
                    </a>
                  )}
                  {review && (
                    <button
                      className="primary-button"
                      onClick={() => setReview(null)}
                    >
                      回到目前章節
                    </button>
                  )}
                </div>
              </div>
            )}
          </main>
          <button
            className="mini-map"
            aria-label="開啟 Learning Map"
            onClick={() => setMap(true)}
          >
            <div>
              <Network size={15} />
              <strong>Learning Map</strong>
              <ArrowUpRight size={14} />
            </div>
            <div className="mini-map-route">
              {route.slice(0, 7).map((n, i) => (
                <span
                  key={n.id}
                  className={
                    (n.id === course.currentNodeId ? "current " : "") +
                    (course.completed.includes(n.id) ? "done" : "")
                  }
                >
                  {course.completed.includes(n.id) ? (
                    <Check size={10} />
                  ) : (
                    i + 1
                  )}
                </span>
              ))}
            </div>
            <small>
              {course.completed.length} / {route.length} 已完成 · 看看我在哪裡
            </small>
          </button>
          {practice && canEnter && (
            <WorkspacePanel
              key={"workspace-" + pkg!.id}
              courseId={course.id}
              chapter={chapter!}
              cues={pkg!.cues}
              audioTime={audioTime}
              audioReady={pkg!.speech === "ready" && !progress.subtitleOnly}
              demonstrating={demonstrating}
              onDemonstrating={(value) => {
                setDemonstrating(value);
                if (!value) setFollow(false);
              }}
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
          )}
          {canEnter && pkg && (
            <AudioControls
              key={pkg.id}
              pkg={pkg}
              progress={progress}
              paused={map || help || Boolean(review)}
              playbackRequest={playbackRequest}
              onTime={narration}
              onSave={(time) => void persist(time)}
              onNext={() =>
                void action(async () => {
                  setReview(null);
                  onChange(
                    await api<Snapshot>(`courses/${course.id}/advance`, {}),
                  );
                })
              }
              nextDisabled={
                busy ||
                practice ||
                Boolean(review) ||
                Boolean(allDone) ||
                chapter!.sections.some(
                  (s) => s.completion && !progress.done.includes(s.id),
                )
              }
              onError={onError}
            />
          )}
        </>
      )}
      {map && course.graph && (
        <LearningMap
          course={course}
          onClose={() => setMap(false)}
          onAdd={() => {
            setMap(false);
            setHelp(true);
          }}
          onReview={(id) => {
            void action(async () => {
              await leaveWorkspace.current?.();
              setReview(id);
              setMap(false);
            });
          }}
          onConfirm={() =>
            void action(async () => {
              const p = course.preview!;
              onChange(
                await api<Snapshot>("branches/confirm", {
                  courseId: course.id,
                  previewId: p.id,
                  baseRevision: p.baseRevision,
                }),
              );
            })
          }
        />
      )}
      {help && (
        <HelpDrawer
          course={course}
          sectionId={activeSection}
          onClose={() => setHelp(false)}
          onMessages={(messages) => onChange({ ...current.current, messages })}
          onPreview={(nodes) => void preview(nodes)}
          onError={onError}
        />
      )}
    </div>
  );
}
function ArrowRightIcon() {
  return <ArrowUpRight size={16} />;
}
