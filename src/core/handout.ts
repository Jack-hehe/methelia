import type { Chapter, Graph, Section } from "./protocol";

const labels = {
  en: {
    handout: "Course handout",
    objective: "Learning objective",
    terminal: "Practice Terminal",
    noFiles: "No practice files are prepared for this chapter.",
    preview:
      "Open the interactive website preview in the course workspace. This chapter's source code is included at the end of the chapter.",
    myAnswer: "My answer:",
    demonstration: "Demonstration",
    find: "Find this content",
    replace: "Replace with",
    previewClick: "Preview action: click",
    chapter: (number: number) => `Chapter ${number}`,
    files: "Chapter practice files",
    answer: "Answer",
    reference: "Answer key",
    explanations: "Quiz answers and explanations",
    print: 'Use your browser\'s Print command and choose "Save as PDF".',
    contentsLabel: "Handout contents",
    contents: "Contents",
    included: (count: number) =>
      `This handout includes ${count} prepared ${count === 1 ? "chapter" : "chapters"}.`,
    emptyTitle: "No chapters are ready to export yet",
    emptyBody:
      "Download the handout again after your chapters are ready to get the lessons and exercises.",
    prepared: (count: number) =>
      `${count} prepared ${count === 1 ? "chapter" : "chapters"}`,
  },
  "zh-TW": {
    handout: "課程講義",
    objective: "學習目標",
    terminal: "教學 Terminal",
    noFiles: "本章沒有準備實作檔案。",
    preview: "互動網頁預覽請在課程實作區開啟；本章準備的原始碼收錄於章末。",
    myAnswer: "我的答案：",
    demonstration: "操作示範",
    find: "找到這段內容",
    replace: "修改為",
    previewClick: "預覽操作：點選",
    chapter: (number: number) => `第 ${number} 章`,
    files: "本章實作檔案",
    answer: "答案",
    reference: "參考答案",
    explanations: "測驗答案與解析",
    print: "使用瀏覽器的「列印」功能，可選擇另存為 PDF。",
    contentsLabel: "講義目錄",
    contents: "章節目錄",
    included: (count: number) => `本講義收錄 ${count} 個已準備好的章節。`,
    emptyTitle: "目前尚無可匯出的章節",
    emptyBody: "課程章節準備完成後，再次下載講義即可取得教材與練習。",
    prepared: (count: number) => `${count} 個已準備章節`,
  },
};
type Labels = (typeof labels)[keyof typeof labels];

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function codeBlock(label: string, code: string): string {
  return `<figure class="code-block"><figcaption>${escape(label)}</figcaption><pre><code>${escape(code)}</code></pre></figure>`;
}

function renderComponent(
  section: Section,
  chapter: Chapter,
  copy: Labels,
): string {
  const component = section.component;
  switch (component.type) {
    case "lab.experiment":
      return `<p>${escape(component.mission)}</p><pre>${escape(JSON.stringify(component.initial || {}, null, 2))}</pre>`;
    case "lesson.article":
      return (
        component.paragraphs.map((p) => `<p>${escape(p)}</p>`).join("") +
        (component.figure
          ? `<ol>${component.figure.items.map((item) => `<li><strong>${escape(item.label)}</strong><p>${escape(item.description)}</p></li>`).join("")}</ol><p>${escape(component.figure.caption)}</p>`
          : "") +
        `<aside>${escape(component.takeaway)}</aside>`
      );
    case "concept.canvas":
      return `<dl class="concepts">${component.cards.map((card) => `<div><dt>${escape(card.title)}</dt><dd>${escape(card.body)}</dd></div>`).join("")}</dl>`;
    case "steps.sequence":
      return `<ol class="sequence">${component.steps.map((step) => `<li><strong>${escape(step.title)}</strong><p>${escape(step.body)}</p></li>`).join("")}</ol>`;
    case "diagram.flow":
      return `<ol class="sequence flow">${component.items.map((item) => `<li><strong>${escape(item.label)}</strong><p>${escape(item.description)}</p></li>`).join("")}</ol>`;
    case "dom.explorer":
      return `<dl class="concepts">${component.elements.map((element) => `<div><dt><code>&lt;${escape(element.tag)}&gt;</code> ${escape(element.label)}</dt><dd>${escape(element.description)}</dd></div>`).join("")}</dl>`;
    case "code.editor":
      return codeBlock(
        `${component.path} · ${component.language}`,
        component.example,
      );
    case "terminal":
      return codeBlock(
        copy.terminal,
        component.commands.map((command) => `$ ${command}`).join("\n"),
      );
    case "file.tree": {
      const paths = Object.keys(chapter.workspaceSetup);
      return paths.length
        ? `<ul class="file-list">${paths.map((path) => `<li><code>${escape(path)}</code></li>`).join("")}</ul>`
        : `<p class="note">${copy.noFiles}</p>`;
    }
    case "browser.preview":
      return `<p class="note">${copy.preview}</p>`;
    case "quiz.choice":
      return `<div class="quiz"><h4>${escape(component.question)}</h4><ol type="A">${component.options.map((option) => `<li>${escape(option)}</li>`).join("")}</ol><p class="answer-space">${copy.myAnswer}________________</p></div>`;
  }
}

