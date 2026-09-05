// Isolated browser acceptance server. Only the model is a local deterministic double.
// The real Next API, SQLite store, worker, player and Python runtime are exercised.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { generalChapter, generalGraph } from "./general-course";

const dataDir = mkdtempSync(join(tmpdir(), "methelia-browser-"));
const model = createServer(async (req, res) => {
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const input = JSON.parse(JSON.parse(raw).messages[1].content).input;
    const environment = /Python/i.test(input.goal)
      ? "python"
      : /Linux/i.test(input.goal)
        ? "terminal"
        : /bread/i.test(input.goal)
          ? "none"
          : "web";
    const content = input.node
      ? generalChapter(input.node)
      : generalGraph(environment);
    if (!input.node && environment === "terminal") {
      Object.assign(content, {
        requiresConfirmation: true,
        scopeNote: "受限虛擬檔案環境，不支援安裝套件或系統程序。",
      });
    }
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(content) } }],
      }),
    );
  } catch {
    res.statusCode = 500;
    res.end("Local model double failed");
  }
});
model.listen(0, "127.0.0.1", () => {
  const address = model.address();
  if (!address || typeof address === "string")
    throw new Error("Missing model address");
  const env = {
    ...process.env,
    METHELIA_DATA_DIR: dataDir,
    AI_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
    AI_MODEL: "local-test",
    AI_API_KEY: "local-test",
    ELEVENLABS_API_KEY: "",
    ELEVENLABS_VOICE_ID: "",
    FISH_AUDIO_API_KEY: "",
    METHELIA_DEMO_PASSWORD: "",
    METHELIA_ALLOWED_ORIGINS: "",
    RENDER_EXTERNAL_URL: "",
    RENDER: "false",
  };
  const children = [
    spawn(
      process.execPath,
      [
        resolve("node_modules/next/dist/bin/next"),
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3100",
      ],
      { env, stdio: "inherit", windowsHide: true },
    ),
    spawn(
      process.execPath,
      ["--import", "tsx", resolve("src/server/worker.ts")],
      { env, stdio: "inherit", windowsHide: true },
    ),
  ];
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    children.forEach((child) => child.kill());
    model.closeAllConnections();
    model.close();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  children.forEach((child) => child.on("exit", stop));
});
