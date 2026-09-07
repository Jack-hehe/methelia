"use client";
import { useEffect, useState } from "react";
import type { PackageState } from "../core/state";
import { useCourseLanguage } from "./course-language";
import styles from "./generation-progress.module.css";

export function GenerationProgress({
  planning = false,
  pkg,
  compact = false,
}: {
  planning?: boolean;
  pkg?: PackageState;
  compact?: boolean;
}) {
  const { t } = useCourseLanguage();
  const stage = planning
    ? 0
    : pkg?.status !== "ready"
      ? 1
      : pkg.speech === "ready"
        ? 3
        : 2;
  const failed = pkg?.status === "failed" || pkg?.speech === "failed";
  const running =
    (!failed && stage < 3 && pkg?.speech !== "not_requested") ||
    (!failed && stage < 2);
  const phaseKey = `${pkg?.id ?? "planning"}:${stage}:${running}`;
  const [clock, setClock] = useState({ key: phaseKey, seconds: 0 });
  const seconds = clock.key === phaseKey ? clock.seconds : 0;
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const timer = setInterval(
      () => setClock({ key: phaseKey, seconds: (Date.now() - start) / 1000 }),
      1000,
    );
    return () => clearInterval(timer);
  }, [phaseKey, running]);
  // Visual waiting feedback only: it cannot cross a real stage boundary.
  const visualProgress =
    stage + (running ? 0.78 * (1 - Math.exp(-seconds / 22)) : 0);
  const asides = [
    t(
      "先伸個懶腰，等等換大腦動一動。",
      "A quick stretch now. A little brain exercise next.",
    ),
    t(
      "不必一次懂全部，好奇心先帶上就好。",
      "You don’t need every answer. Just bring your curiosity.",
    ),
    t(
      "水杯準備好了嗎？你的好奇心待會可能會口渴。",
      "Water nearby? All that curiosity might get thirsty.",
    ),
    t(
      "學會之前，先允許自己有一點問號。",
      "A few question marks are a perfectly good place to start.",
    ),
  ];
  const labels = [
    t("規劃路徑", "Plan the path"),
    t("製作內容", "Create the lesson"),
    t("準備語音", "Prepare narration"),
  ];
  const detail = failed
    ? pkg?.status === "ready"
      ? t(
          "內容已完成，可以先閱讀。語音準備失敗，可稍後重試。",
          "The lesson is ready to read. Narration failed and can be retried.",
        )
      : t("準備遇到問題，請重試。", "Preparation failed. Please retry.")
    : planning
      ? t(
          "正在根據你的回答安排學習路徑 ...",
          "Planning a learning path from your answers ...",
        )
      : stage === 1
        ? pkg?.status === "queued"
          ? t("章節已排入製作佇列。", "Your chapter is queued for preparation.")
          : t(
              "正在編寫講解、示範與練習，並檢查內容。",
              "Writing explanations, demonstrations and practice, and checking the content.",
            )
        : stage === 2
          ? pkg?.speech === "not_requested"
            ? t(
                "內容已完成，可以開始閱讀。語音尚未啟用。",
                "The lesson is ready to read. Narration is not enabled yet.",
              )
            : t(
                "內容已完成，可以先閱讀；整章語音準備中。",
                "You can start reading now while chapter narration is prepared.",
              )
          : t(
              "內容與語音都已準備完成。",
              "The lesson and narration are ready.",
            );
  return (
    <div className={`${styles.root} ${compact ? styles.compact : ""}`}>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={t("課程製作進度", "Course preparation progress")}
        aria-valuetext={detail}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={stage}
      >
        <span
          className={styles.fill}
          style={{ width: `${(visualProgress / 3) * 100}%` }}
        />
      </div>
      {!compact && (
        <ol className={styles.labels}>
          {labels.map((label, i) => (
            <li key={label} aria-current={i === stage ? "step" : undefined}>
              {label}
            </li>
          ))}
        </ol>
      )}
      <p role="status">{detail}</p>
      {!compact && running && (
        <div className={styles.aside}>
          <span key={Math.floor(seconds / 8)}>
            {asides[Math.floor(seconds / 8) % asides.length]}
          </span>
        </div>
      )}
    </div>
  );
}