function renderGuide(section: Section, copy: Labels): string {
  if (!section.guide) return "";
  return `<div class="guide"><h4>${copy.demonstration} · ${escape(section.guide.path)}</h4>${codeBlock(copy.find, section.guide.find)}${codeBlock(copy.replace, section.guide.replacement)}${section.guide.previewClick ? `<p>${copy.previewClick} <code>${escape(section.guide.previewClick)}</code>${copy === labels.en ? "." : "。"}</p>` : ""}</div>`;
}

function renderChapter(chapter: Chapter, index: number, copy: Labels): string {
  const workspace = Object.entries(chapter.workspaceSetup);
  return `<article class="chapter" id="chapter-${index + 1}">
    <header class="chapter-header"><p class="eyebrow">${copy.chapter(index + 1)}</p><h2>${escape(chapter.title)}</h2><p class="objective"><strong>${copy.objective}</strong> ${escape(chapter.objective)}</p></header>
    ${chapter.sections.map((section, sectionIndex) => `<section class="lesson"><h3><span>${index + 1}.${sectionIndex + 1}</span> ${escape(section.title)}</h3><p class="body-copy">${escape(section.body)}</p>${renderComponent(section, chapter, copy)}${renderGuide(section, copy)}</section>`).join("\n")}
    ${workspace.length ? `<section class="workspace"><h3>${copy.files}</h3>${workspace.map(([path, content]) => codeBlock(path, content)).join("")}</section>` : ""}
  </article>`;
}

function renderAnswers(chapters: Chapter[], copy: Labels): string {
  const answers = chapters.flatMap((chapter, chapterIndex) =>
    chapter.sections.flatMap((section, sectionIndex) => {
      const component = section.component;
      if (component.type !== "quiz.choice") return [];
      return [
        `<section class="answer"><p class="eyebrow">${copy.chapter(chapterIndex + 1)} · ${chapterIndex + 1}.${sectionIndex + 1}</p><h3>${escape(section.title)}</h3><p>${escape(component.question)}</p><p class="correct-answer"><strong>${copy.answer} ${String.fromCharCode(65 + component.answer)}</strong> ${escape(component.options[component.answer] ?? "")}</p><p>${escape(component.explanation)}</p></section>`,
      ];
    }),
  );
  return answers.length
    ? `<article class="answer-appendix"><header class="chapter-header"><p class="eyebrow">${copy.reference}</p><h2>${copy.explanations}</h2></header>${answers.join("\n")}</article>`
    : "";
}

