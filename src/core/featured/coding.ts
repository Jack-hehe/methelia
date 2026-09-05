import { bi as b, lesson as l, type CuratedCourse, type Lesson } from "./types";

function exercise(
  path: string,
  language: "html" | "css" | "javascript" | "python",
  starter: string,
  replace: string,
  solution: string,
  target = solution,
  extra: Record<string, string> = {},
): Lesson["code"] {
  if (!starter.includes(replace) || starter.includes(target))
    throw new Error(`Invalid coding exercise: ${path}`);
  return {
    path,
    language,
    files: { ...extra, [path]: starter },
    example: starter.replace(replace, solution),
    target,
  };
}

const portfolio = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>My portfolio</title>
<link rel="stylesheet" href="layout.css"><link rel="stylesheet" href="responsive.css"></head>
<body><header><!-- Add the page heading --><p>I learn by making small, useful things.</p></header>
<main id="projects"><h2>Projects</h2><div class="projects"><article><h3>Weather chart</h3><p>A week of observations made visible.</p></article><article><h3>Reading journal</h3><p>A place to keep ideas and questions.</p></article></div>
<button id="contact" type="button">Show contact</button><p id="message" role="status"></p></main>
<script src="interaction.js"></script><script src="accessibility.js"></script></body></html>`;
const webExtras = { "/index.html": portfolio };

const web: CuratedCourse = {
  id: "interactive-portfolio",
  kind: "web",
  domain: b("Web development", "網頁開發"),
  title: b("Build an interactive portfolio", "打造互動作品集"),
  description: b(
    "Build one semantic page, style its projects, add a real interaction and verify it with a keyboard.",
    "建立語意清楚的網頁、安排作品版面、加入真實互動，最後以鍵盤驗證。",
  ),
  lessons: [
    {
      ...l(
        b("Give the document a structure", "讓文件有清楚結構"),
        b(
          "The early Web linked documents so people could share information across computers. HTML still describes the meaning of content: a heading introduces a section and an article groups a self-contained piece. Your portfolio already has project articles; it needs a main heading that tells a visitor whose work they are seeing.",
          "早期 Web 透過連結文件，讓不同電腦上的人分享資訊。HTML 至今仍描述內容的意義：標題引入段落，article 集中一件獨立內容。作品集已有作品區塊，現在需要主標題，告訴訪客看到的是什麼。",
        ),
        b(
          "Replace the heading comment in /index.html with <h1>My portfolio</h1>. Check that the project headings remain under the main heading. Keep this file: later chapters add linked styles and scripts.",
          "把 /index.html 的標題註解改成 <h1>My portfolio</h1>。確認作品標題仍位於主標題之下。保留檔案，後面章節會加入它連結的樣式與程式。",
        ),
        b(
          "Why use an h1 instead of a large paragraph?",
          "為什麼使用 h1，而不是放大一段文字？",
        ),
        b(
          "It identifies the main heading structurally.",
          "它在文件結構中標示主標題。",
        ),
        b("It makes every browser load faster.", "它能讓所有瀏覽器載入更快。"),
        b(
          "Heading elements communicate structure to browsers and assistive tools. Size is a separate CSS choice; an h1 does not guarantee faster loading.",
          "標題元素向瀏覽器與輔助工具傳達結構。大小由 CSS 決定；h1 不保證載入比較快。",
        ),
      ),
      code: exercise(
        "/index.html",
        "html",
        portfolio,
        "<!-- Add the page heading -->",
        "<h1>My portfolio</h1>",
      ),
    },
    {
      ...l(
        b("Arrange the project collection", "安排作品版面"),
        b(
          "CSS separates presentation from document meaning. A grid defines how sibling articles share the available space. Start with a readable single-column layout, then turn the project collection into two equal columns while retaining generous spacing.",
          "CSS 把呈現方式與文件意義分開。網格定義同一層的文章如何分配空間。先有易讀的單欄版面，再把作品集合改為等寬雙欄，保留充分間距。",
        ),
        b(
          "In /layout.css replace the one-column project definition with grid-template-columns: repeat(2, minmax(0, 1fr));. Observe both project articles, not just the first one.",
          "在 /layout.css 把單欄設定改為 grid-template-columns: repeat(2, minmax(0, 1fr));。同時觀察兩件作品，不要只看第一件。",
        ),
        b(
          "What does minmax(0, 1fr) help prevent?",
          "minmax(0, 1fr) 有助於避免什麼？",
        ),
        b(
          "Content forcing a grid column wider than its share.",
          "內容迫使某欄超過分配寬度。",
        ),
        b(
          "All line breaks inside every paragraph.",
          "每一段文字中的所有換行。",
        ),
        b(
          "A zero minimum lets the column shrink within the grid. Text can still wrap, which is desirable for a readable layout.",
          "最小值為零讓欄位能在網格中縮小。文字仍可以換行，這正是易讀排版所需要的。",
        ),
      ),
      code: exercise(
        "/layout.css",
        "css",
        "body { font: 20px/1.6 system-ui; max-width: 960px; margin: auto; padding: 32px; color: #183b45; background: #f7faf9; }\n.projects { display: grid; gap: 24px; grid-template-columns: 1fr; }\narticle { border-top: 3px solid #238575; padding: 16px; }\nbutton { font: inherit; padding: 10px 20px; }",
        "grid-template-columns: 1fr;",
        "grid-template-columns: repeat(2, minmax(0, 1fr));",
        undefined,
        webExtras,
      ),
    },
    {
      ...l(
        b("Make the contact button respond", "讓聯絡按鈕回應"),
        b(
          "JavaScript listens for events and updates the document. A button already has useful keyboard behavior, so you can attach a click listener without building your own focus system. Use textContent when inserting ordinary text; it does not interpret the string as markup.",
          "JavaScript 監聽事件並更新文件。按鈕已有實用的鍵盤操作行為，可以直接加入 click 監聽，不必自行建立焦點系統。插入一般文字時使用 textContent，它不會把字串解讀為標記。",
        ),
        b(
          "In /interaction.js change the event name from mouseenter to click. Activate Show contact with both a mouse and Enter while the button is focused.",
          "在 /interaction.js 把事件名稱 mouseenter 改成 click。用滑鼠啟動 Show contact，再讓按鈕取得焦點並按 Enter。",
        ),
        b(
          "Why is a click listener on a real button useful?",
          "為什麼在真正的 button 上監聽 click 很實用？",
        ),
        b(
          "It supports standard pointer and keyboard activation.",
          "它支援標準指標與鍵盤啟動。",
        ),
        b(
          "It requires every visitor to use a mouse.",
          "它要求每位訪客使用滑鼠。",
        ),
        b(
          "The browser translates standard button activation into click events. Hover alone excludes keyboard users and many touch interactions.",
          "瀏覽器會把標準按鈕啟動轉為 click 事件。只有懸停互動會排除鍵盤使用者與許多觸控操作。",
        ),
      ),
      code: exercise(
        "/interaction.js",
        "javascript",
        `const button = document.getElementById('contact');\nconst message = document.getElementById('message');\nbutton.addEventListener('mouseenter', () => {\n  message.textContent = 'Contact: hello@example.com';\n});`,
        "mouseenter",
        "click",
        "addEventListener('click'",
        webExtras,
      ),
    },
    {
      ...l(
        b("Keep the portfolio usable on a phone", "讓手機也能使用作品集"),
        b(
          "Responsive design changes layout according to the available viewport. The viewport meta tag in your document lets mobile browsers use the device width. A media query can return the project grid to one column before two columns become cramped.",
          "響應式設計依可用視窗調整版面。文件中的 viewport 標籤讓手機瀏覽器使用裝置寬度。媒體查詢能在雙欄過窄之前，把作品網格改回單欄。",
        ),
        b(
          "Change the breakpoint in /responsive.css from 200px to 600px. Compare a wide preview and a narrow one: projects should stack on a phone, with no sideways scrolling.",
          "把 /responsive.css 的斷點從 200px 改成 600px。比較寬與窄的預覽：手機上的作品應上下排列，而且不需要左右捲動。",
        ),
        b(
          "What should decide a useful breakpoint?",
          "實用的斷點應由什麼決定？",
        ),
        b(
          "The width where the content becomes difficult to use.",
          "內容開始難以使用時的寬度。",
        ),
        b(
          "A rule that every site must use the same width.",
          "每個網站必須使用相同寬度的規定。",
        ),
        b(
          "A breakpoint is a design decision based on content. Test the actual headings, controls and spacing instead of assuming a device name proves the layout works.",
          "斷點是依內容做出的設計決定。要測試實際標題、控制項與間距，不能只憑裝置名稱認定排版可用。",
        ),
      ),
      code: exercise(
        "/responsive.css",
        "css",
        "@media (max-width: 200px) {\n  body { padding: 18px; }\n  .projects { grid-template-columns: 1fr; }\n}\nimg { max-width: 100%; height: auto; }",
        "200px",
        "600px",
        "max-width: 600px",
        webExtras,
      ),
    },
    {
      ...l(
        b("Finish with a keyboard review", "以鍵盤檢查完成作品"),
        b(
          "An interaction should expose its state as well as change the picture. Your final script marks the contact button as expanded after activation. Review the whole project: heading order, narrow layout, visible focus and readable contact feedback. Download the workspace files to keep a complete static website.",
          "互動除了改變畫面，也應揭露狀態。最後一段程式會在啟動後，把聯絡按鈕標示為已展開。檢查整件作品：標題順序、窄螢幕版面、可見焦點與可讀的聯絡回饋。下載工作區檔案，即可保留完整靜態網站。",
        ),
        b(
          "Replace the incorrect expanded state true with false in the initial setAttribute call in /accessibility.js. Then Tab to the button, press Enter and inspect that the state becomes true. Export all five files together.",
          "在 /accessibility.js 的初始 setAttribute 呼叫中，把錯誤的展開狀態 true 改為 false。接著用 Tab 移到按鈕、按 Enter，檢查狀態變為 true。一起匯出五個檔案。",
        ),
        b(
          "What is the strongest evidence that the button is keyboard usable?",
          "什麼最能證明按鈕可用鍵盤操作？",
        ),
        b(
          "Tab reaches it, focus is visible and Enter activates it.",
          "Tab 能到達、焦點可見，而且 Enter 可啟動。",
        ),
        b(
          "Its source contains the word accessible.",
          "原始碼中有 accessible 這個字。",
        ),
        b(
          "Accessibility is observed behavior, not a label. Native controls help, but the final page still needs hands-on testing with the actual interaction.",
          "無障礙是可觀察的行為，不是標籤。原生控制項有幫助，但仍需在成品上實際測試互動。",
        ),
      ),
      code: exercise(
        "/accessibility.js",
        "javascript",
        `const contact = document.getElementById('contact');\ncontact.setAttribute('aria-controls', 'message');\ncontact.setAttribute('aria-expanded', 'true');\ncontact.addEventListener('click', () => contact.setAttribute('aria-expanded', 'true'));`,
        "contact.setAttribute('aria-expanded', 'true');",
        "contact.setAttribute('aria-expanded', 'false');",
        undefined,
        webExtras,
      ),
    },
  ],
};

const pythonSite: CuratedCourse = {
  id: "python-data-website",
  kind: "python",
  domain: b("Python", "Python"),
  title: b(
    "Make a personal data website with Python",
    "用 Python 製作個人資料網站",
  ),
  description: b(
    "Turn structured project data into a real HTML file, escape text safely and download your generated site.",
    "把結構化作品資料轉為真實 HTML 檔案，安全處理文字並下載產生的網站。",
  ),
  lessons: [
    {
      ...l(
        b("Separate data from presentation", "分開資料與呈現"),
        b(
          "A static website is a set of files that a browser can display. Python can prepare those files before anyone opens them. Begin with a list of dictionaries: each dictionary describes a project, while the list describes your collection. This browser runner executes standard Python; it does not start a Flask server.",
          "靜態網站是一組可由瀏覽器呈現的檔案。Python 能在人們開啟網站之前先產生檔案。先用字典串列開始：每個字典描述一件作品，串列描述作品集合。這個瀏覽器執行器運行標準 Python，不會啟動 Flask 伺服器。",
        ),
        b(
          "Add the Weather chart dictionary at the comment in /chapter1.py. Run the program and confirm that it prints two project titles.",
          "在 /chapter1.py 的註解處加入 Weather chart 字典。執行後確認印出兩個作品標題。",
        ),
        b(
          "Which value represents the whole collection?",
          "哪一個值代表整個作品集合？",
        ),
        b("The list containing project dictionaries.", "包含作品字典的串列。"),
        b("One title string alone.", "單獨一個標題字串。"),
        b(
          "A list preserves the collection and allows iteration. Each dictionary holds related fields for one project.",
          "串列保留作品集合並支援迭代。每個字典則保存一件作品的相關欄位。",
        ),
      ),
      code: exercise(
        "/chapter1.py",
        "python",
        `projects = [\n    {'title': 'Reading journal', 'description': 'Notes from five books'},\n    # Add second project here\n]\nfor project in projects:\n    print(project['title'])\n`,
        "# Add second project here",
        "{'title': 'Weather chart', 'description': 'Seven days of observations'},",
        "'title': 'Weather chart'",
      ),
    },
    {
      ...l(
        b("Render one reusable project article", "產生可重用的作品文章"),
        b(
          "A function turns one well-defined input into an output. Instead of repeating markup for every project, render one dictionary into an article and call the function for every item. Joining those articles gives the body of the generated page.",
          "函式把明確的輸入轉為輸出。與其為每件作品重複標記，不如把一個字典產生成文章，再為每個項目呼叫函式。把文章接起來，就得到網站主體。",
        ),
        b(
          'Replace return "" in /chapter2.py with the demonstrated article expression. Run it: index.html should appear under Generated files and the preview should contain a project.',
          '把 /chapter2.py 的 return "" 改為示範的 article 表達式。執行後，產生的檔案中應出現 index.html，而且預覽中應有作品。',
        ),
        b(
          "Why return the article from a function?",
          "為什麼要從函式回傳文章？",
        ),
        b(
          "The caller can combine it with other articles.",
          "呼叫端可以把它與其他文章組合。",
        ),
        b(
          "Returning automatically starts a web server.",
          "回傳會自動啟動網頁伺服器。",
        ),
        b(
          "Returning supplies a value to the caller. Writing that value to an HTML file is a separate operation, and neither action starts a server.",
          "回傳把值交給呼叫端。把值寫入 HTML 是另一項操作，兩者都不會啟動伺服器。",
        ),
      ),
      code: exercise(
        "/chapter2.py",
        "python",
        `projects = [{'title': 'Weather chart', 'description': 'Seven days of observations'}]\ndef render_project(project):\n    return ""\narticles = ''.join(render_project(project) for project in projects)\nwith open('index.html', 'w', encoding='utf-8') as file:\n    file.write('<!doctype html><html lang="en"><title>My projects</title><main>' + articles + '</main></html>')\nprint('Created index.html')\n`,
        'return ""',
        `return f"<article><h2>{project['title']}</h2><p>{project['description']}</p></article>"`,
      ),
    },
    {
      ...l(
        b("Keep text from becoming markup", "避免文字變成標記"),
        b(
          "A title can contain characters such as <, > and &. In HTML those characters can change the structure of the page. html.escape converts them into text entities. Apply escaping to data when it enters markup; do not escape the completed HTML document.",
          "標題可能包含 <、> 與 & 等字元。在 HTML 中，它們可能改變頁面結構。html.escape 會把它們轉為文字實體。資料進入標記時才進行跳脫，不要把完成的 HTML 文件整份跳脫。",
        ),
        b(
          'In /chapter3.py wrap project["title"] with escape(...). Run it and check that <draft> appears literally in the preview, alongside the ampersand.',
          '在 /chapter3.py 用 escape(...) 包住 project["title"]。執行後檢查預覽是否按原樣顯示 <draft> 與 &。',
        ),
        b(
          "Which value needs escaping in this template?",
          "這個樣板中哪個值需要跳脫？",
        ),
        b(
          "The title data inserted inside the heading.",
          "插入標題中的資料文字。",
        ),
        b(
          "The entire finished document including its tags.",
          "包含標籤的整份完成文件。",
        ),
        b(
          "Escaping the title preserves its text meaning. Escaping the full document would display the intended tags as text instead of building the page.",
          "跳脫標題能保留文字意義。若整份文件都跳脫，原本的標籤會變成畫面上的文字，無法建立頁面。",
        ),
      ),
      code: exercise(
        "/chapter3.py",
        "python",
        `from html import escape\nproject = {'title': 'Research <draft> & notes'}\ntitle = project["title"]\npage = f'<!doctype html><html lang="en"><meta charset="utf-8"><title>Project</title><h1>{title}</h1></html>'\nwith open('index.html', 'w', encoding='utf-8') as file:\n    file.write(page)\nprint('Created escaped title preview')\n`,
        'title = project["title"]',
        'title = escape(project["title"])',
      ),
    },
    {
      ...l(
        b("Give the generated page a layout", "替產生的網頁加入排版"),
        b(
          "Generated HTML uses the same browser layout rules as hand-written HTML. Keep the data separate, render each article safely and place all articles in a page template. A viewport declaration makes the layout respond to the actual phone width.",
          "產生的 HTML 與手寫 HTML 使用相同的瀏覽器排版規則。保留獨立資料、安全產生每篇文章，再把文章放入網頁樣板。viewport 宣告能讓排版回應手機的實際寬度。",
        ),
        b(
          "Replace the missing viewport comment in /chapter4.py with the demonstrated meta tag. Run it, then resize the preview to compare narrow and wide layouts.",
          "把 /chapter4.py 中缺少 viewport 的註解改為示範的 meta 標籤。執行後調整預覽寬度，比較寬窄版面。",
        ),
        b(
          "Does generating HTML with Python change how CSS works?",
          "以 Python 產生 HTML 會改變 CSS 的運作方式嗎？",
        ),
        b(
          "No; the browser applies CSS to the resulting document.",
          "不會；瀏覽器會對產生的文件套用 CSS。",
        ),
        b(
          "Yes; Python must remain running to calculate each margin.",
          "會；Python 必須持續執行才能計算每個邊距。",
        ),
        b(
          "After generation, the browser receives ordinary HTML and CSS files. A static site does not require the Python generator to remain running.",
          "產生之後，瀏覽器取得一般 HTML 與 CSS 檔案。靜態網站不需要 Python 產生器持續運行。",
        ),
      ),
      code: exercise(
        "/chapter4.py",
        "python",
        `from html import escape\nprojects = [{'title': 'Weather chart', 'description': 'A week of temperatures'}, {'title': 'Reading journal', 'description': 'Ideas & questions'}]\narticles = ''.join(f"<article><h2>{escape(p['title'])}</h2><p>{escape(p['description'])}</p></article>" for p in projects)\npage = f'''<!doctype html><html lang="en"><meta charset="utf-8">\n<!-- missing viewport -->\n<title>My projects</title><style>body {{font: 20px/1.6 system-ui;max-width: 900px;margin:auto;padding:24px}} main {{display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}}</style>\n<h1>My projects</h1><main>{articles}</main></html>'''\nwith open('index.html', 'w', encoding='utf-8') as file:\n    file.write(page)\nprint('Generated', len(projects), 'projects')\n`,
        "<!-- missing viewport -->",
        '<meta name="viewport" content="width=device-width,initial-scale=1">',
      ),
    },
    {
      ...l(
        b("Verify and export the finished website", "驗證並匯出完成的網站"),
        b(
          "A generator should be checked with data that might expose mistakes. This final version contains two projects, safe text conversion and an embedded responsive layout. Add an assertion for the escaped title, inspect the actual page and download the generated ZIP. The files are static output; a Flask or Django service is a different deployment model.",
          "產生器應用可能暴露錯誤的資料來檢查。最終版本含兩件作品、安全文字轉換與內嵌響應式版面。加入跳脫標題的斷言、檢查實際頁面，再下載產生的 ZIP。這些檔案是靜態輸出；Flask 或 Django 服務是不同的部署模型。",
        ),
        b(
          'Replace the verification comment in /chapter5.py with assert "&lt;draft&gt;" in page. Run successfully, inspect both projects and download index.html using Download ZIP. Keep the Python source too so you can regenerate later.',
          '把 /chapter5.py 的驗證註解改成 assert "&lt;draft&gt;" in page。成功執行後檢查兩件作品，並用下載 ZIP 保留 index.html。也保留 Python 原始碼，方便日後重新產生。',
        ),
        b(
          "What should you retain for future data changes?",
          "為了日後更新資料，應保留什麼？",
        ),
        b(
          "The Python source and data, plus the generated website.",
          "Python 原始碼、資料，以及產生的網站。",
        ),
        b("Only a screenshot of the website.", "只有網站截圖。"),
        b(
          "Source and data let you regenerate the website. The generated files let others open the current result; a screenshot preserves neither behavior nor editable data.",
          "原始碼與資料可重新產生網站。產生的檔案讓他人開啟目前成果；截圖無法保留互動行為或可編輯資料。",
        ),
      ),
      code: exercise(
        "/chapter5.py",
        "python",
        `from html import escape\nprojects = [{'title': 'Research <draft>', 'description': 'Questions & discoveries'}, {'title': 'Weather chart', 'description': 'Seven daily observations'}]\ndef render_project(project):\n    return f"<article><h2>{escape(project['title'])}</h2><p>{escape(project['description'])}</p></article>"\narticles = ''.join(map(render_project, projects))\npage = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>My projects</title><style>body {{font:20px/1.6 system-ui;max-width:900px;margin:auto;padding:24px}} main {{display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}} article {{border-top:3px solid teal}}</style></head><body><h1>My projects</h1><main>{articles}</main></body></html>'''\n# Verify escaped title here\nassert page.count('<article>') == len(projects)\nwith open('index.html', 'w', encoding='utf-8') as file:\n    file.write(page)\nprint('Verified and generated index.html')\n`,
        "# Verify escaped title here",
        'assert "&lt;draft&gt;" in page',
      ),
    },
  ],
};

