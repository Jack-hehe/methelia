// Only imported by isolated integration tests. Never allow a real provider call.
const originalFetch = globalThis.fetch;
globalThis.fetch = (url, options) => {
  const requested = new URL(url);
  // Combined content/speech tests may also use a local model double.
  if (process.env.AI_BASE_URL) {
    const model = new URL(process.env.AI_BASE_URL);
    if (
      model.hostname === "127.0.0.1" &&
      requested.origin === model.origin &&
      requested.pathname ===
        model.pathname.replace(/\/$/, "") + "/chat/completions"
    )
      return originalFetch(url, options);
  }
  if (
    requested.origin !== "https://api.elevenlabs.io" ||
    !requested.pathname.endsWith("/with-timestamps")
  )
    throw new Error("Unexpected external request in speech worker test");
  const local = new URL(process.env.METHELIA_TEST_SPEECH_URL);
  if (local.hostname !== "127.0.0.1")
    throw new Error("Test provider must be local");
  local.pathname = requested.pathname;
  return originalFetch(local, options);
};
