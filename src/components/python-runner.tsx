"use client";
import { localizedError } from "../core/language";
import { useCourseLanguage } from "./course-language";

import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { outputFeedback } from "../core/output-feedback";
import {
  PYODIDE_VERSION,
  PYTHON_OUTPUT_LIMIT,
} from "../core/python-runner-document";

import { usePythonRuntime } from "./python-runtime-provider";

type Status =
  "connecting" | "ready" | "loading" | "running" | "done" | "stopped" | "error";

/** Execution is local feedback only; this component never marks a checkpoint complete. */
export function PythonRunner({
  files,
  entryPath,
  beforeRun,
  expectedOutput,
  sessionKey,
}: {
  files: Record<string, string>;
  entryPath: string | null;
  beforeRun?: () => Promise<unknown>;
  expectedOutput?: string;
  sessionKey?: string;
}) {
  const { language, t } = useCourseLanguage();
  const {
    status: runtimeStatus,
    busy: runtimeBusy,
    error: runtimeError,
    claim,
    release,
    post,
    subscribe,
    results,
    track,
  } = usePythonRuntime();
  const snapshot = JSON.stringify([entryPath, files]);
  const cached = sessionKey ? results.get(sessionKey) : undefined;
  const initial = cached?.snapshot === snapshot ? cached : undefined;
  const runSnapshot = useRef(initial?.snapshot || snapshot);
  const activeRun = useRef<string | null>(null);
  const submitted = useRef(false);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<Status>(initial?.status || "ready");
  const [output, setOutput] = useState(initial?.output || "");
  const [error, setError] = useState(initial?.error || "");
  const busy = status === "loading" || status === "running";
  useEffect(() => {
    if (
      sessionKey &&
      (status === "done" || status === "stopped" || status === "error")
    ) {
      results.set(sessionKey, {
        snapshot: runSnapshot.current,
        status,
        output,
        error,
      });
      if (results.size > 100) results.delete(results.keys().next().value!);
    }
  }, [sessionKey, status, output, error, results]);

  useEffect(() => {
    return subscribe((message) => {
      if (!activeRun.current || message.runId !== activeRun.current) {
        const result = sessionKey ? results.get(sessionKey) : undefined;
        if (result && result.snapshot === snapshot) {
          setStatus(result.status);
          setOutput(result.output);
          setError(result.error);
        }
        return;
      }
      if (message.kind === "running") setStatus("running");
      else if (message.kind === "output" && typeof message.text === "string")
        setOutput((value) =>
          (value + message.text!.slice(0, PYTHON_OUTPUT_LIMIT)).slice(
            0,
            PYTHON_OUTPUT_LIMIT,
          ),
        );
      else if (["done", "stopped", "error"].includes(message.kind)) {
        if (watchdog.current) clearTimeout(watchdog.current);
        activeRun.current = null;
        setStatus(message.kind as Status);
        if (message.kind === "error")
          setError(
            String(message.text || t("執行失敗。", "Execution failed.")).slice(
              0,
              4000,
            ),
          );
      }
    });
  }, [subscribe, sessionKey, snapshot, results]);
  useEffect(
    () => () => {
      if (watchdog.current) clearTimeout(watchdog.current);
      if (activeRun.current) {
        if (!submitted.current) {
          release(activeRun.current);
        }
        activeRun.current = null;
      }
    },
    [post, release],
  );

  async function run() {
    if (activeRun.current || !entryPath) return;
    const runId = crypto.randomUUID();
    if (!claim(runId)) return;
    runSnapshot.current = snapshot;
    activeRun.current = runId;
    submitted.current = false;
    setOutput("");
    setError("");
    setStatus("loading");
    watchdog.current = setTimeout(() => {
      if (activeRun.current !== runId) return;
      post({ kind: "stop", runId });
      release(runId);
      activeRun.current = null;
      setStatus("error");
      setError(
        t(
          "儲存或執行逾時，已停止。請重試。",
          "Saving or execution timed out and was stopped. Please try again.",
        ),
      );
    }, 60000);
    try {
      await beforeRun?.();
    } catch (error) {
      if (activeRun.current !== runId) return;
      if (watchdog.current) clearTimeout(watchdog.current);
      release(runId);
      activeRun.current = null;
      setStatus("error");
      setError(
        error instanceof Error
          ? localizedError(error, language)
          : t(
              "儲存失敗，尚未執行。",
              "Saving failed. The program has not run.",
            ),
      );
      return;
    }
    if (activeRun.current !== runId) return;
    if (sessionKey) track(runId, sessionKey, runSnapshot.current);
    submitted.current = true;
    post({ kind: "run", runId, files, entryPath });
  }

  return (
    <section
      className="python-runner"
      aria-label={t("Python 執行結果", "Python execution results")}
    >
      <div className="practice-pane-header">
        <strong>{t("Python 輸出", "Python output")}</strong>
        {busy ? (
          <button
            onClick={() => {
              if (activeRun.current) {
                post({ kind: "stop", runId: activeRun.current });
                release(activeRun.current);
              }
              activeRun.current = null;
              if (watchdog.current) clearTimeout(watchdog.current);
              setStatus("stopped");
            }}
          >
            <Square size={13} />
            {t("停止", "Stop")}
          </button>
        ) : runtimeStatus === "error" ? (
          <button onClick={() => post({ kind: "hello" })}>
            {t("重試載入 Python", "Retry loading Python")}
          </button>
        ) : (
          <button
            disabled={
              runtimeBusy ||
              runtimeStatus !== "ready" ||
              !entryPath?.endsWith(".py")
            }
            onClick={run}
          >
            <Play size={13} />
            {t("執行 Python", "Run Python")}
          </button>
        )}
      </div>
      <div className="python-run-status" role="status">
        {runtimeBusy && !busy
          ? t(
              "Python 仍在執行，完成後即可查看結果。",
              "Python is still running. Results will appear when it finishes.",
            )
          : runtimeStatus === "warming" && !busy
            ? t("準備 Python 環境…", "Preparing the Python environment…")
            : status === "loading"
              ? t("準備執行 Python…", "Preparing to run Python…")
              : status === "running"
                ? t("執行中…", "Running…")
                : status === "done"
                  ? t("執行完成", "Execution complete")
                  : status === "stopped"
                    ? t("已停止", "Stopped")
                    : status === "error"
                      ? t("執行未完成", "Execution incomplete")
                      : entryPath || t("請選擇 .py 檔案", "Select a .py file")}
      </div>
      <pre
        className="python-output"
        aria-label={t("Python 標準輸出", "Python standard output")}
      >
        {output ||
          (!busy && status === "done"
            ? t("（程式沒有輸出）", "(The program produced no output)")
            : !busy
              ? t(
                  "執行後，print() 的結果會顯示在這裡。",
                  "After running, print() output will appear here.",
                )
              : "")}
      </pre>
      {(error || runtimeError) && (
        <pre className="python-error" role="alert">
          {error || runtimeError}
        </pre>
      )}
      {expectedOutput !== undefined && (
        <div className="python-expected">
          <strong>{t("練習目標輸出", "Expected practice output")}</strong>
          <pre>{expectedOutput || t("（沒有輸出）", "(No output)")}</pre>
          {status === "done" && (
            <p role="status">
              {outputFeedback(output, expectedOutput, language)}
            </p>
          )}
        </div>
      )}
      <small className="practice-footnote">
        Pyodide {PYODIDE_VERSION} ·{" "}
        {t(
          "Python 標準函式庫 · 每次執行上限 10 秒。執行產生的檔案不會寫回作品；不支援互動輸入。",
          "Python standard library · 10 seconds per run. Generated files are not saved to your project; interactive input is not supported.",
        )}
      </small>
    </section>
  );
}
