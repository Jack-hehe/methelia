import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";
import { pythonRunnerDocument } from "../src/core/python-runner-document";

it("exports real virtual files but excludes Python source and symlink targets", async () => {
  let source: Blob | undefined;
  const messages: Record<string, unknown>[] = [];
  class Worker {
    postMessage() {}
  }
  const html = pythonRunnerDocument("test", "en");
  runInNewContext(html.split("<script>")[1].split("</script>")[0], {
    parent: { postMessage() {} },
    Worker,
    Blob,
    URL: {
      createObjectURL: (blob: Blob) => {
        source = blob;
        return "blob:test";
      },
    },
    setTimeout() {},
    clearTimeout() {},
    addEventListener() {},
  });
  let generated = false;
  const self: {
    postMessage: (message: Record<string, unknown>) => void;
    fetch: () => void;
    onmessage?: (event: { data: unknown }) => Promise<void>;
  } = { postMessage: (message) => messages.push(message), fetch() {} };
  const content = new TextEncoder().encode("<h1>Generated</h1>");
  runInNewContext(await source!.text(), {
    self,
    URL,
    TextDecoder,
    importScripts() {},
    loadPyodide: async () => ({
      runPython: () => () => {},
      runPythonAsync: async () => {
        generated = true;
      },
      setStdout() {},
      setStderr() {},
      setStdin() {},
      globals: { set() {} },
      FS: {
        chdir() {},
        mkdirTree() {},
        writeFile() {},
        readdir: () =>
          generated ? [".", "..", "index.html", "main.py", "linked.html"] : [],
        lstat: (path: string) => ({
          mode: path === "/practice" ? 1 : path.endsWith("linked.html") ? 3 : 2,
          size: content.length,
        }),
        isDir: (mode: number) => mode === 1,
        isFile: (mode: number) => mode === 2,
        isLink: (mode: number) => mode === 3,
        readFile: (path: string) => {
          if (path.endsWith("linked.html")) throw new Error("Followed symlink");
          return content;
        },
      },
    }),
  });
  await self.onmessage?.({
    data: {
      kind: "run",
      files: { "/main.py": "print(1)" },
      entryPath: "/main.py",
    },
  });
  expect(messages.at(-1)).toEqual({
    kind: "done",
    artifacts: { "/index.html": "<h1>Generated</h1>" },
  });
});

it("rejects invalid artifact messages before forwarding them out of the iframe", () => {
  const messages: Record<string, unknown>[] = [];
  let receive: (event: unknown) => void = () => {};
  let worker: Worker | undefined;
  class Worker {
    onmessage?: (event: { data: unknown }) => void;
    constructor() {
      worker = this;
    }
    postMessage() {}
    terminate() {}
  }
  const parent = {
    postMessage: (message: Record<string, unknown>) => messages.push(message),
  };
  const html = pythonRunnerDocument("test", "en");
  runInNewContext(html.split("<script>")[1].split("</script>")[0], {
    parent,
    Worker,
    Blob,
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    setTimeout() {},
    clearTimeout() {},
    addEventListener: (kind: string, fn: typeof receive) => {
      if (kind === "message") receive = fn;
    },
  });
  worker!.onmessage?.({ data: { kind: "ready" } });
  receive({
    source: parent,
    data: {
      channel: "test",
      kind: "run",
      runId: "one",
      files: { "/main.py": "" },
      entryPath: "/main.py",
    },
  });
  worker!.onmessage?.({
    data: { kind: "done", artifacts: { "/../index.html": "bad" } },
  });
  expect(messages.some((message) => message.kind === "done")).toBe(false);
  expect(messages.find((message) => message.kind === "error")).toMatchObject({
    runId: "one",
    text: "Invalid generated files.",
  });
});
