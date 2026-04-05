import { decisionEngine } from "./decision";
import { detectorService } from "./detector";

describe("self-healing decision engine", () => {
  it("selects SCALE_UP for cpu spike", () => {
    const out = decisionEngine({
      metrics: { cpu: 95, cost: 20 },
      reasons: ["CPU spike detected (>90%)"],
      aiSuggestedActions: [],
    });
    expect(out.action).toBe("SCALE_UP");
    expect(out.confidence).toBeGreaterThan(0.9);
  });

  it("selects ROLLBACK for repeated failures", () => {
    const out = decisionEngine({
      metrics: { cpu: 20, cost: 10 },
      reasons: ["Repeated run failures detected"],
      aiSuggestedActions: [],
    });
    expect(out.action).toBe("ROLLBACK");
  });
});

describe("self-healing detector", () => {
  it("detects cpu spike", async () => {
    const out = await detectorService({ metrics: { cpu: 92, cost: 40, memory: 50 } });
    expect(out.detected).toBe(true);
    expect(out.reasons.join(" ")).toContain("CPU spike");
  });
});

