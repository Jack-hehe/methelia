import { type Chapter, validateChapter } from "./protocol";
/** Authored teaching copy for the starter course only. Review before synthesizing speech. */
export type StarterPage = { title: string; body: string; script: string };
export type StarterLesson = {
  title: string;
  objective: string;
  pages: Record<string, StarterPage>;
};
export const starterCourseTitle = {
  "zh-TW": "用 HTML、CSS、JavaScript 製作互動個人首頁",
  en: "Build an interactive personal homepage with HTML, CSS and JavaScript",
};
export function teachStarterChapter(
  chapter: Chapter,
  language: "en" | "zh-TW",
): Chapter {
  const lesson = starterTeaching[language][chapter.nodeId];
  if (!lesson) return chapter;
  return validateChapter({
    ...chapter,
    title: lesson.title,
    objective: lesson.objective,
    sections: chapter.sections.map((section) => ({
      ...section,
      title: lesson.pages[section.id].title,
      body: lesson.pages[section.id].body,
    })),
    script: chapter.sections.map((section) => ({
      sectionId: section.id,
      text: lesson.pages[section.id].script,
    })),
  });
}
export const starterTeaching: Record<
  "zh-TW" | "en",
  Record<string, StarterLesson>
> = {
  "zh-TW": {
    web: {
      title: "網頁入門：內容、外觀與點擊互動如何分工",
      objective:
        "觀察同一個網頁，分辨 HTML 內容、CSS 外觀與 JavaScript 點擊行為，知道修改需求應交給哪種語言。",
      pages: {
        languages: {
          title: "同一個個人首頁，三種語言各負責什麼？",
          body: "觀察標題、按鈕顏色與點擊結果。切換 HTML、CSS、JavaScript，比較內容、外觀與行為的差別。",
          script:
            "各位同學大家好，歡迎來到 Methelia。今天我們要一起完成一個有標題、介紹文字，而且按下按鈕就會改變標題的個人首頁。你不需要先會寫程式，我們會從看懂畫面開始，再一步一步修改真正的檔案。早期的網頁主要用來分享文件；今天的網頁還能呈現設計、回應使用者操作。因此，我們先把網站拆成三件事：放什麼內容、看起來怎麼樣，以及操作之後發生什麼事。請看畫面上的標題和按鈕。HTML 負責定義這些內容和結構；CSS 決定顏色、大小與間距；JavaScript 則負責點擊以後的反應。現在切到 CSS，選一個按鈕顏色。你會發現外觀變了，文字仍然相同。再切到 JavaScript，按下按鈕，觀察畫面上的文字如何改變。重點不是背下三個名字，而是能判斷：我想改的究竟是內容、外觀，還是行為？這頁播完會停下來，請你親手比較一次，再按下一頁。",
        },
        structure: {
          title: "老師示範：HTML 標籤如何對應畫面上的標題",
          body: "觀察 h1、p、button 對應的元素。老師只改 h1 中間的文字，保留標籤，示範標題如何更新。",
          script:
            "剛才我們從畫面認識了三種語言。接下來，老師帶你把畫面和 HTML 程式碼連起來。HTML 使用標籤告訴瀏覽器每一段內容的角色。h1 表示主要標題，p 表示段落，button 表示按鈕。請先點選畫面上的 h1，找出它對應的標題。接著觀看示範：打開 index.html，找到「我的第一個網站」，只把這段文字換成 Hello Methelia，左右的標籤保留。你要注意兩件事：標籤告訴瀏覽器它是標題，而標籤中間的文字才是讀者實際看到的內容。所以修改文字後，標題的內容會變，但我們沒有因此修改按鈕的顏色，也沒有加入新的點擊行為。這次先看懂示範；下一章會讓你在自己的檔案裡完成同樣的修改。頁面停下來後，可以再點選 p 和 button，確認它們各自對應到哪一個元素。",
        },
        check: {
          title: "理解檢查：只改按鈕底色，應修改哪種語言？",
          body: "這次需求只改外觀：保留按鈕文字，也保留原本的點擊反應。先判斷需求類型，再作答。",
          script:
            "現在換你判斷。假設我們想把紫色按鈕改成綠色，按鈕上的文字保持一樣，按下去的反應也保持一樣。你會修改哪一種語言？先別急著選，請用剛才的方法把需求分類：這是在改內容、外觀，還是行為？選好之後，再讀一下系統提供的解釋，確認自己的理由，而不只是看有沒有答對。這一章的學習目標，就是能從一個具體需求找到正確的修改方向。這頁結束會暫停，留給你作答。完成後，我們進入 HTML 章節，開始修改個人首頁真正的標題。",
        },
      },
    },
    html: {
      title: "HTML 實作：修改個人首頁的主標題",
      objective:
        "辨認 h1、p、button，修改 index.html 的主標題並儲存，在預覽中確認結果。",
      pages: {
        intro: {
          title: "讀懂 HTML：標籤與內容的關係",
          body: "h1 定義主標題，p 定義段落，button 定義按鈕。本章會修改 index.html 的標題文字。",
          script:
            "歡迎回來。這一章我們要親手修改個人首頁的主標題。上一章知道 HTML 負責內容，現在我們再多問一步：瀏覽器怎麼知道哪一段是標題，哪一段是介紹？答案就在標籤。h1 表示這一頁的主要標題，p 用來放段落，button 則建立按鈕。大部分這類元素會有開始標籤和結束標籤，內容放在中間。你可以把這一對標籤想成對內容角色的標記；即使你把文字改掉，角色依然保留。先依序查看這三個元素，想想個人首頁的名字、介紹和操作入口分別應該放在哪裡。這一章的實作會專注修改標題，讓你先把「找到內容、修改、儲存、確認」這個流程走通。",
        },
        demonstration: {
          title: "老師示範：在 index.html 修改 h1 文字",
          body: "開啟 index.html，將 h1 中的「我的第一個網站」改成 Hello Methelia，保留兩側標籤。",
          script:
            "請先看老師操作。在教學 Terminal 輸入 edit index.html，開啟網頁檔案。我們找到 h1 標籤中間的「我的第一個網站」，把這段文字改成 Hello Methelia。注意，我們只修改內容，不刪掉左右兩側的標籤，也不去更動其他段落。接著觀察網站預覽：主標題已經換了，但原本的樣式和按鈕仍然保留。這說明瀏覽器會根據新的 HTML 內容更新畫面。示範是在獨立副本上操作，等一下你還需要在自己的檔案裡完成。看完後，請先確認你能指出要修改的是哪一段文字，再進入練習。",
        },
        practice: {
          title: "動手練習：儲存 Hello Methelia 主標題",
          body: "在自己的 index.html 完成相同修改，儲存後按「驗證我的練習」，並確認預覽中的主標題。",
          script:
            "現在換你做。開啟 index.html，找到主標題，把標籤中間的文字改成 Hello Methelia。這次先使用相同文字，讓系統能檢查你是否完成指定步驟。修改後先看預覽，再儲存檔案，按下「驗證我的練習」。如果沒有通過，先檢查是不是改到了段落而不是主標題，再檢查拼字與空格，以及修改是否已保存。不要一次修改很多地方，先讓這個小步驟成功，會更容易找出原因。這頁播放結束就會停下來，請放心慢慢操作，完成後再往下一頁走。",
        },
        reflect: {
          title: "確認成果：內容更新了，外觀和行為呢？",
          body: "主標題應顯示 Hello Methelia；按鈕的外觀與原有互動仍保留。比較 HTML 修改前後的差異。",
          script:
            "我們一起檢查成果。主標題現在應該顯示 Hello Methelia。再看看按鈕的顏色和原本的版面，這些不應該因為換了標題文字就跟著改變。你剛才完成的是 HTML 的內容修改，不是重新設計整個網頁。請試著用自己的話說明：標籤負責標記內容的角色，標籤中間的文字則是實際顯示的內容。能解釋這一點，就比只記住修改位置更有用。下一章我們保留目前的內容，改用 CSS 調整按鈕的外觀。",
        },
      },
    },
    css: {
      title: "CSS 實作：修改按鈕底色並理解內距",
      objective:
        "分辨 color、background、padding，將 style.css 的按鈕底色改為指定綠色並驗證。",
      pages: {
        intro: {
          title: "CSS 三個設定：文字顏色、背景色與內距",
          body: "color 改文字，background 改底色，padding 控制內容與邊框之間的空間。",
          script:
            "這一章我們要讓同一個個人首頁換一個外觀。你已經知道 HTML 放內容；CSS 則讓我們在保留內容結構的情況下，調整它的呈現方式。請先分清楚三個常用設定：color 控制文字的顏色，background 控制背景色，padding 則是內容到元素邊緣之間的內部空間。例如按鈕上的文字很貼邊時，通常應該調整內距，而不是在文字前面塞空格。我們今天的實作會先把按鈕底色從紫色改成綠色。請你先想一想，要改的是按鈕上的字，還是文字後面的那一塊顏色？分清楚這兩件事，才不會選錯 CSS 屬性。",
        },
        demonstration: {
          title: "老師示範：修改 style.css 的 button 背景色",
          body: "找到 button 規則，把 background 的 #7057cd 改成 #23856b。其他設定保留。",
          script:
            "請看老師示範。打開 style.css，找到 button 的樣式規則。button 是選取目標，告訴瀏覽器這些設定要套用到按鈕；大括號裡面則是各項樣式。我們找到 background，將原本的紫色色碼換成畫面上提供的綠色色碼。這種井字號開頭的表示法，是用十六進位數字描述顏色，你現在不需要背下每一個數值。修改後觀察預覽，按鈕底色改變了，文字內容並沒有更換。請特別留意：我們改的是 button 規則中的背景，不是整個頁面的背景。看完這個差異，再進入自己的練習。",
        },
        practice: {
          title: "動手練習：將按鈕底色設為 #23856b",
          body: "修改 button 的 background，儲存 style.css，再驗證練習並觀察按鈕是否變綠。",
          script:
            "現在請你開啟 style.css，在 button 的樣式規則裡，把 background 換成畫面提供的綠色色碼。修改時保留屬性後面的冒號，以及設定結尾的分號。完成後先看按鈕是否變綠，再儲存並驗證。如果變色的是整個頁面，可能是改到了 body 的背景；如果文字變綠，可能是改到了 color。這兩個現象都能幫你判斷問題出在哪裡。這頁結束會暫停，你可以對照程式碼和預覽慢慢檢查。驗證通過後，再看下一頁的成果整理。",
        },
        reflect: {
          title: "確認成果：只改樣式，不改內容與點擊反應",
          body: "檢查按鈕底色、標題文字及點擊效果，確認這次 CSS 修改的影響範圍。",
          script:
            "來確認一下這次的修改範圍。按鈕底色應該已經變成綠色；HTML 裡寫的文字和 JavaScript 原本安排的點擊反應，並沒有因為這個樣式修改而被重寫。這就是把內容、外觀與行為分開處理的好處。現在你也可以解釋三個 CSS 設定：文字顏色看 color，背景色看 background，內容四周的空間看 padding。本章驗證的是指定底色的修改；之後你可以用相同方法，一次調整一個設定並觀察。下一章我們要讓按鈕在被點擊之後，顯示自己指定的問候文字。",
        },
      },
    },
    js: {
      title: "JavaScript 實作：點擊按鈕後更新標題",
      objective:
        "理解選取元素、監聽 click 與設定 textContent 的流程，修改 app.js 的點擊結果並驗證。",
      pages: {
        intro: {
          title: "一次點擊如何變成畫面更新？",
          body: "querySelector 找元素，addEventListener 監聽 click，textContent 更新文字。",
          script:
            "現在我們已經能修改內容和外觀，接下來要處理網站的互動。這一章的目標很具體：使用者按下按鈕後，讓主標題顯示 Hello Methelia。要做到這件事，可以拆成三個步驟。第一，找到我們要操作的按鈕；第二，設定有人點擊時要執行的動作；第三，在那個動作裡更新標題文字。畫面上的三個名稱就分別對應這些工作：querySelector 用來找元素，addEventListener 用來監聽事件，textContent 用來設定元素中的文字。先理解這個順序，比一次記住整段程式碼更重要。請沿著「找到按鈕、收到點擊、改變標題」這條線看一次範例。",
        },
        demonstration: {
          title: "老師示範：修改 app.js 的點擊回呼文字",
          body: "將點擊後設定的「很高興認識你！」改成 Hello Methelia，再點按鈕確認結果。",
          script:
            "請看老師打開 app.js。範例先找到識別名稱為 hello 的按鈕，再監聽它的 click 事件。事件發生時，大括號中的程式才會執行，其中一行會找到 h1，並設定它的 textContent。我們保留這個流程，只把原本的問候文字改成 Hello Methelia。接著一定要按一下預覽中的按鈕，才能檢查點擊結果。這裡和上一章直接改 HTML 不一樣：這一行描述的是事件發生時要做的事，不是宣告網頁一開始就要顯示的內容。請觀察老師修改後再點擊的完整過程，下一頁換你操作。",
        },
        practice: {
          title: "動手練習：讓按鈕點擊後顯示 Hello Methelia",
          body: "修改並儲存 app.js，實際點擊預覽按鈕，再按「驗證我的練習」。",
          script:
            "現在請你在 app.js 中找到原本的問候文字，改成 Hello Methelia。只修改引號裡的文字，先保留引號、大括號和事件監聽器的結構。儲存後，實際點擊預覽中的按鈕，看看標題是否符合預期，再驗證練習。因為上一章的 HTML 標題也可能已經使用這段文字，只看畫面上有沒有出現它，還不足以確認程式是對的。請同時檢查 app.js 的事件程式確實包含新的文字，而且按鈕仍能正常操作。頁面會停下來等你；完成後，我們一起把這段事件流程說清楚。",
        },
        reflect: {
          title: "整理事件流程：選取、監聽、更新",
          body: "對照 app.js，指出按鈕在哪裡被選取、click 在哪裡被監聽，以及 h1 在哪裡更新。",
          script:
            "請你看著 app.js，試著向另一位同學解釋這段程式。首先我們選取按鈕；接著登記點擊事件的處理方式；等使用者真的點擊，程式才更新主標題的文字。這個流程就是許多網頁互動的起點，例如展開選單、顯示訊息或切換內容。今天我們只完成其中最小而完整的一個例子，不需要一次寫出所有功能。現在你的網站已經具備內容、樣式和點擊互動。最後一章，我們會整理檔案、檢查預覽，並把這份靜態網站下載保存。",
        },
      },
    },
    publish: {
      title: "完成網站：檢查 HTML、CSS、JS 並匯出檔案",
      objective:
        "使用教學 Terminal 檢查檔案、開啟預覽，確認網站結果並下載靜態網站檔案。",
      pages: {
        intro: {
          title: "認識三個網站檔案與教學 Terminal",
          body: "用 ls 查看 index.html、style.css、app.js，確認內容、樣式和互動各自所在的檔案。",
          script:
            "來到最後一章，我們要把做好的網站整理成可以保存的成果。你的個人首頁由三個檔案合作完成：index.html 放內容，style.css 放樣式，app.js 放互動程式。這裡的 Terminal 是教學用的文字指令介面，用來操作目前課程的虛擬檔案，並不是你電腦上的系統終端機。我們先輸入 ls，列出目前目錄中的檔案。請確認三個檔案都在，再回想它們各自負責什麼。這一步看起來簡單，卻能避免只保存 HTML、漏掉樣式或程式，導致換個地方打開時結果不完整。",
        },
        demonstration: {
          title: "檢查原始碼：用 cat index.html 查看檔案",
          body: "對照 HTML 原始碼與網站預覽，確認主標題及 CSS、JavaScript 檔案引用。",
          script:
            "接下來輸入 cat index.html，查看檔案裡的文字。Terminal 顯示的是原始碼，網站預覽則是瀏覽器解讀這些內容後呈現的畫面。我們要找的不只有主標題，還包括連到 style.css 的樣式引用，以及載入 app.js 的程式引用。這些引用告訴瀏覽器另外兩個檔案在哪裡。因此，下載與搬移網站時，要保留檔名和相對位置。你不需要在這一步重寫整份程式，先把檔案和畫面對照起來。看完後，我們會使用這個教學環境提供的指令開啟預覽，再做最後檢查。",
        },
        practice: {
          title: "開啟教學預覽並驗證網站",
          body: "執行 python -m http.server 8000。這是本平台的預覽轉接指令，並非真正執行 Python 伺服器。",
          script:
            "現在請輸入畫面上的預覽指令：python -m http.server 8000，然後按 Enter。這裡要把環境的範圍說清楚：在本課程裡，這條指令由教學平台轉接到網站預覽，沒有真的啟動 Python 伺服器，也不代表網站已經發布到網路。預覽出現後，確認主標題、綠色按鈕，以及按下按鈕後的文字結果。完成後按「驗證我的練習」，讓系統確認預覽已啟動。這頁會停下來留給你操作；如果某個結果不對，就回到它負責的 HTML、CSS 或 JavaScript 檔案檢查。",
        },
        reflect: {
          title: "課程成果：下載可保存的靜態個人首頁",
          body: "檢查內容、樣式和互動後，使用網站檔案下載功能匯出 ZIP；下載不等於公開部署。",
          script:
            "恭喜你完成這堂課。現在我們從學習目標再檢查一次：你能修改 HTML 主標題、調整 CSS 按鈕底色，也能用 JavaScript 設定點擊後的文字。更重要的是，遇到新的需求時，你知道先判斷它屬於內容、外觀，還是行為。請使用網站檔案的下載功能，把作品保存成 ZIP。這份壓縮檔包含靜態網站的檔案，但下載本身不會讓其他人透過網址看到你的網站；公開部署是另外一個步驟。本課程到這裡完成的是一份可預覽、可保存的互動個人首頁。接下來你可以把練習用的文字換成自己的介紹，再用同樣的三種分工逐步擴充作品。謝謝各位同學，我們下次課程見。",
        },
      },
    },
  },
  en: {},
};
starterTeaching.en = {
  web: {
    title: "Web basics: content, appearance and click behavior",
    objective:
      "Compare one webpage to distinguish HTML content, CSS appearance and JavaScript behavior, then choose the right language for a requested change.",
    pages: {
      languages: {
        title: "One personal homepage: what do the three languages do?",
        body: "Compare the heading, button color and click result. Switch between HTML, CSS and JavaScript to explore content, appearance and behavior.",
        script:
          "Hello everyone, and welcome to Methelia. Today we will work together on a personal homepage with a heading, introductory text and a button that changes the heading when clicked. You do not need previous coding experience. We will start by understanding what we see, then make small changes to real files. Early webpages primarily shared documents. Modern pages also present visual designs and respond to interaction. That gives us three useful questions: what content belongs here, what should it look like, and what should happen when someone interacts? HTML defines content and structure. CSS controls appearance, including colors, sizes and spacing. JavaScript handles behavior. Look at the heading and button in this example. Select CSS and choose a button color. Notice that the appearance changes while the words stay the same. Now select JavaScript and click the button to observe the text change. The goal is not just to memorize three names. It is to classify a change as content, appearance or behavior. Playback will pause at the end of this page. Try the comparison yourself, then choose the next page.",
      },
      structure: {
        title:
          "Teacher demonstration: connect HTML tags to the visible heading",
        body: "Inspect h1, p and button. Watch the teacher change only the heading text while preserving its tags.",
        script:
          "Now let us connect the visible page to its HTML. Tags tell the browser the role of each piece of content. The h1 element marks a main heading, p marks a paragraph, and button creates a button. First select h1 and identify the heading it represents. Then watch the demonstration. We open index.html and replace My first website with Hello Methelia, preserving the tags on both sides. Notice the distinction: the tags identify the content as a heading, while the words between them are what the reader sees. The heading changes, but this edit does not change the button color or add a new click action. For now, focus on understanding the demonstration. In the next chapter you will make the change in your own file. When playback pauses, inspect p and button as well and match each tag to its visible element.",
      },
      check: {
        title:
          "Understanding check: which language changes only the button fill?",
        body: "Keep the label and click response unchanged. Classify the requested change before choosing an answer.",
        script:
          "Your turn to decide. We want to turn a purple button green while keeping its label and click response exactly the same. Which language would you change? Before selecting an answer, classify the requirement: does it concern content, appearance or behavior? After answering, read the explanation and compare it with your reason. A correct choice is useful, but being able to explain the choice is the skill we are building. This page will pause so you can answer. Once you finish, we will move into the HTML chapter and edit the actual heading of your personal homepage.",
      },
    },
  },
  html: {
    title: "HTML practice: change the main heading of your homepage",
    objective:
      "Identify h1, p and button, edit and save the heading in index.html, and confirm the preview result.",
    pages: {
      intro: {
        title: "Read HTML: tags identify the role of content",
        body: "h1 defines a main heading, p a paragraph and button a button. This chapter edits the heading in index.html.",
        script:
          "Welcome back. In this chapter you will change the main heading of your personal homepage. We know HTML supplies content, but how does the browser distinguish a heading from an introduction? It reads the tags. An h1 marks the main heading, p marks a paragraph, and button creates a button. These elements usually have an opening tag and a closing tag, with content between them. Replacing the words preserves their role as long as the tags remain. Inspect these three elements and decide where a name, an introduction and an action belong. Our first coding exercise focuses on the heading so that you can complete a small, reliable cycle: locate the content, edit it, save it and check the result.",
      },
      demonstration: {
        title: "Teacher demonstration: edit h1 in index.html",
        body: "Replace My first website with Hello Methelia inside h1. Preserve the surrounding tags.",
        script:
          "Watch the teacher first. In the teaching Terminal, enter edit index.html to open the page file. Find My first website between the h1 tags and replace those words with Hello Methelia. We are editing the content, so we leave both tags and the other elements in place. Look at the preview: the heading text changes while the styling and button remain. This demonstration uses a separate copy of the work. You will still make the change in your own file in the next activity. Before continuing, make sure you can point to the exact text being changed and explain why the tags stay.",
      },
      practice: {
        title: "Your practice: save the Hello Methelia heading",
        body: "Edit your own index.html, save it, select Check my practice and inspect the heading.",
        script:
          "Now open your own index.html and change the main heading to Hello Methelia. Use that exact text for this exercise so the checker can verify the requested edit. Look at the preview, save the file, and select Check my practice. If it does not pass, check whether you edited the heading rather than the paragraph. Then check spelling, spacing and whether your latest change was saved. Make one small change at a time; that makes mistakes easier to locate. Playback will pause at the end of this page. Take the time you need to complete the edit before continuing.",
      },
      reflect: {
        title: "Check the result: what changed, and what stayed the same?",
        body: "The main heading should show Hello Methelia. Compare its content with the unchanged styling and existing button behavior.",
        script:
          "Let us inspect the result. The main heading should now read Hello Methelia. The original styling and button are still present because changing HTML text did not rewrite the stylesheet or the event handler. Explain the difference in your own words: the tags identify the role of the content, and the text between them supplies the words that appear. Understanding that distinction is more useful than memorizing a line number. In the next chapter, we will keep the content and use CSS to change the appearance of the button.",
      },
    },
  },
  css: {
    title: "CSS practice: change a button fill and understand padding",
    objective:
      "Distinguish color, background and padding, then set the button background in style.css to the specified green and verify it.",
    pages: {
      intro: {
        title: "Three CSS properties: text color, background and padding",
        body: "color changes text, background changes the fill, and padding adds space inside an element.",
        script:
          "This chapter changes how the same homepage looks. HTML supplies its content; CSS adjusts presentation while preserving that structure. First distinguish three common properties. Color controls the text color. Background controls the fill behind the content. Padding creates space between the content and the edge of an element. For example, when a button label feels cramped, increasing padding is more appropriate than inserting spaces into the label. Our exercise changes the button fill from purple to green. Before editing, ask yourself whether you mean the letters or the surface behind them. That small distinction tells you which property to use.",
      },
      demonstration: {
        title: "Teacher demonstration: change the button rule in style.css",
        body: "Inside button, replace the background value #7057cd with #23856b. Keep the other settings.",
        script:
          "Watch the teacher open style.css and find the button rule. The selector identifies which elements receive the settings inside the braces. We find background and replace its purple value with the green value shown on screen. A color beginning with a hash can describe a color using hexadecimal digits. You do not need to memorize the code; focus on where it is used. The button fill changes, but the label does not. Also notice that we edited the button background, not the page background in the body rule. Comparing the target and the property helps explain exactly why this change affects the button.",
      },
      practice: {
        title: "Your practice: set the button background to #23856b",
        body: "Edit the button background, save style.css, verify your practice and inspect the green button.",
        script:
          "Open style.css and set background inside the button rule to the green value shown on screen. Keep the colon after the property name and the semicolon at the end of the declaration. Inspect the preview, then save and verify your practice. If the entire page changes color, you may have edited the body rule. If the letters turn green, you may have changed color instead of background. These visible differences are clues, not just signs that something went wrong. Playback will pause so you can compare the code and preview carefully before moving on.",
      },
      reflect: {
        title:
          "Check the result: appearance changes without rewriting behavior",
        body: "Check the button fill, heading and click response to identify the scope of the CSS edit.",
        script:
          "The button should now have a green fill. This style change did not rewrite the text in HTML or the click action in JavaScript. That is the benefit of separating content, appearance and behavior. Review the three properties: color affects letters, background affects the fill, and padding controls the space inside an element. This exercise checks the requested background change. You can use the same method to explore other settings later, changing one property and observing its effect. Next, we will change what the button does when it receives a click.",
      },
    },
  },
  js: {
    title: "JavaScript practice: update a heading when a button is clicked",
    objective:
      "Explain element selection, a click listener and textContent, then edit and verify the click result in app.js.",
    pages: {
      intro: {
        title: "How does a click become a visible update?",
        body: "querySelector finds an element, addEventListener listens for click, and textContent changes the text.",
        script:
          "We can now change content and appearance. This chapter adds a concrete understanding of interaction: when someone clicks the button, the heading should say Hello Methelia. Break the task into three steps. First find the button. Next register what should happen when it is clicked. Finally update the heading inside that action. The names on screen match those steps: querySelector finds an element, addEventListener listens for an event, and textContent changes the text in an element. You do not need to memorize the whole program at once. Follow the sequence from finding the button, through receiving a click, to updating the heading.",
      },
      demonstration: {
        title: "Teacher demonstration: edit the click callback in app.js",
        body: "Replace Nice to meet you! with Hello Methelia in the event handler, then click the preview button.",
        script:
          "Watch the teacher open app.js. The example finds the button with the identifier hello and listens for its click event. When the event occurs, the code inside the callback runs. One statement finds h1 and sets its textContent. We preserve that structure and replace only the greeting with Hello Methelia. Then we click the preview button to check the result. Unlike editing the initial HTML text, this statement describes what happens when an event occurs. Observe the complete sequence: edit the event handler, then trigger the event. Next you will repeat those steps in your own file.",
      },
      practice: {
        title: "Your practice: make the click action set Hello Methelia",
        body: "Edit and save app.js, click the preview button, then select Check my practice.",
        script:
          "Find the original greeting in app.js and replace it with Hello Methelia. Change the words inside the quotation marks while preserving the quotes, braces and listener structure. Save the file, click the button and verify your practice. Your HTML heading may already contain Hello Methelia from the earlier exercise, so seeing those words on screen is not enough by itself. Check that the event handler in app.js really contains the new text and that the button still works. This page will pause to give you time. Once you finish, we will explain the event sequence together.",
      },
      reflect: {
        title: "Explain the event sequence: select, listen, update",
        body: "Locate where app.js selects the button, listens for click and updates h1.",
        script:
          "Look at app.js and explain it as if you were teaching another learner. First we select the button. Then we register a click handler. When the user actually clicks, the handler updates the heading text. That sequence is a starting point for many interfaces, including menus, messages and content switches. Today we built a small complete example. Your homepage now combines content, styling and click behavior. In the final chapter, we will inspect the files, check the preview and download the static website so you can keep your work.",
      },
    },
  },
  publish: {
    title: "Finish your website: inspect HTML, CSS and JavaScript, then export",
    objective:
      "Inspect files with the teaching Terminal, start its preview, check the website and download the static files.",
    pages: {
      intro: {
        title: "Inspect the three website files with the teaching Terminal",
        body: "Use ls to find index.html, style.css and app.js. Match each file to content, appearance or behavior.",
        script:
          "In this final chapter we will organize the website into a result you can keep. Three files work together: index.html supplies content, style.css supplies presentation, and app.js supplies interaction. The Terminal here is a teaching interface for the course virtual files, not a system terminal on your computer. Enter ls to list the files. Check that all three are present and recall what each one does. This simple check matters because saving only the HTML while forgetting its stylesheet or script can produce an incomplete result when you open it elsewhere.",
      },
      demonstration: {
        title: "Inspect the source with cat index.html",
        body: "Compare the source with the preview and locate the heading, stylesheet reference and script reference.",
        script:
          "Enter cat index.html to inspect the file text. The Terminal displays source code; the preview displays what the browser builds from that code. Look for the heading, but also find the reference to style.css and the reference to app.js. These tell the browser where the other files are located. When you download or move the website, preserve the filenames and their relative positions. You do not need to rewrite the program here. Connect each file reference to its role, then continue to the preview check.",
      },
      practice: {
        title: "Start the teaching preview and verify it",
        body: "Run python -m http.server 8000. Here this command opens a teaching preview; it does not run a Python server.",
        script:
          "Enter the preview command shown on screen: python -m http.server 8000, then press Enter. We need to be precise about what this environment does. In this course, the platform interprets that command as a request to open its website preview. It does not start a real Python server, and it does not publish the site on the internet. Once the preview opens, check the heading, the green button and the click result. Select Check my practice so the system can confirm that the preview is running. Playback will pause while you work. If something is wrong, use its role to decide whether to inspect HTML, CSS or JavaScript.",
      },
      reflect: {
        title: "Your result: download the interactive static homepage",
        body: "Check content, appearance and behavior, then export the website files as a ZIP. Downloading is separate from public deployment.",
        script:
          "Congratulations on completing this course. Let us revisit what you can now do: edit an HTML heading, change a CSS button background, and set the text produced by a JavaScript click handler. More importantly, you can classify a new requirement as content, appearance or behavior before editing. Use the website download control to save the project as a ZIP. The archive contains your static website files, but downloading does not publish a public URL. Deployment is a separate step. What you have completed here is an interactive personal homepage that you can preview and keep. You can now replace the exercise text with your own introduction and expand the page using the same three responsibilities. Thank you for learning with us, and see you in the next course.",
      },
    },
  },
};
