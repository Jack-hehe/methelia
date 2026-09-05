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
): CheckFeedback {
  const condition = section.completion;
  const message = passed
    ? "練習完成，驗證條件已符合。"
    : "尚未符合條件，請比較以下差異後再試一次。";
  if (!condition) return { message };
  if (condition.type === "file.includes")
    return {
      message: passed
        ? message
        : `檢查 ${condition.path} 的已儲存內容；這是程式碼檢查，並非 Python 執行輸出檢查。`,
      expected: condition.value,
      actual:
        workspace.files[condition.path]?.slice(0, 4000) ||
        "（檔案不存在或沒有內容）",
    };
  if (condition.type === "cwd.equals")
    return { message, expected: condition.path, actual: workspace.cwd };
  if (condition.type === "directory.exists")
    return {
      message,
      expected: condition.path,
      actual: workspace.directories.join("\n") || "（沒有目錄）",
    };
  if (condition.type === "file.exists")
    return {
      message,
      expected: condition.path,
      actual: Object.keys(workspace.files).join("\n") || "（沒有檔案）",
    };
  if (condition.type === "quiz" && section.component.type === "quiz.choice")
    return {
      message: passed
        ? section.component.explanation
        : "這個選項還不正確，回頭比較題目中的條件。",
      actual: section.component.options[answer ?? -1] || "（尚未選擇）",
    };
  return { message };
}
