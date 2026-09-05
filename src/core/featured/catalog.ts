// Lightweight catalog: keep chapter content out of the browser catalog bundle.
import type { Bilingual } from "./types";
import type { LabKind } from "../lab";
export interface FeaturedCourse {
  id: string;
  title: Bilingual;
  description: Bilingual;
  domain: Bilingual;
  kind: LabKind | "web" | "python";
  chapters: number;
}
// Titles name the tool or concept first and the finished artifact second, so a
// reader knows what they will practise before they open the course.
export const featuredCourses: FeaturedCourse[] = [
  {
    id: "interactive-portfolio",
    kind: "web",
    domain: {
      en: "Web development",
      zh: "網頁開發",
    },
    title: {
      en: "Build an interactive portfolio page with HTML and CSS",
      zh: "用 HTML 與 CSS 打造可互動的作品集網頁",
    },
    description: {
      en: "Write semantic markup, lay out the project grid, add a JavaScript interaction, then check it works from the keyboard.",
      zh: "寫出語意清楚的標籤、排好作品區塊版面、加上 JavaScript 點擊互動，最後用鍵盤操作驗證。",
    },
    chapters: 5,
  },
  {
    id: "python-data-website",
    kind: "python",
    domain: {
      en: "Python",
      zh: "Python",
    },
    title: {
      en: "Make a personal data website with Python",
      zh: "用 Python 製作個人資料網站",
    },
    description: {
      en: "Turn structured project data into a real HTML file, escape text safely, then download the site you generated.",
      zh: "把結構化的作品資料轉成真實 HTML 檔案，安全處理文字，再下載自己產生的網站。",
    },
    chapters: 5,
  },
  {
    id: "python-text-adventure",
    kind: "python",
    domain: {
      en: "Python",
      zh: "Python",
    },
    title: {
      en: "Write a branching story game with Python dictionaries and functions",
      zh: "用 Python 字典與函式寫出分支故事遊戲",
    },
    description: {
      en: "Store each branch as dictionary state, reuse actions as functions, then test that every ending can be reached.",
      zh: "把每個分支存成字典狀態、用函式重複使用行動，再寫測試確認每個結局都走得到。",
    },
    chapters: 5,
  },
  {
    id: "csv-story",
    kind: "data",
    domain: {
      en: "Data",
      zh: "資料",
    },
    title: {
      en: "Clean a CSV and find its trend with Python",
      zh: "用 Python 清理 CSV 並找出資料趨勢",
    },
    description: {
      en: "Handle missing and duplicate rows, compute averages and extremes, then say what the data actually supports.",
      zh: "處理缺漏與重複的資料列、計算平均與極值，再說明這份資料到底支持什麼結論。",
    },
    chapters: 5,
  },
  {
    id: "maze-pathfinder",
    kind: "pathfinding",
    domain: {
      en: "Algorithms",
      zh: "演算法",
    },
    title: {
      en: "Find the shortest maze path with breadth-first search",
      zh: "用廣度優先搜尋找出迷宮最短路徑",
    },
    description: {
      en: "Model the grid as a graph, expand it level by level with a queue, and verify the path really is the shortest.",
      zh: "把格子地圖建成圖、用佇列逐層展開，並驗證找到的真的是最短路徑。",
    },
    chapters: 5,
  },
  {
    id: "equation-explorer",
    kind: "geometry",
    domain: {
      en: "Mathematics",
      zh: "數學",
    },
    title: {
      en: "Draw circles and spheres from the distance formula",
      zh: "用座標與距離公式畫出圓與球面",
    },
    description: {
      en: "Go from the distance between two points to the circle equation, then extend it to a sphere and its cross-sections.",
      zh: "從兩點距離推到圓的方程式，再延伸到三維球面與它的截面。",
    },
    chapters: 5,
  },
  {
    id: "smooth-coaster",
    kind: "calculus",
    domain: {
      en: "Mathematics",
      zh: "數學",
    },
    title: {
      en: "Design a smooth coaster track with slopes and derivatives",
      zh: "用斜率與導數設計平順的軌道曲線",
    },
    description: {
      en: "Compute each segment's slope and match them at the joins so the track changes direction without a sudden kink.",
      zh: "計算每段軌道的斜率，調整接點讓兩段銜接時方向一致，避免突然的轉折。",
    },
    chapters: 5,
  },
  {
    id: "fair-game",
    kind: "probability",
    domain: {
      en: "Probability",
      zh: "機率",
    },
    title: {
      en: "Design a fair prize game with probability and expected value",
      zh: "用機率與期望值設計公平的抽獎遊戲",
    },
    description: {
      en: "Compute the win probability and expected return, tune the prize and entry fee, then check it against repeated trials.",
      zh: "計算中獎機率與期望報酬、調整獎金與入場費，再用重複試驗檢驗結果。",
    },
    chapters: 5,
  },
  {
    id: "collision-level",
    kind: "collision",
    domain: {
      en: "Physics",
      zh: "物理",
    },
    title: {
      en: "Compute motion after a collision with momentum and kinetic energy",
      zh: "用動量與動能守恆計算碰撞後的運動",
    },
    description: {
      en: "Compare elastic and inelastic collisions, track conserved momentum and lost energy, then tune a level that can be cleared.",
      zh: "比較彈性與非彈性碰撞、追蹤守恆的動量與損失的能量，再調出能通關的關卡。",
    },
    chapters: 5,
  },
  {
    id: "satellite-mission",
    kind: "orbit",
    domain: {
      en: "Astronomy",
      zh: "天文",
    },
    title: {
      en: "Put a satellite into orbit with gravity and orbital speed",
      zh: "用重力與軌道速度把衛星送上軌道",
    },
    description: {
      en: "Compare falling, orbiting and escaping, then find the speed that holds a stable orbit.",
      zh: "比較墜落、繞行與逃逸三種結果，找出能讓衛星穩定繞行的速度。",
    },
    chapters: 5,
  },
  {
    id: "adjustable-lamp",
    kind: "circuit",
    domain: {
      en: "Electricity",
      zh: "電學",
    },
    title: {
      en: "Design a dimmable lamp circuit with Ohm's law",
      zh: "用歐姆定律設計可調亮度的燈泡電路",
    },
    description: {
      en: "Vary the resistance to see how current and voltage respond, then get the lamp's brightness from the power.",
      zh: "改變電阻，觀察電流與電壓如何變化，再從功率算出燈泡的實際亮度。",
    },
    chapters: 5,
  },
  {
    id: "mini-synthesizer",
    kind: "sound",
    domain: {
      en: "Music",
      zh: "音樂",
    },
    title: {
      en: "Synthesize an instrument sound from frequency and waveform",
      zh: "用頻率與波形合成樂器的聲音",
    },
    description: {
      en: "Set pitch from frequency, shape timbre with harmonics, control attack and decay with an envelope, then play a phrase.",
      zh: "用頻率決定音高、用泛音調出音色、用包絡控制起音與衰減，再彈出一段旋律。",
    },
    chapters: 5,
  },
  {
    id: "color-tool",
    kind: "color",
    domain: {
      en: "Color",
      zh: "色彩",
    },
    title: {
      en: "Build a palette tool from RGB mixing and contrast ratio",
      zh: "用 RGB 混色與對比度做出配色工具",
    },
    description: {
      en: "Mix red, green and blue light, compute the contrast between text and background, then export a usable color code.",
      zh: "混合紅綠藍三色光、計算文字與背景的對比度，再輸出可以直接使用的色碼。",
    },
    chapters: 5,
  },
  {
    id: "hierarchy-poster",
    kind: "design",
    domain: {
      en: "Design",
      zh: "設計",
    },
    title: {
      en: "Build a poster's visual hierarchy with type scale, space and grid",
      zh: "用字級、留白與網格排出海報視覺層級",
    },
    description: {
      en: "Set the gap between headline and body sizes, align elements on a grid, and lead the eye to the key message first.",
      zh: "決定標題與內文的字級差距、用網格對齊元素，讓讀者第一眼就看到最重要的訊息。",
    },
    chapters: 5,
  },
  {
    id: "bouncing-character",
    kind: "animation",
    domain: {
      en: "Animation",
      zh: "動畫",
    },
    title: {
      en: "Animate a bounce with timing curves and easing",
      zh: "用時間曲線與緩動做出彈跳動畫",
    },
    description: {
      en: "Space the keyframes, control acceleration with easing, then add squash and stretch to sell the weight.",
      zh: "安排關鍵影格的間距、用緩動控制加速與減速，再加入擠壓與拉伸強化重量感。",
    },
    chapters: 5,
  },
  {
    id: "small-ecosystem",
    kind: "ecosystem",
    domain: {
      en: "Biology",
      zh: "生物",
    },
    title: {
      en: "Model predator and prey populations over time",
      zh: "用族群模型模擬掠食者與獵物的數量變化",
    },
    description: {
      en: "Set birth rate, death rate and carrying capacity, then watch the populations oscillate, settle or collapse.",
      zh: "設定出生率、死亡率與環境容納量，再觀察族群如何震盪、達到平衡或崩潰。",
    },
    chapters: 5,
  },
  {
    id: "particle-separation",
    kind: "separation",
    domain: {
      en: "Chemistry",
      zh: "化學",
    },
    title: {
      en: "Separate a mixture using particle size and evaporation",
      zh: "用粒徑與蒸發原理分離混合物",
    },
    description: {
      en: "Choose filtering or evaporation by particle size, order the steps, then confirm every component comes out.",
      zh: "依粒子大小選擇過濾或蒸發、安排步驟順序，再確認每種成分都被分離出來。",
    },
    chapters: 5,
  },
  {
    id: "rain-ready-neighborhood",
    kind: "flood",
    domain: {
      en: "Geography",
      zh: "地理",
    },
    title: {
      en: "Size a neighborhood's flood storage from a rainfall budget",
      zh: "用降雨收支算出街區需要的滯洪空間",
    },
    description: {
      en: "Compare runoff from paving and green space, then compute how much storage a storm needs to stay dry.",
      zh: "比較不透水鋪面與綠地的逕流量，再算出暴雨時需要多少蓄水容量才不會淹水。",
    },
    chapters: 5,
  },
  {
    id: "coffee-shop",
    kind: "economy",
    domain: {
      en: "Economics",
      zh: "經濟",
    },
    title: {
      en: "Run a coffee shop with cost, price and demand",
      zh: "用成本、定價與需求關係經營咖啡店",
    },
    description: {
      en: "Work out fixed and variable costs, find the price that maximizes profit, then test stock decisions against demand scenarios.",
      zh: "算出固定與變動成本、找出讓利潤最大的定價，再用不同需求情境檢驗庫存決策。",
    },
    chapters: 5,
  },
  {
    id: "logic-door",
    kind: "logic",
    domain: {
      en: "Logic",
      zh: "邏輯",
    },
    title: {
      en: "Design a password lock from AND, OR and NOT gates",
      zh: "用 AND／OR／NOT 邏輯閘設計密碼鎖",
    },
    description: {
      en: "Combine switches and gates, write out the truth table, and confirm only the right combination opens the door.",
      zh: "組合開關與邏輯閘、列出真值表，確認只有正確的組合才會開門。",
    },
    chapters: 5,
  },
];
