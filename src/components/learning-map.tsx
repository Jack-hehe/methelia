"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import type { Snapshot } from "../core/state";
import { insertBranch, routeNodes } from "../core/graph";
export function LearningMap({
  course,
  onClose,
  onConfirm,
  onAdd,
  onReview,
}: {
  course: Snapshot;
  onClose: () => void;
  onConfirm: () => void;
  onAdd: () => void;
  onReview: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(course.currentNodeId),
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
  function pan(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    const start = { x: e.clientX, y: e.clientY };
    const origin = { ...offset };
    e.currentTarget.setPointerCapture(e.pointerId);
    const el = e.currentTarget;
    const move = (ev: PointerEvent) =>
      setOffset({
        x: origin.x + ev.clientX - start.x,
        y: origin.y + ev.clientY - start.y,
      });
    const end = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
  }
  function drag(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    setSelected(id);
    const origin = pos(id),
      start = { x: e.clientX, y: e.clientY };
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) =>
      setPositions((prev) => {
        const next = {
          ...prev,
          [id]: {
            x: origin.x + (ev.clientX - start.x) / scale,
            y: origin.y + (ev.clientY - start.y) / scale,
          },
        };
        localStorage.setItem(
          "map-positions:" + course.id,
          JSON.stringify(next),
        );
        return next;
      });
    const end = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
  }
  const node = graph.nodes.find((n) => n.id === selected);
  const fit = () => {
    setOffset({ x: 30, y: 40 });
    setScale(Math.min(1, (window.innerWidth - 100) / (nodes.length * 265)));
  };
  return (
    <dialog
      ref={dialog}
      className="learning-map"
      aria-label="Learning Map"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header className="map-header">
        <div>
          <span className="eyebrow">YOUR LEARNING JOURNEY</span>
          <h2>
            Learning Map
            <span> / {course.revision.toString().padStart(2, "0")}</span>
          </h2>
        </div>
        <button className="close-map" onClick={onClose}>
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
        className="map-canvas"
        onPointerDown={pan}
        onWheel={(e) =>
          setScale((s) => Math.max(0.25, Math.min(1.5, s - e.deltaY * 0.001)))
        }
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
                style={{ left: p.x, top: p.y }}
                className={
                  "map-node " +
                  (current ? "current " : "") +
                  (done ? "complete " : "") +
                  (preview ? "proposed " : "") +
                  (selected === n.id ? "selected" : "")
                }
                onPointerDown={(e) => drag(e, n.id)}
                onClick={() => setSelected(n.id)}
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
                        ? "YOU ARE HERE"
                        : done
                          ? "COMPLETED"
                          : `CHAPTER ${String(i + 1).padStart(2, "0")}`}
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
      {node && (
        <aside className="node-detail">
          <span className="eyebrow">
            {node.kind === "support"
              ? "SUPPORT YOUR UNDERSTANDING"
              : "ONE STEP CLOSER"}
          </span>
          <h3>{node.title}</h3>
          <p>{node.objective}</p>
          <span className="quiet">
            約 {node.minutes} 分鐘 · {node.prerequisites.length} 個先修節點
          </span>
          {course.completed.includes(node.id) && (
            <button className="text-button" onClick={() => onReview(node.id)}>
              複習這一章 <ArrowRight size={14} />
            </button>
          )}
        </aside>
      )}
      {course.preview ? (
        <div className="branch-confirm">
          <div>
            <strong>先補齊理解，再回到主線</strong>
            <p>
              新增 {course.preview.nodes.length} 個節點，學完後回到「
              {
                graph.nodes.find((n) => n.id === course.preview!.rejoinId)
                  ?.title
              }
              」。目前章節保持原樣。
            </p>
          </div>
          <button className="primary-button" onClick={onConfirm}>
            加入學習路徑 <Plus size={16} />
          </button>
        </div>
      ) : (
        <button className="map-add" onClick={onAdd}>
          <Plus size={17} /> 想多學一點？新增節點
        </button>
      )}
    </dialog>
  );
}
