"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { MousePointer2 } from "lucide-react";
import type { LabKind, LabProps } from "../../core/lab";
import {
  labValueSchema,
  validLabParameters,
  labParameterRanges,
} from "../../core/lab";
import { useCourseLanguage } from "../course-language";
import "./labs.css";

const Science = dynamic<LabProps>(
  () => import("./science-labs").then((m) => m.ScienceLab),
  {
    loading: () => (
      <div className="lab-loading" role="status">
        ◌
      </div>
    ),
  },
);
const Projects = dynamic<LabProps>(
  () => import("./project-labs").then((m) => m.ProjectLab),
  {
    loading: () => (
      <div className="lab-loading" role="status">
        ◌
      </div>
    ),
  },
);
const science = new Set<LabKind>([
  "geometry",
  "calculus",
  "probability",
  "collision",
  "orbit",
  "circuit",
  "sound",
  "color",
]);
const localWork = new Map<string, Record<string, number>>();
type Draft = { value: Record<string, number>; version: number };
function recover(key: string, kind: LabKind): Draft | null {
  try {
    const d = JSON.parse(sessionStorage.getItem(key) || "null");
    return d &&
      Number.isSafeInteger(d.version) &&
      labValueSchema.safeParse(d.value).success &&
      validLabParameters(kind, d.value)
      ? d
      : null;
  } catch {
    return null;
  }
}

