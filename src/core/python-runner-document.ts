export const PYODIDE_VERSION = "0.28.3";
export const PYTHON_OUTPUT_LIMIT = 20000;
export const PYTHON_EXECUTION_MS = 10000;

/** Trusted bootstrap only. Learner files cross postMessage, never HTML interpolation.
 * Run this document in an iframe with sandbox="allow-scripts" (no same-origin).
 * Pyodide's worker and stream APIs: https://pyodide.org/en/0.28.3/usage/webworker.html
 * https://pyodide.org/en/0.28.3/usage/streams.html
 */
export function pythonRunnerDocument(channel: string): string {
  const cdn = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
  const workerSource = String.raw`
    const CDN = ${JSON.stringify(cdn)};
    const LIMIT = ${PYTHON_OUTPUT_LIMIT};
    const send = self.postMessage.bind(self);
    const allowed = new Set(["pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"].map(name => CDN + name));
    const runtimeFetch = self.fetch.bind(self);
    self.fetch = (input, init = {}) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (!allowed.has(url)) return Promise.reject(new Error("Network access is disabled in this practice runner."));
      return runtimeFetch(input, { ...init, credentials: "omit", redirect: "error" });
    };
    let started = false, runtime = null, resetRuntime = null;
    const initialize = async () => {
        if (!runtime) {
          importScripts(CDN + "pyodide.js");
          runtime = await loadPyodide({ indexURL: CDN });
          resetRuntime = runtime.runPython("\nimport builtins, sys, os\ndef _make_practice_reset():\n    original_builtins = dict(builtins.__dict__)\n    clear, update = dict.clear, dict.update\n    streams = sys.stdin, sys.stdout, sys.stderr\n    original_path, original_argv = list(sys.path), list(sys.argv)\n    original_env = dict(os.environ)\n    def reset():\n        clear(builtins.__dict__)\n        update(builtins.__dict__, original_builtins)\n        sys.stdin, sys.stdout, sys.stderr = streams\n        sys.path = list(original_path)\n        sys.argv = list(original_argv)\n        os.environ.clear()\n        os.environ.update(original_env)\n    return reset\n_make_practice_reset()\n");
        }
    };
    self.onmessage = async ({ data }) => {
      if (data?.kind === "warmup") {
        try { await initialize(); send({ kind: "ready" }); }
        catch (error) { send({ kind: "error", text: String(error?.message || error) }); }
        return;
      }
      if (started || data?.kind !== "run") return;
      started = true;
      let pending = "", count = 0, runningLearner = false;
      const flush = () => {
        if (pending) send({ kind: "output", text: pending });
        pending = "";
      };
      const output = text => {
        const rest = LIMIT - count;
        pending += text.slice(0, Math.max(0, rest));
        count += text.length;
        if (pending.length >= 1024 || pending.includes("\n")) flush();
        if (count > LIMIT) {
          flush();
          throw new Error("Output limit reached (20,000 characters).");
        }
      };
      try {
        const entries = Object.entries(data.files || {});
        if (entries.length > 60 || entries.reduce((n, [, value]) => n + (typeof value === "string" ? value.length : 1000001), 0) > 1000000)
          throw new Error("Practice files exceed the runner limit.");
        const validPath = path => typeof path === "string" && path.startsWith("/") && path.length <= 200 && !path.includes("\\") && !path.includes("\0") && path.split("/").every(part => part !== "." && part !== "..");
        if (!validPath(data.entryPath) || !data.entryPath.endsWith(".py") || !Object.hasOwn(data.files, data.entryPath))
          throw new Error("Select a Python (.py) file to run.");
        await initialize();
        const pyodide = runtime;
        resetRuntime();
        const decoder = new TextDecoder();
        const write = buffer => { output(decoder.decode(buffer, { stream: true })); return buffer.length; };
        pyodide.setStdout({ write });
        pyodide.setStderr({ write });
        pyodide.setStdin({ stdin: () => null });
        // Remove files created by the previous run; only the submitted snapshot survives.
        pyodide.FS.chdir("/");
        const remove = path => {
          for (const name of pyodide.FS.readdir(path)) {
            if (name === "." || name === "..") continue;
            const child = path + "/" + name;
            if (pyodide.FS.isDir(pyodide.FS.lstat(child).mode)) { remove(child); pyodide.FS.rmdir(child); }
            else pyodide.FS.unlink(child);
          }
        };
        pyodide.FS.mkdirTree("/practice");
        remove("/practice");
        for (const [path, value] of entries) {
          if (!validPath(path) || path === "/" || typeof value !== "string" || value.length > 100000)
            throw new Error("Invalid practice file.");
          const target = "/practice" + path;
          pyodide.FS.mkdirTree(target.slice(0, target.lastIndexOf("/")));
          pyodide.FS.writeFile(target, value);
        }
        pyodide.FS.chdir("/practice");
        pyodide.globals.set("_practice_entry", "/practice" + data.entryPath);
        send({ kind: "running" });
        runningLearner = true;
        await pyodide.runPythonAsync("import runpy, sys, importlib\nfor name, module in list(sys.modules.items()):\n    if str(getattr(module, '__file__', '')).startswith('/practice/'):\n        sys.modules.pop(name, None)\nsys.path[:] = [p for p in sys.path if not p.startswith('/practice')]\nsys.path.insert(0, '/practice')\nsys.path.insert(0, _practice_entry.rsplit('/', 1)[0])\nsys.dont_write_bytecode = True\nimportlib.invalidate_caches()\nrunpy.run_path(_practice_entry, run_name='__main__')");
        flush();
        send({ kind: "done" });
      } catch (error) {
        flush();
        // Python exceptions are normal exercise feedback, not a broken runtime.
        // Bootstrap, worker, timeout and output-limit failures still rebuild it.
        send({ kind: "error", text: String(error?.message || error).slice(0, 4000), reusable: runningLearner && error?.name === "PythonError" });
      } finally { started = false; }
    };
  `;
  const script = `
    (() => {
      const channel = ${JSON.stringify(channel)};
      const source = ${JSON.stringify(workerSource)};
      let worker = null, url = null, timer = null, runId = null, count = 0, running = false, ready = false;
      const send = (kind, text) => parent.postMessage({ channel, runId, kind, text }, "*");
      const dispose = () => {
        if (timer) clearTimeout(timer);
        if (worker) worker.terminate();
        if (url) URL.revokeObjectURL(url);
        worker = null; url = null; timer = null; running = false; ready = false;
      };
      const finish = (kind, text, reusable = false) => {
        const hadRun = !!runId;
        const keepWorker = kind === "done" || reusable;
        if (keepWorker) { clearTimeout(timer); timer = null; running = false; }
        else dispose();
        send(kind, text); runId = null;
        if (!keepWorker && hadRun) warmup();
      };
      const warmup = () => {
        try {
          send("warming");
          if (!worker) {
            url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
            worker = new Worker(url);
          }
          const current = worker;
          timer = setTimeout(() => finish("error", "Python 載入逾時，請檢查網路後重試。"), 45000);
          current.onmessage = event => {
            if (worker !== current) return;
            const message = event.data;
            if (message?.kind === "ready") {
              ready = true; clearTimeout(timer); timer = null; send("ready");
            } else if (message?.kind === "running" && runId && !running) {
              running = true;
              clearTimeout(timer);
              timer = setTimeout(() => finish("error", "執行超過 10 秒，已停止。"), ${PYTHON_EXECUTION_MS});
              send("running");
            } else if (message?.kind === "output" && typeof message.text === "string") {
              const text = message.text.slice(0, Math.max(0, ${PYTHON_OUTPUT_LIMIT} - count));
              count += message.text.length;
              if (text) send("output", text);
              if (count >= ${PYTHON_OUTPUT_LIMIT}) finish("error", "輸出已達 20,000 字元上限，已停止。");
            } else if (message?.kind === "done") finish("done");
            else if (message?.kind === "error") finish("error", String(message.text || "Python 執行失敗。").slice(0, 4000), message.reusable === true);
          };
          current.onerror = () => finish("error", "Python 無法啟動，請確認瀏覽器支援 WebAssembly 並可連線至執行環境 CDN。");
          current.postMessage({ kind: "warmup" });
        } catch (error) { finish("error", String(error?.message || error).slice(0, 4000)); }
      };
      addEventListener("message", event => {
        const data = event.data;
        if (event.source !== parent || data?.channel !== channel) return;
        if (data.kind === "hello") { if (ready) send("ready"); else if (!worker) warmup(); return; }
        if (data.kind === "dispose") { dispose(); runId = null; return; }
        if (data.kind === "stop" && data.runId === runId && runId) { finish("stopped"); return; }
        if (data.kind !== "run" || typeof data.runId !== "string" || data.runId.length > 100 || !ready || runId) return;
        runId = data.runId; count = 0; running = false;
        timer = setTimeout(() => finish("error", "Python execution timed out."), ${PYTHON_EXECUTION_MS});
        worker.postMessage({ kind: "run", files: data.files, entryPath: data.entryPath });
      });
      addEventListener("pagehide", dispose);
      warmup();
    })();
  `;
  const policy = `default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' ${cdn}pyodide.js ${cdn}pyodide.asm.js; connect-src ${cdn}pyodide.asm.wasm ${cdn}python_stdlib.zip ${cdn}pyodide-lock.json; worker-src blob:; child-src 'none'; frame-src 'none'; img-src 'none'; style-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"></head><body><script>${script.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
}
