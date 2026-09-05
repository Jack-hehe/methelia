import { expect, it } from "vitest";
import { outputFeedback } from "../src/core/output-feedback";
it("identifies a wrong line and preserves meaningful whitespace", () => {
  expect(outputFeedback("first\n3\n", "first\n5\n")).toContain(
    '第 2 行不同：預期 "5"，實際 "3"',
  );
  expect(outputFeedback("5 \n", "5\n")).toContain('實際 "5 "');
  expect(outputFeedback("5\r\n", "5")).toContain("輸出符合目標");
  expect(outputFeedback("first\n", "first\nsecond\n")).toContain("缺少這一行");
});
