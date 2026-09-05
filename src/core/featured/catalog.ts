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
export const featuredCourses: FeaturedCourse[] = [
  {
    id: "interactive-portfolio",
    kind: "web",
    domain: {
      en: "Web development",
      zh: "網頁開發",
    },
    title: {
      en: "Build an interactive portfolio",
      zh: "打造互動作品集",
    },
    description: {
      en: "Build one semantic page, style its projects, add a real interaction and verify it with a keyboard.",
      zh: "建立語意清楚的網頁、安排作品版面、加入真實互動，最後以鍵盤驗證。",
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
      en: "Turn structured project data into a real HTML file, escape text safely and download your generated site.",
      zh: "把結構化作品資料轉為真實 HTML 檔案，安全處理文字並下載產生的網站。",
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
      en: "Build a replayable text adventure",
      zh: "打造可重玩的文字冒險",
    },
    description: {
      en: "Turn a branching story into explicit state, reusable actions and a tested ending without interactive input.",
      zh: "把分支故事轉為明確狀態、可重用行動與經過測試的結局，不需要互動式輸入。",
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
      en: "Turn a CSV into a story",
      zh: "把 CSV 變成故事",
    },
    description: {
      en: "Clean a small dataset, compare summaries and communicate the evidence.",
      zh: "清理小型資料集、比較摘要，並傳達有證據的解讀。",
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
      en: "Build a maze pathfinder",
      zh: "打造迷宮尋路器",
    },
    description: {
      en: "Model a grid as a graph and verify breadth-first shortest paths.",
      zh: "把格子建成圖，驗證廣度優先最短路徑。",
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
      en: "Build a 2D / 3D equation explorer",
      zh: "打造 2D／3D 方程式探索器",
    },
    description: {
      en: "Connect distance, circles and sphere slices in an adjustable geometric model.",
      zh: "從距離、圓到球面切片，建立可調整的幾何模型。",
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
      en: "Design a smooth roller coaster",
      zh: "設計平順的過山車",
    },
    description: {
      en: "Use slopes and matching conditions to inspect a joined track.",
      zh: "用斜率與連接條件檢查一段分段軌道。",
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
      en: "Design a fair game",
      zh: "設計公平的遊戲",
    },
    description: {
      en: "Balance win probability, reward and entry cost, then compare repeated trials.",
      zh: "平衡中獎機率、獎勵與入場成本，再比較重複試驗。",
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
      en: "Build a collision game level",
      zh: "製作碰撞遊戲關卡",
    },
    description: {
      en: "Transfer motion while tracking momentum and kinetic energy.",
      zh: "追蹤動量與動能，設計運動傳遞的關卡。",
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
      en: "Complete a satellite orbit mission",
      zh: "完成衛星入軌任務",
    },
    description: {
      en: "Compare falling, orbiting and escaping in a normalized gravity model.",
      zh: "在標準化引力模型中比較墜落、繞行與逃逸。",
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
      en: "Design an adjustable lamp",
      zh: "設計可調亮度的燈",
    },
    description: {
      en: "Explore a resistive circuit and compare voltage, current and power.",
      zh: "探索電阻電路，比較電壓、電流與功率。",
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
      en: "Build a mini synthesizer",
      zh: "打造迷你合成器",
    },
    description: {
      en: "Shape pitch, timbre and envelopes, then play a short phrase.",
      zh: "塑造音高、音色與包絡，再播放一段短旋律。",
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
      en: "Make an interactive color tool",
      zh: "製作互動調色工具",
    },
    description: {
      en: "Mix RGB light, evaluate contrast and export a reusable color.",
      zh: "混合 RGB 光線、評估對比，並匯出可重用色彩。",
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
      en: "Make a poster with visual hierarchy",
      zh: "製作有視覺層級的海報",
    },
    description: {
      en: "Arrange an event message using type, space, grid and color.",
      zh: "使用字級、留白、網格與色彩安排活動訊息。",
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
      en: "Animate a bouncing character",
      zh: "製作彈跳角色動畫",
    },
    description: {
      en: "Shape a bounce using timing, easing and controlled deformation.",
      zh: "以時間、緩動與受控變形塑造彈跳。",
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
      en: "Build a small ecosystem",
      zh: "建立小型生態系",
    },
    description: {
      en: "Compare population scenarios under resource limits and predation.",
      zh: "在資源限制與捕食下比較族群情境。",
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
      en: "Design a particle separation experiment",
      zh: "設計粒子分離實驗",
    },
    description: {
      en: "Separate a modeled mixture using particle size and evaporation.",
      zh: "利用粒子大小與蒸發，分離模型混合物。",
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
      en: "Design a rain-ready neighborhood",
      zh: "設計能接住暴雨的街區",
    },
    description: {
      en: "Balance green space and storage against a simplified rainfall budget.",
      zh: "以簡化降雨收支，平衡綠地與蓄水配置。",
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
      en: "Run a simulated coffee shop",
      zh: "經營模擬咖啡店",
    },
    description: {
      en: "Compare pricing, stock and costs across demand scenarios.",
      zh: "在不同需求情境中比較定價、庫存與成本。",
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
      en: "Build a logic password door",
      zh: "建造邏輯密碼門",
    },
    description: {
      en: "Compose switches and gates, then verify every input case.",
      zh: "組合開關與邏輯閘，再驗證所有輸入案例。",
    },
    chapters: 5,
  },
];
