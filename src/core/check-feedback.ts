import { copyFor, type Language } from "./language";
import type { Section } from "./protocol";
import type { Workspace } from "./workspace";

export type CheckFeedback = {
  message: string;
  expected?: string;
  actual?: string;
};
/** Describe exactly the evidence checked, never pretend a source check executed code. */
export function checkFeedback(
  section: Section,
  workspace: Workspace,
  passed: boolean,
  answer?: number,
  language: Language = "zh-TW",
): CheckFeedback {
  const t = copyFor(language);
  const condition = section.completion;
  const message = passed
    ? t("練習完成，驗證條件已符合。", "Practice complete. All checks passed.")
    : t(
        "尚未符合條件，請比較以下差異後再試一次。",
        "Not quite yet. Compare the differences below and try again.",
      );
  if (!condition) return { message };
  if (condition.type === "file.includes")
    return {
      message: passed
        ? message
        : t(
            `檢查 ${condition.path} 的已儲存內容；這是程式碼檢查，並非 Python 執行輸出檢查。`,
            `Check the saved contents of ${condition.path}. This checks source code, not Python execution output.`,
          ),
      expected: condition.value,
      actual:
        workspace.files[condition.path]?.slice(0, 4000) ||
        t("（檔案不存在或沒有內容）", "(File is missing or empty)"),
    };
  if (condition.type === "cwd.equals")
    return { message, expected: condition.path, actual: workspace.cwd };
  if (condition.type === "directory.exists")
    return {
      message,
      expected: condition.path,
      actual:
        workspace.directories.join("\n") ||
        t("（沒有目錄）", "(No directories)"),
    };
  if (condition.type === "file.exists")
    return {
      message,
      expected: condition.path,
      actual:
        Object.keys(workspace.files).join("\n") ||
        t("（沒有檔案）", "(No files)"),
    };
  if (condition.type === "quiz" && section.component.type === "quiz.choice")
    return {
      message: passed
        ? section.component.explanation
        : t(
            "這個選項還不正確，回頭比較題目中的條件。",
            "That choice is not correct yet. Review the conditions in the question.",
          ),
      actual:
        section.component.options[answer ?? -1] ||
        t("（尚未選擇）", "(No selection)"),
    };
  return { message };
}
