import { expect, it, vi, afterEach } from "vitest";
import { validateGeneratedLanguage, generateHelp } from "../src/server/model";
import { outputFeedback } from "../src/core/output-feedback";
import { checkFeedback } from "../src/core/check-feedback";
import { emptyWorkspace } from "../src/core/workspace";
import { demoChapter, demoGraph } from "../src/core/fixtures";
import { speechConfig } from "../src/server/speech";
import { pythonRunnerDocument } from "../src/core/python-runner-document";
import { localizedError } from "../src/core/language";

it("explains chapter validation failures without exposing internal diagnostics", () => {
  const message =
    "課程格式驗證失敗，已嘗試修正兩次。請重試。 Details: Practice section needs completion";
  expect(localizedError(message, "en")).toBe(
    "The generated lesson did not pass its content checks. Please retry this chapter; your course plan and answers are saved.",
  );
  expect(localizedError(message, "zh-TW")).toContain("內容檢查");
  expect(localizedError(message, "en")).not.toContain("Details");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("allows Japanese learning examples while keeping English explanations", () => {
  const lesson = {
    title: "Compare Japanese requests",
    sections: [{
      body: 'Compare "お願いします" with "頼む" and choose the formal request.',
      component: { type: "quiz.choice", question: "Which request is formal?", options: ["お願いします", "頼む"], explanation: '"お願いします" is more polite.' },
    }],
    script: [{ text: 'The expression 「お願いします」 makes a polite request.' }],
  };
  expect(() => validateGeneratedLanguage(lesson, "en", "I want to learn Japanese")).not.toThrow();
  expect(() => validateGeneratedLanguage({body: "這段說明是中文。"}, "en", "Learn Japanese")).toThrow(/English/);
  expect(() => validateGeneratedLanguage({title:'"這是一整段中文介紹"'}, "en", "Learn Japanese")).toThrow(/English/);
  expect(() => validateGeneratedLanguage({component: {options: ["中文", "英文"]}}, "en", "Learn algebra")).toThrow(/English/);
});
it("rejects wrong-language generated prose while preserving code identifiers", () => {
  expect(() =>
    validateGeneratedLanguage(
      { title: "English lesson", script: [{ text: "中文解說" }] },
      "en",
    ),
  ).toThrow(/English/);
  expect(() =>
    validateGeneratedLanguage(
      { title: "English lesson", body: "English explanation" },
      "zh-TW",
    ),
  ).toThrow(/Traditional Chinese/);
  expect(() =>
    validateGeneratedLanguage(
      {
        title: "English lesson",
        workspace: { files: { "/a.py": "print('中文')" } },
      },
      "en",
    ),
  ).not.toThrow();
});
it("help explicitly receives the course language even when the question uses a different language", async () => {
  vi.stubEnv("AI_BASE_URL", "https://example.test/v1");
  vi.stubEnv("AI_API_KEY", "test");
  vi.stubEnv("AI_MODEL", "test");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) => {
      const input = JSON.parse(
        JSON.parse(options.body).messages[1].content,
      ).input;
      expect(input.language).toBe("en");
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                answer: "An English explanation.",
                nodes: [],
              }),
            },
          },
        ],
      });
    }),
  );
  expect((await generateHelp("為什麼？", {}, "en")).answer).toBe(
    "An English explanation.",
  );
});

it("preserves Chinese source strings in English chapter starter files and code examples", () => {
  expect(() =>
    validateGeneratedLanguage(
      {
        title: "Print a message",
        workspaceSetup: { "/main.py": "訊息 = '你好'\nprint(訊息)" },
        sections: [
          {
            title: "Run the code",
            component: { type: "code.editor", example: "print('你好')" },
          },
        ],
        script: [{ text: "Run the code to print the message." }],
      },
      "en",
    ),
  ).not.toThrow();
  expect(() =>
    validateGeneratedLanguage(
      { title: "Print a message", sections: [{ body: "中文解說" }] },
      "en",
    ),
  ).toThrow(/English/);
});
it("feedback and Python platform errors follow the course language", () => {
  const section = demoChapter(demoGraph("en").nodes[0], "en").sections.find(
    (s) => s.completion,
  )!;
  expect(
    checkFeedback(section, emptyWorkspace(), false, 0, "en").message,
  ).not.toMatch(/[\u3400-\u9fff]/u);
  expect(outputFeedback("4", "5", "en")).toContain("Line 1 differs");
  expect(outputFeedback("4", "5", "zh-TW")).toContain("第 1 行");
  expect(pythonRunnerDocument("test", "en")).not.toMatch(/[\u3400-\u9fff]/u);
});
it("the explicit course language takes precedence over a stale speech language", () => {
  vi.stubEnv("ELEVENLABS_API_KEY", "test");
  vi.stubEnv("ELEVENLABS_VOICE_ID", "voice");
  expect(
    speechConfig(
      {
        provider: "elevenlabs",
        voiceId: "voice",
        model: "eleven_flash_v2_5",
        languageCode: "zh",
      },
      "en",
    ).profile.languageCode,
  ).toBe("en");
});
