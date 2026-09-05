"use client";
import { useCourseLanguage } from "./course-language";
import { localizedError } from "../core/language";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Plus,
  Minus,
  Maximize,
  Check,
  ArrowRight,
  BookOpen,
  GitBranch,
  Clock3,
  LoaderCircle,
  PanelRightClose,
  Info,
} from "lucide-react";
import type { LearningDepth, Snapshot } from "../core/state";
import { addExtension, insertBranch, routeNodes } from "../core/graph";
import { mapPositions } from "./learning-map-layout";
import styles from "./learning-map.module.css";

// Same bounds as the help drawer, so both side panels behave alike.
const MIN_DETAIL = 320,
  MAX_DETAIL = 720,
  DEFAULT_DETAIL = 440,
  DETAIL_WIDTH_KEY = "methelia:map-detail-width";

type Point = { x: number; y: number };
type MapGesture = {
  pointerId: number;
  element: HTMLElement;
  start: Point;
  origin: Point;
  position: Point;
  scale: number;
  nodeId?: string;
  moved: boolean;
};

/** The map doubles as the screen a course opens on, before its first chapter
 *  has been entered. Editing the route is a mid-course affordance, so intro
 *  mode drops it and offers the two ways out of the screen instead. */
export type MapIntro = {
  onStart: () => void;
  onLater: () => void;
  themeControl?: React.ReactNode;
};