const adventure: CuratedCourse = {
  id: "python-text-adventure",
  kind: "python",
  domain: b("Python", "Python"),
  title: b("Build a replayable text adventure", "打造可重玩的文字冒險"),
  description: b(
    "Turn a branching story into explicit state, reusable actions and a tested ending without interactive input.",
    "把分支故事轉為明確狀態、可重用行動與經過測試的結局，不需要互動式輸入。",
  ),
  lessons: [
    {
      ...l(
        b("Describe a small story world", "描述小型故事世界"),
        b(
          "Early text adventures described rooms and interpreted commands rather than drawing every scene. Our project uses a fixed list of commands so every run can be replayed in this browser. Begin by storing the current room in a dictionary and selecting an observation action.",
          "早期文字冒險以描述房間與解讀指令取代繪製每個場景。本專題使用固定指令串列，因此每次都能在瀏覽器中重播。先用字典保存所在房間，再選擇觀察行動。",
        ),
        b(
          'Change actions = ["wait"] to actions = ["look"] in /chapter1.py. Run it to discover the locked door and brass key.',
          '在 /chapter1.py 把 actions = ["wait"] 改為 actions = ["look"]。執行後發現上鎖的門與黃銅鑰匙。',
        ),
        b(
          "Why put commands in a list for this runner?",
          "為什麼在這個執行器中把指令放進串列？",
        ),
        b(
          "The same command sequence can be replayed without input().",
          "相同指令序列可不透過 input() 重播。",
        ),
        b(
          "Lists automatically generate every possible story.",
          "串列會自動產生所有可能的故事。",
        ),
        b(
          "A saved sequence gives reproducible behavior and fits the non-interactive runner. The program must still define what each command does.",
          "保存序列能重現行為，也符合非互動式執行器。程式仍須定義每個指令的作用。",
        ),
      ),
      code: exercise(
        "/chapter1.py",
        "python",
        `state = {'room': 'foyer'}\nactions = ["wait"]\nfor action in actions:\n    if action == 'look':\n        print('A locked door and a brass key wait in the', state['room'])\n    else:\n        print('Nothing changes.')\n`,
        'actions = ["wait"]',
        'actions = ["look"]',
      ),
    },
    {
      ...l(
        b("Make inventory change the outcome", "讓物品改變結果"),
        b(
          "A branch chooses behavior from a condition. A locked door should open only when the player holds a key. Represent that fact explicitly, then test the opening condition rather than letting the story jump to a happy ending unconditionally.",
          "分支根據條件選擇行為。上鎖的門只有在玩家持有鑰匙時才應開啟。明確表示這個事實，再檢查開門條件，不要讓故事無條件跳到好結局。",
        ),
        b(
          'In /chapter2.py change state["has_key"] = False inside the take key action to True. Replay the actions and confirm that the door opens.',
          '在 /chapter2.py 的 take key 行動中，把 state["has_key"] = False 改為 True。重播行動，確認門能開啟。',
        ),
        b(
          "What should the open door branch check?",
          "open door 分支應檢查什麼？",
        ),
        b(
          "Whether the current state contains the key.",
          "目前狀態是否持有鑰匙。",
        ),
        b(
          "Whether the program has printed any text.",
          "程式是否印出過任何文字。",
        ),
        b(
          "Inventory is the relevant condition. Printing feedback alone does not prove that the player collected the required item.",
          "物品狀態才是相關條件。印出回饋並不能證明玩家拿到了必要物品。",
        ),
      ),
      code: exercise(
        "/chapter2.py",
        "python",
        `state = {'has_key': False, 'escaped': False}\nactions = ['take key', 'open door']\nfor action in actions:\n    if action == 'take key':\n        state["has_key"] = False\n    elif action == 'open door' and state['has_key']:\n        state['escaped'] = True\nprint('Door open' if state['escaped'] else 'Still locked')\n`,
        'state["has_key"] = False',
        'state["has_key"] = True',
      ),
    },
    {
      ...l(
        b("Give each action a clear interface", "讓每個行動有清楚介面"),
        b(
          "An action function takes state and a command, then returns the next state. Copying the dictionary before changing it keeps the caller’s previous snapshot intact. This makes it easier to compare before and after and to test a single action without replaying a whole story.",
          "行動函式接收狀態與指令，再回傳下一個狀態。修改前先複製字典，可保留呼叫端先前的快照。這讓前後比較更容易，也能單獨測試行動，不必重播整個故事。",
        ),
        b(
          "Change return state to return next_state in /chapter3.py. The first printed inventory should remain False while the returned inventory becomes True.",
          "在 /chapter3.py 把 return state 改為 return next_state。第一個印出的物品狀態應仍為 False，回傳的狀態則變為 True。",
        ),
        b("Why return a new dictionary here?", "為什麼在這裡回傳新字典？"),
        b(
          "To preserve the previous state for comparison and tests.",
          "保留先前狀態，方便比較與測試。",
        ),
        b(
          "Because Python cannot modify dictionaries.",
          "因為 Python 不能修改字典。",
        ),
        b(
          "Python can modify dictionaries. Here copying is a deliberate interface choice that prevents an action from silently changing the caller’s snapshot.",
          "Python 可以修改字典。此處複製是刻意的介面選擇，避免行動暗中改變呼叫端的快照。",
        ),
      ),
      code: exercise(
        "/chapter3.py",
        "python",
        `def act(state, command):\n    next_state = dict(state)\n    if command == 'take key':\n        next_state['has_key'] = True\n    return state\noriginal = {'has_key': False}\nupdated = act(original, 'take key')\nprint('Before:', original['has_key'])\nprint('After:', updated['has_key'])\n`,
        "return state",
        "return next_state",
      ),
    },
    {
      ...l(
        b("Replay a route to the ending", "重播通往結局的路線"),
        b(
          "A game run is a sequence of state transitions. The order matters: trying the door before collecting the key should leave it locked. Write a run function that begins from a fresh state every time so two attempted routes do not accidentally share inventory.",
          "一局遊戲是一連串狀態轉換。順序很重要：拿鑰匙之前試著開門，門應仍上鎖。run 函式每次都從新狀態開始，避免兩條路線意外共用物品。",
        ),
        b(
          "Replace the single open door command in the actions list in /chapter4.py with take key followed by open door. Run it and compare the escaped flag with the previous route.",
          "在 /chapter4.py 的 actions 串列中，把單一 open door 改為先 take key、再 open door。執行後比較 escaped 狀態與前一條路線。",
        ),
        b(
          "Why must run create a fresh state each time?",
          "為什麼 run 每次都要建立新狀態？",
        ),
        b(
          "So one route’s inventory cannot leak into another test.",
          "避免一條路線的物品洩漏到另一個測試。",
        ),
        b("So every route is guaranteed to win.", "保證每條路線都會獲勝。"),
        b(
          "Isolation makes comparisons meaningful. A losing sequence should stay losing even after a winning sequence was tested.",
          "隔離讓比較有意義。即使先測試獲勝序列，失敗序列也應仍然失敗。",
        ),
      ),
      code: exercise(
        "/chapter4.py",
        "python",
        `def act(state, command):\n    result = dict(state)\n    if command == 'take key':\n        result['has_key'] = True\n    elif command == 'open door' and result['has_key']:\n        result['escaped'] = True\n    return result\ndef run(commands):\n    state = {'has_key': False, 'escaped': False}\n    for command in commands:\n        state = act(state, command)\n    return state\nactions = ["open door"]\nprint(run(actions))\n`,
        'actions = ["open door"]',
        'actions = ["take key", "open door"]',
      ),
    },
    {
      ...l(
        b("Test both success and failure", "同時測試成功與失敗"),
        b(
          "A finished game needs more than a successful demonstration. Verify that opening without a key fails, collecting a key then opening succeeds and an unknown command leaves state unchanged. The final program writes a JSON result you can download, while your Python workspace keeps the editable game source.",
          "完成的遊戲不只需要成功示範。要驗證沒有鑰匙時開門失敗、拿鑰匙再開門成功，以及未知指令不改變狀態。最終程式會寫出可下載的 JSON 結果，Python 工作區則保留可編輯遊戲原始碼。",
        ),
        b(
          "Replace the missing winning-route test in /chapter5.py with the demonstrated assertion. Run all three checks and download adventure-result.json. Change the command list to explore another route.",
          "把 /chapter5.py 中缺少獲勝路線測試的註解改為示範斷言。執行三個檢查，下載 adventure-result.json，再修改指令串列探索另一條路線。",
        ),
        b(
          "Which test catches a door that opens unconditionally?",
          "哪個測試能找出無條件開門的錯誤？",
        ),
        b(
          "A route that tries opening without first taking the key.",
          "一條沒有先拿鑰匙就嘗試開門的路線。",
        ),
        b(
          "Only replaying the winning route repeatedly.",
          "只重複播放獲勝路線。",
        ),
        b(
          "A negative test exercises the boundary that success-only demonstrations miss. Both winning and losing behavior are part of the game rules.",
          "反例測試檢查只有成功示範時會漏掉的邊界。獲勝與失敗行為都是遊戲規則的一部分。",
        ),
      ),
      code: exercise(
        "/chapter5.py",
        "python",
        `import json\ndef act(state, command):\n    result = dict(state)\n    if command == 'take key':\n        result['has_key'] = True\n    elif command == 'open door' and result['has_key']:\n        result['escaped'] = True\n    return result\ndef run(commands):\n    state = {'has_key': False, 'escaped': False}\n    for command in commands:\n        state = act(state, command)\n    return state\nassert not run(['open door'])['escaped']\n# Add winning-route assertion\nassert run(['sing']) == run([])\nresult = run(['take key', 'open door'])\nwith open('adventure-result.json', 'w', encoding='utf-8') as file:\n    json.dump(result, file, indent=2)\nprint('All route tests passed:', result)\n`,
        "# Add winning-route assertion",
        "assert run(['take key', 'open door'])['escaped']",
      ),
    },
  ],
};

