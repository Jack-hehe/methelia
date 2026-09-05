import { expect, it } from "vitest";
import { buildPreview } from "../src/core/preview";
it("highlights a selected HTML tag without modifying learner files", () => {
  const files = {"/index.html":"<h1>Title</h1><p>Introduction</p>"};
  const html = buildPreview(files, undefined, "h1");
  expect(html).toContain("h1 { outline: 3px solid #7355c9");
  expect(files["/index.html"]).toBe("<h1>Title</h1><p>Introduction</p>");
  expect(buildPreview(files,undefined,"</style><script>bad()</script>")).not.toContain("bad()");
});
it("assembles saved local HTML CSS and JS in an isolated document", () => {
  const html = buildPreview({
    "/index.html":
      '<link rel="stylesheet" href="style.css"><h1>Hello</h1><script src="app.js"></script>',
    "/style.css": "h1 { color: red; }",
    "/app.js": 'document.title="Ready";',
  });
  expect(html).toContain("h1 { color: red; }");
  expect(html).toContain('document.title="Ready"');
  expect(html).toContain("connect-src 'none'");
  expect(html).not.toContain('src="app.js"');
});
