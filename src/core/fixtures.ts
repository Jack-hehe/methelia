import {
  type Graph,
  type Chapter,
  type LearningNode,
  validateChapter,
} from "./protocol";

export const starterFiles = {
  "/index.html":
    '<!doctype html>\n<html lang="zh-Hant">\n<head>\n  <meta charset="UTF-8">\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <main>\n    <span class="eyebrow">HELLO, WORLD</span>\n    <h1>我的第一個網站</h1>\n    <p>每個好想法，都值得一個自己的空間。</p>\n    <button id="hello">打個招呼 ↗</button>\n  </main>\n  <script src="app.js"></script>\n</body>\n</html>',
  "/style.css":
    "body { margin: 0; background: #f3efe8; color: #30283d; font-family: system-ui, sans-serif; }\nmain { max-width: 540px; margin: 80px auto; padding: 36px; }\n.eyebrow { font-size: 11px; letter-spacing: 3px; color: #8a749c; }\nh1 { font-size: 42px; letter-spacing: -2px; }\np { line-height: 1.8; color: #797080; }\nbutton { margin-top: 20px; border: 0; background: #7057cd; color: white; padding: 14px 24px; border-radius: 28px; cursor: pointer; }",
  "/app.js":
    'document.querySelector("#hello").addEventListener("click", () => {\n  document.querySelector("h1").textContent = "很高興認識你！";\n});',
};
export function demoGraph(): Graph {
  const lessons = [
    [
      "web",
      "認識網站的三種語言",
      "分辨 HTML、CSS 與 JavaScript 在網站中的工作",
      6,
    ],
    ["html", "用 HTML 建立骨架", "使用語意標籤建立個人首頁的內容結構", 8],
    ["css", "讓你的想法有樣子", "修改 CSS 顏色、間距與字級", 8],
    ["js", "讓網站回應你", "用事件監聽器回應按鈕點擊", 7],
    ["publish", "準備與世界見面", "檢查網站並匯出可部署的靜態檔案", 5],
  ] as const;
  return {
    schemaVersion: 1,
    title: "從零打造你的第一個網站",
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
export function demoChapter(node: LearningNode): Chapter {
  const language =
    node.id === "css" ? "css" : node.id === "js" ? "javascript" : "html";
  const path =
    language === "css"
      ? "/style.css"
      : language === "javascript"
        ? "/app.js"
        : "/index.html";
  const intro = {
    id: "languages",
    title: "一個網站，三種默契",
    body: "你每天瀏覽的網站，背後其實有三個分工清楚的角色。點選下方卡片，從你看得見的畫面理解它們。",
    intent: "explain",
    template: "compare",
    component: {
      type: "concept.canvas",
      cards: [
        {
          title: "HTML",
          body: "內容與結構。告訴瀏覽器：這是標題、段落，還是一個按鈕？",
          accent: "amber",
        },
        {
          title: "CSS",
          body: "樣式與佈局。決定顏色、留白、字體，以及內容如何排列。",
          accent: "violet",
        },
        {
          title: "JavaScript",
          body: "行為與互動。當你點擊按鈕、輸入文字，網站要如何回應？",
          accent: "blue",
        },
      ],
    },
  };
  const sections =
    node.id === "web"
      ? [
          intro,
          {
            id: "structure",
            title: "從畫面，看見結構",
            body: "網站不只是一張圖片。每個元素都有自己的意義。試著點選標籤，看它如何對應到頁面中的內容。",
            intent: "demonstrate",
            template: "split",
            guide: {
              path: "/index.html",
              find: "我的第一個網站",
              replacement: "Hello Methelia",
            },
            component: {
              type: "dom.explorer",
              elements: [
                {
                  tag: "h1",
                  label: "我的第一個網站",
                  description: "這是頁面最主要的標題。h1 表達內容的重要性。",
                },
                {
                  tag: "p",
                  label: "每個好想法，都值得一個自己的空間。",
                  description: "p 用來表達一個段落，讓內容有清楚的閱讀節奏。",
                },
                {
                  tag: "button",
                  label: "打個招呼 ↗",
                  description:
                    "button 是可互動的按鈕。JavaScript 可以回應它的點擊。",
                },
              ],
            },
          },
          {
            id: "check",
            title: "換你判斷看看",
            body: "不用背語法。先掌握每種語言要解決的問題，就能知道下一步該用什麼工具。",
            intent: "check",
            template: "focus",
            component: {
              type: "quiz.choice",
              question: "如果想把按鈕從紫色改成綠色，你會使用哪種語言？",
              options: [
                "HTML：修改內容結構",
                "CSS：調整外觀樣式",
                "JavaScript：增加互動行為",
              ],
              answer: 1,
              explanation:
                "沒錯！顏色屬於樣式，交給 CSS。HTML 保留按鈕的結構，JavaScript 保留點擊後的行為。",
            },
            completion: { type: "quiz" },
          },
        ]
      : [
          {
            id: "intro",
            title: node.title,
            body:
              node.objective +
              "。接下來我們會在同一份網站檔案上練習，修改會保存在你的學習工作區。",
            intent: "explain",
            template: "narrative",
            component: {
              type: "concept.canvas",
              cards: [
                {
                  title: "觀察",
                  body: "先看看現在的網站與原始碼，找出你要調整的地方。",
                  accent: "blue",
                },
                {
                  title: "動手",
                  body: "一次改一個小地方，儲存後用預覽檢查差異。",
                  accent: "violet",
                },
                {
                  title: "理解",
                  body: "說出你的修改為什麼會影響畫面，建立自己的理解。",
                  accent: "green",
                },
              ],
            },
          },
          {
            id: "demonstration",
            title: "先看一次：一個修改，立即看見結果",
            body:
              node.id === "publish"
                ? "先用 ls 看看工作區的檔案，再使用預覽指令。這裡是教學用終端機，不會操作你的電腦。"
                : `在 Terminal 輸入 edit ${path.slice(1)}，打開檔案。${language === "css" ? "把按鈕的紫色 #7057cd 改成綠色 #23856b。" : language === "javascript" ? "把按鈕點擊後的回應改成 Hello Methelia，再點左側按鈕觀察。" : "只把 h1 裡的標題文字改成 Hello Methelia，保留前後的標籤。"}左側會立刻顯示修改後的網站。`,
            intent: "demonstrate",
            template: "workspace",
            component: {
              type: "code.editor",
              path,
              language,
              example: starterFiles[path],
            },
            ...(node.id === "publish"
              ? {}
              : {
                  guide: {
                    path,
                    find:
                      language === "css"
                        ? "#7057cd"
                        : language === "javascript"
                          ? "很高興認識你！"
                          : "我的第一個網站",
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
            title:
              node.id === "publish" ? "啟動你的網站預覽" : "做一個小小的改變",
            body:
              node.id === "publish"
                ? "在右側終端機輸入 python -m http.server 8000，啟動練習預覽。這是網站練習環境提供的指令轉接器。"
                : `換你試試。在 Terminal 輸入 edit ${path.slice(1)}，${language === "css" ? "把按鈕背景 #7057cd 改成 #23856b" : language === "javascript" ? "把點擊後顯示的文字改成 Hello Methelia" : "把 h1 標題文字改成 Hello Methelia"}。觀察左側變化，按「儲存並返回 Terminal」，再驗證練習。`,
            intent: "practice",
            template: "workspace",
            component:
              node.id === "publish"
                ? {
                    type: "terminal",
                    commands: [
                      "ls",
                      "cat index.html",
                      "python -m http.server 8000",
                    ],
                  }
                : {
                    type: "code.editor",
                    path,
                    language,
                    example: starterFiles[path],
                  },
            completion:
              node.id === "publish"
                ? { type: "preview.running" }
                : {
                    type: "file.includes",
                    path,
                    value: language === "css" ? "#23856b" : "Hello Methelia",
                  },
          },
          {
            id: "reflect",
            title: "把這一步，變成你的能力",
            body: "觀察你的頁面，想一想：剛剛修改的是內容、樣式，還是互動？你可以隨時打開「小問題」，補齊不熟悉的概念。",
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
    script: sections.map((s) => ({
      sectionId: s.id,
      text:
        s.id === "languages"
          ? "我們先從一個你看得見的網站開始。畫面上的標題、介紹和按鈕，是 HTML 負責的內容與結構。接著，CSS 幫它安排顏色、字體和留白。最後，JavaScript 讓按鈕被點擊時能夠回應你。你不需要現在就記住所有語法。先記得這三個分工：內容、外觀，還有行為。接下來，我們只改一個地方，看看程式和畫面之間的關係。"
          : s.id === "structure"
            ? "先看我示範一次，現在不用動手。在右側 Terminal 輸入 edit index.html，打開網頁檔案。這是練習環境提供的編輯指令。我們找到 h1，這一對標籤中間，就是網站的主要標題。保留標籤，只把中間的文字改成 Hello Methelia。現在看左邊，標題跟著改變了，但顏色和按鈕仍然一樣。這就是 HTML 管內容的意思。等等換你操作時，會回到你自己的網站，示範不會替你完成練習。"
            : s.id === "demonstration"
              ? "接下來先看我操作，留意修改前後的差別。" +
                s.body +
                "示範只使用副本，不會改動你的作品。等這段解說結束，再切換到自己試試。"
              : s.body,
    })),
    workspaceSetup: starterFiles,
  });
}
