// Only loaded by the isolated worker integration test; never by the application.
const originalFetch = globalThis.fetch;
globalThis.fetch = (url, options) => {
  if (url !== "https://api.fish.audio/v1/tts/stream/with-timestamp")
    throw new Error("Unexpected external request in Fish worker test");
  const local = new URL(process.env.METHELIA_TEST_FISH_URL);
  if (local.hostname !== "127.0.0.1")
    throw new Error("Test provider must be local");
  return originalFetch(local, options);
};
