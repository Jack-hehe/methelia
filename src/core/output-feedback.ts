import { copyFor, type Language } from "./language";
export function outputFeedback(
  actual: string,
  expected: string,
  language: Language = "zh-TW",
): string {
  const t = copyFor(language);
  const lines = (text: string) =>
    text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
  const a = lines(actual),
    e = lines(expected);
  for (let i = 0; i < Math.max(a.length, e.length); i++) {
    if (a[i] !== e[i])
      return language === "en"
        ? `Line ${i + 1} differs: expected ${e[i] === undefined ? "(no line)" : JSON.stringify(e[i].slice(0, 300))}, actual ${a[i] === undefined ? "(missing line)" : JSON.stringify(a[i].slice(0, 300))}.`
        : `第 ${i + 1} 行不同：預期 ${e[i] === undefined ? "（沒有這一行）" : JSON.stringify(e[i].slice(0, 300))}，實際 ${a[i] === undefined ? "（缺少這一行）" : JSON.stringify(a[i].slice(0, 300))}。`;
  }
  return t(
    "輸出符合目標。接著驗證練習，儲存學習進度。",
    "The output matches. Check your practice to save your progress.",
  );
}
