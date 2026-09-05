import { describe, expect, it } from "vitest";
import {
  shortestPath,
  waterBalance,
  coffeeDay,
  lockOpen,
  ecosystem,
  separate,
  bounce,
  summarizeData,
} from "../src/core/labs/projects";

describe("project laboratory models", () => {
  it("finds a shortest route and reports a sealed destination", () => {
    expect(shortestPath(3, new Set([1]), 0, 2).path).toEqual([0, 3, 4, 5, 2]);
    expect(shortestPath(3, new Set([1, 3]), 0, 8).path).toEqual([]);
  });
  it("conserves stormwater and saturates storage", () => {
    const result = waterBalance(60, 50, 10);
    expect(result.infiltration + result.stored + result.runoff).toBeCloseTo(60);
    expect(result.stored).toBe(10);
    expect(waterBalance(0, 100, 10).runoff).toBe(0);
  });
  it("charges for unsold coffee stock and caps sales at demand and stock", () => {
    expect(coffeeDay(5, 80, 100, 2, 100)).toEqual({
      demand: 100,
      sold: 80,
      waste: 0,
      lost: 20,
      revenue: 400,
      profit: 140,
    });
    expect(coffeeDay(5, 120, 100, 2, 100).profit).toBe(160);
  });
  it("requires the selected credential rule and rejects an active alarm", () => {
    expect(lockOpen(1, 0, 0, 0)).toBe(false);
    expect(lockOpen(1, 0, 0, 1)).toBe(true);
    expect(lockOpen(1, 1, 1, 1)).toBe(false);
  });
  it("keeps population trajectories finite and nonnegative", () => {
    const history = ecosystem(40, 8, 100, 0.7);
    expect(history).toHaveLength(161);
    expect(
      history.every(
        (p) => Number.isFinite(p.prey) && p.prey >= 0 && p.predators >= 0,
      ),
    ).toBe(true);
    expect(ecosystem(0, 8, 100, 0.7).at(-1)!.predators).toBeLessThan(8);
  });
  it("retains dissolved salt in filtration and leaves dry salt after evaporation", () => {
    expect(separate(true, false)).toEqual({
      sand: 0,
      salt: 12,
      water: 40,
      residueSand: 8,
      residueSalt: 0,
      vapor: 0,
    });
    expect(separate(true, true)).toEqual({
      sand: 0,
      salt: 0,
      water: 0,
      residueSand: 8,
      residueSalt: 12,
      vapor: 40,
    });
  });
  it("places bounce endpoints on the floor and the midpoint at full height", () => {
    expect(bounce(0, 150, 1)).toBe(0);
    expect(bounce(0.5, 150, 1)).toBe(150);
    expect(bounce(1, 150, 1)).toBe(0);
  });
  it("cleans missing readings instead of treating them as zero", () => {
    expect(summarizeData([10, null, 20], true)).toEqual({
      values: [10, 20],
      mean: 15,
      missing: 1,
    });
    expect(summarizeData([10, null, 20], false).mean).toBe(10);
  });
});
