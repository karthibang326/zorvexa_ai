import { describe, expect, it } from "vitest";
import { calculateFee } from "./billing";

describe("calculateFee", () => {
  it("should calculate fee correctly", () => {
    const fee = calculateFee(1000);
    expect(fee).toBe(200);
  });

  it("should return 0 if no savings", () => {
    const fee = calculateFee(0);
    expect(fee).toBe(0);
  });
});
