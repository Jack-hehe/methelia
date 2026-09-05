import { expect, it } from "vitest";
import { buildPreview } from "../src/core/preview";
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