const printStyles = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f3f1ed; color: #24232b; font: 11pt/1.75 system-ui, -apple-system, "Segoe UI", "Noto Sans TC", sans-serif; }
  main { max-width: 210mm; margin: 24px auto; padding: 18mm; background: #fff; }
  h1, h2, h3, h4, p, figure { margin: 0; }
  h1 { font-size: 28pt; line-height: 1.3; letter-spacing: -.035em; overflow-wrap: anywhere; }
  h2 { font-size: 22pt; line-height: 1.4; overflow-wrap: anywhere; }
  h3 { font-size: 14pt; line-height: 1.5; margin: 0 0 12px; break-after: avoid; overflow-wrap: anywhere; }
  h3 > span { color: #7355a2; margin-right: 7px; font-size: 11pt; }
  h4 { font-size: 11pt; margin-bottom: 10px; break-after: avoid; }
  p, dd, li { overflow-wrap: anywhere; orphans: 3; widows: 3; }
  p + p { margin-top: 10px; }
  .eyebrow { color: #73687d; font-size: 9pt; letter-spacing: .06em; margin-bottom: 14px; }
  .cover { padding-bottom: 30px; }
  .cover .goal { margin-top: 24px; padding: 18px 20px; background: #f4f1f8; border-left: 3px solid #9c84b8; white-space: pre-wrap; }
  .print-note, .note { color: #665e6c; font-size: 10pt; }
  .print-note { margin-top: 20px; }
  .contents { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ded9e3; }
  .contents li { padding-left: 5px; margin: 12px 0; }
  .contents a { color: inherit; text-decoration: none; font-weight: 600; }
  .contents small { display: block; margin-top: 3px; color: #665e6c; font-size: 10pt; white-space: pre-wrap; }
  .chapter, .answer-appendix { break-before: page; page-break-before: always; margin-top: 40px; }
  .chapter-header { border-bottom: 1px solid #cfc6d9; padding-bottom: 20px; margin-bottom: 26px; }
  .objective { margin-top: 14px; white-space: pre-wrap; }
  .objective > strong { color: #6f557f; margin-right: 8px; }
  .lesson { margin-bottom: 28px; }
  .body-copy { white-space: pre-wrap; margin-bottom: 16px; }
  .concepts { display: block; margin: 12px 0; }
  .concepts > div { border: 1px solid #e1dce5; border-radius: 6px; padding: 14px 16px; margin-bottom: 10px; break-inside: avoid; }
  dt { font-weight: 650; }
  dd { margin: 5px 0 0; white-space: pre-wrap; }
  .sequence { padding-left: 26px; }
  .sequence li { padding-left: 8px; margin: 14px 0; break-inside: avoid; }
  .sequence li::marker { color: #7355a2; font-weight: 600; }
  .sequence p { white-space: pre-wrap; margin-top: 4px; }
  .flow li { border-left: 2px solid #ded3e8; padding: 7px 14px; }
  .code-block { margin: 12px 0 18px; border: 1px solid #dcd7e1; border-radius: 5px; }
  figcaption { padding: 7px 12px; border-bottom: 1px solid #dcd7e1; background: #f6f4f8; color: #66596f; font-size: 9pt; overflow-wrap: anywhere; break-after: avoid; }
  pre { margin: 0; padding: 12px; font-size: 9pt; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; tab-size: 2; }
  code { font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace; }
  .quiz { padding: 18px; border: 1px solid #dcd7e1; border-radius: 6px; break-inside: avoid; }
  .quiz ol { padding-left: 26px; margin: 10px 0; }
  .quiz li { padding-left: 6px; margin: 7px 0; white-space: pre-wrap; }
  .answer-space { margin-top: 22px; color: #665e6c; }
  .guide { border-left: 2px solid #dad2e2; padding-left: 16px; margin-top: 18px; }
  .workspace { border-top: 1px solid #ded9e3; padding-top: 22px; margin-top: 30px; }
  .answer { padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid #e6e0e9; break-inside: avoid; }
  .answer .eyebrow { margin-bottom: 6px; }
  .answer p { white-space: pre-wrap; }
  .correct-answer { background: #f4f1f8; padding: 10px 14px; }
  .correct-answer strong { margin-right: 10px; }
  .empty { padding: 24px; margin-top: 26px; border: 1px dashed #cfc6d9; }
  footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e6e0e9; color: #766d7c; font-size: 9pt; }
  @page { size: A4; margin: 17mm 16mm 19mm; }
  @media print {
    body { background: #fff; }
    main { max-width: none; margin: 0; padding: 0; }
    .chapter, .answer-appendix { margin-top: 0; }
    .print-note { display: none; }
    a { color: inherit; }
  }
  @media screen and (max-width: 700px) {
    main { margin: 0; padding: 24px; }
    h1 { font-size: 24pt; }
  }
`;

/** Render prepared course material without executing or embedding its markup. */
export function renderHandout(
  course: { goal: string; graph: Graph | null; language?: "en" | "zh-TW" },
  chapters: Chapter[],
): string {
  const language = course.language ?? "zh-TW";
  const copy = labels[language];
  const title = course.graph?.title || course.goal || copy.handout;
  return `<!doctype html>
<html lang="${language === "en" ? "en" : "zh-Hant"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
  <title>${escape(title)} · ${copy.handout}</title>
  <style>${printStyles}</style>
</head>
<body><main>
  <header class="cover"><p class="eyebrow">METHELIA · ${copy.handout}</p><h1>${escape(title)}</h1><p class="goal"><strong>${copy.objective}</strong><br>${escape(course.goal)}</p><p class="print-note">${escape(copy.print)}</p>
  ${chapters.length ? `<nav class="contents" aria-label="${copy.contentsLabel}"><h2>${copy.contents}</h2><p class="note">${copy.included(chapters.length)}</p><ol>${chapters.map((chapter, index) => `<li><a href="#chapter-${index + 1}">${escape(chapter.title)}</a><small>${escape(chapter.objective)}</small></li>`).join("")}</ol></nav>` : `<div class="empty"><h2>${copy.emptyTitle}</h2><p>${copy.emptyBody}</p></div>`}
  </header>
  ${chapters.map((chapter, index) => renderChapter(chapter, index, copy)).join("\n")}
  ${renderAnswers(chapters, copy)}
  <footer>Methelia · ${copy.prepared(chapters.length)}</footer>
</main></body>
</html>`;
}
