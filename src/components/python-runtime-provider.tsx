"use client";
import { useCourseLanguage } from "./course-language";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { pythonRunnerDocument } from "../core/python-runner-document";
import { PYTHON_OUTPUT_LIMIT } from "../core/python-runner-document";
import { parsePythonArtifacts } from "../core/python-artifacts";

type RuntimeMessage = {
  kind: string;
  runId?: string;
  text?: string;
  artifacts?: Record<string, string>;
};
export type PythonResult = {
  snapshot: string;
  output: string;
  error: string;
  status: "done" | "stopped" | "error";
  artifacts: Record<string, string>;
};
type Runtime = {
  results: Map<string, PythonResult>;
  track: (runId: string, key: string, snapshot: string) => void;
  status: "warming" | "ready" | "error";
  busy: boolean;
  error: string;
  claim: (runId: string) => boolean;
  release: (runId: string) => void;
  post: (
    message: RuntimeMessage & {
      files?: Record<string, string>;
      entryPath?: string;
    },
  ) => void;
  subscribe: (listener: (message: RuntimeMessage) => void) => () => void;
};
const Context = createContext<Runtime | null>(null);

/** Course-owned sandbox: workspace views never own or dispose the warm interpreter. */
export function PythonRuntimeProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const { language, t } = useCourseLanguage();
  const iframe = useRef<HTMLIFrameElement>(null);
  const listeners = useRef(new Set<(message: RuntimeMessage) => void>());
  const active = useRef<string | null>(null);
  const results = useRef(new Map<string, PythonResult>());
  const job = useRef<{
    runId: string;
    key: string;
    result: PythonResult;
  } | null>(null);
  const track = useCallback((runId: string, key: string, snapshot: string) => {
    job.current = {
      runId,
      key,
      result: {
        snapshot,
        output: "",
        error: "",
        status: "stopped",
        artifacts: {},
      },
    };
  }, []);
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState<Runtime["status"]>("warming");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (enabled) setChannel((value) => value || crypto.randomUUID());
  }, [enabled]);
  const document = useMemo(
    () => (channel ? pythonRunnerDocument(channel, language) : ""),
    [channel, language],
  );
  const post = useCallback(
    (
      message: RuntimeMessage & {
        files?: Record<string, string>;
        entryPath?: string;
      },
    ) => {
      iframe.current?.contentWindow?.postMessage({ ...message, channel }, "*");
    },
    [channel],
  );
  const claim = useCallback(
    (runId: string) => {
      if (active.current || status !== "ready") return false;
      active.current = runId;
      setBusy(true);
      return true;
    },
    [status],
  );
  const release = useCallback((runId: string) => {
    if (active.current === runId) {
      active.current = null;
      setBusy(false);
    }
  }, []);
  const subscribe = useCallback(
    (listener: (message: RuntimeMessage) => void) => {
      listeners.current.add(listener);
      return () => {
        listeners.current.delete(listener);
      };
    },
    [],
  );
  useEffect(() => {
    if (!channel) return;
    const frame = iframe.current;
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame?.contentWindow ||
        event.origin !== "null" ||
        event.data?.channel !== channel
      )
        return;
      const raw = event.data;
      if (
        !raw ||
        typeof raw !== "object" ||
        ![
          "ready",
          "warming",
          "running",
          "output",
          "done",
          "stopped",
          "error",
        ].includes(raw.kind)
      )
        return;
      if (
        raw.runId != null &&
        (typeof raw.runId !== "string" ||
          raw.runId.length > 100 ||
          raw.runId !== active.current)
      )
        return;
      if (
        ["running", "output", "done", "stopped"].includes(raw.kind) &&
        !raw.runId
      )
        return;
      const message: RuntimeMessage = {
        kind: raw.kind,
        runId: raw.runId || undefined,
        text:
          typeof raw.text === "string"
            ? raw.text.slice(0, PYTHON_OUTPUT_LIMIT)
            : undefined,
      };
      if (message.kind === "done") {
        try {
          message.artifacts = parsePythonArtifacts(raw.artifacts || {});
        } catch {
          message.kind = "error";
          message.text = t(
            "產生的檔案格式或大小無效。",
            "Generated files have an invalid format or size.",
          );
        }
      }
      const current = job.current;
      if (current && current.runId === message.runId) {
        if (message.kind === "output" && typeof message.text === "string")
          current.result.output = (current.result.output + message.text).slice(
            0,
            PYTHON_OUTPUT_LIMIT,
          );
        if (
          message.kind === "done" ||
          message.kind === "stopped" ||
          message.kind === "error"
        ) {
          current.result.status = message.kind;
          current.result.artifacts =
            message.kind === "done" ? message.artifacts || {} : {};
          current.result.error =
            message.kind === "error"
              ? String(
                  message.text || t("執行失敗。", "Execution failed."),
                ).slice(0, 4000)
              : "";
          results.current.set(current.key, current.result);
          if (results.current.size > 100)
            results.current.delete(results.current.keys().next().value!);
          job.current = null;
        }
      }
      if (message.kind === "ready") {
        setStatus("ready");
        setError("");
      } else if (message.kind === "warming") setStatus("warming");
      else if (message.kind === "error" && !message.runId) {
        setStatus("error");
        setError(
          String(
            message.text || t("Python 載入失敗。", "Python failed to load."),
          ).slice(0, 4000),
        );
      }
      if (
        ["done", "stopped", "error"].includes(message.kind) &&
        message.runId === active.current
      ) {
        active.current = null;
        setBusy(false);
      }
      listeners.current.forEach((listener) => listener(message));
    };
    window.addEventListener("message", receive);
    return () => {
      active.current = null;
      frame?.contentWindow?.postMessage({ channel, kind: "dispose" }, "*");
      window.removeEventListener("message", receive);
    };
  }, [channel]);
  const runtime = useMemo(
    () => ({
      status,
      busy,
      error,
      claim,
      release,
      post,
      subscribe,
      results: results.current,
      track,
    }),
    [status, busy, error, claim, release, post, subscribe, track],
  );
  return (
    <Context.Provider value={runtime}>
      {children}
      {channel && (
        <iframe
          ref={iframe}
          title={t("隔離的 Python 執行環境", "Isolated Python runtime")}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          srcDoc={document}
          hidden
          onLoad={() => post({ kind: "hello" })}
        />
      )}
    </Context.Provider>
  );
}

export function usePythonRuntime() {
  const runtime = useContext(Context);
  if (!runtime) throw new Error("PythonRunner requires PythonRuntimeProvider.");
  return runtime;
}