export function Laboratory({
  kind,
  mission,
  initial = {},
  saved,
  courseId,
  nodeId,
  sectionId,
}: {
  kind: LabKind;
  mission: string;
  initial?: Record<string, number>;
  saved?: Record<string, number>;
  courseId: string;
  nodeId: string;
  sectionId: string;
}) {
  const { language, t } = useCourseLanguage();
  const key = `${courseId}:${nodeId}:${sectionId}`;
  const storageKey = `methelia-lab-draft:${key}`;
  const restored = useRef<Draft | null>(
    typeof window === "undefined" ? null : recover(storageKey, kind),
  );
  const [value, setValue] = useState(
    () => restored.current?.value ?? localWork.get(key) ?? saved ?? initial,
  );
  const [status, setStatus] = useState<
    "saved" | "saving" | "error" | "conflict"
  >("saved");
  const [epoch, setEpoch] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState<{
    value: Record<string, number>;
    x: number;
    y: number;
  } | null>(null);
  const demoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  function stopDemo() {
    for (const timer of demoTimers.current) clearTimeout(timer);
    demoTimers.current = [];
    setDemo(null);
  }
  useEffect(
    () => () => {
      for (const timer of demoTimers.current) clearTimeout(timer);
    },
    [],
  );
  function demonstrate() {
    stopDemo();
    const control = root.current?.querySelector<
      HTMLInputElement | HTMLSelectElement
    >(".lab-controls input[name],.lab-controls select[name]");
    const bounds = control && labParameterRanges[kind][control.name];
    if (!control || !bounds || !root.current) return;
    const rectangle = control.getBoundingClientRect(),
      container = root.current.getBoundingClientRect();
    const position = {
      x: Math.max(
        0,
        Math.min(
          rectangle.left - container.left + Math.min(rectangle.width / 2, 100),
          container.width - 250,
        ),
      ),
      y: rectangle.top - container.top + rectangle.height / 2,
    };
    control.focus({ preventScroll: true });
    for (const [index, factor] of [0, 0.5, 1].entries())
      demoTimers.current.push(
        setTimeout(() => {
          const range = bounds[1] - bounds[0];
          const step =
            control instanceof HTMLInputElement && control.type === "range"
              ? Number(control.step) || 1
              : 1;
          const n = Math.min(
            bounds[1],
            bounds[0] + Math.round((range * factor) / step) * step,
          );
          setDemo({
            value: { ...value, [control.name]: Number(n.toFixed(5)) },
            ...position,
          });
        }, index * 1400),
      );
    demoTimers.current.push(setTimeout(() => setDemo(null), 4400));
  }
  const pending = useRef<Draft | null>(restored.current);
  const newest = useRef(restored.current?.version ?? 0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const save = useRef(() => {});
  save.current = () => {
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    void fetch("/api/labs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        nodeId,
        sectionId,
        value: next.value,
        version: next.version,
      }),
      keepalive: true,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Save failed");
        const result = await response.json();
        if (result.stale) {
          if (newest.current === next.version) setStatus("conflict");
          return;
        }
        if (newest.current === next.version) {
          try {
            if (recover(storageKey, kind)?.version === next.version)
              sessionStorage.removeItem(storageKey);
          } catch {}
          setStatus("saved");
        }
      })
      .catch(() => {
        if (newest.current === next.version) {
          pending.current = next;
          setStatus("error");
        }
      });
  };
  useEffect(() => {
    const flush = () => save.current();
    if (pending.current) {
      setStatus("saving");
      flush();
    }
    window.addEventListener("pagehide", flush);
    return () => {
      clearTimeout(timer.current);
      flush();
      window.removeEventListener("pagehide", flush);
    };
  }, []);
  function change(next: Record<string, number>) {
    setValue(next);
    localWork.set(key, next);
    const draft = {
      value: next,
      version: Math.max(Date.now(), newest.current + 1),
    };
    newest.current = draft.version;
    pending.current = draft;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {}
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save.current(), 350);
  }
  const View = science.has(kind) ? Science : Projects;
  function exportWork() {
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify({ kind, mission, parameters: value }, null, 2)],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind}-experiment.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="laboratory" data-lab={kind} ref={root}>
      <div className="lab-mission">
        <p>{mission}</p>
        <span role="status">
          {status === "saving" ? (
            t("儲存中…", "Saving…")
          ) : status === "conflict" ? (
            <button
              onClick={() => {
                pending.current = null;
                clearTimeout(timer.current);
                localWork.delete(key);
                try {
                  sessionStorage.removeItem(storageKey);
                } catch {}
                window.location.reload();
              }}
            >
              {t(
                "其他分頁有更新，載入最新進度",
                "Newer work in another tab. Load latest",
              )}
            </button>
          ) : status === "error" ? (
            <button
              onClick={() => {
                setStatus("saving");
                save.current();
              }}
            >
              {t("儲存失敗，重試", "Save failed. Retry")}
            </button>
          ) : (
            t("已儲存", "Saved")
          )}
        </span>
      </div>
      <View
        key={epoch}
        kind={kind}
        language={language}
        value={demo?.value ?? value}
        onChange={(next) => {
          if (demo) {
            // A renderer reports its entire displayed state. Preserve the learner's
            // work and apply only their edit when they take over a demonstration.
            const edited = { ...value };
            for (const key of Object.keys(demo.value))
              if (!(key in next)) delete edited[key];
            for (const [key, n] of Object.entries(next))
              if (!Object.is(n, demo.value[key])) edited[key] = n;
            next = edited;
          }
          stopDemo();
          change(next);
        }}
      />
      {demo && (
        <div
          className="lab-demo-pointer"
          style={{ left: demo.x, top: demo.y }}
          role="status"
        >
          <MousePointer2 size={32} />
          <span>
            {t(
              "示範：觀察參數與畫面一起改變",
              "Demo: watch the control change the scene",
            )}
          </span>
        </div>
      )}
      <div className="lab-footer">
        <button onClick={demo ? stopDemo : demonstrate}>
          {demo
            ? t("停止示範", "Stop demonstration")
            : t("查看操作示範", "Watch a control demonstration")}
        </button>
        <button
          onClick={() => {
            stopDemo();
            change({ ...initial });
            setEpoch((v) => v + 1);
          }}
        >
          {t("重設本頁實驗", "Reset this experiment")}
        </button>
        <button onClick={exportWork}>
          {t("下載實驗參數", "Download experiment")}
        </button>
      </div>
    </div>
  );
}
