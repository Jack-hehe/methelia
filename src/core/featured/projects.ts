import { bi as b, lesson as l, type CuratedCourse } from "./types";

export const projectCourses: CuratedCourse[] = [
  {
    id: "csv-story",
    kind: "data",
    domain: b("Data", "資料"),
    title: b("Turn a CSV into a story", "把 CSV 變成故事"),
    description: b(
      "Clean a small dataset, compare summaries and communicate the evidence.",
      "清理小型資料集、比較摘要，並傳達有證據的解讀。",
    ),
    lessons: [
      l(
        b("Start with an answerable question", "先提出可以回答的問題"),
        b(
          "Spreadsheets and CSV made rows of observations portable between tools. A chart begins with a question about a unit of observation. The supplied sample contains eight synthetic weekly reading-minute records for each of groups A and B. These invented values demonstrate analysis; they are not observations of real readers.",
          "試算表與 CSV 讓逐列觀測資料能在工具間流通。圖表應從觀測單位和問題開始。這裡提供 A、B 兩組各八週的合成閱讀分鐘資料。這些虛構數值用來示範分析，不是真實讀者的觀測。",
        ),
        b(
          "Inspect the Week and Minutes table for group A. Turn cleaning off and note that the missing week stays labeled Missing in the source table but becomes zero in the chart and mean. Use the Sample series selector to view group B.",
          "檢查 A 組的週次與分鐘表格。關閉清理，注意原始表格仍標記缺失，但圖表與平均把該週當作零。用範例資料選單切換 B 組。",
        ),
        b(
          "What must be defined before interpreting a row?",
          "解讀一列資料之前，必須定義什麼？",
        ),
        b("What one observation represents", "一筆觀測代表什麼"),
        b("The chart's decorative color", "圖表裝飾的顏色"),
        b(
          "An observation could be a sale, day or person; that meaning determines valid comparisons. Decorative color cannot establish the unit of analysis.",
          "一筆觀測可能是一筆銷售、一天或一個人；這決定哪些比較合理。裝飾顏色無法確定分析單位。",
        ),
        { clean: 0, chart: 0, group: 0 },
      ),
      l(
        b("Clean without inventing evidence", "清理但不捏造證據"),
        b(
          "This lab compares two missing-value rules: exclude the missing week, or replace it with zero. The source table stays unchanged and the valid-row count reveals the denominator. No duplicate-removal operation is provided. A missing number is not automatically zero: those states have different meanings.",
          "這個實驗比較兩種缺值規則：排除缺失週，或補成零。原始表格保持不變，有效列數顯示平均的分母。此處沒有刪除重複列功能。缺少數字不自動等於零：兩者意義不同。",
        ),
        b(
          "Toggle cleaning and compare accepted counts and summaries. Describe which records the rule excludes rather than treating the result as magically correct.",
          "切換清理，比較接受的筆數與摘要。說明規則排除了哪些紀錄，而不是把結果當成自動正確。",
        ),
        b(
          "Why should missing values not always become zero?",
          "為何不能總把缺值改成零？",
        ),
        b(
          "Zero is an observed quantity; missing is unknown",
          "零是觀測值；缺值是未知",
        ),
        b("Zero makes every chart invalid", "零會讓所有圖表無效"),
        b(
          "Replacing unknown values with zero can bias the average. Genuine zero observations are valid and should not be discarded simply for being zero.",
          "把未知值改成零可能扭曲平均。真正觀測到的零有效，不應只因為是零就刪除。",
        ),
        { clean: 1, chart: 0, group: 0 },
      ),
      l(
        b("Choose an honest summary", "選擇誠實的摘要"),
        b(
          "A mean divides the total by the number of included records. Group A totals 125 minutes across seven known weeks: excluding the missing week gives 125/7, about 17.86; replacing it with zero gives 125/8 = 15.625. The denominator changes even though the known total does not.",
          "平均把總和除以納入的筆數。A 組七個已知週合計 125 分鐘：排除缺失週得到 125/7，約 17.86；補零則為 125/8 = 15.625。已知總和不變，分母卻不同。",
        ),
        b(
          "Compare zero-filled and cleaned means for group A, then select group B. With cleaning on, verify B has seven valid weeks and a mean of 28 minutes.",
          "比較 A 組補零與排除缺值的平均，再選 B 組。開啟清理時，確認 B 組有七個有效週，平均為 28 分鐘。",
        ),
        b("What should accompany a group average?", "群組平均旁邊應搭配什麼？"),
        b("Its observation count and context", "觀測筆數與背景"),
        b(
          "A claim that every member equals the average",
          "聲稱每位成員都等於平均",
        ),
        b(
          "Counts reveal how much data supports a summary. An average is a group statistic, not a value shared by all its members.",
          "筆數顯示摘要背後有多少資料。平均是群組統計量，不是所有成員共同的數值。",
        ),
        { clean: 1, chart: 0, group: 1 },
      ),
      l(
        b("Match the chart to the comparison", "讓圖表配合比較目的"),
        b(
          "Bars support category comparison; a line implies meaningful order and connection. Changing the chart does not change the underlying records. Choose a representation that makes the question easier to answer without implying a sequence that does not exist.",
          "長條適合比較類別；折線暗示有意義的順序與連接。換圖不會改變底層紀錄。應選擇能回答問題的表示方式，避免暗示不存在的順序。",
        ),
        b(
          "Keep cleaning on and group B selected. Compare bars and a line: the horizontal axis is ordered by week, so a line is meaningful, but the missing third week must remain a gap.",
          "保持清理開啟並選 B 組，比較長條和折線。水平軸按週排序，因此折線有意義，但缺失的第三週必須留空。",
        ),
        b(
          "Which representation is a safer default for unordered categories?",
          "沒有順序的類別通常優先用哪種圖？",
        ),
        b("Bars with clear category labels", "有清楚類別標籤的長條圖"),
        b("A line implying a continuous progression", "暗示連續發展的折線圖"),
        b(
          "Bars compare separate categories without inventing continuity. A line is appropriate only when order and connection are meaningful.",
          "長條比較獨立類別，不會憑空增加連續性。只有順序和連接有意義時，折線才合適。",
        ),
        { clean: 1, chart: 1, group: 1 },
      ),
      l(
        b("Publish the data story", "完成資料故事"),
        b(
          "A defensible data story joins a claim, visible evidence and a limitation. State the cleaning rule and sample scope next to the comparison. These synthetic records can demonstrate a comparison, but cannot establish real reading behavior or its causes.",
          "可信的資料故事包含主張、可見證據與限制。比較旁邊應交代清理規則與樣本範圍。這些合成紀錄可以示範比較，但不能確立真實閱讀行為或其成因。",
        ),
        b(
          "With cleaning on, export each group's SVG and cleaned CSV before changing groups. In an accompanying note, compare A's 17.86 minutes with B's 28 minutes and state that the values are synthetic, not evidence about real readers.",
          "開啟清理，切換群組前分別匯出 SVG 和清理後 CSV。另寫一份附註，比較 A 組的 17.86 分鐘與 B 組的 28 分鐘，並註明數值為合成資料，不是真實讀者的證據。",
        ),
        b(
          "Which conclusion respects this synthetic sample?",
          "哪個結論尊重這份合成樣本的限制？",
        ),
        b(
          "These synthetic groups differ; no real-world cause is established",
          "這些合成群組有差異；未確立真實世界成因",
        ),
        b(
          "The chart alone proves why the difference occurred",
          "單靠圖表就證明差異的原因",
        ),
        b(
          "A chart displays the supplied values. Synthetic numbers cannot establish a real-world association; causal conclusions would require appropriate real evidence and a study design.",
          "圖表只呈現提供的數值。合成數字不能確立真實世界關聯；因果結論需要適當的真實證據與研究設計。",
        ),
        { clean: 1, chart: 0, group: 1 },
      ),
    ],
  },
  {
    id: "maze-pathfinder",
    kind: "pathfinding",
    domain: b("Algorithms", "演算法"),
    title: b("Build a maze pathfinder", "打造迷宮尋路器"),
    description: b(
      "Model a grid as a graph and verify breadth-first shortest paths.",
      "把格子建成圖，驗證廣度優先最短路徑。",
    ),
    lessons: [
      l(
        b("Turn a maze into a search problem", "把迷宮變成搜尋問題"),
        b(
          "Route-finding systems represent places as nodes and permitted moves as edges. This maze allows equal-cost moves between neighboring open cells. Walls remove connections, so visual closeness does not guarantee that two cells are reachable from one another.",
          "尋路系統把位置表示成節點、允許的移動表示成邊。這個迷宮只允許相鄰空格間等成本移動。牆會移除連接，因此畫面上靠近不代表可以到達。",
        ),
        b(
          "Inspect start and goal. Toggle one interior wall and observe whether the allowed route changes even though the endpoints stay fixed.",
          "查看起點與終點，切換一面內部牆壁。觀察端點不變時，可行路徑是否改變。",
        ),
        b(
          "What does an edge represent in this maze graph?",
          "迷宮圖中的一條邊代表什麼？",
        ),
        b("An allowed move between cells", "格子之間允許的一步移動"),
        b("Any two cells that look close", "任何看起來靠近的兩格"),
        b(
          "Edges encode movement rules and walls. Geometric proximity alone can include blocked or diagonal moves that are not permitted.",
          "邊編碼移動規則與牆壁。單純的幾何距離可能包含被擋住或不允許的斜向移動。",
        ),
        { maze: 0 },
      ),
      l(
        b("Explore a frontier in order", "依序探索前緣"),
        b(
          "Breadth-first search stores discovered cells in a first-in, first-out queue. Marking a cell when it is discovered prevents repeated insertion. The frontier expands in layers, each one move farther from the start.",
          "廣度優先搜尋把已發現的格子放進先進先出佇列。發現格子時立即標記，可避免重複加入。搜尋前緣逐層擴張，每一層比起點多一步。",
        ),
        b(
          "Use an open maze and play or scrub the timeline. Compare early nearby discoveries with later distant ones; the visualization shows discovery order, not individual predecessor pointers.",
          "使用開放迷宮，播放或拖曳時間軸。比較早期附近格子和後期遠處格子；畫面顯示發現順序，沒有逐格前驅指標。",
        ),
        b(
          "Which queue rule produces breadth-first layers?",
          "哪個佇列規則產生廣度優先的層次？",
        ),
        b("Process the earliest inserted cell first", "先處理最早加入的格子"),
        b(
          "Always process the latest inserted cell first",
          "總是先處理最後加入的格子",
        ),
        b(
          "First-in, first-out preserves discovery layers. Taking the latest item uses stack-like depth-first behavior and loses this shortest-layer guarantee.",
          "先進先出保留發現的層次。取最後加入的項目像堆疊式深度優先，會失去這個最短層保證。",
        ),
        { maze: 0 },
      ),
      l(
        b("Recover the shortest route", "重建最短路徑"),
        b(
          "When a cell is first discovered, save the predecessor that reached it. After finding the goal, follow those pointers backward and reverse the sequence. With equal-cost edges, BFS first reaches the goal using the fewest moves.",
          "首次發現一格時，保存到達它的前驅。找到終點後，沿前驅反向走再反轉順序。所有邊成本相同時，BFS 第一次到達終點使用的步數最少。",
        ),
        b(
          "Choose the wall-with-a-gap preset and move the timeline to its end to reveal the route. Trace it backward from goal to start and count edges rather than all discovered cells.",
          "選擇有缺口的牆預設，把時間軸拉到最後顯示路徑。從終點倒走到起點，計算邊的數目，而不是搜尋發現的總格數。",
        ),
        b(
          "A route contains 6 cells. How many moves connect them?",
          "一條路徑包含 6 格，需要幾步連接？",
        ),
        b("5", "5"),
        b("6", "6"),
        b(
          "Moves connect consecutive cells, so there is one fewer move than cells. Counting the start as a move introduces an off-by-one error.",
          "每一步連接相鄰的兩格，因此步數比格數少一。把起點也算成一步會產生差一錯誤。",
        ),
        { maze: 1 },
      ),
      l(
        b("Distinguish unreachable from unfinished", "區分無法到達與尚未完成"),
        b(
          "A search can end without a route when its queue becomes empty. That means every reachable cell has been explored, not that the algorithm should invent a line through a wall. Search status and path length must therefore be separate outputs.",
          "當佇列清空時，搜尋可能仍找不到路徑。這表示已探索所有可達格子，不是演算法應該畫線穿牆。搜尋狀態和路徑長度必須分開顯示。",
        ),
        b(
          "Block the start's exits using walls, then reopen one. Compare the no-path state with a valid route and verify no displayed step crosses a wall.",
          "用牆擋住起點的出口，再打開其中一個。比較無路可走與有效路徑，確認任何一步都沒有穿牆。",
        ),
        b(
          "What proves that the goal is unreachable in this finite search?",
          "有限搜尋中，什麼能證明終點不可達？",
        ),
        b(
          "The frontier empties without discovering the goal",
          "前緣清空，但仍未發現終點",
        ),
        b("The route looks long", "路線看起來很長"),
        b(
          "An empty frontier exhausts all reachable cells. A long route is still a valid route and gives no evidence of unreachability.",
          "前緣清空表示所有可達格子都已耗盡。很長的路徑仍然有效，不能證明不可達。",
        ),
        { maze: 0, wall1: 1, wall8: 1 },
      ),
      l(
        b("Test the finished pathfinder", "測試完成的尋路器"),
        b(
          "Keep a small test suite: open grid, forced detour and blocked destination. Verify start, goal, legal adjacency and wall avoidance for every returned route. BFS minimizes steps here; weighted terrain would need a different shortest-path method.",
          "保留小型測試組：開放格子、強迫繞路、封閉終點。每條回傳路徑都要檢查起終點、合法鄰接與避牆。BFS 在這裡最小化步數；有權重地形需要其他最短路徑方法。",
        ),
        b(
          "Export your custom maze data before switching presets. Test an open grid, a wall with a gap, and a sealed goal by blocking row 7 column 8 and row 8 column 7. Explain why unequal travel costs would require a different algorithm.",
          "切換預設前先匯出自訂迷宮資料。測試空白網格、有缺口的牆，再封住第 7 列第 8 欄與第 8 列第 7 欄以隔離終點。說明不等通行成本為何需要其他演算法。",
        ),
        b(
          "When is BFS guaranteed to minimize this route's cost?",
          "什麼條件下，BFS 保證最小化這條路的成本？",
        ),
        b("Every allowed move has the same cost", "每個合法移動成本都相同"),
        b("Terrain costs can vary arbitrarily", "地形成本可以任意不同"),
        b(
          "BFS minimizes edge count, which matches cost only for equal-cost moves. Variable costs require accounting for accumulated weights.",
          "BFS 最小化邊數，只有等成本移動時才等於最小成本。可變成本需要考慮累積權重。",
        ),
        { maze: 1 },
      ),
    ],
  },
  {
    id: "hierarchy-poster",
    kind: "design",
    domain: b("Design", "設計"),
    title: b("Make a poster with visual hierarchy", "製作有視覺層級的海報"),
    description: b(
      "Arrange an event message using type, space, grid and color.",
      "使用字級、留白、網格與色彩安排活動訊息。",
    ),
    lessons: [
      l(
        b("Give the poster one job", "讓海報有一個主要任務"),
        b(
          "Posters compete for brief attention in public space. Decide what readers should notice first and what action follows. The fixed sample event poster separates a headline, date and numbered grid panels; hierarchy gives those parts different emphasis.",
          "海報在公共空間爭取短暫注意。先決定讀者最先看到什麼，以及接下來要做什麼。固定範例活動海報分成標題、日期與編號網格區塊；視覺層級讓這些部分有不同強調程度。",
        ),
        b(
          "Inspect the default poster from a distance. Increase title size and identify whether the event name now wins attention before the details.",
          "從較遠的視角檢查預設海報，增加標題字級，判斷活動名稱是否先於細節吸引注意。",
        ),
        b(
          "What should define the strongest visual emphasis?",
          "什麼應決定最強的視覺強調？",
        ),
        b("The message readers need first", "讀者首先需要的訊息"),
        b("Whichever element has the most words", "字數最多的元素"),
        b(
          "Emphasis follows communication priority. Long details often need less emphasis so they do not compete with the main message.",
          "強調應跟隨溝通優先順序。冗長細節通常更需要降低強調，避免和主要訊息競爭。",
        ),
        { titleSize: 44, spacing: 28, hue: 210, columns: 2, format: 0 },
      ),
      l(
        b("Build an alignment system", "建立對齊系統"),
        b(
          "A grid provides shared anchors for otherwise separate elements. Alignment helps readers perceive relationships without drawing a box around everything. More columns offer flexibility but can create narrow text areas that are harder to scan.",
          "網格為分離元素提供共同基準。對齊讓讀者不用每個區塊都加框，也能看出關係。更多欄提供彈性，但也可能讓文字區太窄而難以掃讀。",
        ),
        b(
          "Compare one and two columns with the same title size. Follow the reading order and check whether related details share a visible alignment.",
          "固定標題大小，比較一欄和兩欄。追蹤閱讀順序，檢查相關細節是否有可見的對齊。",
        ),
        b(
          "What is the main purpose of a layout grid?",
          "排版網格的主要用途是什麼？",
        ),
        b(
          "Provide consistent alignment and relationships",
          "提供一致對齊與關係",
        ),
        b("Force every element to be the same size", "強迫所有元素大小相同"),
        b(
          "A grid coordinates positions while allowing hierarchy. Equal size everywhere can erase the very emphasis the poster needs.",
          "網格協調位置，同時容許層級。所有大小相同可能抹去海報需要的強調。",
        ),
        { titleSize: 44, spacing: 28, hue: 210, columns: 1, format: 0 },
      ),
      l(
        b("Use type and whitespace together", "同時運用字級與留白"),
        b(
          "Large type can attract attention, but crowding makes it difficult to read. Whitespace separates groups and gives the headline room. Evaluate title size and spacing together instead of making every element larger.",
          "大字能吸引注意，但擁擠會讓閱讀困難。留白分隔群組，也給標題呼吸空間。應一起評估標題大小與間距，而不是把所有元素都放大。",
        ),
        b(
          "Raise title size, then compare outer margins of 20 and 40. This control changes the outer margin, not the line spacing. Check the headline's available width and its separation from the fixed grid panels.",
          "提高標題字級，再比較外側留白 20 和 40。這個控制改變外側邊界，不是行距。檢查標題可用寬度，以及它和固定網格區塊的距離。",
        ),
        b(
          "Why can extra space around a headline improve hierarchy?",
          "標題周圍增加空間為何能改善層級？",
        ),
        b(
          "It separates the headline from competing details",
          "它將標題與競爭的細節分開",
        ),
        b("It automatically adds more information", "它自動增加更多資訊"),
        b(
          "Whitespace changes relationships and attention, not information quantity. Too little separation can make a headline merge into surrounding text.",
          "留白改變關係與注意力，不會增加資訊數量。間隔太少可能讓標題融進周圍文字。",
        ),
        { titleSize: 58, spacing: 36, hue: 210, columns: 2, format: 0 },
      ),
      l(
        b("Give color a role", "讓色彩有用途"),
        b(
          "Color can identify the event's tone. Here hue changes the accent strip and grid panels; headline and date colors stay fixed. It should reinforce the existing reading order rather than create many competing focal points. A changed hue does not fix crowded spacing or weak type contrast.",
          "色彩能表達活動氣氛。這裡的色相改變裝飾線與網格區塊，標題和日期顏色保持固定。它應強化原有閱讀順序，而不是製造許多競爭焦點。換色相不能修復擁擠間距或薄弱的字級對比。",
        ),
        b(
          "Compare two hue choices while preserving layout. Check the white panel numbers against each background, then retain the palette whose emphasis best supports the headline.",
          "保留排版，比較兩個色相。檢查白色區塊編號在各背景上的清晰度，保留最能支持標題層級的配色。",
        ),
        b(
          "Can hue alone repair a confusing reading order?",
          "只改色相能修復混亂的閱讀順序嗎？",
        ),
        b(
          "No; size, position and spacing still matter",
          "不能；大小、位置與間距仍重要",
        ),
        b(
          "Yes; any vivid color guarantees clarity",
          "能；任何鮮豔色都保證清楚",
        ),
        b(
          "Hierarchy is built from several visual relationships. A vivid palette can increase competition when the underlying layout is unresolved.",
          "層級來自多種視覺關係。底層排版未解決時，鮮豔配色反而可能增加競爭。",
        ),
        { titleSize: 58, spacing: 36, hue: 280, columns: 2, format: 0 },
      ),
      l(
        b("Export and inspect another size", "匯出並檢查另一種尺寸"),
        b(
          "A poster that works in one shape can fail when narrowed. Format changes are a test of the hierarchy, not just a scale operation. Export the final poster only after checking that headline, date and numbered panels remain distinguishable.",
          "在一種形狀有效的海報，變窄後可能失敗。格式變更是在測試層級，不只是縮放。確認標題、日期與編號區塊仍可區分，再匯出成品。",
        ),
        b(
          "Switch formats, adjust headline size, columns and outer margin, then export your chosen poster SVG. Check that the smallest text remains readable at the intended viewing size.",
          "切換格式、調整標題字級、欄數與外側留白，再匯出海報 SVG。檢查預定觀看尺寸下，最小文字是否仍易讀。",
        ),
        b("What is a useful final format check?", "哪個是有用的最後格式檢查？"),
        b(
          "Verify reading order and text fit at the target size",
          "在目標尺寸確認閱讀順序與文字容納",
        ),
        b(
          "Assume the desktop view proves every format works",
          "假設桌面畫面證明所有格式都有效",
        ),
        b(
          "Different aspect ratios change available width and grouping. Testing the actual target format catches overflow and hierarchy problems.",
          "不同長寬比改變可用寬度與分組。測試真正的目標格式能發現溢出和層級問題。",
        ),
        { titleSize: 48, spacing: 28, hue: 280, columns: 1, format: 1 },
      ),
    ],
  },
  {
    id: "bouncing-character",
    kind: "animation",
    domain: b("Animation", "動畫"),
    title: b("Animate a bouncing character", "製作彈跳角色動畫"),
    description: b(
      "Shape a bounce using timing, easing and controlled deformation.",
      "以時間、緩動與受控變形塑造彈跳。",
    ),
    lessons: [
      l(
        b("Create motion from poses", "從姿勢產生運動"),
        b(
          "Frame-by-frame animation creates perceived motion from successive poses. Keyframes specify important states; interpolation fills the intervals. Our bounce uses a ground pose and a high pose, with duration controlling the cycle's pace.",
          "逐格動畫用連續姿勢產生運動感。關鍵影格指定重要狀態，插值填補中間變化。彈跳使用地面姿勢和高處姿勢，週期長度控制節奏。",
        ),
        b(
          "Play the default bounce, pause it and scrub the timeline. Identify the ground and highest poses before changing any timing.",
          "播放預設彈跳，暫停並拖動時間軸。改時間前，先找出地面與最高處姿勢。",
        ),
        b("What does a keyframe specify?", "關鍵影格指定什麼？"),
        b("An important state at a particular time", "特定時間的重要狀態"),
        b("Every possible future frame automatically", "自動指定所有未來影格"),
        b(
          "Interpolation still determines the motion between keyframes. Important poses alone do not specify how fast the character travels between them.",
          "關鍵影格之間仍由插值決定運動。只有重要姿勢，還不能指定角色在其間移動的快慢。",
        ),
        { duration: 2, height: 150, squash: 0, easing: 0 },
      ),
      l(
        b("Tune the time budget", "調整時間預算"),
        b(
          "The same path feels different at different durations. Shortening the cycle increases average movement speed without changing its height. Timing is therefore a design decision separate from the poses themselves.",
          "同一路徑在不同週期下有不同感受。縮短週期會提高平均移動速度，不需要改變高度。因此時間安排是獨立於姿勢的設計決策。",
        ),
        b(
          "Compare durations 1 and 2 seconds at fixed height. Pause at the same fractional timeline position and compare the pose.",
          "固定高度，比較 1 秒與 2 秒週期。在相同時間比例暫停，比較姿勢。",
        ),
        b(
          "What changes when duration halves but the path stays fixed?",
          "路徑固定、週期減半時，什麼會改變？",
        ),
        b("Average speed doubles", "平均速度加倍"),
        b("The maximum height must double", "最高高度一定加倍"),
        b(
          "The same distance is covered in half the time. Height is a separate parameter and need not change when timing changes.",
          "相同距離用一半時間完成，因此平均速度加倍。高度是獨立參數，時間改變時不必跟著變。",
        ),
        { duration: 1, height: 150, squash: 0, easing: 0 },
      ),
      l(
        b("Replace mechanical motion with easing", "用緩動改善機械感"),
        b(
          "Linear interpolation covers equal distances in equal times. A bounce usually slows near its top and accelerates toward contact. Easing redistributes motion through time, but a stylized curve is not necessarily a full physical simulation.",
          "線性插值在相同時間走相同距離。彈跳通常在頂端變慢、朝地面加速。緩動重新分配時間中的移動量，但風格化曲線不一定是完整物理模擬。",
        ),
        b(
          "Compare easing modes at the same duration. Scrub near the top and ground to inspect where position changes most rapidly.",
          "固定週期比較緩動模式，在頂端和地面附近拖動時間軸，檢查哪裡位置變化最快。",
        ),
        b("What does easing primarily change?", "緩動主要改變什麼？"),
        b("How progress is distributed over time", "進度如何分配在時間中"),
        b("The number of colors in the character", "角色的顏色數量"),
        b(
          "Easing maps time to progress along the motion. Color styling is unrelated to that timing map.",
          "緩動把時間映射成運動進度。角色配色與這個時間映射無關。",
        ),
        { duration: 2, height: 150, squash: 0, easing: 1 },
      ),
      l(
        b("Add weight with squash", "用擠壓增加重量感"),
        b(
          "Squash and stretch exaggerate impact while suggesting a consistent amount of material. When height shrinks, width can expand. Excessive deformation can obscure the silhouette, so test the contact pose as well as the full playback.",
          "擠壓伸展誇張碰撞，同時暗示材料總量一致。高度縮短時，寬度可以增加。過度變形可能破壞輪廓，因此要檢查接觸姿勢和完整播放。",
        ),
        b(
          "Compare squash 0, 20 and 40. Pause at contact and inspect width and height together, then watch whether the character remains recognizable.",
          "比較擠壓 0、20、40，在接觸時暫停，同時檢查寬與高，再觀察角色是否仍容易辨認。",
        ),
        b(
          "Why expand width while reducing height at impact?",
          "碰撞時降低高度，為何同時增加寬度？",
        ),
        b("To suggest preserved volume or area", "暗示體積或面積保持一致"),
        b("To move the ground upward", "把地面往上移"),
        b(
          "Compensating dimensions helps the shape feel like deforming material. Moving the ground is a different positional change and does not preserve the shape's mass impression.",
          "尺寸互相補償能讓形狀像材料在變形。移動地面是另一種位置變化，不能維持形體的質量感。",
        ),
        { duration: 2, height: 150, squash: 25, easing: 1 },
      ),
      l(
        b("Review the loop as a finished shot", "把循環當成完成鏡頭檢查"),
        b(
          "A loop should return cleanly to its starting state. Review the boundary, peak and contact, not only an attractive middle frame. Save the timing and deformation parameters so another playback reproduces the same shot.",
          "循環應平順回到起始狀態。檢查週期邊界、頂點和接觸，不只看漂亮的中間影格。保存時間與變形參數，讓下次播放能重現相同鏡頭。",
        ),
        b(
          "Choose height, duration and squash. Play several cycles and inspect the boundary, then export project data to preserve playback settings. An SVG export captures only the current still frame.",
          "選擇高度、週期與擠壓量，播放數個循環並檢查邊界，再匯出作品資料以保留播放設定。SVG 匯出只會記錄目前的靜止影格。",
        ),
        b("Which inspection catches a loop seam?", "哪個檢查能發現循環接縫？"),
        b(
          "Compare the ending state with the starting state",
          "比較結束狀態與開始狀態",
        ),
        b("Inspect only the highest pose", "只檢查最高處姿勢"),
        b(
          "A seam appears at the transition between cycles. The highest pose can look correct while the end-to-start transition still jumps.",
          "接縫出現在兩個週期交替之處。最高姿勢可能正確，但結束到開始仍然跳動。",
        ),
        { duration: 1.8, height: 130, squash: 20, easing: 1 },
      ),
    ],
  },
  {
    id: "small-ecosystem",
    kind: "ecosystem",
    domain: b("Biology", "生物"),
    title: b("Build a small ecosystem", "建立小型生態系"),
    description: b(
      "Compare population scenarios under resource limits and predation.",
      "在資源限制與捕食下比較族群情境。",
    ),
    lessons: [
      l(
        b("Draw the living relationships", "畫出生命之間的關係"),
        b(
          "Ecological models simplify food webs into measurable relationships. Here prey grow with resources and predators depend on prey. The variables represent aggregate populations, not individual organisms or a prediction for a particular habitat.",
          "生態模型把食物網簡化成可測量關係。這裡獵物依靠資源成長，捕食者依賴獵物。變數代表整體族群，不是個別生物，也不是特定棲地的預測。",
        ),
        b(
          "Run the starting populations and identify the two curves. Observe which population responds after changes in the other.",
          "執行初始族群，辨認兩條曲線。觀察一個族群變化後，另一個如何回應。",
        ),
        b("What does this model represent?", "這個模型代表什麼？"),
        b("Simplified population relationships", "簡化的族群關係"),
        b("Every organism's exact future", "每個生物精確的未來"),
        b(
          "Aggregated equations omit individual variation and many environmental factors. They help inspect mechanisms without predicting every organism.",
          "整體方程式省略個體差異與許多環境因素。它們幫助檢查機制，不能預測每個生物。",
        ),
        { prey: 40, predators: 8, capacity: 100, growth: 0.7 },
      ),
      l(
        b("Separate growth from population size", "分開成長率與族群大小"),
        b(
          "A growth parameter controls how quickly prey can increase under favorable conditions. Initial population controls where the scenario starts. Changing both at once makes it hard to tell why the curves differ.",
          "成長參數控制獵物在有利條件下增加多快；初始族群控制情境從哪裡開始。兩者同時改變，會難以判斷曲線差異的原因。",
        ),
        b(
          "Keep starting populations and capacity fixed. Compare growth 0.4 and 0.8, focusing on early changes before later interactions accumulate.",
          "固定初始族群與容量，比較成長率 0.4 和 0.8。先注意早期變化，再看後續交互作用累積。",
        ),
        b(
          "Which comparison isolates the growth parameter?",
          "哪個比較能隔離成長參數？",
        ),
        b(
          "Change growth while keeping other inputs fixed",
          "只改成長率，固定其他輸入",
        ),
        b("Change all populations and capacity too", "同時更改所有族群與容量"),
        b(
          "A controlled comparison changes one cause at a time. Multiple simultaneous changes create competing explanations for the resulting curves.",
          "控制比較一次改變一個原因。同時改多項會讓曲線結果有多種競爭解釋。",
        ),
        { prey: 40, predators: 8, capacity: 100, growth: 0.4 },
      ),
      l(
        b("Introduce a resource ceiling", "加入資源上限"),
        b(
          "Carrying capacity describes a resource-supported scale for prey in this simplified growth term. As prey approach it, net growth slows. It is not a rigid wall that guarantees every interacting trajectory stays exactly below that number.",
          "承載量在簡化成長項中描述資源可支持的獵物規模。獵物接近它時，淨成長減慢。它不是一道硬牆，不保證所有交互作用軌跡都精確低於這個數字。",
        ),
        b(
          "Compare capacities 60 and 140 with identical populations and growth. Record how resource availability changes the prey trajectory.",
          "固定族群與成長率，比較承載量 60 和 140，記錄資源可用性如何改變獵物曲線。",
        ),
        b("What does carrying capacity encode here?", "這裡的承載量編碼什麼？"),
        b(
          "A resource limit in the prey growth model",
          "獵物成長模型中的資源限制",
        ),
        b("A guaranteed constant predator count", "保證固定的捕食者數量"),
        b(
          "Capacity modifies prey growth. Predator numbers still evolve through their own relationship with prey and are not fixed by that parameter.",
          "承載量修改獵物成長。捕食者仍依其與獵物的關係變化，不會被這個參數固定。",
        ),
        { prey: 40, predators: 8, capacity: 60, growth: 0.7 },
      ),
      l(
        b("Test a disturbance", "測試環境擾動"),
        b(
          "A disturbance can change starting populations or resource availability. Compare a baseline and one altered condition over the same time window. A temporary rebound is not necessarily long-term stability, so inspect the full trajectory.",
          "擾動可以改變起始族群或資源供應。用相同時間範圍比較基準與一個改變條件。短暫回升不一定代表長期穩定，因此要檢查整段軌跡。",
        ),
        b(
          "Keep the baseline inputs except increase predators from 8 to 16. Compare the prey response, then restore the baseline before a capacity experiment.",
          "除了把捕食者從 8 增到 16，其他基準輸入不變。比較獵物反應，再還原基準才進行容量實驗。",
        ),
        b(
          "Why restore the baseline between disturbances?",
          "不同擾動之間為何要還原基準？",
        ),
        b("So each scenario has a clear comparison", "讓每個情境都有清楚比較"),
        b(
          "Because the baseline is guaranteed realistic",
          "因為基準保證符合真實世界",
        ),
        b(
          "Restoring inputs makes differences interpretable. A baseline is a reference configuration, not proof that its numbers match a real habitat.",
          "還原輸入讓差異可解釋。基準只是參考設定，不是證明數值符合真實棲地。",
        ),
        { prey: 40, predators: 16, capacity: 100, growth: 0.7 },
      ),
      l(
        b("Present an ecosystem comparison", "呈現生態系比較"),
        b(
          "Your result is a comparison of model scenarios with explicit assumptions. Record starting populations, capacity and growth, then identify one mechanism and one omitted factor such as migration or seasonal resources. Avoid treating a smooth curve as a forecast.",
          "成果是附帶明確假設的模型情境比較。記錄初始族群、容量與成長率，再指出一項機制和一個省略因素，例如遷徙或季節資源。不要把平滑曲線當成預報。",
        ),
        b(
          "Export the baseline project data before changing one input, then export that comparison separately. Explain how adding migration could alter conclusions about a declining population.",
          "改變一項輸入前先匯出基準作品資料，再另外匯出比較情境。說明若加入遷徙，可能如何改變對下降族群的結論。",
        ),
        b(
          "Which statement is appropriate for your report?",
          "哪個說法適合放進報告？",
        ),
        b(
          "Under these assumptions, the scenarios differ this way",
          "在這些假設下，情境出現這樣的差異",
        ),
        b(
          "The local ecosystem will follow this exact curve",
          "當地生態系一定遵循這條精確曲線",
        ),
        b(
          "Model conclusions are conditional on inputs and equations. Real ecosystems include omitted processes and uncertain measurements.",
          "模型結論取決於輸入和方程式。真實生態系還有未納入的過程與不確定測量。",
        ),
        { prey: 40, predators: 8, capacity: 100, growth: 0.7 },
      ),
    ],
  },
  {
    id: "particle-separation",
    kind: "separation",
    domain: b("Chemistry", "化學"),
    title: b("Design a particle separation experiment", "設計粒子分離實驗"),
    description: b(
      "Separate a modeled mixture using particle size and evaporation.",
      "利用粒子大小與蒸發，分離模型混合物。",
    ),
    lessons: [
      l(
        b("Define what must be recovered", "定義要回收的物質"),
        b(
          "Separation methods exploit differences in physical properties. Our mixture represents water, dissolved solute and insoluble particles. The experiment must say which material is the target; a clear liquid can still contain dissolved substances.",
          "分離方法利用物理性質的差異。混合物代表水、溶解的溶質與不溶粒子。實驗必須說明目標是哪種物質；透明液體仍可能含有溶解物。",
        ),
        b(
          "Inspect the unprocessed mixture and identify the three represented components. State whether your first target is insoluble solid or dissolved solute.",
          "檢查未處理混合物，辨認三種成分。先說明第一個目標是不溶固體還是溶質。",
        ),
        b(
          "Does a clear liquid necessarily contain only water?",
          "透明液體一定只有水嗎？",
        ),
        b("No; dissolved solute can remain", "不一定；仍可能有溶質"),
        b(
          "Yes; all substances are visible particles",
          "是；所有物質都能看見粒子",
        ),
        b(
          "Dissolved substances need not be visibly distinct. Appearance alone cannot establish purity or successful removal of solute.",
          "溶解物不一定能以肉眼區分。只有外觀不能確立純度，也不能證明溶質已移除。",
        ),
        { filter: 0, evaporate: 0 },
      ),
      l(
        b("Choose a property that differs", "選擇有差異的性質"),
        b(
          "A particle model explains why a filter can retain larger insoluble material while solvent and dissolved solute pass through. The model draws particles at symbolic sizes, not molecular scale. The useful idea is selective passage, not the artwork's dimensions.",
          "粒子模型說明過濾器為何留住較大的不溶物，而溶劑和溶質能通過。圖上粒子是象徵大小，不是分子比例。重點是選擇性通過，不是圖案實際尺寸。",
        ),
        b(
          "Activate filtration and compare retained material with filtrate. Follow the solute symbols rather than assuming the filter removes everything.",
          "啟用過濾，比較留下的物質和濾液。追蹤溶質符號，不要假設濾器會移除所有東西。",
        ),
        b(
          "What generally passes through this model's filter with water?",
          "在這個模型中，通常什麼會跟水一起通過濾器？",
        ),
        b("Dissolved solute", "溶解的溶質"),
        b("All retained insoluble particles", "所有被攔住的不溶粒子"),
        b(
          "The filter targets insoluble particles. Dissolved solute remains in the filtrate, so another property is needed to recover it.",
          "濾器針對不溶粒子。溶質留在濾液中，因此要用另一種性質回收它。",
        ),
        { filter: 1, evaporate: 0 },
      ),
      l(
        b("Remove solvent to recover solute", "移除溶劑以回收溶質"),
        b(
          "Evaporation transfers solvent into vapor and can leave nonvolatile solute behind. It does not destroy the solvent, and without a condenser this procedure does not collect purified liquid water. Decide whether losing the liquid collection matters to your objective.",
          "蒸發讓溶劑進入氣相，可能留下不揮發的溶質。它沒有消滅溶劑；沒有冷凝器時，也不會收集純化液態水。要判斷沒有收集液體是否影響目標。",
        ),
        b(
          "After filtration, activate evaporation. Compare the remaining solute with the removed solvent and identify which product has actually been collected.",
          "過濾後啟用蒸發，比較剩餘溶質與移出的溶劑，辨認真正收集到的產物。",
        ),
        b(
          "What does evaporation alone recover in this model?",
          "在此模型中，單靠蒸發能回收什麼？",
        ),
        b("The nonvolatile solute residue", "不揮發的溶質殘留物"),
        b("A bottle of condensed pure water", "一瓶已冷凝的純水"),
        b(
          "The solvent leaves as vapor; no condenser is modeled. Collecting liquid solvent would require an additional condensation step.",
          "溶劑以蒸氣離開，模型沒有冷凝器。要收集液態溶劑，還需要額外冷凝步驟。",
        ),
        { filter: 1, evaporate: 1 },
      ),
      l(
        b("Order the operations", "安排操作順序"),
        b(
          "Evaporating an unfiltered mixture can leave insoluble particles mixed with the solute residue. Filtering first removes that contamination before solvent removal. A procedure is therefore an ordered strategy. The toggles select a plan: when both are on, this renderer always applies filtration before evaporation, regardless of click order.",
          "未過濾就蒸發，可能讓不溶粒子混在溶質殘留物中。先過濾可在移除溶劑前去除這些污染。程序是有順序的策略。這裡的開關選擇計畫：兩者啟用時，無論點擊順序，畫面一律按先過濾再蒸發計算。",
        ),
        b(
          "Compare evaporation alone with filtration plus evaporation. Identify why the first residue can contain both solid components.",
          "比較單獨蒸發與先過濾再蒸發，說明第一種殘留物為何可能同時含有兩種固體。",
        ),
        b(
          "Which plan better isolates the dissolved nonvolatile solute?",
          "哪個計畫較能分離原先溶解的不揮發溶質？",
        ),
        b(
          "Filter out insoluble particles, then evaporate solvent",
          "先過濾不溶粒子，再蒸發溶劑",
        ),
        b(
          "Evaporate the original mixture and ignore the residue composition",
          "直接蒸發原混合物，不管殘留物成分",
        ),
        b(
          "Filtering removes a contaminant before concentration. Evaporation alone removes solvent but leaves both nonvolatile solid types together.",
          "過濾在濃縮前移除污染物。單靠蒸發只移除溶劑，兩種不揮發固體仍混在一起。",
        ),
        { filter: 0, evaporate: 1 },
      ),
      l(
        b("Verify a separation claim", "驗證分離主張"),
        b(
          "Report which components are retained, pass through or leave as vapor. The particle diagram demonstrates ideal complete separation; actual purity would need measurement. Resetting lets you compare plans from the same starting mixture.",
          "報告哪些成分被留下、通過或變成蒸氣。粒子圖解展示理想的完全分離；真實純度仍需要測量。重設能讓不同計畫從相同混合物開始比較。",
        ),
        b(
          "Turn both process toggles off, then enable filtration and evaporation. Verify 8 sand particles and 12 salt particles in separate collection dishes and 40 water particles evaporated. Export the final project data and explain why no liquid water was recovered.",
          "先關閉兩個處理開關，再啟用過濾與蒸發。確認分開的收集皿各有 8 個砂粒、12 個鹽粒，且 40 個水粒已蒸發。匯出最後作品資料，說明為何沒有回收液態水。",
        ),
        b(
          "What evidence supports the modeled separation result?",
          "什麼證據支持模型中的分離結果？",
        ),
        b(
          "Accounting for every component's destination",
          "交代每個成分最後去了哪裡",
        ),
        b("Only the mixture looking cleaner", "只看混合物變乾淨"),
        b(
          "A component balance shows what the procedure separated and what it did not recover. Visual clarity alone can hide dissolved contamination.",
          "成分去向能顯示程序分離了什麼、沒有回收什麼。只看透明程度可能漏掉溶解的污染。",
        ),
        { filter: 1, evaporate: 1 },
      ),
    ],
  },
  {
    id: "rain-ready-neighborhood",
    kind: "flood",
    domain: b("Geography", "地理"),
    title: b("Design a rain-ready neighborhood", "設計能接住暴雨的街區"),
    description: b(
      "Balance green space and storage against a simplified rainfall budget.",
      "以簡化降雨收支，平衡綠地與蓄水配置。",
    ),
    lessons: [
      l(
        b("Follow water through a street", "追蹤街區中的水"),
        b(
          "Urban paving changes where rain can infiltrate or accumulate. This model partitions rainfall into infiltration, storage and runoff. It is a planning illustration without a real drainage network, soil survey or flood forecast.",
          "都市鋪面改變雨水能滲入或累積的位置。模型把降雨分配到入滲、蓄水與逕流。它是規劃示意，沒有真實排水網、土壤調查或洪水預報。",
        ),
        b(
          "Set rain to 60 mm, green ground to 30% and storage to 10 mm; inspect the immediately calculated water-budget outputs. Identify where water goes instead of reading runoff alone.",
          "設定降雨 60 mm、透水地表 30%、蓄水 10 mm，檢查立即計算的水量收支輸出。辨認水的去向，不只看逕流。",
        ),
        b("What must a water budget account for?", "水量收支必須交代什麼？"),
        b(
          "How rainfall is divided among modeled destinations",
          "降雨如何分配到模型中的各個去向",
        ),
        b("Only the neighborhood's color", "只有街區顏色"),
        b(
          "Conservation requires tracking the water amount in each destination. A map's appearance cannot substitute for that accounting.",
          "守恆要求追蹤各個去向的水量。地圖外觀不能取代這項收支計算。",
        ),
        { rain: 60, green: 30, storage: 10 },
      ),
      l(
        b("Give soil room to absorb", "讓土壤有吸水空間"),
        b(
          "Green area can support infiltration in this simplified model. Infiltration is min(rain,30) times the green fraction: permeable ground absorbs at most 30 mm in one storm. This assumed capacity is not universal. Holding rainfall fixed makes land-cover comparisons interpretable.",
          "在簡化模型中，綠地能支持入滲。入滲為 min(雨量,30) 乘以綠地比例：透水地表每場雨最多吸收 30 mm。這項假設容量不是通用常數。固定降雨，才能清楚比較土地覆蓋。",
        ),
        b(
          "Compare green area 20 and 60 with rain 60 and storage 10. Record the change in infiltration and remaining runoff.",
          "固定降雨 60、蓄水 10，比較綠地 20 和 60，記錄入滲與剩餘逕流的變化。",
        ),
        b(
          "Why keep rain fixed when comparing green area?",
          "比較綠地時，為何固定降雨？",
        ),
        b("To isolate the land-cover change", "隔離土地覆蓋改變的效果"),
        b("Because all storms have equal rainfall", "因為所有暴雨雨量相同"),
        b(
          "A controlled storm input lets us attribute differences to land cover. Real storms vary, so later tests should change rainfall separately.",
          "固定降雨輸入讓差異能歸因於覆蓋。真實暴雨不同，因此後續應另外改變雨量測試。",
        ),
        { rain: 60, green: 60, storage: 10 },
      ),
      l(
        b("Add a finite storage buffer", "加入有限蓄水緩衝"),
        b(
          "Storage holds part of the water that would otherwise become runoff. It has a capacity and can fill; it is not an infinite sink. The model treats one event, so emptying between storms is outside the current calculation.",
          "蓄水容納部分原本會成為逕流的水。它有容量且會裝滿，不是無限消失的水槽。模型只處理單次事件，暴雨間如何排空不在目前計算中。",
        ),
        b(
          "Keep rain and green area fixed, then raise storage. Find when extra storage stops changing runoff for this particular event.",
          "固定降雨與綠地，逐步提高蓄水量，找出這次事件中額外蓄水何時不再改變逕流。",
        ),
        b(
          "Why can extra storage eventually stop helping in one event?",
          "單次事件中，額外蓄水為何可能不再有幫助？",
        ),
        b(
          "All remaining water may already be accommodated",
          "剩餘水量可能已全部被容納",
        ),
        b("Storage creates extra rainfall", "蓄水會創造更多降雨"),
        b(
          "Once no excess water remains, unused capacity cannot reduce runoff below zero. Storage does not change the rainfall input.",
          "沒有多餘水後，未使用容量不能讓逕流低於零。蓄水不會改變降雨輸入。",
        ),
        { rain: 60, green: 40, storage: 30 },
      ),
      l(
        b("Stress-test a stronger storm", "用更強暴雨壓力測試"),
        b(
          "A design that contains one storm may overflow under a larger one. Compare multiple rain amounts while preserving the land plan. Nonnegative runoff and an accounted-for water total are basic checks on the simulation.",
          "能接住一次暴雨的設計，遇到更大雨量仍可能溢流。保留土地配置，比較多種雨量。逕流非負和總水量有交代，是模擬的基本檢查。",
        ),
        b(
          "Keep green 50 and storage 25. Compare rain 40, 80 and 120, noting when runoff appears and which capacity becomes limiting.",
          "固定綠地 50、蓄水 25，比較雨量 40、80、120，注意逕流何時出現，以及哪個容量成為限制。",
        ),
        b(
          "Does zero runoff in one simulated storm prove flood safety?",
          "一次模擬沒有逕流，就證明不會淹水嗎？",
        ),
        b(
          "No; other storms and omitted drainage effects matter",
          "不能；其他暴雨和省略的排水效應仍重要",
        ),
        b(
          "Yes; one event covers every future condition",
          "能；一次事件涵蓋所有未來條件",
        ),
        b(
          "The result is conditional on one input and a simplified model. Larger storms, saturated soil and drainage failures can change the outcome.",
          "結果只適用於一組輸入和簡化模型。更大雨量、飽和土壤與排水故障都可能改變結果。",
        ),
        { rain: 120, green: 50, storage: 25 },
      ),
      l(
        b("Explain the neighborhood tradeoff", "說明街區的取捨"),
        b(
          "Green space and storage both use land or construction resources. Present two configurations and their runoff under the same storm, then describe a tradeoff the simulator does not price. The final plan is a learning artifact, not site engineering advice.",
          "綠地和蓄水都使用土地或施工資源。呈現兩組配置在同一場暴雨下的逕流，再說明模擬沒有計價的取捨。最後計畫是學習作品，不是現地工程建議。",
        ),
        b(
          "Save your selected layout and compare a lower-storage alternative. Record the storm assumption and one omitted factor such as soil saturation.",
          "保存所選配置，與較低蓄水替代方案比較。記錄降雨假設和一個省略因素，例如土壤飽和。",
        ),
        b(
          "Which report makes the comparison reproducible?",
          "哪種報告能讓比較重現？",
        ),
        b(
          "Rain, green area, storage and resulting water budget",
          "雨量、綠地、蓄水與結果水量收支",
        ),
        b("Only a label saying flood-proof", "只有防淹水標籤"),
        b(
          "Explicit inputs and outputs let others repeat the model. A flood-proof label overstates what this limited simulation can establish.",
          "明確輸入與輸出讓他人重現模型。防淹水標籤超出了有限模擬能確立的範圍。",
        ),
        { rain: 80, green: 60, storage: 30 },
      ),
    ],
  },
  {
    id: "coffee-shop",
    kind: "economy",
    domain: b("Economics", "經濟"),
    title: b("Run a simulated coffee shop", "經營模擬咖啡店"),
    description: b(
      "Compare pricing, stock and costs across demand scenarios.",
      "在不同需求情境中比較定價、庫存與成本。",
    ),
    lessons: [
      l(
        b("Make scarcity visible", "讓稀缺看得見"),
        b(
          "A shop cannot sell more cups than it has stock or willing customers. This simulation uses an explicit demand response to price and baseline demand at $5. It is a toy business model, not a forecast for a real cafe or investment decision.",
          "店家不能賣出超過庫存或顧客願買數量的杯數。模擬使用明確的價格與售價 $5 時的需求需求反應。這是教學商業模型，不是真實咖啡店預報或投資決策。",
        ),
        b(
          "Inspect price 5, stock 80 and baseline demand at $5 100. Compare demand, sales and unsold stock; identify which quantity limits sales.",
          "檢查價格 5、庫存 80、售價 $5 時的需求 100。比較需求、銷售與未售庫存，辨認哪個量限制銷售。",
        ),
        b("What limits actual sales?", "什麼限制實際銷售？"),
        b("Both demand and available stock", "需求與可用庫存兩者"),
        b("Stock alone, even without customers", "只有庫存，就算沒顧客也一樣"),
        b(
          "Sales cannot exceed either willing demand or inventory. Having stock does not create buyers at the chosen price.",
          "銷售不能超過願意購買的需求或庫存。擁有庫存不會自動創造願以該價格購買的顧客。",
        ),
        { price: 5, stock: 80, traffic: 100, cost: 2, fixed: 100 },
      ),
      l(
        b("Separate revenue from profit", "分開營收與利潤"),
        b(
          "Revenue is price times units sold. Profit subtracts modeled variable and fixed costs. Here every prepared cup costs money, including leftovers: profit = price × sales − cost × stock − fixed. Unsold cups bring no revenue.",
          "營收是價格乘以銷售量。利潤還要扣除模型中的變動與固定成本。這裡每杯備貨都要付成本，含未售杯數：利潤＝售價×銷量－每杯成本×備貨－固定成本。未售杯數沒有營收。",
        ),
        b(
          "Keep sales inputs fixed and compare fixed cost 50 with 100. Inspect the profit change while revenue remains unchanged.",
          "固定銷售輸入，比較固定成本 50 和 100。觀察營收不變時，利潤如何改變。",
        ),
        b(
          "Does positive revenue guarantee positive profit?",
          "營收為正就保證有利潤嗎？",
        ),
        b("No; costs can exceed revenue", "不會；成本可能超過營收"),
        b("Yes; all sales are profit", "會；所有銷售都是利潤"),
        b(
          "Revenue excludes expenses. A shop can sell many cups and still lose money if its modeled costs exceed the receipts.",
          "營收尚未扣除費用。即使賣出很多杯，只要模型成本高於收入，店家仍可能虧損。",
        ),
        { price: 5, stock: 80, traffic: 100, cost: 2, fixed: 50 },
      ),
      l(
        b("Price changes demand too", "價格也會改變需求"),
        b(
          "Raising price increases receipts per sale but may reduce the number of buyers. The demand curve encodes an assumption about that response. Compare total outcomes instead of assuming the highest unit price yields the highest profit.",
          "提高價格增加每筆收入，卻可能減少買家。需求曲線編碼了這種反應的假設。應比較總結果，不要假設最高單價必然帶來最高利潤。",
        ),
        b(
          "Compare prices 3, 5 and 7 with baseline demand at $5 and stock fixed. Record demand, sales and profit, and identify the modeled tradeoff.",
          "固定售價 $5 時的需求和庫存，比較價格 3、5、7，記錄需求、銷售與利潤，辨認模型中的取捨。",
        ),
        b(
          "Why might a higher price reduce profit?",
          "較高價格為何可能降低利潤？",
        ),
        b(
          "The loss of sales may outweigh the higher margin",
          "減少的銷售可能超過單筆毛利增加",
        ),
        b("Revenue never depends on units sold", "營收從不受銷量影響"),
        b(
          "Revenue multiplies price by sales volume. A sufficiently large drop in volume can offset a higher price per cup.",
          "營收是價格乘以銷量。銷量若下降夠多，就可能抵銷每杯價格增加的效果。",
        ),
        { price: 7, stock: 80, traffic: 100, cost: 2, fixed: 100 },
      ),
      l(
        b("Prepare for demand uncertainty", "為需求不確定性準備"),
        b(
          "Inventory decisions trade availability against leftover stock and its modeled cost. Baseline demand at $5 is a scenario input, not guaranteed attendance. Test both quiet and busy days before choosing a stock level from a single favorable case.",
          "庫存決策在供貨能力、剩貨及模型成本之間取捨。售價 $5 時的需求是情境輸入，不是保證來客。不要只根據一個有利案例，應先測試冷清與忙碌日。",
        ),
        b(
          "At fixed price and stock, compare baseline demand at $5 50 and 150. Note lost sales or leftovers, then change stock and repeat both days.",
          "固定價格與庫存，比較售價 $5 時的需求 50 和 150，記錄缺貨損失或剩貨。再改庫存，重做兩種日子。",
        ),
        b(
          "What does testing quiet and busy days reveal?",
          "測試冷清與忙碌日能揭露什麼？",
        ),
        b(
          "How the decision behaves across scenarios",
          "決策在不同情境下的表現",
        ),
        b("The exact number of tomorrow's customers", "明天顧客的精確數量"),
        b(
          "Scenario testing exposes sensitivity to demand. It does not estimate tomorrow's baseline demand at $5 without separate data and a validated forecasting model.",
          "情境測試顯示對需求的敏感度。沒有其他資料與驗證過的預測模型，不能算出明天精確售價 $5 時的需求。",
        ),
        { price: 5, stock: 80, traffic: 150, cost: 2, fixed: 100 },
      ),
      l(
        b("Present a defensible operating choice", "呈現可辯護的經營選擇"),
        b(
          "Your operating card should record price, stock, cost assumptions and baseline demand at $5 scenarios. Choose a policy you can explain, including when it performs poorly. Real cafes add labor, spoilage, customer loyalty and other effects beyond this model.",
          "經營卡應記錄價格、庫存、成本假設與售價 $5 時的需求情境。選擇能說明的策略，也交代何時表現不好。真實咖啡店還有人工、腐敗、顧客忠誠等模型之外的因素。",
        ),
        b(
          "Save a chosen price and stock level. Compare its quiet-day and busy-day results and state one reason a real shop could differ.",
          "保存選定價格與庫存，比較冷清日和忙碌日結果，說明一個真實店家可能不同的原因。",
        ),
        b(
          "Which claim is justified by this project?",
          "這個專題能支持哪項主張？",
        ),
        b(
          "The policy has these outcomes under the model assumptions",
          "此策略在模型假設下有這些結果",
        ),
        b("The policy guarantees real-world profit", "此策略保證真實世界獲利"),
        b(
          "The simulation compares conditional outcomes. A real profit guarantee would ignore missing costs, uncertain demand and model error.",
          "模擬比較有條件的結果。保證真實獲利會忽略缺漏成本、不確定需求與模型誤差。",
        ),
        { price: 5, stock: 70, traffic: 100, cost: 2, fixed: 100 },
      ),
    ],
  },
  {
    id: "logic-door",
    kind: "logic",
    domain: b("Logic", "邏輯"),
    title: b("Build a logic password door", "建造邏輯密碼門"),
    description: b(
      "Compose switches and gates, then verify every input case.",
      "組合開關與邏輯閘，再驗證所有輸入案例。",
    ),
    lessons: [
      l(
        b("Turn conditions into bits", "把條件變成位元"),
        b(
          "Boolean logic represents true and false with two states. Digital circuits use this abstraction to combine conditions reliably. In our door, A and B are authorization inputs and C is an alarm; this is a logic exercise, not a secure authentication system.",
          "布林邏輯用兩種狀態表示真與假。數位電路利用這個抽象可靠地組合條件。門鎖中 A、B 是授權輸入，C 是警報；這是邏輯練習，不是安全的認證系統。",
        ),
        b(
          "Toggle A, B and C separately and observe their 0/1 values. Start with alarm off and identify the current gate mode.",
          "分別切換 A、B、C，觀察 0/1 值。從警報關閉開始，辨認目前邏輯閘模式。",
        ),
        b(
          "How many possible states does one Boolean input have?",
          "一個布林輸入有幾種可能狀態？",
        ),
        b("Two", "兩種"),
        b("Any real number", "任意實數"),
        b(
          "A Boolean value is true or false. Continuous measurements must be converted into a condition before this two-state logic can use them.",
          "布林值是真或假。連續測量必須先轉成條件，這種兩態邏輯才能使用。",
        ),
        { a: 0, b: 0, c: 0, gate: 0 },
      ),
      l(
        b("Require both conditions with AND", "用 AND 要求兩個條件"),
        b(
          "AND is true only when both inputs are true. It models a door requiring two authorizations together. Testing only the all-true case is insufficient because a mistaken OR gate would pass that test too.",
          "AND 只有兩個輸入都真才為真。它可描述需要兩個授權同時成立的門。只測兩者皆真並不足夠，因為錯用 OR 也會通過這個測試。",
        ),
        b(
          "With alarm off and AND selected, try 00, 10, 01 and 11. Record which combination opens the door.",
          "關閉警報並選 AND，測試 00、10、01、11，記錄哪組會開門。",
        ),
        b(
          "Which input distinguishes AND from OR?",
          "哪組輸入能區分 AND 和 OR？",
        ),
        b("A = 1, B = 0", "A = 1、B = 0"),
        b("A = 1, B = 1", "A = 1、B = 1"),
        b(
          "With 10, AND is false while OR is true. With 11 both gates are true, so that case cannot reveal the difference.",
          "輸入 10 時，AND 為假，OR 為真。輸入 11 時兩者都真，因此無法看出差異。",
        ),
        { a: 1, b: 0, c: 0, gate: 0 },
      ),
      l(
        b("Allow an alternative with OR", "用 OR 接受替代條件"),
        b(
          "Inclusive OR is true when at least one input is true, including when both are true. It models alternative authorization routes. Everyday 'either' can sound exclusive, so the exact truth rule must be stated explicitly.",
          "包含式 OR 在至少一個輸入為真時成立，也包含兩者都真。它可表示替代授權途徑。日常的二選一可能聽起來互斥，因此必須明確寫出真值規則。",
        ),
        b(
          "Switch to OR with alarm off and repeat all four input pairs. Pay special attention to 11 rather than assuming either means exactly one.",
          "警報關閉，切換 OR，重測四組輸入。特別注意 11，不要假設二選一代表只能有一個真。",
        ),
        b(
          "What is inclusive OR for A = 1 and B = 1?",
          "A = 1、B = 1 時，包含式 OR 是多少？",
        ),
        b("1", "1"),
        b("0", "0"),
        b(
          "At least one is true, so inclusive OR returns 1. Returning 0 for two true inputs would describe exclusive OR instead.",
          "至少一個為真，所以包含式 OR 回傳 1。兩者都真時回傳 0，描述的是互斥 OR。",
        ),
        { a: 1, b: 1, c: 0, gate: 1 },
      ),
      l(
        b("Give the alarm veto power", "讓警報有否決權"),
        b(
          "The final condition combines authorization with NOT C. When the alarm is on, NOT C is false and the door stays closed regardless of A or B. Parenthesizing the authorization expression makes this veto explicit.",
          "最後條件把授權結果與 NOT C 結合。警報開啟時，NOT C 為假，不論 A、B 如何門都關閉。把授權運算括起來，能清楚表達這項否決權。",
        ),
        b(
          "Set both authorizations true, then toggle alarm. Repeat with OR selected and only one authorization true; verify the alarm still blocks entry.",
          "讓兩個授權皆真，再切換警報。換成 OR 且只有一個授權為真，確認警報仍阻止進入。",
        ),
        b(
          "For (A OR B) AND NOT C, what does C = 1 force?",
          "對 (A OR B) AND NOT C，C = 1 強制什麼結果？",
        ),
        b("Door closed", "門關閉"),
        b("Door open whenever A is true", "只要 A 為真就開門"),
        b(
          "NOT C becomes false and the final AND is false. Letting A bypass the alarm would implement a different expression.",
          "NOT C 變成假，最後 AND 因而為假。若讓 A 繞過警報，實作的就是另一個運算式。",
        ),
        { a: 1, b: 1, c: 1, gate: 1 },
      ),
      l(
        b("Verify the complete truth table", "驗證完整真值表"),
        b(
          "Three Boolean inputs produce 2³ = 8 combinations. A complete truth table tests all of them for the chosen gate mode. This establishes logical behavior, but it does not provide password secrecy, tamper resistance or real access security.",
          "三個布林輸入有 2³ = 8 種組合。完整真值表測試所選模式的所有組合。這能確立邏輯行為，但不提供密碼保密、防竄改或真實門禁安全。",
        ),
        b(
          "Choose your authorization rule, test all eight rows and save the gate configuration. Explain why this visible switch puzzle is not secure authentication.",
          "選擇授權規則，測試八列並保存邏輯閘設定。說明為何看得見的開關謎題不是安全認證。",
        ),
        b(
          "How many rows cover all three-input combinations?",
          "涵蓋三輸入全部組合需要幾列？",
        ),
        b("8", "8"),
        b("3", "3"),
        b(
          "Each input doubles the combinations: 2 × 2 × 2 = 8. Three rows test individual inputs but miss interactions among them.",
          "每個輸入讓組合加倍，2 × 2 × 2 = 8。三列只能測部分單獨輸入，會漏掉交互作用。",
        ),
        { a: 1, b: 1, c: 0, gate: 0 },
      ),
    ],
  },
];
