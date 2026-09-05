import {
  type Graph,
  type Chapter,
  type LearningNode,
  validateChapter,
} from "./protocol";

const starterFiles = {
  "/index.html":
    '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <main>\n    <span class="eyebrow">HTML / CSS / JavaScript</span>\n    <h1>My first website</h1>\n    <p>This paragraph uses the p tag.</p>\n    <button id="hello">Say hello ↗</button>\n  </main>\n  <script src="app.js"></script>\n</body>\n</html>',
  "/style.css":
    "body { margin: 0; background: #f3efe8; color: #30283d; font-family: system-ui, sans-serif; }\nmain { max-width: 540px; margin: 80px auto; padding: 36px; }\n.eyebrow { font-size: 11px; letter-spacing: 3px; color: #8a749c; }\nh1 { font-size: 42px; letter-spacing: -2px; }\np { line-height: 1.8; color: #797080; }\nbutton { margin-top: 20px; border: 0; background: #7057cd; color: white; padding: 14px 24px; border-radius: 28px; cursor: pointer; }",
  "/app.js":
    'document.querySelector("#hello").addEventListener("click", () => {\n  document.querySelector("h1").textContent = "Nice to meet you!";\n});',
};

export function englishDemoGraph(): Graph {
  const lessons = [
    [
      "web",
      "Meet the three languages of the web",
      "Identify the roles of HTML, CSS, and JavaScript in a website",
      6,
    ],
    [
      "html",
      "Build the structure with HTML",
      "Use semantic tags to structure a personal homepage",
      8,
    ],
    [
      "css",
      "CSS: color and spacing",
      "Change CSS colors, spacing, and font sizes",
      8,
    ],
    [
      "js",
      "JavaScript: click events",
      "Respond to button clicks with an event listener",
      7,
    ],
    [
      "publish",
      "Terminal: preview and export",
      "Check your website and export deployable static files",
      5,
    ],
  ] as const;
  return {
    schemaVersion: 1,
    title: "Build your first website from scratch",
    nodes: lessons.map(([id, title, objective, minutes], i) => ({
      id,
      title,
      objective,
      minutes,
      kind: "main",
      prerequisites: i ? [lessons[i - 1][0]] : [],
    })),
    edges: lessons.slice(1).map((n, i) => ({ from: lessons[i][0], to: n[0] })),
  };
}