// A direct chapter review has the completed prerequisite files available. The
// workspace merger preserves learner edits to those paths during normal study.
for (let index = 1; index < web.lessons.length; index++) {
  const code = web.lessons[index].code!;
  code.files = {
    ...code.files,
    ...Object.fromEntries(
      web.lessons
        .slice(0, index)
        .map((lesson) => [lesson.code!.path, lesson.code!.example]),
    ),
  };
}

export const codingCourses: CuratedCourse[] = [web, pythonSite, adventure];

/** Explicitly authored display-string translations; code identifiers and game commands stay stable. */
export function localizedCodingLesson(
  lesson: Lesson,
  language: "en" | "zh-TW",
): Lesson {
  if (language === "en" || !lesson.code) return lesson;
  const translations: [string, string][] = [
    ['lang="en"', 'lang="zh-Hant"'],
    ["My portfolio", "我的作品集"],
    ["I learn by making small, useful things.", "我透過製作實用的小作品學習。"],
    ["A week of observations made visible.", "把一週的觀察化為看得見的圖表。"],
    ["A place to keep ideas and questions.", "保存想法與問題的地方。"],
    ["Show contact", "顯示聯絡資訊"],
    ["Contact: hello@example.com", "聯絡信箱：hello@example.com"],
    ["<h2>Projects</h2>", "<h2>作品</h2>"],
    ["Weather chart", "氣象圖"],
    ["Reading journal", "閱讀札記"],
    ["Notes from five books", "五本書的閱讀筆記"],
    ["Seven days of observations", "七天的觀察紀錄"],
    ["My projects", "我的作品"],
    ["Created index.html", "已產生 index.html"],
    ["Research <draft> & notes", "研究 <draft> 與筆記"],
    ["Research <draft>", "研究 <draft>"],
    ["<title>Project</title>", "<title>作品</title>"],
    ["Created escaped title preview", "已產生安全跳脫的標題預覽"],
    ["A week of temperatures", "一週的氣溫紀錄"],
    ["Ideas & questions", "想法 & 問題"],
    [
      "print('Generated', len(projects), 'projects')",
      "print('已產生', len(projects), '件作品')",
    ],
    ["Questions & discoveries", "問題 & 發現"],
    ["Seven daily observations", "七次每日觀察"],
    ["Verified and generated index.html", "已驗證並產生 index.html"],
    ["A locked door and a brass key wait in the", "上鎖的門與黃銅鑰匙位於"],
    ["'foyer'", "'門廳'"],
    ["Nothing changes.", "沒有任何變化。"],
    ["Door open", "門已開啟"],
    ["Still locked", "門仍上鎖"],
    ["'Before:'", "'變更前：'"],
    ["'After:'", "'變更後：'"],
    ["All route tests passed:", "所有路線測試通過："],
  ];
  const translate = (source: string) =>
    translations.reduce((text, [en, zh]) => text.replaceAll(en, zh), source);
  return {
    ...lesson,
    mission: { ...lesson.mission, zh: translate(lesson.mission.zh) },
    code: {
      ...lesson.code,
      files: Object.fromEntries(
        Object.entries(lesson.code.files).map(([path, source]) => [
          path,
          translate(source),
        ]),
      ),
      example: translate(lesson.code.example),
      target: translate(lesson.code.target),
    },
  };
}
