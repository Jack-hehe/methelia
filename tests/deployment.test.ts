import { afterEach, expect, it, vi } from "vitest";
import { Store } from "../src/server/db";

afterEach(() => vi.unstubAllEnvs());

it("blocks the demo without credentials and fails closed on Render without a password", async () => {
  const { demoAccess } = await import("../src/server/deployment");
  vi.stubEnv("RENDER", "true");
  vi.stubEnv("METHELIA_DEMO_PASSWORD", "");
  expect(demoAccess(new Headers())?.status).toBe(503);
  vi.stubEnv("METHELIA_DEMO_PASSWORD", "a-long-test-password");
  expect(demoAccess(new Headers())?.status).toBe(401);
  const headers = new Headers({
    authorization:
      "Basic " + Buffer.from("demo:a-long-test-password").toString("base64"),
  });
  expect(demoAccess(headers)).toBeNull();
  headers.set(
    "authorization",
    "Basic " + Buffer.from("demo:wrong-password").toString("base64"),
  );
  expect(demoAccess(headers)?.status).toBe(401);
});

it("leaves local development open when no demo password is configured", async () => {
  const { demoAccess } = await import("../src/server/deployment");
  vi.stubEnv("RENDER", "");
  vi.stubEnv("METHELIA_DEMO_PASSWORD", "");
  expect(demoAccess(new Headers())).toBeNull();
});

it("uses the configured HTTPS origin behind Render and rejects unknown hosts", async () => {
  const { publicOrigin } = await import("../src/server/deployment");
  vi.stubEnv("RENDER", "true");
  vi.stubEnv("RENDER_EXTERNAL_URL", "https://methelia-demo.onrender.com");
  vi.stubEnv(
    "METHELIA_ALLOWED_ORIGINS",
    "https://methelia.com,https://www.methelia.com",
  );
  expect(publicOrigin("methelia.com", "http:")).toBe("https://methelia.com");
  expect(publicOrigin("methelia-demo.onrender.com", "http:")).toBe(
    "https://methelia-demo.onrender.com",
  );
  expect(publicOrigin("attacker.example", "https:")).toBeNull();
  expect(publicOrigin("methelia.com:8443", "https:")).toBeNull();
});

it("does not force HTTPS onto localhost", async () => {
  const { publicOrigin } = await import("../src/server/deployment");
  vi.stubEnv("RENDER", "");
  vi.stubEnv("RENDER_EXTERNAL_URL", "");
  vi.stubEnv("METHELIA_ALLOWED_ORIGINS", "");
  expect(publicOrigin("127.0.0.1:3000", "http:")).toBe("http://127.0.0.1:3000");
});

it("shares the daily budget across calls and only resets on the next UTC day", async () => {
  const { reserveUsage } = await import("../src/server/usage");
  vi.stubEnv("METHELIA_AI_DAILY_REQUESTS", "2");
  const store = new Store(":memory:");
  try {
    const now = Date.parse("2026-09-05T10:00:00Z");
    reserveUsage("ai", 1, store, now);
    reserveUsage("ai", 1, store, now);
    expect(() => reserveUsage("ai", 1, store, now)).toThrow(/上限/);
    expect(() => reserveUsage("ai", 1, store, now + 86400000)).not.toThrow();
  } finally {
    store.db.close();
  }
});

it("reserves speech characters before a request and blocks invalid quota settings", async () => {
  const { reserveUsage } = await import("../src/server/usage");
  vi.stubEnv("METHELIA_SPEECH_DAILY_CHARACTERS", "10");
  const store = new Store(":memory:");
  try {
    reserveUsage("speech", 8, store);
    expect(() => reserveUsage("speech", 3, store)).toThrow(/上限/);
    expect(() => reserveUsage("speech", 2, store)).not.toThrow();
    vi.stubEnv("METHELIA_SPEECH_DAILY_CHARACTERS", "invalid");
    expect(() => reserveUsage("speech", 1, store)).toThrow(/設定/);
  } finally {
    store.db.close();
  }
});
