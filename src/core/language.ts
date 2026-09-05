export type Language = "en" | "zh-TW";
export const copyFor =
  (language: Language = "zh-TW") =>
  (zh: string, en: string) =>
    language === "en" ? en : zh;

/** Localize platform errors without rewriting learner code or runtime output. */
export function localizedError(
  error: unknown,
  language: Language = "zh-TW",
): string {
  const message = error instanceof Error ? error.message : String(error);
  const t = copyFor(language);
  const rules: [RegExp, string, string][] = [
    [
      /課程格式驗證失敗|生成章節與學習目標不一致/,
      "生成的課程未通過內容檢查，請重試這個章節；課程大綱與回答都已保留。",
      "The generated lesson did not pass its content checks. Please retry this chapter; your course plan and answers are saved.",
    ],
    [
      /conflict|草稿已更新|回答已更新|課程已更新/i,
      "內容已更新，請重新載入後再試一次。",
      "This content has changed. Reload and try again.",
    ],
    [/Course not found/i, "找不到這堂課程。", "Course not found."],
    [
      /先回答前面/,
      "請先回答前面的問題。",
      "Please answer the earlier questions first.",
    ],
    [
      /問題.*失敗|問題暫時無法產生/,
      "問題暫時無法產生，請重試。",
      "Unable to prepare this question. Please try again.",
    ],
    [
      /暫時無法儲存/,
      "暫時無法儲存，請再試一次。",
      "Unable to save right now. Please try again.",
    ],
    [
      /逾時|timeout|timed out|aborted/i,
      "連線逾時，請重試。",
      "The request timed out. Please try again.",
    ],
    [
      /AI.*設定|AI.*available/i,
      "AI 課程尚未設定完成，請稍後再試。",
      "AI courses are not configured yet. Please try again later.",
    ],
    [
      /ELEVENLABS|語音.*設定|voice.*config/i,
      "語音尚未設定完成，仍可閱讀課程。",
      "Narration is not configured yet. You can still read the lesson.",
    ],
    [
      /語音仍在準備/,
      "語音仍在準備中，請稍後再試。",
      "Narration is still being prepared. Please try again shortly.",
    ],
    [
      /額度|limit reached|quota|429/i,
      "已達目前的使用額度，請稍後再試。",
      "The usage limit has been reached. Please try again later.",
    ],
    [/Directory not found/, "找不到目錄。", "Directory not found."],
    [/File not found/, "找不到檔案。", "File not found."],
    [
      /Parent directory does not exist/,
      "上層目錄不存在。",
      "Parent directory does not exist.",
    ],
    [/Path already exists/, "這個路徑已存在。", "Path already exists."],
    [/Path is a directory/, "這個路徑是目錄。", "Path is a directory."],
    [
      /Invalid.*path|outside.*root|escapes.*root/i,
      "路徑無效，請使用實作目錄內的路徑。",
      "Invalid path. Use a path inside the practice workspace.",
    ],
    [
      /supported.*command|Command.*supported/i,
      "此處支援 pwd、ls、cd、mkdir、touch、cat、clear 指令。",
      "Supported commands: pwd, ls, cd, mkdir, touch, cat, clear.",
    ],
    [
      /network|fetch|連線失敗|connection/i,
      "連線失敗，請再試一次。",
      "Connection failed. Please try again.",
    ],
  ];
  for (const [pattern, zh, en] of rules)
    if (pattern.test(message)) return t(zh, en);
  if (language === "en" && !/[\u3400-\u9fff]/u.test(message)) return message;
  if (language !== "en" && /[\u3400-\u9fff]/u.test(message)) return message;
  return t(
    "操作未完成，請再試一次。",
    "Unable to complete this action. Please try again.",
  );
}
