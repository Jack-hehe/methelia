import { z } from "zod";

export const labKinds = [
  "geometry",
  "calculus",
  "probability",
  "collision",
  "orbit",
  "circuit",
  "sound",
  "color",
  "design",
  "animation",
  "ecosystem",
  "separation",
  "flood",
  "economy",
  "logic",
  "pathfinding",
  "data",
] as const;
export type LabKind = (typeof labKinds)[number];
export const labParameterRanges: Record<
  LabKind,
  Record<string, readonly [number, number]>
> = {
  geometry: { radius: [1, 5], slice: [-5, 5], rotation: [0, 360] },
  calculus: { bend: [-2, 2], join: [-2, 2], x: [-3, 3] },
  probability: {
    probability: [0, 1],
    reward: [0, 20],
    cost: [0, 10],
    trials: [10, 1000],
    seed: [1, 999],
  },
  collision: {
    mass1: [1, 5],
    mass2: [1, 5],
    velocity1: [0, 6],
    velocity2: [-6, 0],
    restitution: [0, 1],
  },
  orbit: { speed: [0.2, 1.7], radius: [1.2, 3] },
  circuit: { voltage: [0, 12], resistance: [10, 1000], parallel: [0, 1] },
  sound: {
    frequency: [110, 880],
    amplitude: [0, 1],
    waveform: [0, 2],
    attack: [0.01, 1],
    release: [0.05, 2],
    note1: [0, 12],
    note2: [0, 12],
    note3: [0, 12],
    note4: [0, 12],
  },
  color: { red: [0, 255], green: [0, 255], blue: [0, 255] },
  design: {
    titleSize: [24, 64],
    spacing: [16, 60],
    hue: [0, 360],
    columns: [1, 3],
    format: [0, 1],
  },
  animation: {
    duration: [0.5, 4],
    height: [30, 220],
    squash: [0, 60],
    easing: [0, 1],
  },
  ecosystem: {
    prey: [0, 100],
    predators: [0, 30],
    capacity: [20, 200],
    growth: [0.1, 1.5],
  },
  separation: { filter: [0, 1], evaporate: [0, 1] },
  flood: { rain: [0, 120], green: [0, 100], storage: [0, 50] },
  economy: {
    price: [1, 10],
    stock: [0, 200],
    traffic: [20, 180],
    cost: [0.5, 5],
    fixed: [0, 200],
  },
  logic: { a: [0, 1], b: [0, 1], c: [0, 1], gate: [0, 1] },
  pathfinding: {
    maze: [0, 1],
    ...Object.fromEntries(
      Array.from({ length: 64 }, (_, i) => [`wall${i}`, [0, 1] as const]),
    ),
  },
  data: { clean: [0, 1], chart: [0, 1], group: [0, 1] },
};
export function validLabParameters(
  kind: LabKind,
  value: Record<string, number>,
) {
  return Object.entries(value).every(([key, n]) => {
    const bounds = labParameterRanges[kind][key];
    return bounds && Number.isFinite(n) && n >= bounds[0] && n <= bounds[1];
  });
}
export const labValueSchema = z
  .record(
    z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/),
    z.number().finite().min(-1000000).max(1000000),
  )
  .refine(
    (value) => Object.keys(value).length <= 128,
    "Too many laboratory parameters",
  );
export const labComponentSchema = z
  .object({
    type: z.literal("lab.experiment"),
    kind: z.enum(labKinds),
    mission: z.string().min(1).max(800),
    initial: labValueSchema.optional(),
  })
  .strict()
  .refine(
    (c) => !c.initial || validLabParameters(c.kind, c.initial),
    "Unsupported laboratory parameters",
  );
export type LabProps = {
  kind: LabKind;
  language: "en" | "zh-TW";
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
};
