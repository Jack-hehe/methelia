import { expect, it } from "vitest";
import { sameOrigin } from "../src/server/origin";
it("accepts the public host when Next normalizes the internal URL to localhost", () => {
  expect(sameOrigin("http://127.0.0.1:3000", "127.0.0.1:3000", "http:")).toBe(
    true,
  );
});
it("rejects cross-site origins and changed ports", () => {
  expect(
    sameOrigin("https://attacker.example", "127.0.0.1:3000", "http:"),
  ).toBe(false);
  expect(sameOrigin("http://127.0.0.1:4000", "127.0.0.1:3000", "http:")).toBe(
    false,
  );
});
