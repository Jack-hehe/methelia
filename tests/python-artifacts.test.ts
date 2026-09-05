import { describe, it, expect } from "vitest";
import { parsePythonArtifacts } from "../src/core/python-artifacts";

describe("Python artifact boundary", () => {
  it("accepts a bounded generated static website", () => {
    expect(
      parsePythonArtifacts({
        "/index.html": "<h1>你好</h1>",
        "/assets/site.css": "body{}",
      }),
    ).toEqual({ "/index.html": "<h1>你好</h1>", "/assets/site.css": "body{}" });
  });
  it.each([
    "/../index.html",
    "/a/../index.html",
    "//index.html",
    "/a\\index.html",
    "/%2e%2e/index.html",
    "/code.py",
    "index.html",
    "/a/./index.html",
  ])("rejects unsafe or unsupported path %s", (path) => {
    expect(() => parsePythonArtifacts({ [path]: "" })).toThrow();
  });
  it("rejects non-text, excessive files, excessive content and invalid Unicode", () => {
    expect(() => parsePythonArtifacts({ "/index.html": 2 })).toThrow();
    expect(() =>
      parsePythonArtifacts(
        Object.fromEntries(
          Array.from({ length: 21 }, (_, i) => [`/${i}.txt`, ""]),
        ),
      ),
    ).toThrow();
    expect(() =>
      parsePythonArtifacts({ "/a.txt": "a".repeat(200001) }),
    ).toThrow();
    expect(() => parsePythonArtifacts({ "/a.txt": "\ud800" })).toThrow();
    expect(() => parsePythonArtifacts(null)).toThrow();
  });
});
