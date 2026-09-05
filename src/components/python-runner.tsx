"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import {
  pythonRunnerDocument,
  PYODIDE_VERSION,
  PYTHON_OUTPUT_LIMIT,
} from "../core/python-runner-document";

type Status =
  "connecting" | "ready" | "loading" | "running" | "done" | "stopped" | "error";

/** Execution is local feedback only; this component never marks a checkpoint complete. */
export function PythonRunner({
  files,
  entryPath,
}: {
  files: Record<string, string>;
  entryPath: string | null;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const activeRun = useRef<string | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState<Status>("connecting");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const document = useMemo(
    () => (channel ? pythonRunnerDocument(channel) : ""),
    [channel],
  );
  const busy = status === "loading" || status === "running";

  useEffect(() => {
    setChannel(crypto.randomUUID());
  }, []);
  useEffect(() => {
    if (!channel) return;
    const frame = iframe.current;
    const connectTimer = setTimeout(() => {
      setStatus((value) => (value === "connecting" ? "error" : value));
      setError((value) => value || "Python 沙箱尚未就緒；請重新開啟實作區。");
    }, 10000);
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame?.contentWindow ||
        event.origin !== "null" ||
        event.data?.channel !== channel
      )
        return;
      const message = event.data;
      if (message.kind === "ready") {
        clearTimeout(connectTimer);
        setStatus((value) => (value === "connecting" ? "ready" : value));
        return;
      }
      if (!activeRun.current || message.runId !== activeRun.current) return;
      if (message.kind === "running") setStatus("running");
      else if (message.kind === "output" && typeof message.text === "string")
        setOutput((value) =>
          (value + message.text.slice(0, PYTHON_OUTPUT_LIMIT)).slice(
            0,
            PYTHON_OUTPUT_LIMIT,
          ),
        );
      else if (["done", "stopped", "error"].includes(message.kind)) {
        if (watchdog.current) clearTimeout(watchdog.current);
        activeRun.current = null;
        setStatus(message.kind);
        if (message.kind === "error")
          setError(String(message.text || "執行失敗。").slice(0, 4000));
      }
    };
    window.addEventListener("message", receive);
    return () => {
      clearTimeout(connectTimer);
      if (watchdog.current) clearTimeout(watchdog.current);
      activeRun.current = null;
      frame?.contentWindow?.postMessage({ channel, kind: "dispose" }, "*");
      window.removeEventListener("message", receive);
    };
  }, [channel]);

  function run() {
    if (activeRun.current || !entryPath || !channel) return;
    const runId = crypto.randomUUID();
    activeRun.current = runId;
    setOutput("");
    setError("");
    setStatus("loading");
    iframe.current?.contentWindow?.postMessage(
      { channel, kind: "run", runId, files, entryPath },
      "*",
    );
    watchdog.current = setTimeout(() => {
      iframe.current?.contentWindow?.postMessage(
        { channel, kind: "stop", runId },
        "*",
      );
      activeRun.current = null;
      setStatus("error");
      setError("Python 執行逾時，已停止。請重試。");
    }, 60000);
  }

  return (
    <section className="python-runner" aria-label="Python 執行結果">
      <div className="practice-pane-header">
        <strong>Python 輸出</strong>
        {busy ? (
          <button
            onClick={() =>
              iframe.current?.contentWindow?.postMessage(
                { channel, kind: "stop", runId: activeRun.current },
                "*",
              )
            }
          >
            <Square size={13} />
            停止
          </button>
        ) : (
          <button
            disabled={status === "connecting" || !entryPath?.endsWith(".py")}
            onClick={run}
          >
            <Play size={13} />
            執行 Python
          </button>
        )}
      </div>
      <div className="python-run-status" role="status">
        {status === "connecting"
          ? "準備沙箱…"
          : status === "loading"
            ? "載入 Python…首次執行需要下載環境。"
            : status === "running"
              ? "執行中…"
              : status === "done"
                ? "執行完成"
                : status === "stopped"
                  ? "已停止"
                  : status === "error"
                    ? "執行未完成"
                    : entryPath || "請選擇 .py 檔案"}
      </div>
      <pre className="python-output" aria-label="Python 標準輸出">
        {output || (!busy && status === "done" ? "（程式沒有輸出）" : "")}
      </pre>
      {error && (
        <pre className="python-error" role="alert">
          {error}
        </pre>
      )}
      <small className="practice-footnote">
        Pyodide {PYODIDE_VERSION} · Python 標準函式庫 · 每次執行上限 10
        秒。執行產生的檔案不會寫回作品；不支援互動輸入。
      </small>
      {channel && (
        <iframe
          ref={iframe}
          title="隔離的 Python 執行環境"
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          srcDoc={document}
          hidden
          onLoad={() =>
            iframe.current?.contentWindow?.postMessage(
              { channel, kind: "hello" },
              "*",
            )
          }
        />
      )}
    </section>
  );
}
