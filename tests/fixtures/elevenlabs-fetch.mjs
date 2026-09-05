// Only imported by isolated integration tests. Never allow a real provider call.
const originalFetch = globalThis.fetch;
globalThis.fetch = (url, options) => {
  const requested = new URL(url);
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
