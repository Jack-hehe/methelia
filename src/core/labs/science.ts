export const sphereSlice = (radius: number, height: number) =>
  Math.sqrt(Math.max(0, radius * radius - height * height));

export function collide(
  m1: number,
  m2: number,
  u1: number,
  u2: number,
  e: number,
) {
  const v1 = (m1 * u1 + m2 * u2 - m2 * e * (u1 - u2)) / (m1 + m2);
  const v2 = (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / (m1 + m2);
  return {
    v1,
    v2,
    energyBefore: (m1 * u1 ** 2 + m2 * u2 ** 2) / 2,
    energyAfter: (m1 * v1 ** 2 + m2 * v2 ** 2) / 2,
  };
}

/** Dimensionless two-body gravity, mu=1, planet radius=0.5; velocity Verlet. */
export function simulateOrbit(radius: number, speed: number, steps = 2400) {
  let x = radius,
    y = 0,
    vx = 0,
    vy = speed / Math.sqrt(radius);
  const dt = 0.015,
    points = [{ x, y }];
  let status: "orbit" | "impact" | "escape" =
    speed >= Math.SQRT2 ? "escape" : "orbit";
  for (let i = 0; i < Math.min(5000, steps); i++) {
    const r = Math.hypot(x, y),
      ax = -x / r ** 3,
      ay = -y / r ** 3;
    x += vx * dt + (ax * dt * dt) / 2;
    y += vy * dt + (ay * dt * dt) / 2;
    const nextR = Math.hypot(x, y);
    vx += ((ax - x / nextR ** 3) * dt) / 2;
    vy += ((ay - y / nextR ** 3) * dt) / 2;
    points.push({ x, y });
    if (nextR <= 0.5) {
      status = "impact";
      break;
    }
    if (nextR > 12) break;
  }
  return { points, status, energy: ((speed * speed) / 2 - 1) / radius };
}

export function circuit(
  voltage: number,
  resistance: number,
  parallel: boolean,
) {
  const equivalent = resistance / (parallel ? 2 : 1);
  return {
    equivalent,
    current: voltage / equivalent,
    power: (voltage * voltage) / equivalent,
  };
}

export function gameTrials(
  probability: number,
  reward: number,
  cost: number,
  count: number,
  seed: number,
) {
  let random = seed >>> 0,
    wins = 0;
  const history = [0];
  for (let i = 0; i < count; i++) {
    random = (Math.imul(1664525, random) + 1013904223) >>> 0;
    if (random / 4294967296 < probability) wins++;
    history.push(wins * reward - (i + 1) * cost);
  }
  return {
    wins,
    profit: wins * reward - count * cost,
    history,
    expected: probability * reward - cost,
  };
}

export function contrastRatio(a: number[], b: number[]) {
  const luminance = (rgb: number[]) =>
    rgb
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const la = luminance(a),
    lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Continuous join at x=0; join controls the right-hand slope discontinuity. */
export function coaster(x: number, bend: number, join: number) {
  return {
    y: (bend * x * x) / 3 + (x >= 0 ? join * x : 0),
    slope: (2 * bend * x) / 3 + (x >= 0 ? join : 0),
  };
}
