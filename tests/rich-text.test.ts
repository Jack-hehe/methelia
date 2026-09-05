import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText } from "../src/components/rich-text";

const render = (text: string) =>
  renderToStaticMarkup(createElement(RichText, { text }));

it("renders the paragraph, bold and numbered structure a tutor replies with", () => {
  const html = render(
    "這篇論文的核心是提出 **Transformer**。\n\n其關鍵思想可概括為三點：\n\n1. **以自注意力取代循環計算**\n   序列中的每個位置可以直接與其他位置建立關聯。\n2. **以 Multi-Head Attention 學習多種關係**\n   模型將查詢投影到多個表示子空間。",
  );
  expect(html).toContain("<strong>Transformer</strong>");
  expect(html).toContain("<ol>");
  expect(html).toContain("<strong>以自注意力取代循環計算</strong>");
  expect(html).toContain("序列中的每個位置");
  expect(html.match(/<li>/g)).toHaveLength(2);
});

it("keeps model output as text, never as markup", () => {
  const html = render(
    '<img src=x onerror="alert(1)"> 與 <script>alert(2)</script>',
  );
  expect(html).not.toContain("<img");
  expect(html).not.toContain("<script");
  expect(html).toContain("&lt;img");
});

it("renders fenced code without treating its contents as markdown", () => {
  const html = render("試試看：\n\n```\n<h1>Hello</h1>\n**not bold**\n```");
  expect(html).toContain("<pre><code>");
  expect(html).toContain("&lt;h1&gt;Hello&lt;/h1&gt;");
  expect(html).toContain("**not bold**");
});

it("does not mistake a bold line for a bullet, and keeps unmatched markers literal", () => {
  expect(render("**重點**")).toBe("<p><strong>重點</strong></p>");
  expect(render("2 * 3 * 4 的結果")).toContain("2 * 3 * 4 的結果");
});

it("separates unordered from ordered runs instead of merging them", () => {
  const html = render("- 第一\n- 第二\n\n1. 步驟一\n2. 步驟二");
  expect(html).toContain("<ul>");
  expect(html).toContain("<ol>");
  expect(html.indexOf("<ul>")).toBeLessThan(html.indexOf("<ol>"));
});
