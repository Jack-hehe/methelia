export function shortestPath(
  size: number,
  walls: Set<number>,
  start = 0,
  end = size * size - 1,
) {
  const queue = [start];
  const parents = new Map<number, number>([[start, -1]]);
  if (walls.has(start) || walls.has(end))
    return { path: [] as number[], visited: [] as number[] };
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (current === end) break;
    const x = current % size,
      y = Math.floor(current / size);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        next = ny * size + nx;
      if (
        nx >= 0 &&
        nx < size &&
        ny >= 0 &&
        ny < size &&
        !walls.has(next) &&
        !parents.has(next)
      ) {
        parents.set(next, current);
        queue.push(next);
      }
    }
  }
  const path: number[] = [];
  if (parents.has(end))
    for (let p = end; p !== -1; p = parents.get(p)!) path.unshift(p);
  return { path, visited: queue };
}
export function waterBalance(rain: number, green: number, storage: number) {
  const infiltration = (Math.min(rain, 30) * green) / 100;
  const stored = Math.min(storage, Math.max(0, rain - infiltration));
  return {
    infiltration,
    stored,
    runoff: Math.max(0, rain - infiltration - stored),
  };
}
export function coffeeDay(
  price: number,
  stock: number,
  traffic: number,
  cost: number,
  fixed: number,
) {
  const demand = Math.max(0, Math.round(traffic * (1 - 0.16 * (price - 5))));
  const sold = Math.min(stock, demand),
    revenue = sold * price;
  return {
    demand,
    sold,
    waste: stock - sold,
    lost: demand - sold,
    revenue,
    profit: revenue - stock * cost - fixed,
  };
}
export function lockOpen(a: number, b: number, c: number, gate: number) {
  return Boolean((gate ? a || b : a && b) && !c);
}
export function ecosystem(
  prey: number,
  predators: number,
  capacity: number,
  growth: number,
) {
  const history = [{ prey, predators }];
  for (let t = 0; t < 160; t++) {
    const nextPrey = Math.max(
      0,
      prey +
        0.1 *
          (growth * prey * (1 - prey / capacity) - 0.025 * prey * predators),
    );
    predators = Math.max(
      0,
      predators + 0.1 * (0.008 * prey * predators - 0.25 * predators),
    );
    prey = nextPrey;
    history.push({ prey, predators });
  }
  return history;
}
export function separate(filter: boolean, evaporate: boolean) {
  return {
    sand: filter ? 0 : 8,
    salt: evaporate ? 0 : 12,
    water: evaporate ? 0 : 40,
    residueSand: filter ? 8 : 0,
    residueSalt: evaporate ? 12 : 0,
    vapor: evaporate ? 40 : 0,
  };
}
export function bounce(phase: number, height: number, easing: number) {
  const p = Math.max(0, Math.min(1, phase));
  return height * (easing ? 4 * p * (1 - p) : 1 - Math.abs(2 * p - 1));
}
export function summarizeData(rows: (number | null)[], clean: boolean) {
  const values = clean
    ? rows.filter((x): x is number => x !== null)
    : rows.map((x) => x ?? 0);
  return {
    values,
    mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    missing: rows.filter((x) => x === null).length,
  };
}
