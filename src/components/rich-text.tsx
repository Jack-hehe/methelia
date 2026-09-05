import { createElement, Fragment, type ReactNode } from "react";

/** Inline spans. Model text is never injected as HTML, only as React children. */
function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*([^*\n]+)\*\*|`([^`\n]+)`/g;
  let last = 0,
    key = 0,
    match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      match[1] !== undefined
        ? createElement("strong", { key: key++ }, match[1])
        : createElement("code", { key: key++ }, match[2]),
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** The small Markdown subset a tutor actually emits: paragraphs, headings,
 * ordered/unordered lists, fenced code, bold and inline code. Anything else
 * stays literal rather than being guessed at. */
function blocks(text: string): ReactNode[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let paragraph: string[] = [],
    list: { ordered: boolean; items: string[] } | null = null,
    fence: string[] | null = null,
    key = 0;
  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(
      createElement("p", { key: key++ }, ...inline(paragraph.join("\n"))),
    );
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    out.push(
      createElement(
        list.ordered ? "ol" : "ul",
        { key: key++ },
        ...list.items.map((item, i) =>
          createElement("li", { key: i }, ...inline(item)),
        ),
      ),
    );
    list = null;
  };
  const flush = () => {
    flushParagraph();
    flushList();
  };
  const closeFence = () => {
    out.push(
      createElement(
        "pre",
        { key: key++ },
        createElement("code", null, fence!.join("\n")),
      ),
    );
    fence = null;
  };
  for (const line of lines) {
    if (fence) {
      if (line.trim().startsWith("```")) closeFence();
      else fence.push(line);
      continue;
    }
    if (line.trim().startsWith("```")) {
      flush();
      fence = [];
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      out.push(
        createElement(
          "strong",
          { key: key++, className: "rich-heading" },
          ...inline(heading[1]),
        ),
      );
      continue;
    }
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line),
      unordered = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (ordered || unordered) {
      flushParagraph();
      if (list && list.ordered !== Boolean(ordered)) flushList();
      if (!list) list = { ordered: Boolean(ordered), items: [] };
      list.items.push((ordered || unordered)![1]);
      continue;
    }
    if (list) {
      // An indented run-on line belongs to the bullet above it.
      if (/^\s{2,}/.test(line) && list.items.length) {
        list.items[list.items.length - 1] += "\n" + line.trim();
        continue;
      }
      flushList();
    }
    paragraph.push(line);
  }
  if (fence) closeFence();
  flush();
  return out;
}

export function RichText({ text }: { text: string }) {
  return createElement(Fragment, null, ...blocks(text));
}
