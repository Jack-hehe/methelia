import { describe, expect, it } from "vitest";
import {
  sphereSlice,
  collide,
  simulateOrbit,
  circuit,
  gameTrials,
  contrastRatio,
  coaster,
} from "../src/core/labs/science";

describe("science models", () => {
  it("computes sphere sections and excludes planes outside the sphere", () => {
    expect(sphereSlice(5, 3)).toBe(4);
    expect(sphereSlice(2, 3)).toBe(0);
  });
  it("conserves momentum and elastic kinetic energy for unequal masses", () => {
    const result = collide(2, 3, 4, -1, 1);
    expect(2 * result.v1 + 3 * result.v2).toBeCloseTo(5);
    expect(result.energyAfter).toBeCloseTo(result.energyBefore);
    const stuck = collide(2, 3, 4, -1, 0);
    expect(stuck.v1).toBeCloseTo(stuck.v2);
    expect(stuck.energyAfter).toBeLessThan(stuck.energyBefore);
  });
  it("keeps a circular numerical orbit near its launch radius", () => {
    const orbit = simulateOrbit(2, 1, 2400);
    expect(orbit.status).toBe("orbit");
    expect(
      Math.max(...orbit.points.map((p) => Math.hypot(p.x, p.y))) - 2,
    ).toBeLessThan(0.002);
    expect(simulateOrbit(1.5, 0.2).status).toBe("impact");
    expect(simulateOrbit(2, 1.6).status).toBe("escape");
  });
  it("applies Ohm law and two equal resistors in parallel", () => {
    expect(circuit(6, 100, false).current).toBeCloseTo(0.06);
    expect(circuit(6, 100, true).current).toBeCloseTo(0.12);
  });
  it("replays seeded trials and handles certain wins and losses", () => {
    expect(gameTrials(0, 10, 1, 100, 3).profit).toBe(-100);
    expect(gameTrials(1, 10, 1, 100, 3).profit).toBe(900);
    expect(gameTrials(0.4, 3, 1, 100, 3)).toEqual(
      gameTrials(0.4, 3, 1, 100, 3),
    );
  });
  it("evaluates color contrast and detects mismatched join slopes", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21);
    expect(coaster(0, 1, 0).slope).toBe(0);
    expect(coaster(0, 1, 2).slope).toBe(2);
  });
});
