// Isolated browser acceptance server. Only the model is a local deterministic double.
// The real Next API, SQLite store, worker, player and Python runtime are exercised.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { generalChapter, generalGraph } from "./general-course";
import { fixtureIntakeQuestion } from "./intake-question";

const dataDir = mkdtempSync(join(tmpdir(), "methelia-browser-"));
const model = createServer(async (req, res) => {
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const input = JSON.parse(JSON.parse(raw).messages[1].content).input;
    if (input.task === "intake-question") {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(
                  fixtureIntakeQuestion(
                    input.goal,
                    input.field,
                    input.answers,
                    input.language,
                  ),
                ),
              },
            },
          ],
        }),
      );
      return;
    }
    const environment = /Python/i.test(input.goal)
      ? "python"
      : /Linux/i.test(input.goal)
        ? "terminal"
        : /bread/i.test(input.goal)
          ? "none"
          : "web";
    const content =
      input.topic && input.anchor
        ? {
            title: input.topic,
            reason: `Extend ${input.anchor.title} by comparing a focused new example. The exercise remains within the supported environment.`,
            nodes: [
              {
                ...generalGraph(input.anchor.environment, {
                  experience: "Beginner",
                  purpose: input.topic,
                  priorKnowledge: "Learned the anchor",
                  depth: input.depth,
                  studyPlan: "A short focused example",
                }).nodes[0],
                id: `support-${randomUUID()}`,
                kind: "support",
                prerequisites: [input.anchor.id],
                title: input.topic,
                objective: `Explain and apply ${input.topic} in one focused comparison.`,
              },
            ],
          }
        : input.node
          ? generalChapter(input.node, input.learnerProfile)
          : generalGraph(environment, input.learnerProfile);
    if (input.node && /illustrated/.test(input.goal) && "sections" in content) {
      content.sections[0].component = {
        type: "lesson.article",
        paragraphs: [
          "酵母利用麵團中的糖，產生二氧化碳。氣體被麵筋網絡留住，麵團因此膨脹。",
          "觀察體積變化，比只計時更能判斷發酵進度。",
        ],
        takeaway: "氣體生成與麵團保氣能力共同決定膨脹。",
        figure: {
          items: [
            { label: "酵母", description: "利用糖進行發酵" },
            { label: "二氧化碳", description: "形成小氣泡" },
            { label: "麵筋網絡", description: "留住氣體，體積增加" },
          ],
          caption: "麵團膨脹的因果過程",
        },
      };
    }
    if (!input.node && environment === "terminal") {
      Object.assign(content, {
        requiresConfirmation: true,
        scopeNote: "受限虛擬檔案環境，不支援安裝套件或系統程序。",
      });
    }
    if (input.language === "zh-TW") {
      if ("sections" in content)
        content.sections[0].body = "比較起點與修改後的結果，理解這個概念。";
      else if ("outcome" in content)
        content.outcome = "理解並應用這個主題的基本步驟";
      else if ("reason" in content)
        content.reason = "利用相關範例延伸理解，完成後返回主線。";
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
    METHELIA_TEST_BUILD: "1",
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
