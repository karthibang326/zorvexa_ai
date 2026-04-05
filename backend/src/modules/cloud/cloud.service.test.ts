import { cloudService } from "./cloud.service";

describe("cloud service", () => {
  it("routes provider execution", async () => {
    const out = await cloudService.execute({
      provider: "aws",
      operation: "scaleDeployment",
      deploymentName: "api",
      namespace: "prod",
      replicas: 3,
    });
    expect(out.ok).toBe(true);
    expect(out.provider).toBe("aws");
  });

  it("aggregates metrics", async () => {
    const metrics = await cloudService.metrics();
    expect(metrics).toHaveLength(3);
    expect(metrics.some((m) => m.provider === "gcp")).toBe(true);
  });
});

