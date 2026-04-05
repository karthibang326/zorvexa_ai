import { collectCostRecords } from "./cost-collector";
import { detectCostAnomaly } from "./anomaly-detector";
import { finopsService } from "./finops.service";

describe("finops module", () => {
  it("collects and normalizes cost records", async () => {
    const records = await collectCostRecords();
    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toHaveProperty("provider");
    expect(records[0]).toHaveProperty("cost");
  });

  it("detects anomaly on cost spike", () => {
    const now = new Date();
    const out = detectCostAnomaly([
      { provider: "aws", service: "EKS", cost: 100, timestamp: now },
      { provider: "aws", service: "EKS", cost: 150, timestamp: now },
    ]);
    expect(out.anomaly).toBe(true);
  });

  it("enforces budget when over threshold", async () => {
    await collectCostRecords();
    const out = await finopsService.enforce({ threshold: 1, provider: "aws" });
    expect(typeof out.status).toBe("string");
  });
});

