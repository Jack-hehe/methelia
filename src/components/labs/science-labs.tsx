"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LabProps } from "@/core/lab";
import {
  sphereSlice,
  collide,
  simulateOrbit,
  circuit,
  gameTrials,
  contrastRatio,
  coaster,
} from "@/core/labs/science";
import "./science.css";

const cyan = "var(--lab-teal)",
  gold = "var(--lab-gold)";
const f = (v: number, digits = 2) => v.toFixed(digits);
const line = (points: number[][]) =>
  points
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

export function ScienceLab({ kind, language, value, onChange }: LabProps) {
  const zh = language === "zh-TW";
  const t = (en: string, tw: string) => (zh ? tw : en);
  const n = (key: string, fallback: number, min: number, max: number) =>
    Math.min(
      max,
      Math.max(min, Number.isFinite(value[key]) ? value[key] : fallback),
    );
  const set = (key: string, next: number) =>
    onChange({ ...value, [key]: next });
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const reduced = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const activeAudio = useRef<OscillatorNode[]>([]);
  const motionLimit = useRef(24);
  const pointer = useRef<number | null>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = media.matches;
    const update = () => {
      reduced.current = media.matches;
      if (media.matches) setPlaying(false);
    };
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      void audio.current?.close();
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    let id: number,
      last = 0;
    const tick = (now: number) => {
      if (last)
        setTime((v) =>
          Math.min(
            motionLimit.current,
            v + Math.min((now - last) / 1000, 0.05),
          ),
        );
      last = now;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]);
  useEffect(() => {
    if (playing && time >= motionLimit.current) setPlaying(false);
  }, [time, playing]);
  const range = (
    key: string,
    label: string,
    fallback: number,
    min: number,
    max: number,
    step = 0.1,
    unit = "",
  ) => (
    <label className="lab-control" key={key}>
      <span>
        {label}{" "}
        <output>
          {f(n(key, fallback, min, max), step >= 1 ? 0 : 2)}
          {unit}
        </output>
      </span>
      <input
        type="range"
        aria-label={label}
        name={key}
        min={min}
        max={max}
        step={step}
        value={n(key, fallback, min, max)}
        onChange={(e) => {
          setPlaying(false);
          setTime(0);
          set(key, Number(e.target.value));
        }}
      />
    </label>
  );
  const stat = (label: string, result: string) => (
    <div className="lab-stat" key={label}>
      <span>{label}</span>
      <strong>{result}</strong>
    </div>
  );
  const playback = (
    <div className="lab-actions">
      <button
        type="button"
        onClick={() => {
          if (time >= motionLimit.current) setTime(0);
          setPlaying((p) => !p);
        }}
      >
        {playing ? t("Pause", "暫停") : t("Play experiment", "播放實驗")}
      </button>
      <button
        type="button"
        onClick={() => {
          setPlaying(false);
          setTime((v) => v + 0.2);
        }}
      >
        {t("Step", "單步")}
      </button>
      <button
        type="button"
        onClick={() => {
          setPlaying(false);
          setTime(0);
        }}
      >
        {t("Restart motion", "重新播放")}
      </button>
    </div>
  );
  const axes = (
    <g stroke="currentColor" opacity="0.2">
      <path d="M40 210H620M330 30V390" />
      {Array.from({ length: 11 }, (_, i) => (
        <path key={i} d={`M${80 + i * 50} 205v10`} />
      ))}
    </g>
  );
  const svg = (children: ReactNode, label: string, extra = {}) => (
    <svg viewBox="0 0 660 420" role="img" aria-label={label} {...extra}>
      {children}
    </svg>
  );
  let visual: ReactNode,
    controls: ReactNode,
    stats: ReactNode,
    note = "";
  const orbitRadius = n("radius", 2, 1.2, 3),
    orbitSpeed = n("speed", 1, 0.2, 1.7);
  const orbit = useMemo(
    () => simulateOrbit(orbitRadius, orbitSpeed),
    [orbitRadius, orbitSpeed],
  );

  if (kind === "geometry") {
    const radius = n("radius", 3, 1, 5),
      height = n("slice", 1, -5, 5),
      rotation = (n("rotation", 25, 0, 360) * Math.PI) / 180;
    const section = sphereSlice(radius, height),
      scale = 30;
    const project = (x: number, y: number, z: number) => {
      const a = x * Math.cos(rotation) + z * Math.sin(rotation),
        b = -x * Math.sin(rotation) + z * Math.cos(rotation);
      return [250 + scale * a, 215 - scale * (y * 0.88 - b * 0.47)];
    };
    const ring = (r: number, h: number) =>
      line(
        Array.from({ length: 97 }, (_, i) =>
          project(
            r * Math.cos((i * Math.PI) / 48),
            h,
            r * Math.sin((i * Math.PI) / 48),
          ),
        ),
      );
    visual = svg(
      <>
        <g fill="none" stroke={cyan}>
          {[-0.8, -0.4, 0, 0.4, 0.8].map((v) => (
            <path
              opacity="0.4"
              key={v}
              d={ring(sphereSlice(radius, v * radius), v * radius)}
            />
          ))}
          {Array.from({ length: 8 }, (_, j) => (
            <path
              opacity="0.45"
              key={j}
              d={line(
                Array.from({ length: 97 }, (_, i) => {
                  const a = (i * Math.PI) / 48,
                    b = (j * Math.PI) / 8;
                  return project(
                    radius * Math.sin(a) * Math.cos(b),
                    radius * Math.cos(a),
                    radius * Math.sin(a) * Math.sin(b),
                  );
                }),
              )}
            />
          ))}
          <path d={ring(section, height)} stroke={gold} strokeWidth="4" />
        </g>
        <circle
          cx="530"
          cy="210"
          r={section * 19}
          fill={gold}
          fillOpacity="0.15"
          stroke={gold}
          strokeWidth="3"
        />
        <text x="530" y="330" textAnchor="middle">
          {t("Cross-section", "截面")}
        </text>
        <text x="250" y="395" textAnchor="middle">
          x² + y² + z² = {f(radius * radius, 1)}
        </text>
      </>,
      t("Drag to rotate the sphere", "拖曳旋轉球體"),
      {
        onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => {
          pointer.current = e.clientX;
          e.currentTarget.setPointerCapture(e.pointerId);
        },
        onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => {
          if (pointer.current !== null) {
            set(
              "rotation",
              (n("rotation", 25, 0, 360) + e.clientX - pointer.current + 360) %
                360,
            );
            pointer.current = e.clientX;
          }
        },
        onPointerUp: () => {
          pointer.current = null;
        },
        onPointerCancel: () => {
          pointer.current = null;
        },
      },
    );
    controls = (
      <>
        {range("radius", t("Sphere radius", "球體半徑"), 3, 1, 5)}
        {range("slice", t("Slice height", "切面高度"), 1, -5, 5)}
        {range("rotation", t("View rotation", "視角旋轉"), 25, 0, 360, 1, "°")}
      </>
    );
    stats = (
      <>
        {stat(t("Section radius", "截面半徑"), f(section))}
        {stat(t("Section area", "截面面積"), f(Math.PI * section ** 2))}
      </>
    );
    note = t(
      "Orthographic 3D projection. Drag the sphere or use the rotation slider. A plane outside the sphere has no intersection. Section: x² + z² = r² − h².",
      "正投影 3D 模型。拖曳球體或使用旋轉滑桿。切面超出球體時沒有交集。截面：x² + z² = r² − h²。",
    );
  } else if (kind === "calculus") {
    const bend = n("bend", 1, -2, 2),
      join = n("join", 0, -2, 2),
      x = n("x", 1, -3, 3),
      point = coaster(x, bend, join);
    const project = (a: number, b: number) => [330 + a * 80, 210 - b * 35];
    const [px, py] = project(x, point.y);
    visual = svg(
      <>
        {axes}
        <path
          d={line(
            Array.from({ length: 121 }, (_, i) => {
              const a = -3 + i / 20;
              return project(a, coaster(a, bend, join).y);
            }),
          )}
          fill="none"
          stroke={cyan}
          strokeWidth="5"
        />
        <path
          d={line(
            [-1, 1].map((d) => project(x + d, point.y + d * point.slope)),
          )}
          stroke={gold}
          strokeWidth="3"
        />
        <circle cx={px} cy={py} r="9" fill={gold} />
        <text x="45" y="45">
          {t("Curve + local tangent", "曲線與局部切線")}
        </text>
      </>,
      t("Piecewise roller coaster curve", "分段過山車曲線"),
    );
    controls = (
      <>
        {range("bend", t("Curvature", "彎曲程度"), 1, -2, 2)}
        {range("join", t("Right join slope", "右側接點斜率"), 0, -2, 2)}
        {range("x", t("Inspect position", "觀察位置"), 1, -3, 3)}
      </>
    );
    stats = (
      <>
        {stat(t("Tangent slope", "切線斜率"), f(point.slope))}
        {stat(t("Join slope gap", "接點斜率差"), f(Math.abs(join)))}
      </>
    );
    note = t(
      "y = ax²/3 on the left; y = ax²/3 + bx on the right. Height is continuous at x=0; matching slopes requires b=0. At a corner the displayed slope is the right derivative. This is a shape model, not a structural safety calculation.",
      "左側 y = ax²/3；右側 y = ax²/3 + bx。x=0 的高度連續；b=0 時斜率相接。轉角顯示右導數。此為形狀模型，不是結構安全計算。",
    );
  } else if (kind === "probability") {
    const p = n("probability", 0.4, 0, 1),
      reward = n("reward", 3, 0, 20),
      cost = n("cost", 1, 0, 10),
      count = n("trials", 100, 10, 1000),
      seed = n("seed", 1, 1, 999),
      result = gameTrials(p, reward, cost, count, seed);
    const extent = Math.max(
      10,
      ...result.history.map(Math.abs),
      Math.abs(result.expected * count),
    );
    visual = svg(
      <>
        <path d="M45 210H620" stroke="currentColor" opacity="0.3" />
        <path
          d={line(
            result.history.map((v, i) => [
              45 + (i / count) * 575,
              210 - (v / extent) * 150,
            ]),
          )}
          stroke={cyan}
          strokeWidth="3"
          fill="none"
        />
        <path
          d={`M45 210L620 ${210 - ((result.expected * count) / extent) * 150}`}
          stroke={gold}
          strokeWidth="3"
          strokeDasharray="8 6"
        />
        <text x="45" y="35">
          {t("Cumulative net reward", "累計淨獎勵")}
        </text>
        <text x="45" y="395">
          {t(
            "Teal: trials · gold: expected value",
            "青色：實驗結果 · 金色：期望值",
          )}
        </text>
      </>,
      t("Seeded probability experiment", "固定種子機率實驗"),
    );
    controls = (
      <>
        {range(
          "probability",
          t("Win probability", "獲勝機率"),
          0.4,
          0,
          1,
          0.01,
        )}
        {range("reward", t("Win reward", "獲勝獎勵"), 3, 0, 20)}
        {range("cost", t("Entry cost", "參加成本"), 1, 0, 10)}
        {range("trials", t("Trials", "實驗次數"), 100, 10, 1000, 10)}
        <button onClick={() => set("seed", (seed % 999) + 1)}>
          {t("Run a new sample", "重新抽樣")}
        </button>
      </>
    );
    stats = (
      <>
        {stat(t("Expected net / play", "每次淨期望值"), f(result.expected))}
        {stat(t("Observed win rate", "實際勝率"), f(result.wins / count))}
        {stat(t("Net result", "淨結果"), f(result.profit))}
      </>
    );
    note = t(
      "Independent trials with fixed probability. Fair means expected net reward p × reward − cost = 0. A seeded pseudorandom sample is replayable; short runs can differ greatly from expectation.",
      "固定機率的獨立試驗。公平代表淨期望值 p × 獎勵 − 成本 = 0。固定種子的偽隨機樣本可重現；短期結果可能大幅偏離期望值。",
    );
  } else if (kind === "collision") {
    const m1 = n("mass1", 2, 1, 5),
      m2 = n("mass2", 2, 1, 5),
      u1 = n("velocity1", 3, 0, 6),
      u2 = n("velocity2", -1, -6, 0),
      e = n("restitution", 1, 0, 1),
      result = collide(m1, m2, u1, u2, e);
    const hit = u1 - u2 > 0 ? 6 / (u1 - u2) : Infinity,
      elapsed = Math.min(time, hit + 2),
      r1 = 20 + m1 * 4,
      r2 = 20 + m2 * 4;
    motionLimit.current = Number.isFinite(hit) ? hit + 2 : 2;
    const a =
        elapsed < hit
          ? -3 + u1 * elapsed
          : -3 + u1 * hit + result.v1 * (elapsed - hit),
      b =
        elapsed < hit
          ? 3 + u2 * elapsed
          : 3 + u2 * hit + result.v2 * (elapsed - hit);
    visual = svg(
      <>
        <path d="M20 290H640" stroke="currentColor" opacity="0.3" />
        <circle cx={330 + a * 28 - r1} cy={250} r={r1} fill={cyan} />
        <circle cx={330 + b * 28 + r2} cy={250} r={r2} fill={gold} />
        <text x="50" y="60">
          {t("Momentum before = momentum after", "碰撞前動量 = 碰撞後動量")}
        </text>
        <text x="50" y="105">
          m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂
        </text>
        <text x="50" y="360">
          {elapsed >= hit
            ? t("After contact", "碰撞後")
            : t("Approaching contact", "接近碰撞")}{" "}
          · t = {f(elapsed)} s
        </text>
      </>,
      t("One-dimensional collision", "一維碰撞"),
    );
    controls = (
      <>
        {range("mass1", t("Teal mass", "青色質量"), 2, 1, 5, 0.1, " kg")}
        {range("mass2", t("Gold mass", "金色質量"), 2, 1, 5, 0.1, " kg")}
        {range("velocity1", t("Teal velocity", "青色速度"), 3, 0, 6)}
        {range("velocity2", t("Gold velocity", "金色速度"), -1, -6, 0)}
        {range("restitution", t("Restitution", "恢復係數"), 1, 0, 1)}
        {playback}
      </>
    );
    stats = (
      <>
        {stat("v₁ / v₂ (m/s)", `${f(result.v1)} / ${f(result.v2)}`)}
        {stat(
          t("Kinetic energy before / after", "碰撞前／後動能"),
          `${f(result.energyBefore)} / ${f(result.energyAfter)} J`,
        )}
      </>
    );
    note = t(
      "Frictionless one-dimensional isolated system. e=1 is elastic; e=0 sticks together. No wall collisions. Motion holds two seconds after contact; restart to repeat.",
      "無摩擦的一維孤立系統。e=1 為彈性碰撞；e=0 黏合。不模擬牆面碰撞。接觸後兩秒停留，重新播放可再觀察。",
    );
  } else if (kind === "orbit") {
    const index = Math.min(orbit.points.length - 1, Math.floor(time * 100)),
      point = orbit.points[index],
      scale = 55;
    motionLimit.current = (orbit.points.length - 1) / 100;
    visual = svg(
      <>
        <circle cx="330" cy="210" r={0.5 * scale} fill={gold} />
        <path
          d={line(
            orbit.points.map((p) => [330 + p.x * scale, 210 - p.y * scale]),
          )}
          stroke={cyan}
          strokeWidth="2"
          fill="none"
          opacity="0.55"
        />
        <circle
          cx={330 + point.x * scale}
          cy={210 - point.y * scale}
          r="7"
          fill={cyan}
        />
        <path
          d={`M${330 + orbitRadius * scale} 210v-65l-6 10m6-10l6 10`}
          stroke={gold}
          fill="none"
          strokeWidth="2"
        />
        <text x="30" y="35">
          a = −r / |r|³
        </text>
      </>,
      t("Numerically integrated satellite orbit", "數值積分衛星軌道"),
    );
    controls = (
      <>
        {range("radius", t("Launch radius", "發射半徑"), 2, 1.2, 3)}
        {range(
          "speed",
          t("Speed / circular speed", "速度／圓軌道速度"),
          1,
          0.2,
          1.7,
          0.01,
        )}
        {playback}
      </>
    );
    stats = (
      <>
        {stat(
          t("Trajectory", "軌跡"),
          orbit.status === "impact"
            ? t("Impact", "墜落")
            : orbit.status === "escape"
              ? t("Escape", "逃逸")
              : t("Bound orbit", "束縛軌道"),
        )}
        {stat(t("Specific energy", "比能量"), f(orbit.energy, 3))}
      </>
    );
    note = t(
      "Dimensionless two-body model: GM=1, planet radius=0.5, tangential launch, no atmosphere. Velocity Verlet, Δt=0.015. Escape requires speed ≥ √2 × circular speed. The preview is a finite trajectory, not a real mission prediction.",
      "無因次二體模型：GM=1、行星半徑=0.5、切向發射、無大氣。Velocity Verlet 積分，Δt=0.015。逃逸速度 ≥ √2 × 圓軌道速度。預覽為有限軌跡，不是實際任務預測。",
    );
  } else if (kind === "circuit") {
    const voltage = n("voltage", 6, 0, 12),
      resistance = n("resistance", 100, 10, 1000),
      parallel = n("parallel", 0, 0, 1) >= 0.5,
      result = circuit(voltage, resistance, parallel);
    visual = svg(
      <>
        <g fill="none" stroke={cyan} strokeWidth="4">
          <path d="M130 180V100H270M400 100H550V310H130V235M100 180H160M110 200H150M100 220H160" />
          <path d="M270 100v-20h130v40H270z" />
          {parallel && (
            <path d="M230 100V200H270M270 180H400V220H270ZM400 200H440V100" />
          )}
        </g>
        <circle
          cx="550"
          cy="215"
          r="32"
          fill={gold}
          opacity={0.15 + Math.min(result.power / 2, 0.85)}
        />
        <circle
          cx="550"
          cy="215"
          r="25"
          fill="none"
          stroke={gold}
          strokeWidth="3"
        />
        <text x="55" y="270">
          {voltage} V
        </text>
        <text x="270" y="65">
          {resistance} Ω
        </text>
        <text x="220" y="380">
          I = V / R · P = V² / R
        </text>
      </>,
      t("Adjustable resistive lamp model", "可調電阻燈模型"),
    );
    controls = (
      <>
        {range("voltage", t("Supply voltage", "供應電壓"), 6, 0, 12, 0.1, " V")}
        {range(
          "resistance",
          t("Each resistance", "每個電阻"),
          100,
          10,
          1000,
          10,
          " Ω",
        )}
        <label className="lab-control">
          <span>
            {t("Two equal resistors in parallel", "兩個相同電阻並聯")}
          </span>
          <input
            type="checkbox"
            checked={parallel}
            onChange={(e) => set("parallel", Number(e.target.checked))}
          />
        </label>
      </>
    );
    stats = (
      <>
        {stat(t("Total current", "總電流"), `${f(result.current * 1000)} mA`)}
        {stat(t("Total power", "總功率"), `${f(result.power)} W`)}
      </>
    );
    note = t(
      "Ideal voltage source and resistive loads; brightness illustrates total dissipated power. The bulb icon is an ideal indicator with zero added resistance. Real LEDs require a different model and current limits.",
      "理想電壓源與電阻負載；亮度示意總耗散功率。燈泡符號為不增加電阻的理想指示器。實際 LED 需要不同模型及限流。",
    );
  } else if (kind === "sound") {
    const frequency = n("frequency", 220, 110, 880),
      amplitude = n("amplitude", 0.5, 0, 1),
      waveform = Math.round(n("waveform", 0, 0, 2)),
      attack = n("attack", 0.05, 0.01, 1),
      release = n("release", 0.4, 0.05, 2);
    const types: OscillatorType[] = ["sine", "square", "sawtooth"];
    const notes = [0, 4, 7, 12].map((fallback, i) =>
      n(`note${i + 1}`, fallback, 0, 12),
    );
    const play = async (melody = false) => {
      const context = (audio.current ??= new AudioContext());
      await context.resume();
      activeAudio.current.forEach((node) => {
        try {
          node.stop();
        } catch {
          /* Already ended. */
        }
      });
      activeAudio.current = [];
      (melody
        ? notes.map((semitone) => frequency * 2 ** (semitone / 12))
        : [frequency]
      ).forEach((pitch, index) => {
        const oscillator = context.createOscillator(),
          gain = context.createGain(),
          now = context.currentTime + index * (attack + 0.3 + release);
        oscillator.type = types[waveform];
        oscillator.frequency.value = pitch;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(amplitude * 0.12, now + attack);
        gain.gain.setValueAtTime(amplitude * 0.12, now + attack + 0.25);
        gain.gain.linearRampToValueAtTime(0, now + attack + 0.25 + release);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + attack + 0.3 + release);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        activeAudio.current.push(oscillator);
      });
    };
    visual = svg(
      <>
        {axes}
        <path
          d={line(
            Array.from({ length: 601 }, (_, i) => {
              const phase = (i / 600) * frequency * 0.015;
              const y =
                waveform === 0
                  ? Math.sin(phase * Math.PI * 2)
                  : waveform === 1
                    ? Math.sign(Math.sin(phase * Math.PI * 2))
                    : 2 * (phase - Math.floor(phase + 0.5));
              return [30 + i, 210 - y * amplitude * 130];
            }),
          )}
          fill="none"
          stroke={cyan}
          strokeWidth="3"
        />
        <text x="35" y="45">
          {t("Waveform · 15 milliseconds", "波形 · 15 毫秒")}
        </text>
      </>,
      t("Synthesizer waveform", "合成器波形"),
    );
    controls = (
      <>
        {range("frequency", t("Frequency", "頻率"), 220, 110, 880, 1, " Hz")}
        {range("amplitude", t("Amplitude", "振幅"), 0.5, 0, 1, 0.01)}
        <label className="lab-control">
          <span>{t("Waveform", "波形")}</span>
          <select
            value={waveform}
            onChange={(e) => set("waveform", Number(e.target.value))}
          >
            <option value="0">{t("Sine", "正弦波")}</option>
            <option value="1">{t("Square", "方波")}</option>
            <option value="2">{t("Sawtooth", "鋸齒波")}</option>
          </select>
        </label>
        {range("attack", t("Attack", "起音"), 0.05, 0.01, 1, 0.01, " s")}
        {range("release", t("Release", "釋音"), 0.4, 0.05, 2, 0.05, " s")}
        <button
          onClick={() => {
            void play();
          }}
        >
          {t("Play one note", "播放單音")}
        </button>
        <details>
          <summary>{t("Compose four notes", "編排四個音符")}</summary>
          {notes.map((_, i) =>
            range(
              `note${i + 1}`,
              `${t("Note", "音符")} ${i + 1} (${t("semitones", "半音")})`,
              [0, 4, 7, 12][i],
              0,
              12,
              1,
            ),
          )}
        </details>
        <button
          onClick={() => {
            void play(true);
          }}
        >
          {t("Play melody", "播放旋律")}
        </button>
        <button
          onClick={() => {
            activeAudio.current.forEach((node) => {
              try {
                node.stop();
              } catch {
                /* Already stopped. */
              }
            });
            activeAudio.current = [];
          }}
        >
          {t("Stop sound", "停止聲音")}
        </button>
      </>
    );
    stats = (
      <>
        {stat(t("Period", "週期"), `${f(1000 / frequency)} ms`)}
        {stat(
          t("Tone duration", "音符長度"),
          `${f(attack + 0.25 + release)} s`,
        )}
      </>
    );
    note = t(
      "Sound starts only when you press a play button, at a limited output gain. Melody notes are semitone offsets from the base frequency and use the same envelope. The drawing shows the sustained oscillator, not the envelope.",
      "只有按下播放按鈕才發聲，輸出增益有限制。旋律音符以基礎頻率的半音差編排，共用起音與釋音包絡。圖形顯示持續振盪波形，不包含包絡。",
    );
  } else {
    const rgb = [
        n("red", 45, 0, 255),
        n("green", 180, 0, 255),
        n("blue", 170, 0, 255),
      ].map(Math.round),
      color = `rgb(${rgb.join(", ")})`,
      black = contrastRatio(rgb, [0, 0, 0]),
      white = contrastRatio(rgb, [255, 255, 255]);
    visual = (
      <div className="science-color-stage" style={{ background: color }}>
        <p style={{ color: "#000" }}>
          {t("A clear message", "清楚傳達訊息")}
          <br />
          <strong>{f(black)} : 1</strong>
        </p>
        <p style={{ color: "#fff" }}>
          {t("A clear message", "清楚傳達訊息")}
          <br />
          <strong>{f(white)} : 1</strong>
        </p>
        <code style={{ color: black > white ? "#000" : "#fff" }}>{color}</code>
      </div>
    );
    controls = (
      <>
        {range("red", t("Red light", "紅光"), 45, 0, 255, 1)}
        {range("green", t("Green light", "綠光"), 180, 0, 255, 1)}
        {range("blue", t("Blue light", "藍光"), 170, 0, 255, 1)}
        <button
          onClick={() => {
            const blob = new Blob(
              [
                `:root { --accent: ${color}; --on-accent: ${black > white ? "#000000" : "#ffffff"}; }`,
              ],
              { type: "text/css" },
            );
            const url = URL.createObjectURL(blob),
              link = document.createElement("a");
            link.href = url;
            link.download = "palette.css";
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          {t("Export palette CSS", "匯出配色 CSS")}
        </button>
      </>
    );
    stats = (
      <>
        {stat(
          t("Recommended text", "建議文字"),
          black > white ? t("Black", "黑色") : t("White", "白色"),
        )}
        {stat(
          t("Normal text 4.5:1 threshold", "一般文字 4.5:1 門檻"),
          Math.max(black, white) >= 4.5
            ? t("Pass", "通過")
            : t("Adjust color", "調整顏色"),
        )}
      </>
    );
    note = t(
      "RGB models additive screen light, not pigment mixing. Contrast uses linearized sRGB relative luminance. Choose at least 4.5:1 for ordinary text; verify the final design at its actual size.",
      "RGB 模擬螢幕光的加色，不是顏料混色。對比值使用線性化 sRGB 相對亮度。一般文字選擇至少 4.5:1，並以成品實際尺寸檢查。",
    );
  }
  return (
    <div className="lab-layout science-lab">
      <div className="lab-visual">
        {visual}
        <div className="lab-stats" aria-live="polite">
          {stats}
        </div>
      </div>
      <div className="lab-controls">
        {controls}
        <p className="lab-note">{note}</p>
      </div>
    </div>
  );
}