export function englishDemoChapter(node: LearningNode): Chapter {
  const language =
    node.id === "css" ? "css" : node.id === "js" ? "javascript" : "html";
  const path =
    language === "css"
      ? "/style.css"
      : language === "javascript"
        ? "/app.js"
        : "/index.html";
  const publish = node.id === "publish";
  const change =
    language === "css"
      ? "find background inside button and replace #7057cd with #23856b. The button changes from purple to green"
      : language === "javascript"
        ? 'replace "Nice to meet you!" with Hello Methelia, then click the button on the left to update the heading'
        : "find h1 and replace only the text between its tags with Hello Methelia. The heading on the left updates";
  const cards =
    language === "css"
      ? [
          {
            title: "color",
            body: "Change color to give text a new color. For example, color: green makes the text green.",
            accent: "blue",
          },
          {
            title: "padding",
            body: "Is the text too close to the button edge? Increase padding to leave more space around it.",
            accent: "violet",
          },
          {
            title: "background",
            body: "Change background to give the button a new fill color. Soon you will switch purple to green.",
            accent: "green",
          },
        ]
      : language === "javascript"
        ? [
            {
              title: "querySelector",
              body: "First, find the element you want to control. querySelector('#hello') finds the button whose id is hello.",
              accent: "blue",
            },
            {
              title: "addEventListener",
              body: "Tell the button which code to run when someone clicks it. The click event represents that action.",
              accent: "violet",
            },
            {
              title: "textContent",
              body: "Replace the text inside an element. For example, set the heading's textContent to Hello Methelia.",
              accent: "green",
            },
          ]
        : [
            {
              title: "h1",
              body: "Place the main heading between <h1> and </h1>. Try giving it a new name.",
              accent: "blue",
            },
            {
              title: "p",
              body: "Use p for an introductory paragraph. Put your text between <p> and </p>.",
              accent: "violet",
            },
            {
              title: "button",
              body: "button creates a clickable button. The text between its tags becomes its label.",
              accent: "green",
            },
          ];
  const editor = {
    type: "code.editor",
    path,
    language,
    example: starterFiles[path],
  };
  const sections =
    node.id === "web"
      ? [
          {
            id: "languages",
            title: "The roles of HTML, CSS, and JavaScript",
            body: "Select CSS and choose a button color. Then select JavaScript and click the button. Explore how the same page can change.",
            intent: "explain",
            template: "compare",
            component: {
              type: "concept.canvas",
              cards: [
                {
                  title: "HTML",
                  body: "What headings, text, and buttons belong on the page? HTML defines the content and its order.",
                  accent: "amber",
                },
                {
                  title: "CSS",
                  body: "Choose a color and watch the button on the right change. CSS controls colors, sizes, and spacing.",
                  accent: "violet",
                },
                {
                  title: "JavaScript",
                  body: "Click the button on the right to change its text. JavaScript makes a website respond to your actions.",
                  accent: "blue",
                },
              ],
            },
          },
          {
            id: "structure",
            title: "HTML tags and the page",
            body: "Select h1 to find the heading. Open the practice workspace and replace the text inside h1 with Hello Methelia. Keep both tags.",
            intent: "demonstrate",
            template: "split",
            guide: {
              path: "/index.html",
              find: "My first website",
              replacement: "Hello Methelia",
            },
            component: {
              type: "dom.explorer",
              elements: [
                {
                  tag: "h1",
                  label: "My first website",
                  description:
                    "h1 tells the browser this is the main heading. Replace the text between its tags to update the heading on the page.",
                },
                {
                  tag: "p",
                  label: "This paragraph uses the p tag.",
                  description:
                    "Want to introduce yourself? Write between <p> and </p>. The p tag holds a paragraph.",
                },
                {
                  tag: "button",
                  label: "Say hello ↗",
                  description:
                    "button creates a button. JavaScript tells it what to do when someone clicks it.",
                },
              ],
            },
          },
          {
            id: "check",
            title: "Practice: choose the right language",
            body: "Your turn: change only the color, keeping the text and click behavior the same.",
            intent: "check",
            template: "focus",
            component: {
              type: "quiz.choice",
              question:
                "Which language should you change to turn a purple button green?",
              options: [
                "HTML: content and structure",
                "CSS: appearance and style",
                "JavaScript: interactive behavior",
              ],
              answer: 1,
              explanation:
                "Correct: change background in CSS to switch colors. HTML places the button, CSS defines its appearance, and JavaScript decides what happens when you click.",
            },
            completion: { type: "quiz" },
          },
        ]
      : [
          {
            id: "intro",
            title: node.title,
            body: publish
              ? "Type ls on the right and press Enter to see the filenames. The Terminal lets you give instructions using text."
              : language === "css"
                ? "Want a new text color or a bigger button? Select these three settings to explore the CSS you will use next."
                : language === "javascript"
                  ? "What should happen after a click? JavaScript can find a button and decide what to do when you click it."
                  : "Headings and paragraphs are pieces of HTML. Select h1, p, and button to explore what each one contains.",
            intent: "explain",
            template: publish ? "workspace" : "narrative",
            component: publish
              ? { type: "terminal", commands: ["ls", "cat index.html"] }
              : { type: "concept.canvas", cards },
          },
          {
            id: "demonstration",
            title: publish
              ? "Inspect your website files"
              : language === "css"
                ? "Demo: change the button color"
                : language === "javascript"
                  ? "Demo: change the click result"
                  : "Demo: change the heading",
            body: publish
              ? "Type cat index.html and press Enter. The right side shows the file's code; the left shows how the browser renders it."
              : `Watch the demonstration: type edit ${path.slice(1)} to open the file. Then ${change}.`,
            intent: "demonstrate",
            template: "workspace",
            component: publish
              ? { type: "terminal", commands: ["ls", "cat index.html"] }
              : editor,
            ...(publish
              ? {}
              : {
                  guide: {
                    path,
                    find:
                      language === "css"
                        ? "#7057cd"
                        : language === "javascript"
                          ? "Nice to meet you!"
                          : "My first website",
                    replacement:
                      language === "css" ? "#23856b" : "Hello Methelia",
                    ...(language === "javascript"
                      ? { previewClick: "hello" }
                      : {}),
                  },
                }),
          },
          {
            id: "practice",
            title: publish
              ? "Start the website preview"
              : "Practice: edit and save",
            body: publish
              ? 'Type python -m http.server 8000 and press Enter to start the website preview. This teaching environment simulates the preview command; it does not run Python. Then select "Check my work".'
              : `Your turn. Type edit ${path.slice(1)}, then ${change}. Save and select "Check my work".`,
            intent: "practice",
            template: "workspace",
            component: publish
              ? {
                  type: "terminal",
                  commands: [
                    "ls",
                    "cat index.html",
                    "python -m http.server 8000",
                  ],
                }
              : editor,
            completion: publish
              ? { type: "preview.running" }
              : {
                  type: "file.includes",
                  path,
                  value: language === "css" ? "#23856b" : "Hello Methelia",
                },
          },
          {
            id: "reflect",
            title: "Check the result",
            body: publish
              ? "Click the button and read the text to check that your website works. After completing this chapter, you can download the website files."
              : language === "css"
                ? "Is the button green? You changed CSS, so the heading and click behavior remain the same."
                : language === "javascript"
                  ? "Click the button again. The heading should become Hello Methelia: receive a click, run the code, and update the page."
                  : "Does the heading on the left say Hello Methelia? You changed the HTML content while keeping the colors and button behavior the same.",
            intent: "explain",
            template: "focus",
            component: { type: "browser.preview" },
          },
        ];
  return validateChapter({
    schemaVersion: 1,
    nodeId: node.id,
    title: node.title,
    objective: node.objective,
    sections,
    script: sections.map((section) => ({
      sectionId: section.id,
      text:
        section.id === "languages"
          ? "Select CSS and choose a button color. The content stays the same while the appearance changes. Now select JavaScript and click the button to change its text. HTML supplies content, CSS defines appearance, and JavaScript responds to actions. Switch between them to compare."
          : section.id === "structure"
            ? "Let's change a heading. In the Terminal, type edit index.html to open the file. Find h1 and replace the text between its tags with Hello Methelia. Keep the tags. The heading on the left updates. h1 holds a heading, p holds a paragraph, and button creates a button."
            : section.id === "check"
              ? "Your turn to decide. We want to change the button from purple to green, keeping its label and click behavior the same. Think back to the color experiment and choose the language responsible for that change."
              : section.body,
    })),
    workspaceSetup: starterFiles,
  });
}
