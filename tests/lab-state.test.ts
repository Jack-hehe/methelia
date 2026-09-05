import { expect, it } from "vitest";
import { labValueSchema } from "../src/core/lab";
it("bounds persistent laboratory data and rejects non-finite values", () => {
  expect(labValueSchema.parse({ radius: 2, wall63: 1 })).toEqual({
    radius: 2,
    wall63: 1,
  });
  expect(labValueSchema.safeParse({ radius: Infinity }).success).toBe(false);
  expect(labValueSchema.safeParse({ "../file": 3 }).success).toBe(false);
  expect(
    labValueSchema.safeParse(
      Object.fromEntries(Array.from({ length: 130 }, (_, i) => ["k" + i, i])),
    ).success,
  ).toBe(false);
});