export function LearningMap({
  course,
  busy,
  intro,
  onClose,
  onConfirm,
  onAdd,
  onCancelPreview,
  onReview,
  onResume,
  onJump,
  onLeaveExtension,
  onEnterExtension,
  onSaveNote,
}: {
  course: Snapshot;
  busy: boolean;
  intro?: MapIntro;
  onClose: () => void;
  onConfirm: (enterNow?: boolean) => Promise<void>;
  onAdd: (
    topic: string,
    anchorId: string,
    depth: LearningDepth,
  ) => Promise<void>;
  onCancelPreview: () => Promise<void>;
  onReview: (id: string) => void;
  onResume?: () => void;
  onJump?: (nodeId: string) => Promise<void>;
  onLeaveExtension?: () => Promise<void>;
  onEnterExtension?: (extensionId: string) => Promise<void>;
  onSaveNote?: (
    nodeId: string,
    text: string,
    revision: number,
  ) => Promise<void>;
}) {
  const { t, language, english } = useCourseLanguage();
  const depthLabels = {
    foundation: t(
      "淺入門：能解釋基本概念",
      "Foundations: explain the basic concepts",
    ),
    applied: t(
      "能應用：能獨立完成任務",
      "Applied: complete tasks independently",
    ),
    advanced: t(
      "深入原理：能分析與比較方法",
      "Advanced: analyze and compare approaches",
    ),
  };
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const selectedElement = useRef<HTMLButtonElement>(null);
  const gesture = useRef<MapGesture | null>(null);
  const ignoreNodeClick = useRef(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailWidth, setDetailWidth] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(DETAIL_WIDTH_KEY));
      if (stored >= MIN_DETAIL && stored <= MAX_DETAIL) return stored;
    } catch {}
    return DEFAULT_DETAIL;
  });
  const draggingDetail = useRef(false);
  const [depth, setDepth] = useState<LearningDepth>("applied");
  const [anchorId, setAnchorId] = useState(course.currentNodeId);
  const [adding, setAdding] = useState(false),
    [topic, setTopic] = useState(""),
    [submitting, setSubmitting] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(course.currentNodeId),
    [scale, setScale] = useState(0.8),
    [offset, setOffset] = useState({ x: 60, y: 70 }),
    [positions, setPositions] = useState<
      Record<string, { x: number; y: number }>
    >({});
  const graph = useMemo(
    () =>
      course.preview
        ? course.preview.extension
          ? addExtension(
              course.graph!,
              course.preview.afterId,
              course.preview.nodes,
              course.preview.extension,
            )
          : insertBranch(
              course.graph!,
              course.preview.afterId,
              course.preview.nodes,
            )
        : course.graph!,
    [course.graph, course.preview],
  );
  const nodes = graph.nodes;
  const mainNodes = routeNodes(graph);
  const defaultPositions = useMemo(() => mapPositions(graph), [graph]);
  useEffect(() => {
    dialog.current?.showModal();
    const saved = localStorage.getItem("map-positions:" + course.id);
    if (saved) {
      try {
        setPositions(JSON.parse(saved));
      } catch {}
    }
    fit();
    return () => dialog.current?.close();
  }, []);
  const pos = (id: string) =>
    positions[id] || defaultPositions[id] || { x: 50, y: 190 };
  function beginGesture(e: React.PointerEvent<HTMLElement>, nodeId?: string) {
    if (e.button !== 0 || !e.isPrimary || gesture.current) return;
    if (!nodeId && e.target !== e.currentTarget) return;
    e.preventDefault();
    e.stopPropagation();
    ignoreNodeClick.current = false;
    const selection = window.getSelection();
    if (selection?.anchorNode && canvas.current?.contains(selection.anchorNode))
      selection.removeAllRanges();
    if (nodeId) {
      setSelected(nodeId);
      e.currentTarget.focus({ preventScroll: true });
    }
    const origin = nodeId ? pos(nodeId) : offset;
    gesture.current = {
      pointerId: e.pointerId,
      element: e.currentTarget,
      start: { x: e.clientX, y: e.clientY },
      origin,
      position: origin,
      scale,
      nodeId,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveGesture(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const dx = e.clientX - g.start.x,
      dy = e.clientY - g.start.y;
    if (!g.moved && Math.hypot(dx, dy) < 4) return;
    g.moved = true;
    const divisor = g.nodeId ? g.scale : 1;
    g.position = { x: g.origin.x + dx / divisor, y: g.origin.y + dy / divisor };
    if (g.nodeId) {
      const id = g.nodeId;
      const position = g.position;
      setPositions((previous) => ({ ...previous, [id]: position }));
    } else setOffset(g.position);
  }
  function endGesture(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gesture.current = null;
    ignoreNodeClick.current = Boolean(g.nodeId && g.moved);
    if (g.element.hasPointerCapture(g.pointerId))
      g.element.releasePointerCapture(g.pointerId);
    if (g.nodeId && g.moved) {
      localStorage.setItem(
        "map-positions:" + course.id,
        JSON.stringify({ ...positions, [g.nodeId]: g.position }),
      );
    }
  }
  const node = graph.nodes.find((n) => n.id === selected);
  useEffect(() => {
    if (!node) {
      setSelected(course.currentNodeId);
      setDetailsOpen(false);
    }
  }, [node, course.currentNodeId]);
  const showDetails = Boolean(
    node && detailsOpen && !adding && !course.preview,
  );
  useLayoutEffect(() => {
    const viewport = canvas.current;
    if (!showDetails || !viewport) return;
    function keepVisible() {
      if (gesture.current || window.innerWidth <= 800) return;
      const area = viewport!.getBoundingClientRect();
      const anchor = selectedElement.current?.getBoundingClientRect();
      if (!anchor) return;
      // Keep the selected node visible when opening or resizing the sidebar.
      const dx =
        anchor.right > area.right - 24
          ? area.right - 24 - anchor.right
          : anchor.left < area.left + 24
            ? area.left + 24 - anchor.left
            : 0;
      if (dx) setOffset((previous) => ({ ...previous, x: previous.x + dx }));
    }
    keepVisible();
    const observer = new ResizeObserver(keepVisible);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [showDetails, selected]);
  const anchorNode = graph.nodes.find((n) => n.id === anchorId);
  const canAdd = !intro && Boolean(node) && graph.nodes.length < 50;
  // Intro mode waits on the chapter behind 「開始學習」 so that pressing it
  // opens a lesson instead of the spinner this screen exists to replace.
  const firstChapter = course.chapters[course.currentNodeId];
  const introPending =
    Boolean(intro) &&
    firstChapter?.status !== "ready" &&
    firstChapter?.status !== "failed";
  // The checkpoint decides the wording: finished chapters are reviewed,
  // the one you are on is resumed, anything further ahead is a preview.
  // course.progress is seeded whenever a chapter is prepared, including
  // background prefetch, so it cannot stand in for "the learner was here".
  const nodeDone = Boolean(node && course.completed.includes(node.id));
  const isExtensionNode = Boolean(
    node &&
    graph.extensions?.some((extension) => extension.nodeIds.includes(node.id)),
  );
  const isCurrentNode = Boolean(node && node.id === course.currentNodeId);
  const isReturnNode = Boolean(
    node && course.extensionSession?.returnNodeId === node.id,
  );
  const chapterReady = Boolean(
    node && course.chapters[node.id]?.status === "ready",
  );
  function openAdd(id?: string) {
    // The canvas plus button names its own node; the toolbar falls back to the selection.
    setAnchorId(id ?? node?.id ?? course.currentNodeId);
    setSelected(id ?? selected);
    setAdding(true);
    setError("");
  }
  function closeAdd() {
    setAdding(false);
    setError("");
    requestAnimationFrame(() => addButton.current?.focus());
  }
  async function perform(work: () => Promise<void>) {
    if (submitting || busy) return;
    setSubmitting(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof Error
          ? localizedError(e, language)
          : t("操作失敗，請重試", "Action failed. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  }
  async function submitTopic() {
    if (!topic.trim()) return;
    await perform(async () => {
      await onAdd(topic.trim(), anchorId, depth);
      setAdding(false);
      setTopic("");
    });
  }
  const fit = () => {
    const points = nodes.map((n) => pos(n.id));
    const left = Math.min(...points.map((p) => p.x)),
      top = Math.min(...points.map((p) => p.y));
    const width = Math.max(...points.map((p) => p.x)) - left + 215;
    const height = Math.max(...points.map((p) => p.y)) - top + 140;
    const nextScale = Math.max(
      0.1,
      Math.min(
        1,
        ((canvas.current?.clientWidth ?? window.innerWidth) - 60) / width,
        ((canvas.current?.clientHeight ?? window.innerHeight) - 120) / height,
      ),
    );
    setScale(nextScale);
    setOffset({ x: 30 - left * nextScale, y: 40 - top * nextScale });
  };
  return (
    <dialog
      ref={dialog}
      className={
        "learning-map" +
        (showDetails ? " details-open" : "") +
        (intro ? " map-intro" : "")
      }
      // Canvas, add button and close button all offset from this one variable.
      style={
        { "--map-detail-width": `${detailWidth}px` } as React.CSSProperties
      }
      aria-label={t("Learning Map", "Learning map")}
      onCancel={(e) => {
        // Intro mode has no course behind it to escape back to.
        e.preventDefault();
        if (submitting || busy || intro) return;
        if (adding) closeAdd();
        else onClose();
      }}
    >
      <header className="map-header">
        <div className="map-title">
          <h2>{t("Learning Map", "Learning map")}</h2>
          <div className="map-title-meta">
            <span>{graph.title}</span>
            <details className={styles.legend}>
              <summary
                aria-label={t("地圖狀態說明", "Map status legend")}
                title={t("地圖狀態說明", "Map status legend")}
              >
                <Info size={18} />
              </summary>
              <div>
                <p>
                  <BookOpen size={14} />
                  {t("正在學習", "Learning now")}
                </p>
                <p>
                  <Check size={14} />
                  {t("已完成", "Completed")}
                </p>
                <p>
                  <GitBranch size={14} />
                  {t(
                    "補強／延伸支線（虛線）",
                    "Reinforcement / extension branches (dashed)",
                  )}
                </p>
              </div>
            </details>
          </div>
        </div>
        {intro ? (
          intro.themeControl
        ) : (
          <button
            className="close-map"
            onClick={onClose}
            disabled={submitting || busy}
          >
            {t("回到課程", "Return to course")}
            <X size={19} />
          </button>
        )}
      </header>
      <div
        ref={canvas}
        className="map-canvas"
        onPointerDown={(e) => beginGesture(e)}
        onPointerMove={moveGesture}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onLostPointerCapture={endGesture}
        onDragStart={(e) => e.preventDefault()}
        onWheel={(e) => {
          if (gesture.current) return;
          setScale((s) => Math.max(0.25, Math.min(1.5, s - e.deltaY * 0.001)));
        }}
      >
        <div
          className="map-world"
          style={{
            transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`,
          }}
        >
          <svg
            width={nodes.length * 350 + 500}
            height={Math.max(1100, 800 + (graph.extensions?.length ?? 0) * 200)}
            className="map-edges"
          >
            {[
              ...graph.edges.map((e) => ({ ...e, virtual: false })),
              ...(graph.extensions ?? []).map((e) => ({
                from: e.anchorId,
                to: e.nodeIds[0],
                virtual: true,
              })),
            ].map((e) => {
              const a = pos(e.from),
                b = pos(e.to);
              return (
                <path
                  key={e.from + e.to}
                  d={`M ${a.x + 215} ${a.y + 65} C ${a.x + 250} ${a.y + 65}, ${b.x - 35} ${b.y + 65}, ${b.x} ${b.y + 65}`}
                  className={
                    e.virtual ||
                    graph.nodes.find((n) => n.id === e.to)?.kind === "support"
                      ? "branch-edge"
                      : ""
                  }
                />
              );
            })}
          </svg>
          {nodes.map((n) => {
            const extension = graph.extensions?.find((e) =>
              e.nodeIds.includes(n.id),
            );
            const p = pos(n.id),
              current = n.id === course.currentNodeId,
              done = course.completed.includes(n.id),
              preview = course.preview?.nodes.some((x) => x.id === n.id);
            return (
              <div
                key={n.id}
                className="map-node-slot"
                style={{ left: p.x, top: p.y }}
              >
                <button
                  ref={selected === n.id ? selectedElement : undefined}
                  aria-expanded={selected === n.id && showDetails}
                  aria-controls={
                    selected === n.id && showDetails
                      ? "learning-node-detail"
                      : undefined
                  }
                  className={
                    "map-node " +
                    (current ? "current " : "") +
                    (done ? "complete " : "") +
                    (preview ? "proposed " : "") +
                    (selected === n.id ? "selected" : "")
                  }
                  onPointerDown={(e) => beginGesture(e, n.id)}
                  onClick={(e) => {
                    if (ignoreNodeClick.current && e.detail !== 0) {
                      ignoreNodeClick.current = false;
                      return;
                    }
                    setSelected(n.id);
                    setDetailsOpen(true);
                  }}
                >
                  <span className="node-top">
                    <span>
                      {n.kind === "support" ? (
                        <GitBranch size={17} />
                      ) : done ? (
                        <Check size={17} />
                      ) : (
                        <BookOpen size={17} />
                      )}
                    </span>
                    <small>
                      {preview
                        ? t("建議新增", "Suggested addition")
                        : current
                          ? t("正在學習", "Learning now")
                          : done
                            ? t("已完成", "Completed")
                            : extension
                              ? t("延伸單元", "Extension unit")
                              : t(
                                  `第 ${mainNodes.findIndex((x) => x.id === n.id) + 1} 章`,
                                  `Chapter ${mainNodes.findIndex((x) => x.id === n.id) + 1}`,
                                )}
                    </small>
                  </span>
                  <strong>{n.title}</strong>
                  <span className="node-meta">
                    <Clock3 size={12} />
                    {n.minutes}
                    {t("分鐘", "min")}
                    <span>
                      {extension
                        ? t("延伸", "Extension")
                        : n.kind === "support"
                          ? t("補強", "Reinforcement")
                          : t("主線課程", "Main course")}
                    </span>
                  </span>
                </button>
                {selected === n.id && !adding && !course.preview && !intro && (
                  <button
                    className="map-node-add"
                    aria-label={t(
                      `從「${n.title}」延伸新增單元`,
                      `Add an extension from ${n.title}`,
                    )}
                    title={
                      canAdd
                        ? t("從這裡延伸", "Extend from here")
                        : t("已達節點上限", "Node limit reached")
                    }
                    disabled={!canAdd || busy || submitting}
                    onClick={() => openAdd(n.id)}
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {node && showDetails && (
        <div
          className="node-detail-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label={t("調整側欄寬度", "Resize sidebar")}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            draggingDetail.current = true;
          }}
          onPointerMove={(event) => {
            if (!draggingDetail.current) return;
            setDetailWidth(
              Math.min(
                MAX_DETAIL,
                Math.max(MIN_DETAIL, window.innerWidth - event.clientX),
              ),
            );
          }}
          onPointerUp={(event) => {
            if (!draggingDetail.current) return;
            draggingDetail.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
            try {
              localStorage.setItem(DETAIL_WIDTH_KEY, String(detailWidth));
            } catch {}
          }}
          onPointerCancel={() => {
            draggingDetail.current = false;
          }}
        />
      )}
      {node && showDetails && (
        <aside
          id="learning-node-detail"
          className="node-detail"
          aria-labelledby="node-detail-title"
        >
          <h3 id="node-detail-title">{node.title}</h3>
          <p className="section-label">
            {t("預計學習內容", "Planned learning content")}
          </p>
          <p>{node.objective}</p>
          {node.summary && <p>{node.summary}</p>}
          {node.depth && <p>{depthLabels[node.depth]}</p>}
          {!!node.keyConcepts?.length && (
            <section className={styles.detailSection}>
              <h4>{t("核心概念", "Core concepts")}</h4>
              <ul>
                {node.keyConcepts.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </section>
          )}
          {!!node.misconceptions?.length && (
            <section className={styles.detailSection}>
              <h4>{t("容易混淆", "Common misconceptions")}</h4>
              <ul>
                {node.misconceptions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </section>
          )}
          {node.assessment && (
            <section className={styles.detailSection}>
              <h4>{t("驗證方式", "How to check your understanding")}</h4>
              <p>{node.assessment}</p>
            </section>
          )}
          <div className="node-detail-meta">
            <p>
              {t(
                `約 ${node.minutes} 分鐘 · ${node.prerequisites.length} 個先修節點`,
                `About ${node.minutes} min · ${node.prerequisites.length} prerequisites`,
              )}
            </p>
            {!!node.prerequisites.length && (
              <p>
                {t("先備：", "Prerequisites:")}
                {node.prerequisites
                  .map(
                    (id) => graph.nodes.find((n) => n.id === id)?.title ?? id,
                  )
                  .join("、")}
              </p>
            )}
          </div>
          {!intro && (
            <button
              className="pill-button quiet-pill"
              disabled={busy || submitting || !canAdd}
              onClick={() => openAdd(node.id)}
            >
              <Plus size={15} />
              {t("從這裡延伸", "Extend from here")}
            </button>
          )}
          {(graph.extensions ?? [])
            .filter(
              (e) => e.anchorId === node.id || e.nodeIds.includes(node.id),
            )
            .map((extension) => (
              <section className={styles.detailSection} key={extension.id}>
                <h4>{extension.title}</h4>
                <p>
                  {extension.nodeIds.every((id) =>
                    course.completed.includes(id),
                  )
                    ? t("已完成延伸", "Extension completed")
                    : t("可隨時進入或繼續", "Start or resume at any time")}
                </p>
                {onEnterExtension && !intro && (
                  <button
                    className="pill-button quiet-pill"
                    disabled={
                      busy ||
                      submitting ||
                      Boolean(course.extensionSession) ||
                      extension.nodeIds.every((id) =>
                        course.completed.includes(id),
                      )
                    }
                    onClick={() =>
                      void perform(() => onEnterExtension(extension.id))
                    }
                  >
                    {course.extensionSession?.extensionId === extension.id
                      ? t("正在這條支線", "Currently on this branch")
                      : t("進入延伸", "Enter extension")}
                    <ArrowRight size={14} />
                  </button>
                )}
              </section>
            ))}
          {error && <p role="alert">{error}</p>}
          <div className="node-detail-actions">
            {intro ? null : nodeDone ? (
              <button
                className="pill-button"
                disabled={busy || submitting}
                onClick={() => onReview(node.id)}
              >
                {t("複習這一章", "Review this chapter")}
                <ArrowRight size={15} />
              </button>
            ) : isCurrentNode ? (
              <button
                className="pill-button"
                disabled={busy || submitting || !onResume}
                onClick={() => onResume?.()}
              >
                {t("回到這一課", "Return to this lesson")}
                <ArrowRight size={15} />
              </button>
            ) : isReturnNode ? (
              <button
                className="pill-button"
                disabled={busy || submitting || !onLeaveExtension}
                onClick={() => void perform(() => onLeaveExtension!())}
              >
                {t("回到這一課", "Return to this lesson")}
                <ArrowRight size={15} />
              </button>
            ) : !isExtensionNode ? (
              <>
                <button
                  className="pill-button"
                  disabled={
                    busy ||
                    submitting ||
                    !onJump ||
                    Boolean(course.extensionSession)
                  }
                  onClick={() => void perform(() => onJump!(node.id))}
                >
                  {t("跳到這一章", "Jump to this chapter")}
                  <ArrowRight size={15} />
                </button>
                {chapterReady && (
                  <button
                    className="pill-button quiet-pill"
                    disabled={busy || submitting}
                    onClick={() => onReview(node.id)}
                  >
                    {t("先預習不跳過", "Preview without jumping")}
                  </button>
                )}
                <p className="quiet">
                  {t(
                    "跳過的章節不會標記完成，隨時可以回來補。",
                    "Skipped chapters stay unfinished; you can come back to them.",
                  )}
                </p>
              </>
            ) : null}
          </div>
        </aside>
      )}
      {/* Only lives inside the open panel; selecting a node brings it back. */}
      {showDetails && (
        <button
          className="map-detail-toggle"
          aria-label={t("收起節點資訊", "Collapse node details")}
          title={t("收起節點資訊", "Collapse node details")}
          aria-expanded
          aria-controls="learning-node-detail"
          disabled={busy || submitting}
          onClick={() => setDetailsOpen(false)}
        >
          <PanelRightClose size={20} />
        </button>
      )}
      <div className="map-toolbar">
        <button
          aria-label={t("縮小", "Zoom out")}
          onClick={() => setScale((s) => Math.max(0.25, s - 0.1))}
        >
          <Minus size={18} />
        </button>
        <span>{Math.round(scale * 100)}%</span>
        <button
          aria-label={t("放大", "Zoom in")}
          onClick={() => setScale((s) => Math.min(1.5, s + 0.1))}
        >
          <Plus size={18} />
        </button>
        <i />
        <button aria-label={t("顯示完整路徑", "Fit entire path")} onClick={fit}>
          <Maximize size={17} />
        </button>
      </div>
      {intro ? (
        <div className="map-intro-bar">
          <div className="map-intro-brief">
            {graph.outcome && (
              <p>
                <strong>
                  {t("完成後你能：", "After this course, you can:")}
                </strong>
                {graph.outcome}
              </p>
            )}
            {graph.scopeNote && <p className="quiet">{graph.scopeNote}</p>}
          </div>
          <div className="map-intro-actions">
            <button
              className="text-button"
              disabled={busy || submitting}
              onClick={intro.onLater}
            >
              {t("等等再學", "Learn later")}
            </button>
            <button
              className="primary-button"
              // A failed chapter still lets them through: the lesson offers the
              // retry, and refusing entry would strand them here.
              disabled={busy || submitting || introPending}
              onClick={intro.onStart}
            >
              {introPending && <LoaderCircle className="spin" size={15} />}
              {introPending
                ? t("正在準備第 1 章…", "Preparing chapter 1…")
                : t("開始學習", "Start learning")}
              {!introPending && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      ) : course.preview ? (
        <div className="branch-confirm">
          <div>
            <strong>
              {course.preview.extension?.title ?? t("節點預覽", "Node preview")}
            </strong>
            {course.preview.reason && <p>{course.preview.reason}</p>}
            <p>
              {t(
                `新增 ${course.preview.nodes.length} 個節點，學完後回到`,
                `Add ${course.preview.nodes.length} nodes, then return to`,
              )}{" "}
              “
              {
                graph.nodes.find(
                  (n) =>
                    n.id ===
                    (course.preview!.extension
                      ? (course.extensionSession?.returnNodeId ??
                        course.currentNodeId)
                      : course.preview!.rejoinId),
                )?.title
              }
              」。
            </p>
            {course.preview.extension && (
              <div className={styles.previewDetails}>
                <p>
                  {t("從", "From")} “
                  {
                    graph.nodes.find((n) => n.id === course.preview!.afterId)
                      ?.title
                  }
                  ” {t("延伸", "extension")} ·{" "}
                  {depthLabels[course.preview.extension.depth]}
                </p>
                {course.preview.nodes.map((n) => (
                  <p key={n.id}>
                    <strong>{n.title}</strong> · {n.minutes}
                    {t("分鐘", "min")}
                    <br />
                    {n.objective}
                    {n.prerequisites.length > 0 && (
                      <>
                        <br />
                        {t("先備：", "Prerequisites:")}
                        {n.prerequisites
                          .map(
                            (id) =>
                              graph.nodes.find((x) => x.id === id)?.title ?? id,
                          )
                          .join("、")}
                      </>
                    )}
                  </p>
                ))}
              </div>
            )}
            {error && (
              <p className="map-form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="map-form-actions">
            <button
              className="secondary-button"
              disabled={busy || submitting}
              onClick={() => void perform(onCancelPreview)}
            >
              {t("取消新增", "Cancel addition")}
            </button>
            <button
              className="primary-button"
              disabled={busy || submitting}
              onClick={() => void perform(() => onConfirm(false))}
            >
              {course.preview.extension
                ? t("保留稍後學習", "Save for later")
                : t("確認新增", "Confirm addition")}{" "}
              <Plus size={16} />
            </button>
            {course.preview.extension && (
              <button
                className="primary-button"
                disabled={
                  busy || submitting || Boolean(course.extensionSession)
                }
                onClick={() => void perform(() => onConfirm(true))}
              >
                {t("現在進入", "Enter now")}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      ) : adding ? (
        <form
          className="map-add-panel"
          aria-labelledby="add-node-title"
          onSubmit={(e) => {
            e.preventDefault();
            void submitTopic();
          }}
        >
          <h3 id="add-node-title">
            {t("新增延伸單元", "Add an extension unit")}
          </h3>
          <p>
            {t("從", "From")} “{anchorNode?.title}” {t("延伸", "extension")}
          </p>
          <label htmlFor="node-topic">{t("主題", "Topic")}</label>
          <div className="node-topic-field">
            <input
              id="node-topic"
              autoFocus
              value={topic}
              maxLength={120}
              required
              disabled={submitting || busy}
              placeholder={t("例如：HTML 表單", "For example: HTML forms")}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <label htmlFor="node-depth">
            {t("想理解到什麼程度？", "How deeply do you want to learn?")}
          </label>
          <select
            className={styles.depthSelect}
            id="node-depth"
            value={depth}
            disabled={submitting || busy}
            onChange={(e) => setDepth(e.target.value as LearningDepth)}
          >
            {Object.entries(depthLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
          {course.mode === "demo" && !course.featuredId && (
            <small>
              {t(
                "體驗模式的新增章節使用固定 HTML 範例。",
                "Additional demo chapters use a fixed HTML example.",
              )}
            </small>
          )}
          {error && (
            <p className="map-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="map-form-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={submitting || busy}
              onClick={closeAdd}
            >
              {t("取消", "Cancel")}
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={!topic.trim() || submitting || busy}
            >
              {submitting && <LoaderCircle className="spin" size={15} />}
              {t("預覽", "Preview")}
            </button>
          </div>
        </form>
      ) : (
        <button
          ref={addButton}
          className="map-add"
          disabled={busy || !canAdd}
          title={
            !canAdd
              ? t("已達節點上限", "Node limit reached")
              : t(
                  "從選取的節點建立延伸",
                  "Create an extension from the selected node",
                )
          }
          onClick={() => openAdd()}
        >
          <Plus size={17} />
          {t("新增節點", "Add node")}
        </button>
      )}
    </dialog>
  );
}
