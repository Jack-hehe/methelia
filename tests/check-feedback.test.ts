import { expect, it } from "vitest";
import { checkFeedback } from "../src/core/check-feedback";
import { emptyWorkspace } from "../src/core/workspace";
import { generalChapter, generalGraph } from "./fixtures/general-course";
it("shows the actual saved file separately from the expected code", () => {
  const chapter = generalChapter(generalGraph("python").nodes[0]);
  const section = chapter.sections.find(
    (s) => s.completion?.type === "file.includes",
  )!;
  const workspace = emptyWorkspace();
  workspace.files["/main.py"] = "print(1 + 2)";
  const feedback = checkFeedback(section, workspace, false);
  expect(feedback.actual).toBe("print(1 + 2)");
  expect(feedback.expected).toBe("print(2 + 3)");
  expect(feedback.message).toContain("並非 Python 執行輸出檢查");
});
