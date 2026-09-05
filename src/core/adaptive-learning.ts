import type { LearningAttempt, LearningDepth } from "./state";

const depths: LearningDepth[] = ["foundation", "applied", "advanced"];

export function recommendDepth(
  attempts: LearningAttempt[],
  fromNodeId: string,
  currentDepth: LearningDepth,
  language: "zh-TW" | "en" = "en",
): { depth: LearningDepth; reason: string } | null {
  const evidence = attempts.filter((attempt) => attempt.nodeId === fromNodeId);
  const first = new Map<string, LearningAttempt>();
  for (const attempt of evidence)
    if (!first.has(attempt.sectionId)) first.set(attempt.sectionId, attempt);
  if (first.size < 2) return null;
  const passed = [...first.values()].filter((attempt) => attempt.passed).length;
  const rate = passed / first.size;
  const failures = evidence.filter((attempt) => !attempt.passed).length;
  const index = depths.indexOf(currentDepth);
  if (
    rate >= 0.8 &&
    !evidence.some((attempt) => attempt.usedHelp) &&
    index < depths.length - 1
  )
    return {
      depth: depths[index + 1],
      reason:
        language === "zh-TW"
          ? `${first.size} 個檢核中有 ${passed} 個首次作答通過，且沒有本章提問紀錄；建議下一章加深一級。`
          : `${passed}/${first.size} checkpoints passed on the first attempt without recorded help; try one level more depth.`,
    };
  if (rate <= 0.5 && failures >= 2 && index > 0)
    return {
      depth: depths[index - 1],
      reason:
        language === "zh-TW"
          ? `${first.size} 個檢核中有 ${passed} 個首次作答通過，累計 ${failures} 次未通過；建議下一章增加基礎練習，降低一級。`
          : `${passed}/${first.size} checkpoints passed on the first attempt, with ${failures} failed attempts; add foundational practice next.`,
    };
  return null;
}
