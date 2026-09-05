"use client";
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
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import type { Snapshot } from "../core/state";
import { insertBranch, routeNodes } from "../core/graph";

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

export function LearningMap({
  course,
  busy,
  onClose,
  onConfirm,
  onAdd,
  onCancelPreview,
  onReview,
}: {
  course: Snapshot;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onAdd: (topic: string) => Promise<void>;
  onCancelPreview: () => Promise<void>;
  onReview: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const selectedElement = useRef<HTMLButtonElement>(null);
  const gesture = useRef<MapGesture | null>(null);
  const ignoreNodeClick = useRef(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
        ? insertBranch(
            course.graph!,
            course.preview.afterId,
            course.preview.nodes,
          )
        : course.graph!,
    [course.graph, course.preview],
  );
  const nodes = routeNodes(graph);
  useEffect(() => {
    dialog.current?.showModal();
    const saved = localStorage.getItem("map-positions:" + course.id);
    if (saved) {
      try {
        setPositions(JSON.parse(saved));
      } catch {}
    }
    setScale(Math.min(1, (window.innerWidth - 120) / (nodes.length * 265)));
    return () => dialog.current?.close();
  }, []);
  const pos = (id: string) =>
    positions[id] || {
      x: nodes.findIndex((n) => n.id === id) * 265 + 50,
      y: graph.nodes.find((n) => n.id === id)?.kind === "support" ? 360 : 190,
    };
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
  const currentNode = graph.nodes.find((n) => n.id === course.currentNodeId);
  const canAdd =
    Boolean(graph.edges.some((e) => e.from === course.currentNodeId)) &&
    graph.nodes.length < 50;
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
      setError(e instanceof Error ? e.message : "操作失敗，請重試");
    } finally {
      setSubmitting(false);
    }
  }
  async function submitTopic() {
    if (!topic.trim()) return;
    await perform(async () => {
      await onAdd(topic.trim());
      setAdding(false);
      setTopic("");
    });
  }
  const fit = () => {
    setOffset({ x: 30, y: 40 });
    setScale(
      Math.min(
        1,
        ((canvas.current?.clientWidth ?? window.innerWidth) - 100) /
          (nodes.length * 265),
      ),
    );
  };
  return (
    <dialog
      ref={dialog}
      className={"learning-map" + (showDetails ? " details-open" : "")}
      aria-label="Learning Map"
      onCancel={(e) => {
        e.preventDefault();
        if (submitting || busy) return;
        if (adding) closeAdd();
        else onClose();
      }}
    >
      <header className="map-header">
        <div>
          <h2>Learning Map</h2>
        </div>
        <button
          className="close-map"
          onClick={onClose}
          disabled={submitting || busy}
        >
          回到課程 <X size={19} />
        </button>
      </header>
      <div className="map-subheader">
        <span>{graph.title}</span>
        <span>
          <i className="legend current" /> 正在學習{" "}
          <i className="legend complete" /> 已完成{" "}
          <i className="legend support" /> 補強路徑
        </span>
      </div>
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
            height="1100"
            className="map-edges"
          >
            {graph.edges.map((e) => {
              const a = pos(e.from),
                b = pos(e.to);
              return (
                <path
                  key={e.from + e.to}
                  d={`M ${a.x + 215} ${a.y + 65} C ${a.x + 250} ${a.y + 65}, ${b.x - 35} ${b.y + 65}, ${b.x} ${b.y + 65}`}
                  className={
                    graph.nodes.find((n) => n.id === e.to)?.kind === "support"
                      ? "branch-edge"
                      : ""
                  }
                />
              );
            })}
          </svg>
          {nodes.map((n, i) => {
            const p = pos(n.id),
              current = n.id === course.currentNodeId,
              done = course.completed.includes(n.id),
              preview = course.preview?.nodes.some((x) => x.id === n.id);
            return (
              <button
                key={n.id}
                ref={selected === n.id ? selectedElement : undefined}
                aria-expanded={selected === n.id && showDetails}
                aria-controls={
                  selected === n.id && showDetails
                    ? "learning-node-detail"
                    : undefined
                }
                style={{ left: p.x, top: p.y }}
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
                      ? "建議新增"
                      : current
                        ? "正在學習"
                        : done
                          ? "已完成"
                          : `第 ${i + 1} 章`}
                  </small>
                </span>
                <strong>{n.title}</strong>
                <span className="node-meta">
                  <Clock3 size={12} />
                  {n.minutes} 分鐘
                  <span>{n.kind === "support" ? "補強" : "主線課程"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {node && showDetails && (
        <aside
          id="learning-node-detail"
          className="node-detail"
          aria-labelledby="node-detail-title"
        >
          <h3 id="node-detail-title">{node.title}</h3>
          <p>{node.objective}</p>
          <span className="quiet">
            約 {node.minutes} 分鐘 · {node.prerequisites.length} 個先修節點
          </span>
          {course.completed.includes(node.id) && (
            <button
              className="text-button"
              disabled={busy || submitting}
              onClick={() => onReview(node.id)}
            >
              複習這一章 <ArrowRight size={14} />
            </button>
          )}
        </aside>
      )}
      <button
        className="map-detail-toggle"
        aria-label={showDetails ? "收起節點資訊" : "展開節點資訊"}
        title={showDetails ? "收起節點資訊" : "展開節點資訊"}
        aria-expanded={showDetails}
        aria-controls={showDetails ? "learning-node-detail" : undefined}
        disabled={
          adding || Boolean(course.preview) || busy || submitting || !node
        }
        onClick={() => setDetailsOpen((open) => !open)}
      >
        {showDetails ? (
          <PanelRightClose size={20} />
        ) : (
          <PanelRightOpen size={20} />
        )}
      </button>
      <div className="map-toolbar">
        <button
          aria-label="縮小"
          onClick={() => setScale((s) => Math.max(0.25, s - 0.1))}
        >
          <Minus size={18} />
        </button>
        <span>{Math.round(scale * 100)}%</span>
        <button
          aria-label="放大"
          onClick={() => setScale((s) => Math.min(1.5, s + 0.1))}
        >
          <Plus size={18} />
        </button>
        <i />
        <button aria-label="顯示完整路徑" onClick={fit}>
          <Maximize size={17} />
        </button>
      </div>
      {course.preview ? (
        <div className="branch-confirm">
          <div>
            <strong>節點預覽</strong>
            <p>
              新增 {course.preview.nodes.length} 個節點，學完後回到「
              {
                graph.nodes.find((n) => n.id === course.preview!.rejoinId)
                  ?.title
              }
              」。
            </p>
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
              取消新增
            </button>
            <button
              className="primary-button"
              disabled={busy || submitting}
              onClick={() => void perform(onConfirm)}
            >
              確認新增 <Plus size={16} />
            </button>
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
          <h3 id="add-node-title">新增節點</h3>
          <p>接在「{currentNode?.title}」之後</p>
          <label htmlFor="node-topic">主題</label>
          <div className="node-topic-field">
            <input
              id="node-topic"
              autoFocus
              value={topic}
              maxLength={120}
              required
              disabled={submitting || busy}
              placeholder="例如：HTML 表單"
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          {course.mode === "demo" && (
            <small>體驗模式的新增章節使用固定 HTML 範例。</small>
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
              取消
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={!topic.trim() || submitting || busy}
            >
              {submitting && <LoaderCircle className="spin" size={15} />} 預覽
            </button>
          </div>
        </form>
      ) : (
        <button
          ref={addButton}
          className="map-add"
          disabled={busy || !canAdd}
          title={!canAdd ? "目前章節後無法再插入節點" : undefined}
          onClick={() => {
            setAdding(true);
            setError("");
          }}
        >
          <Plus size={17} /> 新增節點
        </button>
      )}
    </dialog>
  );
}
