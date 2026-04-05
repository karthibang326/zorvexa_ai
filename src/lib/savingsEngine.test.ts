import { describe, expect, it } from "vitest";
import { calculateSavings } from "./savingsEngine";

describe("calculateSavings", () => {
  it("should calculate savings correctly", () => {
    const result = calculateSavings(1000, 800);
    expect(result).toBe(200);
  });
});
