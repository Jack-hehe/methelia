import { runInNewContext } from "node:vm";
import { expect, test, vi } from "vitest";
import { pythonRunnerDocument } from "../src/core/python-runner-document";

function sandbox() {
  let workerBlob: Blob | undefined;
  const messages: Record<string, unknown>[] = [];
  const workers: FakeWorker[] = [];
  let receive: (event: unknown) => void = () => {};
  class FakeWorker {
    onmessage?: (event: { data: unknown }) => void;
    onerror?: () => void;
    postMessage = vi.fn();
    terminate = vi.fn();
    constructor() {
      workers.push(this);
    }
  }
  const parent = {
    postMessage: (message: Record<string, unknown>) => messages.push(message),
  };
  const document = pythonRunnerDocument("course-channel");
  runInNewContext(document.split("<script>")[1].split("</script>")[0], {
    parent,
    Worker: FakeWorker,
    Blob,
    URL: {
      createObjectURL: (blob: Blob) => {
        workerBlob = blob;
        return "blob:worker";
      },
      revokeObjectURL: vi.fn(),
    },
    setTimeout: vi.fn(),
    clearTimeout: vi.fn(),
    addEventListener: (kind: string, listener: typeof receive) => {
      if (kind === "message") receive = listener;
    },
  });
  return {
    workers,
    messages,
    workerSource: () => workerBlob!.text(),
    send: (data: object) =>
      receive({ source: parent, data: { channel: "course-channel", ...data } }),
  };
}

test("course sandbox warms Python before any learner run and reuses it after completion", () => {
  const frame = sandbox();
  expect(frame.workers).toHaveLength(1);
  expect(frame.workers[0].postMessage).toHaveBeenCalledWith({ kind: "warmup" });
  frame.workers[0].onmessage?.({ data: { kind: "ready" } });
  expect(frame.messages.at(-1)?.kind).toBe("ready");
  frame.send({
    kind: "run",
    runId: "first",
    files: { "/main.py": "print(1)" },
    entryPath: "/main.py",
  });
  frame.workers[0].onmessage?.({ data: { kind: "done" } });
  frame.send({
    kind: "run",
    runId: "second",
    files: { "/main.py": "print(2)" },
    entryPath: "/main.py",
  });
  expect(frame.workers).toHaveLength(1);
  expect(frame.workers[0].terminate).not.toHaveBeenCalled();
});

test("stopping an active run discards its worker and prewarms a replacement", () => {
  const frame = sandbox();
  frame.workers[0]?.onmessage?.({ data: { kind: "ready" } });
  frame.send({ kind: "run", runId: "first", files: {}, entryPath: "/main.py" });
  frame.send({ kind: "stop", runId: "first" });
  expect(frame.workers).toHaveLength(2);
  expect(frame.workers[0].terminate).toHaveBeenCalledOnce();
  expect(frame.workers[1].postMessage).toHaveBeenCalledWith({ kind: "warmup" });
});

test("unrecoverable worker errors still replace and prewarm the interpreter", () => {
  const frame = sandbox();
  frame.workers[0].onmessage?.({ data: { kind: "ready" } });
  frame.send({
    kind: "run",
    runId: "failed",
    files: {},
    entryPath: "/main.py",
  });
  frame.workers[0].onmessage?.({
    data: { kind: "error", text: "Runtime unavailable" },
  });
  expect(frame.workers[0].terminate).toHaveBeenCalledOnce();
  expect(frame.workers).toHaveLength(2);
  expect(frame.workers[1].postMessage).toHaveBeenCalledWith({ kind: "warmup" });
});

test("ordinary Python exceptions keep the warm interpreter for the corrected run", async () => {
  const frame = sandbox();
  const source = await frame.workerSource();
  const worker = frame.workers[0];
  const runPythonAsync = vi
    .fn()
    .mockRejectedValueOnce(
      Object.assign(new Error("SyntaxError: invalid syntax"), {
        name: "PythonError",
      }),
    )
    .mockResolvedValueOnce(undefined);
  const loadPyodide = vi.fn(async () => ({
    runPython: () => () => {},
    runPythonAsync,
    setStdout: vi.fn(),
    setStderr: vi.fn(),
    setStdin: vi.fn(),
    globals: { set: vi.fn() },
    FS: {
      chdir: vi.fn(),
      mkdirTree: vi.fn(),
      readdir: () => [],
      writeFile: vi.fn(),
    },
  }));
  const self = {
    postMessage: (message: unknown) => worker.onmessage?.({ data: message }),
    fetch: vi.fn(),
    onmessage: undefined as
      undefined | ((event: { data: unknown }) => Promise<void>),
  };
  runInNewContext(source, {
    self,
    importScripts: vi.fn(),
    loadPyodide,
    URL,
    TextDecoder,
  });
  await self.onmessage?.({ data: { kind: "warmup" } });
  const first = {
    kind: "run",
    runId: "broken",
    files: { "/main.py": "print(" },
    entryPath: "/main.py",
  };
  frame.send(first);
  await self.onmessage?.({ data: first });
  expect(frame.messages.at(-1)).toMatchObject({
    kind: "error",
    runId: "broken",
    text: "SyntaxError: invalid syntax",
  });
  expect(worker.terminate).not.toHaveBeenCalled();
  expect(frame.workers).toHaveLength(1);
  const corrected = {
    kind: "run",
    runId: "corrected",
    files: { "/main.py": "print(1)" },
    entryPath: "/main.py",
  };
  frame.send(corrected);
  expect(worker.postMessage).toHaveBeenLastCalledWith({
    kind: "run",
    files: corrected.files,
    entryPath: corrected.entryPath,
  });
  await self.onmessage?.({ data: corrected });
  expect(frame.messages.at(-1)).toMatchObject({
    kind: "done",
    runId: "corrected",
  });
  expect(loadPyodide).toHaveBeenCalledOnce();
});

test("prewarming initializes Python without running learner files", async () => {
  const frame = sandbox();
  const source = await frame.workerSource();
  const messages: unknown[] = [];
  const runPythonAsync = vi.fn();
  const loadPyodide = vi.fn(async () => ({
    runPython: () => () => {},
    runPythonAsync,
  }));
  const self = {
    postMessage: (message: unknown) => messages.push(message),
    fetch: vi.fn(),
    onmessage: undefined as
      undefined | ((event: { data: unknown }) => Promise<void>),
  };
  runInNewContext(source, { self, importScripts: vi.fn(), loadPyodide, URL });
  await self.onmessage?.({ data: { kind: "warmup" } });
  expect(loadPyodide).toHaveBeenCalledOnce();
  expect(messages).toEqual([{ kind: "ready" }]);
  expect(runPythonAsync).not.toHaveBeenCalled();
  await self.onmessage?.({ data: { kind: "warmup" } });
  expect(loadPyodide).toHaveBeenCalledOnce();
});
