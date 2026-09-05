"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LabProps } from "@/core/lab";
import {
  bounce,
  coffeeDay,
  ecosystem,
  lockOpen,
  separate,
  shortestPath,
  summarizeData,
  waterBalance,
} from "../../core/labs/projects";
import "./project-labs.css";

const defaults: Record<string, Record<string, number>> = {
  design: { titleSize: 44, spacing: 28, hue: 210, columns: 2, format: 0 },
  animation: { duration: 2, height: 150, squash: 25, easing: 1 },
  ecosystem: { prey: 40, predators: 8, capacity: 100, growth: 0.7 },
  separation: { filter: 0, evaporate: 0 },
  flood: { rain: 60, green: 30, storage: 10 },
  economy: { price: 5, stock: 80, traffic: 100, cost: 2, fixed: 100 },
  logic: { a: 0, b: 0, c: 0, gate: 0 },
  pathfinding: { maze: 0 },
  data: { clean: 1, chart: 0, group: 0 },
};
const bounds: Record<string, [number, number]> = {
  titleSize: [24, 64],
  spacing: [16, 60],
  hue: [0, 360],
  columns: [1, 3],
  format: [0, 1],
  duration: [0.5, 4],
  height: [30, 220],
  squash: [0, 60],
  easing: [0, 1],
  prey: [0, 100],
  predators: [0, 30],
  capacity: [20, 200],
  growth: [0.1, 1.5],
  filter: [0, 1],
  evaporate: [0, 1],
  rain: [0, 120],
  green: [0, 100],
  storage: [0, 50],
  price: [1, 10],
  stock: [0, 200],
  traffic: [20, 180],
  cost: [0.5, 5],
  fixed: [0, 200],
  a: [0, 1],
  b: [0, 1],
  c: [0, 1],
  gate: [0, 1],
  maze: [0, 1],
  clean: [0, 1],
  chart: [0, 1],
  group: [0, 1],
};
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ProjectLab({ kind, language, value, onChange }: LabProps) {
  const zh = language === "zh-TW";
  const t = (en: string, cn: string) => (zh ? cn : en);
  const v = { ...defaults[kind], ...value };
  for (const [key, fallback] of Object.entries(defaults[kind] ?? {})) {
    const [min, max] = bounds[key];
    v[key] = Math.max(
      min,
      Math.min(max, Number.isFinite(v[key]) ? v[key] : fallback),
    );
    if (max === 1 || key === "columns") v[key] = Math.round(v[key]);
  }
  const set = (key: string, n: number) => {
    const next =
      key === "maze"
        ? Object.fromEntries(
            Object.entries(value).filter(([k]) => !/^wall\d+$/.test(k)),
          )
        : value;
    onChange({ ...next, [key]: n });
  };
  const [playing, setPlaying] = useState(false),
    [frame, setFrame] = useState(0);
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setFrame((f) => {
          if (f >= 160) {
            if (kind !== "animation") setPlaying(false);
            return kind === "animation" ? 0 : 160;
          }
          return f + 1;
        }),
      kind === "animation" ? (v.duration * 1000) / 160 : 60,
    );
    return () => clearInterval(timer);
  }, [playing, kind, v.duration]);
  const range = (
    key: string,
    en: string,
    cn: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label className="lab-control" key={key}>
      <span>
        {t(en, cn)} <output>{v[key]}</output>
      </span>
      <input
        aria-label={t(en, cn)}
        name={key}
        type="range"
        min={min}
        max={max}
        step={step}
        value={v[key]}
        onChange={(e) => set(key, Number(e.target.value))}
      />
    </label>
  );
  const toggle = (key: string, en: string, cn: string) => (
    <label className="lab-control project-toggle" key={key}>
      <input
        type="checkbox"
        name={key}
        checked={Boolean(v[key])}
        onChange={(e) => set(key, e.target.checked ? 1 : 0)}
      />
      {t(en, cn)}
    </label>
  );
  const select = (
    key: string,
    en: string,
    cn: string,
    options: [string, string][],
  ) => (
    <label className="lab-control" key={key}>
      {t(en, cn)}
      <select
        name={key}
        value={v[key]}
        onChange={(e) => set(key, Number(e.target.value))}
      >
        {options.map(([a, b], i) => (
          <option value={i} key={i}>
            {t(a, b)}
          </option>
        ))}
      </select>
    </label>
  );
  const stat = (en: string, cn: string, n: string | number) => (
    <div className="lab-stat" key={en}>
      <span>{t(en, cn)}</span>
      <strong>{n}</strong>
    </div>
  );
  let controls: ReactNode,
    visual: ReactNode,
    stats: ReactNode,
    note = "",
    artifact: unknown = v;
  let viewBox = "0 0 640 400";
  let csv = "";

  if (kind === "design") {
    const width = v.format ? 360 : 640;
    viewBox = `0 0 ${width} 400`;
    controls = (
      <>
        {range("titleSize", "Headline size", "標題字級", 24, 64)}
        {range("spacing", "Outer margin", "外側留白", 16, 60)}
        {range("hue", "Accent hue", "主色相", 0, 360)}
        {range("columns", "Grid columns", "網格欄數", 1, 3)}
        {select("format", "Format", "尺寸", [
          ["Landscape", "橫式"],
          ["Portrait", "直式"],
        ])}
      </>
    );
    const columns = v.columns,
      inner = width - v.spacing * 2,
      cell = (inner - 12 * (columns - 1)) / columns;
    visual = (
      <>
        <rect width={width} height="400" fill="#f6f1e5" />
        <rect
          x={v.spacing}
          y={v.spacing}
          width="55"
          height="6"
          fill={`hsl(${v.hue} 70% 40%)`}
        />
        <text
          x={v.spacing}
          y={v.spacing + 55}
          fill="#192733"
          fontSize={v.titleSize}
          fontWeight="800"
        >
          {t("MAKE SPACE", "留白的力量")}
        </text>
        <text x={v.spacing} y={v.spacing + 94} fill="#465461" fontSize="17">
          {t("A festival of ideas • 21 September", "創意生活節・9 月 21 日")}
        </text>
        {Array.from({ length: columns }, (_, i) => (
          <g key={i}>
            <rect
              x={v.spacing + i * (cell + 12)}
              y="174"
              width={cell}
              height="130"
              rx="5"
              fill={`hsl(${v.hue} ${45 + i * 10}% ${32 + i * 14}%)`}
            />
            <text
              x={v.spacing + i * (cell + 12) + 10}
              y="210"
              fill="white"
              fontSize="22"
            >
              0{i + 1}
            </text>
            <line
              x1={v.spacing + i * (cell + 12)}
              x2={v.spacing + i * (cell + 12) + cell}
              y1="326"
              y2="326"
              stroke="#192733"
              strokeWidth="3"
            />
            <line
              x1={v.spacing + i * (cell + 12)}
              x2={v.spacing + i * (cell + 12) + cell * 0.7}
              y1="340"
              y2="340"
              stroke="#71808c"
              strokeWidth="2"
            />
          </g>
        ))}
      </>
    );
    stats = (
      <>
        {stat("Grid columns", "網格欄數", columns)}
        {stat("Headline / body", "標題／內文比", (v.titleSize / 17).toFixed(1))}
        {stat("Usable width", "可用寬度", inner)}
      </>
    );
    note = t(
      "Switch sizes to inspect the fixed headline. Reduce its size if it extends beyond the margin; the downloaded SVG is editable.",
      "切換尺寸檢查固定標題；若超出邊界，請縮小字級。下載的 SVG 可再編輯。",
    );
  } else if (kind === "animation") {
    const phase = frame / 160,
      y = bounce(phase, v.height, v.easing),
      contact = Math.max(0, 1 - y / 25),
      sx = 1 + (contact * v.squash) / 100;
    controls = (
      <>
        {range("duration", "Seconds per bounce", "每次彈跳秒數", 0.5, 4, 0.1)}
        {range("height", "Jump height", "彈跳高度", 30, 220)}
        {range("squash", "Contact squash %", "接觸擠壓 %", 0, 60)}
        {select("easing", "Interpolation", "插值", [
          ["Linear triangles", "線性三角波"],
          ["Parabolic flight", "拋物線飛行"],
        ])}
      </>
    );
    visual = (
      <>
        <path d="M40 320H600" stroke="#667587" strokeWidth="3" />
        <ellipse
          cx="320"
          cy="324"
          rx={35 - y / 12}
          ry="7"
          fill="#172b42"
          opacity=".15"
        />
        <g
          transform={`translate(320 ${320 - 30 / sx - y}) scale(${sx} ${1 / sx})`}
        >
          <circle r="30" fill="#e7a546" />
          <circle cx="-10" cy="-5" r="3" fill="#152c3c" />
          <circle cx="10" cy="-5" r="3" fill="#152c3c" />
          <path
            d="M-9 9Q0 17 9 9"
            fill="none"
            stroke="#152c3c"
            strokeWidth="3"
          />
        </g>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <circle
            key={p}
            cx={80 + p * 480}
            cy={370 - bounce(p, 40, v.easing)}
            r="5"
            fill="#477dd2"
          />
        ))}
        <path
          d={`M${Array.from({ length: 101 }, (_, i) => `${80 + i * 4.8},${370 - bounce(i / 100, 40, v.easing)}`).join(" L")}`}
          stroke="#477dd2"
          fill="none"
        />
      </>
    );
    stats = (
      <>
        {stat("Phase", "相位", phase.toFixed(2))}
        {stat("Height", "目前高度", y.toFixed(1))}
        {stat("Keyframes", "關鍵影格", "0 → 0.5 → 1")}
      </>
    );
    note = t(
      "Scrub the timeline or play. Parabolic flight slows near the top; squash preserves the character’s approximate area. Playback starts only when requested.",
      "拖曳時間軸或播放。拋物線在頂點變慢；擠壓大致維持角色面積。動畫只會在按下播放後啟動。",
    );
  } else if (kind === "ecosystem") {
    const history = ecosystem(v.prey, v.predators, v.capacity, v.growth),
      baseline = ecosystem(40, 8, 100, 0.7),
      scale = Math.max(
        100,
        ...history.map((p) => Math.max(p.prey, p.predators)),
      ),
      sample = history[frame];
    controls = (
      <>
        {range("prey", "Initial rabbits", "初始兔子", 0, 100)}
        {range("predators", "Initial foxes", "初始狐狸", 0, 30)}
        {range("capacity", "Resource capacity", "資源承載量", 20, 200)}
        {range("growth", "Rabbit growth rate", "兔子成長率", 0.1, 1.5, 0.1)}
      </>
    );
    const line = (points: typeof history, key: "prey" | "predators") =>
      points
        .map((p, i) => `${50 + i * 3.4},${340 - (p[key] / scale) * 270}`)
        .join(" ");
    visual = (
      <>
        <path d="M50 40V340H605" fill="none" stroke="#81909e" />
        <polyline
          points={line(baseline, "prey")}
          fill="none"
          stroke="#50a68b"
          strokeDasharray="5 5"
          opacity=".45"
        />
        <polyline
          points={line(history, "prey")}
          fill="none"
          stroke="#16856b"
          strokeWidth="3"
        />
        <polyline
          points={line(history, "predators")}
          fill="none"
          stroke="#de8540"
          strokeWidth="3"
        />
        <line
          x1={50 + frame * 3.4}
          x2={50 + frame * 3.4}
          y1="40"
          y2="340"
          stroke="#587ca6"
        />
        <text x="55" y="30" fill="#16856b">
          {t("Rabbits · dashed = baseline", "兔子・虛線為基準")}
        </text>
        <text x="410" y="30" fill="#de8540">
          {t("Foxes", "狐狸")}
        </text>
        <text x="280" y="380">
          {t("Time (model units)", "時間（模型單位）")}
        </text>
      </>
    );
    stats = (
      <>
        {stat("Rabbits", "兔子", sample.prey.toFixed(1))}
        {stat("Foxes", "狐狸", sample.predators.toFixed(1))}
        {stat("Time", "時間", (frame * 0.1).toFixed(1))}
      </>
    );
    artifact = history;
    note = t(
      "A logistic prey–predator teaching model; the dashed curve uses 40 rabbits, 8 foxes and capacity 100. It omits seasons, migration, disease and randomness; it is not an ecological forecast.",
      "資源限制與捕食的教學模型；虛線基準為 40 隻兔子、8 隻狐狸、承載量 100。省略季節、遷徙、疾病與隨機性，不能預測真實生態。",
    );
  } else if (kind === "separation") {
    const result = separate(Boolean(v.filter), Boolean(v.evaporate));
    artifact = result;
    controls = (
      <>
        {toggle("filter", "1. Filter insoluble sand", "1. 過濾不溶砂粒")}
        {toggle("evaporate", "2. Evaporate water", "2. 蒸發水分")}
      </>
    );
    const particles = (count: number, x: number, y: number, color: string) =>
      Array.from({ length: count }, (_, i) => (
        <circle
          key={`${color}-${i}`}
          cx={x + (i % 6) * 18}
          cy={y + Math.floor(i / 6) * 19}
          r="5"
          fill={color}
        />
      ));
    visual = (
      <>
        <path
          d="M50 110V310H220V110 M280 240V310H430V240 M465 240V310H620V240"
          stroke="#7d94a5"
          fill="none"
          strokeWidth="4"
        />
        <rect
          x="52"
          y="170"
          width="166"
          height={result.water ? 138 : 0}
          fill="#b7e4f2"
        />
        {particles(result.sand, 70, 270, "#a67946")}
        {particles(result.salt, 70, 190, "#ad62ba")}
        {particles(result.residueSand, 310, 265, "#a67946")}
        {particles(
          result.residueSalt,
          v.filter ? 480 : 70,
          v.filter ? 265 : 215,
          "#ad62ba",
        )}
        {particles(result.vapor, 500, 100, "#72bed7")}
        <text x="50" y="350">
          {t("Filtrate / beaker", "濾液／燒杯")}
        </text>
        <text x="280" y="350">
          {t("Filtered sand", "過濾砂粒")}
        </text>
        <text x="465" y="350">
          {t("Salt crystals", "鹽結晶")}
        </text>
        <text x="495" y="70">
          {t("Vapor", "水蒸氣")}
        </text>
      </>
    );
    stats = (
      <>
        {stat("Sand collected", "收集砂粒", result.residueSand)}
        {stat("Salt collected", "收集鹽粒", result.residueSalt)}
        {stat("Water evaporated", "蒸發水粒", result.vapor)}
      </>
    );
    note = t(
      v.evaporate && !v.filter
        ? "Salt remains mixed with sand: filter first to obtain separate solid fractions. This ideal model assumes perfect filtration and complete evaporation."
        : "Purple salt passes through the filter dissolved in blue water; brown sand is trapped. Evaporation removes water, not salt. This ideal model assumes perfect filtration and complete evaporation.",
      v.evaporate && !v.filter
        ? "鹽仍與砂混合：先過濾才能分開取得固體。本理想模型假設完全過濾與完全蒸發。"
        : "紫色鹽溶於藍色水中，會通過濾紙；棕色砂被截留。蒸發移除的是水，不是鹽。本理想模型假設完全過濾與完全蒸發。",
    );
  } else if (kind === "flood") {
    const result = waterBalance(v.rain, v.green, v.storage);
    artifact = result;
    controls = (
      <>
        {range("rain", "Rainfall (mm)", "降雨量（mm）", 0, 120)}
        {range("green", "Permeable ground %", "透水地表 %", 0, 100)}
        {range(
          "storage",
          "Tank capacity (mm over block)",
          "蓄水容量（街區等效 mm）",
          0,
          50,
        )}
      </>
    );
    visual = (
      <>
        {Array.from({ length: 30 }, (_, i) => (
          <line
            key={i}
            x1={40 + i * 19}
            x2={34 + i * 19}
            y1={30 + (i % 3) * 30}
            y2={40 + (i % 3) * 30 + v.rain / 3}
            stroke="#4293c3"
            strokeWidth="2"
          />
        ))}
        <rect x="40" y="205" width="560" height="90" fill="#99a6af" />
        <rect
          x="40"
          y="205"
          width={(560 * v.green) / 100}
          height="90"
          fill="#76ab7c"
        />
        <rect
          x="40"
          y={205 - result.runoff * 0.5}
          width="560"
          height={result.runoff * 0.5}
          fill="#4b9ddb"
          opacity=".6"
        />
        <rect
          x="420"
          y="310"
          width="160"
          height="60"
          fill="none"
          stroke="#5480a4"
          strokeWidth="3"
        />
        <rect
          x="423"
          y={367 - result.stored}
          width="154"
          height={result.stored}
          fill="#4b9ddb"
        />
        <text x="55" y="255">
          {t("Permeable", "透水地表")}
        </text>
        <text x="427" y="397">
          {t("Storage tank", "蓄水槽")}
        </text>
      </>
    );
    stats = (
      <>
        {stat("Infiltrated mm", "滲透 mm", result.infiltration.toFixed(1))}
        {stat("Stored mm", "蓄水 mm", result.stored.toFixed(1))}
        {stat("Runoff mm", "逕流 mm", result.runoff.toFixed(1))}
      </>
    );
    note = t(
      "Water balance over a uniform block: permeable land absorbs at most 30 mm per storm, then storage fills. Runoff = rain − infiltration − storage. No drains, timing or terrain; this is not a flood forecast.",
      "均勻街區的水量平衡：透水區每場雨最多吸收 30 mm，再填滿蓄水槽。逕流＝降雨－滲透－蓄水。未計入排水、時程與地形，不能預測真實淹水。",
    );
  } else if (kind === "economy") {
    const result = coffeeDay(v.price, v.stock, v.traffic, v.cost, v.fixed);
    artifact = result;
    controls = (
      <>
        {range("price", "Price per cup ($)", "每杯售價（$）", 1, 10, 0.25)}
        {range("stock", "Prepared cups", "備貨杯數", 0, 200)}
        {range("traffic", "Demand at $5", "售價 $5 時的需求", 20, 180)}
        {range(
          "cost",
          "Cost per prepared cup ($)",
          "每杯備貨成本（$）",
          0.5,
          5,
          0.25,
        )}
        {range("fixed", "Daily fixed cost ($)", "每日固定成本（$）", 0, 200, 5)}
      </>
    );
    const bars = [
      [t("Demand", "需求"), result.demand, "#8ca0b5"],
      [t("Prepared", "備貨"), v.stock, "#8c75c2"],
      [t("Sold", "售出"), result.sold, "#329780"],
      [t("Unsold", "未售"), result.waste, "#d19948"],
    ] as const;
    visual = (
      <>
        {bars.map(([label, n, color], i) => (
          <g key={label}>
            <text x="25" y={75 + i * 80} fontSize="18">
              {label}
            </text>
            <rect
              x="145"
              y={50 + i * 80}
              width={(n / 320) * 420}
              height="38"
              rx="4"
              fill={color}
            />
            <text x={155 + (n / 320) * 420} y={75 + i * 80} fontSize="19">
              {n}
            </text>
          </g>
        ))}
      </>
    );
    stats = (
      <>
        {stat("Revenue $", "營收 $", result.revenue.toFixed(2))}
        {stat("Profit $", "利潤 $", result.profit.toFixed(2))}
        {stat("Unmet demand", "未滿足需求", result.lost)}
      </>
    );
    note = t(
      "Demand falls 16% of baseline per $1 price increase from $5. Profit deducts every prepared cup, including unsold stock, plus fixed cost. Compare scenarios; this deterministic model is not business advice.",
      "售價從 $5 每增加 $1，需求下降基準量的 16%。利潤扣除所有備貨（含未售）與固定成本。比較不同情境；此確定性模型不是商業建議。",
    );
  } else if (kind === "logic") {
    const open = lockOpen(v.a, v.b, v.c, v.gate);
    controls = (
      <>
        {toggle("a", "A · keycard valid", "A・卡片有效")}
        {toggle("b", "B · PIN correct", "B・密碼正確")}
        {toggle("c", "C · alarm active", "C・警報啟動")}
        {select("gate", "Credential rule", "憑證規則", [
          ["AND · require both", "AND・兩者皆需"],
          ["OR · either credential", "OR・任一憑證"],
        ])}
      </>
    );
    const wire = (on: boolean) => (on ? "#31a381" : "#8b99a7");
    visual = (
      <>
        <path
          d="M70 90H185V140H220"
          stroke={wire(Boolean(v.a))}
          fill="none"
          strokeWidth="4"
        />
        <path
          d="M70 230H185V180H220"
          stroke={wire(Boolean(v.b))}
          fill="none"
          strokeWidth="4"
        />
        <rect x="220" y="105" width="120" height="100" rx="30" fill="#dae5ef" />
        <text x="248" y="163" fontSize="26">
          {v.gate ? "OR" : "AND"}
        </text>
        <path
          d="M340 155H450"
          stroke={wire(lockOpen(v.a, v.b, 0, v.gate))}
          fill="none"
          strokeWidth="4"
        />
        <path
          d="M320 285H400V185H450"
          stroke={wire(!v.c)}
          fill="none"
          strokeWidth="4"
        />
        <text x="45" y="75" fontSize="23">
          A = {v.a}
        </text>
        <text x="45" y="260" fontSize="23">
          B = {v.b}
        </text>
        <text x="195" y="315" fontSize="22">
          NOT C = {v.c ? 0 : 1}
        </text>
        <rect
          x="450"
          y="120"
          width="130"
          height="185"
          rx="8"
          fill={open ? "#b6e5cd" : "#e5c3c3"}
        />
        <text x="475" y="170" fontSize="21">
          AND
        </text>
        <text x="465" y="235" fontSize="21">
          {open ? t("OPEN", "開啟") : t("LOCKED", "上鎖")}
        </text>
      </>
    );
    stats = stat("Door output", "門鎖輸出", open ? 1 : 0);
    artifact = Array.from({ length: 8 }, (_, i) => ({
      a: (i >> 2) & 1,
      b: (i >> 1) & 1,
      c: i & 1,
      open: lockOpen((i >> 2) & 1, (i >> 1) & 1, i & 1, v.gate),
    }));
    note = t(
      "Output = (A AND/OR B) AND NOT C. Test all eight input combinations in the truth table below; an active alarm always locks the door.",
      "輸出＝（A AND／OR B）AND NOT C。用下方真值表檢查全部八種組合；警報啟動時必定上鎖。",
    );
  } else if (kind === "pathfinding") {
    const walls = new Set(
      Array.from({ length: 64 }, (_, i) => i).filter(
        (i) =>
          i !== 0 &&
          i !== 63 &&
          (v[`wall${i}`] ??
            (v.maze === 1 && i % 8 === 3 && i !== 35 ? 1 : 0)) === 1,
      ),
    );
    const result = shortestPath(8, walls),
      revealed = new Set(
        result.visited.slice(
          0,
          Math.floor((frame / 160) * result.visited.length),
        ),
      );
    controls = (
      <>
        {select("maze", "Starting maze", "起始迷宮", [
          ["Open grid", "空白網格"],
          ["Wall with a gap", "有缺口的牆"],
        ])}
        <p>
          {t(
            "Toggle cells with a click, Tab + Space, or Enter. Green is start; gold is destination.",
            "點擊格子，或用 Tab＋空白鍵、Enter 切換。綠色是起點，金色是終點。",
          )}
        </p>
      </>
    );
    visual = (
      <>
        {Array.from({ length: 64 }, (_, i) => {
          const fill =
            i === 0
              ? "#44a98d"
              : i === 63
                ? "#e0ac4e"
                : walls.has(i)
                  ? "#334b63"
                  : result.path.includes(i) && frame === 160
                    ? "#8bd6c1"
                    : revealed.has(i)
                      ? "#a9c9e6"
                      : "#e5edf4";
          return (
            <rect
              key={i}
              x={120 + (i % 8) * 48}
              y={8 + Math.floor(i / 8) * 48}
              width="44"
              height="44"
              rx="4"
              fill={fill}
              role="button"
              tabIndex={i === 0 || i === 63 ? -1 : 0}
              aria-label={`${t("Cell", "格子")} ${Math.floor(i / 8) + 1},${(i % 8) + 1}`}
              aria-pressed={walls.has(i)}
              onClick={() => {
                if (i !== 0 && i !== 63) set(`wall${i}`, walls.has(i) ? 0 : 1);
              }}
              onKeyDown={(e) => {
                if (
                  (e.key === " " || e.key === "Enter") &&
                  i !== 0 &&
                  i !== 63
                ) {
                  e.preventDefault();
                  set(`wall${i}`, walls.has(i) ? 0 : 1);
                }
              }}
            />
          );
        })}
      </>
    );
    stats = (
      <>
        {stat(
          "Shortest steps",
          "最短步數",
          result.path.length ? result.path.length - 1 : t("No route", "無路徑"),
        )}
        {stat("Discovered cells", "探索格數", result.visited.length)}
      </>
    );
    artifact = { walls: [...walls], ...result };
    note = t(
      "Breadth-first search explores neighbors in increasing distance. All moves cost one and diagonals are disabled. Scrub to the end to reveal the shortest path; seal the gap to test failure.",
      "廣度優先搜尋依距離探索鄰居。每次移動成本為一，不可斜走。將時間軸拉到最後顯示最短路徑；封住缺口測試失敗情境。",
    );
  } else {
    const rows = v.group
        ? [18, 22, null, 30, 24, 35, 27, 40]
        : [10, 15, 12, null, 20, 18, 26, 24],
      result = summarizeData(rows, Boolean(v.clean));
    artifact = { source: "Synthetic weekly reading minutes", rows, ...result };
    csv = [
      "week,minutes",
      ...rows.flatMap((n, i) =>
        n === null && v.clean ? [] : [`${i + 1},${n ?? 0}`],
      ),
    ].join("\r\n");
    controls = (
      <>
        {toggle("clean", "Exclude missing readings", "排除缺失讀值")}
        {select("chart", "Chart", "圖表", [
          ["Columns", "長條圖"],
          ["Line", "折線圖"],
        ])}
        {select("group", "Sample series", "範例資料", [
          ["Group A", "A 組"],
          ["Group B", "B 組"],
        ])}
        <details>
          <summary>
            {t("Inspect the eight records", "查看八筆原始資料")}
          </summary>
          <table className="project-table">
            <thead>
              <tr>
                <th>{t("Week", "週")}</th>
                <th>{t("Minutes", "分鐘")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{n ?? t("Missing", "缺失")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </>
    );
    const points = rows.map((n, i) => ({
      x: 75 + i * 67,
      y: 340 - (n ?? 0) * 6,
      n,
    }));
    visual = (
      <>
        <path d="M50 40V340H610" fill="none" stroke="#7c8d9c" />
        <line
          x1="50"
          x2="610"
          y1={340 - result.mean * 6}
          y2={340 - result.mean * 6}
          stroke="#cf9443"
          strokeWidth="2"
          strokeDasharray="6 5"
        />
        <text x="65" y="30" fill="#87612c">
          {t("Dashed: mean", "虛線：平均值")} {result.mean.toFixed(1)}{" "}
          {t("min", "分鐘")}
        </text>
        {points.map((p, i) => (
          <g key={i}>
            {p.n !== null || !v.clean ? (
              v.chart ? (
                <>
                  <circle cx={p.x} cy={p.y} r="5" fill="#4d87c1" />
                  {i > 0 && (points[i - 1].n !== null || !v.clean) && (
                    <line
                      x1={points[i - 1].x}
                      y1={points[i - 1].y}
                      x2={p.x}
                      y2={p.y}
                      stroke="#4d87c1"
                      strokeWidth="3"
                    />
                  )}
                </>
              ) : (
                <rect
                  x={p.x - 19}
                  y={p.y}
                  width="38"
                  height={340 - p.y}
                  fill="#4d87c1"
                />
              )
            ) : (
              <text x={p.x - 5} y="326" fill="#aa6070">
                ?
              </text>
            )}
            <text x={p.x - 5} y="365">
              {i + 1}
            </text>
          </g>
        ))}
        <text x="285" y="394">
          {t("Week", "週")}
        </text>
      </>
    );
    stats = (
      <>
        {stat("Mean minutes", "平均分鐘", result.mean.toFixed(2))}
        {stat("Valid rows", "有效列數", result.values.length)}
        {stat("Missing", "缺失", result.missing)}
      </>
    );
    note = t(
      "Synthetic weekly reading data. With cleaning off, missing values become zero and bias the mean downward. The line chart leaves gaps for missing readings rather than inventing a trend.",
      "合成的每週閱讀資料。關閉清理會把缺失值當作零，拉低平均。折線圖在缺失處留空，避免捏造趨勢。",
    );
  }
  const animated = ["animation", "ecosystem", "pathfinding"].includes(kind);
  return (
    <div className="lab-layout project-lab">
      <div className="lab-visual">
        <svg
          ref={svg}
          viewBox={viewBox}
          role={kind === "pathfinding" ? "group" : "img"}
          fontFamily="system-ui, sans-serif"
          aria-label={t(
            `${kind} experiment visualization`,
            `${({ design: "海報", animation: "彈跳動畫", ecosystem: "生態系", separation: "粒子分離", flood: "雨水街區", economy: "咖啡店", logic: "邏輯門", pathfinding: "迷宮尋路", data: "資料圖表" } as Record<string, string>)[kind]}實驗視覺化`,
          )}
          xmlns="http://www.w3.org/2000/svg"
        >
          {visual}
        </svg>
        <div className="lab-stats" aria-live={playing ? "off" : "polite"}>
          {stats}
        </div>
        {animated && (
          <div className="project-timeline">
            <button
              type="button"
              onClick={() => {
                if (frame === 160) setFrame(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? t("Pause", "暫停") : t("Play", "播放")}
            </button>
            <label>
              {t("Timeline", "時間軸")}
              <input
                type="range"
                min="0"
                max="160"
                value={frame}
                onChange={(e) => {
                  setPlaying(false);
                  setFrame(Number(e.target.value));
                }}
              />
            </label>
          </div>
        )}
        {kind === "logic" && (
          <details>
            <summary>{t("Inspect the truth table", "查看真值表")}</summary>
            <table className="project-table">
              <thead>
                <tr>
                  <th>A</th>
                  <th>B</th>
                  <th>C</th>
                  <th>{t("Open", "開啟")}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }, (_, i) => (
                  <tr key={i}>
                    <td>{(i >> 2) & 1}</td>
                    <td>{(i >> 1) & 1}</td>
                    <td>{i & 1}</td>
                    <td>
                      {lockOpen((i >> 2) & 1, (i >> 1) & 1, i & 1, v.gate)
                        ? 1
                        : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
        <p className="lab-note">{note}</p>
      </div>
      <div className="lab-controls">
        {controls}
        <div className="lab-actions">
          <button
            type="button"
            onClick={() => {
              if (svg.current)
                download(
                  `${kind}.svg`,
                  new XMLSerializer().serializeToString(svg.current),
                  "image/svg+xml",
                );
            }}
          >
            {t("Export SVG", "匯出 SVG")}
          </button>
          <button
            type="button"
            onClick={() =>
              download(
                `${kind}.json`,
                JSON.stringify(
                  { kind, parameters: v, result: artifact },
                  null,
                  2,
                ),
                "application/json",
              )
            }
          >
            {t("Export project data", "匯出作品資料")}
          </button>
          {kind === "data" && (
            <button
              type="button"
              onClick={() =>
                download("reading-data.csv", csv, "text/csv;charset=utf-8")
              }
            >
              {t("Export cleaned CSV", "匯出清理後 CSV")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
