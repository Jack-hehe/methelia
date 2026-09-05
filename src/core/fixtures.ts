import {
  type Graph,
  type Chapter,
  type LearningNode,
  validateChapter,
} from "./protocol";
import { englishDemoChapter, englishDemoGraph } from "./fixtures-en";
import {
  starterCourseTitle,
  starterTeaching,
  teachStarterChapter,
} from "./starter-teaching";

export const starterFiles = {
  "/index.html":
    '<!doctype html>\n<html lang="zh-Hant">\n<head>\n  <meta charset="UTF-8">\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <main>\n    <span class="eyebrow">HTML / CSS / JavaScript</span>\n    <h1>我的第一個網站</h1>\n    <p>這是用 p 標籤建立的段落。</p>\n    <button id="hello">打個招呼 ↗</button>\n  </main>\n  <script src="app.js"></script>\n</body>\n</html>',
  "/style.css":
    "body { margin: 0; background: #f3efe8; color: #30283d; font-family: system-ui, sans-serif; }\nmain { max-width: 540px; margin: 80px auto; padding: 36px; }\n.eyebrow { font-size: 11px; letter-spacing: 3px; color: #8a749c; }\nh1 { font-size: 42px; letter-spacing: -2px; }\np { line-height: 1.8; color: #797080; }\nbutton { margin-top: 20px; border: 0; background: #7057cd; color: white; padding: 14px 24px; border-radius: 28px; cursor: pointer; }",
  "/app.js":
    'document.querySelector("#hello").addEventListener("click", () => {\n  document.querySelector("h1").textContent = "很高興認識你！";\n});',
};
export function demoGraph(language: "en" | "zh-TW" = "zh-TW"): Graph {
  if (language === "en") return englishDemoGraph();
  const lessons = [
    [
      "web",
      "認識網站的三種語言",
      "分辨 HTML、CSS 與 JavaScript 在網站中的工作",
      6,
    ],
    ["html", "用 HTML 建立骨架", "使用語意標籤建立個人首頁的內容結構", 8],
    ["css", "CSS：顏色與間距", "修改 CSS 顏色、間距與字級", 8],
    ["js", "JavaScript：點擊事件", "用事件監聽器回應按鈕點擊", 7],
    ["publish", "Terminal：預覽與匯出", "檢查網站並匯出可部署的靜態檔案", 5],
  ] as const;
  return {
    schemaVersion: 1,
    title: starterCourseTitle["zh-TW"],
    nodes: lessons.map(([id, title, objective, minutes], i) => ({
      id,
      title: starterTeaching["zh-TW"][id].title,
      objective: starterTeaching["zh-TW"][id].objective,
      minutes,
      kind: "main",
      prerequisites: i ? [lessons[i - 1][0]] : [],
    })),
    edges: lessons.slice(1).map((n, i) => ({ from: lessons[i][0], to: n[0] })),
  };
}
export function demoChapter(
  node: LearningNode,
  locale: "en" | "zh-TW" = "zh-TW",
): Chapter {
  if (locale === "en") return englishDemoChapter(node);
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
    title: "HTML、CSS、JavaScript 的分工",
    body: "先選 CSS，換個按鈕顏色；再選 JavaScript，點一下按鈕。看看同一個網頁能有哪些變化。",
    intent: "explain",
    template: "compare",
    component: {
      type: "concept.canvas",
      cards: [
        {
          title: "HTML",
          body: "標題、文字、按鈕要放什麼？交給 HTML。它負責網頁的內容和順序。",
          accent: "amber",
        },
        {
          title: "CSS",
          body: "選個顏色，看右邊的按鈕換色。CSS 就是用來改顏色、大小和間距的。",
          accent: "violet",
        },
        {
          title: "JavaScript",
          body: "點一下右邊的按鈕，文字會變。JavaScript 讓網站能回應你的操作。",
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
            title: "HTML 標籤與畫面",
            body: "點一下 h1，看看哪段文字是標題。想改它？開啟實作區，把 h1 中間的文字換成 Hello Methelia；左右的標籤先留著。",
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
                  description:
                    "h1 告訴瀏覽器：這是主要標題。換掉中間的文字，就能換掉畫面上的標題。",
                },
                {
                  tag: "p",
                  label: "這是用 p 標籤建立的段落。",
                  description:
                    "想放一段自我介紹？把文字寫在 <p> 和 </p> 中間。p 就是用來放段落的。",
                },
                {
                  tag: "button",
                  label: "打個招呼 ↗",
                  description:
                    "button 會做出一顆按鈕。要讓它按下去有反應，還需要 JavaScript 告訴它該做什麼。",
                },
              ],
            },
          },
          {
            id: "check",
            title: "練習：選擇正確的語言",
            body: "換你決定：這次只想換顏色，文字和點擊後的反應都不動。",
            intent: "check",
            template: "focus",
            component: {
              type: "quiz.choice",
              question: "想把紫色按鈕換成綠色，該改哪一種語言？",
              options: [
                "HTML：修改內容結構",
                "CSS：調整外觀樣式",
                "JavaScript：增加互動行為",
              ],
              answer: 1,
              explanation:
                "對，改 CSS 的 background 就能換色。HTML 放按鈕，CSS 決定它的樣子，JavaScript 決定點了以後做什麼。",
            },
            completion: { type: "quiz" },
          },
        ]
      : [
          {
            id: "intro",
            title: node.title,
            body:
              node.id === "publish"
                ? "先在右邊輸入 ls，按 Enter，就會看到檔名。Terminal 就是讓你用文字下指令的地方。"
                : language === "css"
                  ? "想讓文字換色、按鈕變大？點選這三個設定，認識待會會用到的 CSS。"
                  : language === "javascript"
                    ? "點按鈕後要發生什麼事？JavaScript 可以先找到按鈕，再安排點擊後要做的事。"
                    : "網頁上的標題和段落，都是一段段 HTML。點選 h1、p、button，看看它們分別放什麼內容。",
            intent: "explain",
            template: node.id === "publish" ? "workspace" : "narrative",
            component:
              node.id === "publish"
                ? {
                    type: "terminal",
                    commands: ["ls", "cat index.html"],
                  }
                : {
                    type: "concept.canvas",
                    cards: [
                      {
                        title:
                          node.id === "publish"
                            ? "ls"
                            : language === "css"
                              ? "color"
                              : language === "javascript"
                                ? "querySelector"
                                : "h1",
                        body:
                          node.id === "publish"
                            ? "列出目前目錄的檔案。"
                            : language === "css"
                              ? "想讓文字變色，就改 color。例如 color: green，文字就會變綠。"
                              : language === "javascript"
                                ? "先找到要操作的東西。例如 querySelector('#hello')，就是找出 id 為 hello 的按鈕。"
                                : "這一頁最重要的標題，放在 <h1> 和 </h1> 中間。先試著替它換個名字。",
                        accent: "blue",
                      },
                      {
                        title:
                          node.id === "publish"
                            ? "cat"
                            : language === "css"
                              ? "padding"
                              : language === "javascript"
                                ? "addEventListener"
                                : "p",
                        body:
                          node.id === "publish"
                            ? "顯示檔案內容。"
                            : language === "css"
                              ? "文字太貼著按鈕邊緣？加大 padding，就能在文字四周多留一點空間。"
                              : language === "javascript"
                                ? "告訴按鈕：有人點你時，就執行這段程式。click 代表的就是點擊。"
                                : "要放一段介紹，就用 p。文字寫在 <p> 和 </p> 中間。",
                        accent: "violet",
                      },
                      {
                        title:
                          node.id === "publish"
                            ? "預覽"
                            : language === "css"
                              ? "background"
                              : language === "javascript"
                                ? "textContent"
                                : "button",
                        body:
                          node.id === "publish"
                            ? "本環境用預覽轉接器顯示網站，不執行真正的 Python。"
                            : language === "css"
                              ? "想換按鈕的底色，就改 background。待會把紫色換成綠色，看看差別。"
                              : language === "javascript"
                                ? "直接換掉元素裡的文字。例如把標題的 textContent 改成 Hello Methelia。"
                                : "button 會做出可以按的按鈕；裡面的文字，就是按鈕上顯示的字。",
                        accent: "green",
                      },
                    ],
                  },
          },
          {
            id: "demonstration",
            title:
              node.id === "publish"
                ? "查看網站檔案"
                : language === "css"
                  ? "示範：修改按鈕顏色"
                  : language === "javascript"
                    ? "示範：修改點擊結果"
                    : "示範：修改標題",
            body:
              node.id === "publish"
                ? "試著輸入 cat index.html，按 Enter。右邊出現的是檔案裡的程式，左邊則是瀏覽器把它畫出來的樣子。"
                : `先看一次示範：輸入 edit ${path.slice(1)} 打開檔案。${language === "css" ? "找到 button 裡的 background，把 #7057cd 換成 #23856b。看，按鈕從紫色變成綠色了。" : language === "javascript" ? "把「很高興認識你！」換成 Hello Methelia，再點左邊的按鈕，標題就會跟著變。" : "找到 h1，只把裡面的字換成 Hello Methelia。左邊的標題就換好了，其他內容不用動。"}`,
            intent: "demonstrate",
            template: "workspace",
            component:
              node.id === "publish"
                ? {
                    type: "terminal",
                    commands: ["ls", "cat index.html"],
                  }
                : {
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
            title: node.id === "publish" ? "啟動網站預覽" : "練習：修改並儲存",
            body:
              node.id === "publish"
                ? "輸入 python -m http.server 8000，再按 Enter，啟動這裡的網站預覽。注意：這是教學環境提供的預覽指令，沒有真的執行 Python。完成後按「驗證我的練習」。"
                : `現在你來改。輸入 edit ${path.slice(1)}，${language === "css" ? "把 button 的 background 從 #7057cd 換成 #23856b，看看按鈕有沒有變綠" : language === "javascript" ? "把「很高興認識你！」換成 Hello Methelia，再點一下左側按鈕" : "把 h1 中間的字換成 Hello Methelia，看看左邊的標題"}。儲存後按「驗證我的練習」。`,
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
            title: "檢查網站結果",
            body:
              node.id === "publish"
                ? "點點按鈕、看看文字，確認網站能正常使用。完成這章後，就可以把網站檔案下載下來。"
                : language === "css"
                  ? "按鈕變綠了嗎？這次我們只改 CSS，所以標題的文字和點擊的反應都不會變。"
                  : language === "javascript"
                    ? "再點一次按鈕，標題應該會變成 Hello Methelia。這就是「收到點擊 → 執行程式 → 更新畫面」。"
                    : "左邊的標題現在是 Hello Methelia 嗎？你剛才改的是 HTML 的內容；顏色和按鈕行為都保持原樣。",
            intent: "explain",
            template: "focus",
            component: { type: "browser.preview" },
          },
        ];
  return teachStarterChapter(
    validateChapter({
      schemaVersion: 1,
      nodeId: node.id,
      title: node.title,
      objective: node.objective,
      sections,
      script: sections.map((s) => ({
        sectionId: s.id,
        text:
          s.id === "languages"
            ? "先選 CSS，再選一個按鈕顏色。看，內容沒變，但外觀換了。接著選 JavaScript，點一下按鈕，文字會改變。這三種語言各有工作：HTML 放上內容，CSS 決定長相，JavaScript 回應操作。你可以來回切換，比較它們的差別。"
            : s.id === "structure"
              ? "現在看一次標題怎麼改。在 Terminal 輸入 edit index.html，打開檔案。找到 h1，把中間的文字換成 Hello Methelia，左右的標籤保留。左邊的標題就會更新。h1 是主要標題，p 放段落，button 放按鈕；先認得這三個就能開始改網頁。"
              : s.id === "check"
                ? "換你判斷一下。這次只想把按鈕從紫色換成綠色，不改按鈕上的字，也不改點擊後的反應。想想剛才換顏色的操作，再選出負責這件事的語言。"
                : s.body,
      })),
      workspaceSetup: starterFiles,
    }),
    "zh-TW",
  );
}
