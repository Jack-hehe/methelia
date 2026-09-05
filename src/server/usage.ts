import { getStore, type Store } from "./db";

export class UsageLimitError extends Error {}

/** Global UTC-day budgets survive restarts. Failed/uncertain requests stay counted. */
export function reserveUsage(
  kind: "ai" | "speech",
  units = 1,
  store?: Store,
  now = Date.now(),
) {
  const variable =
    kind === "ai"
      ? "METHELIA_AI_DAILY_REQUESTS"
      : "METHELIA_SPEECH_DAILY_CHARACTERS";
  const configured = process.env[variable]?.trim();
  if (!configured && process.env.RENDER !== "true") return;
  const limit = Number(configured || (kind === "ai" ? 100 : 30000));
  if (!Number.isSafeInteger(limit) || limit < 0)
    throw new UsageLimitError(`${variable} 設定必須是非負整數。`);
  if (!Number.isSafeInteger(units) || units < 1)
    throw new Error("Invalid generation usage");
  const day = new Date(now).toISOString().slice(0, 10);
  const db = (store || getStore()).db;
  // One atomic statement, shared by the web process and background worker.
  const accepted = db
    .prepare(
      `
    INSERT INTO daily_usage(day,kind,units) SELECT ?,?,? WHERE ?<=?
    ON CONFLICT(day,kind) DO UPDATE SET units=daily_usage.units+excluded.units
      WHERE daily_usage.units+excluded.units<=?
    RETURNING units
  `,
    )
    .get(day, kind, units, units, limit, limit);
  if (!accepted)
    throw new UsageLimitError(
      `今日${kind === "ai" ? "AI 請求" : "語音字數"}已達 demo 上限；仍可使用已準備的課程。請管理者調整額度或隔日重試（UTC）。`,
    );
}
