import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { aiCopilotRoutes } from "./ai.routes";

jest.mock("../../lib/llm", () => ({
  callLLM: jest.fn(async (prompt: string) => {
    if (prompt.includes("Generate a workflow DAG")) {
      return JSON.stringify({
        nodes: [{ id: "n1", type: "K8S", label: "Scale" }],
        edges: [],
      });
    }
    if (prompt.includes("Detect anomalies")) {
      return JSON.stringify({ anomaly: true, reason: "CPU spike detected", suggestion: "Scale up worker nodes" });
    }
    return JSON.stringify({
      optimizations: ["Merge 3 sequential nodes into 1 worker"],
      latencyReduction: "40ms",
      risk: "LOW",
    });
  }),
  safeJsonParse: jest.requireActual("../../lib/llm").safeJsonParse,
}));

function sign(app: any) {
  return app.jwt.sign({ sub: "test", role: "operator", email: "test@example.com" });
}

describe("ai copilot routes", () => {
  it("analyze workflow", async () => {
    const app = Fastify();
    await app.register(jwt, { secret: "test" });
    await app.register(aiCopilotRoutes, { prefix: "/api/ai" } as any);

    const res = await app.inject({
      method: "POST",
      url: "/api/ai/analyze",
      headers: { authorization: `Bearer ${sign(app)}` },
      payload: { nodes: [{ id: "a", type: "HTTP", label: "A" }], edges: [] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.risk).toBe("LOW");
    expect(Array.isArray(body.optimizations)).toBe(true);
    await app.close();
  });

  it("generate workflow", async () => {
    const app = Fastify();
    await app.register(jwt, { secret: "test" });
    await app.register(aiCopilotRoutes, { prefix: "/api/ai" } as any);

    const res = await app.inject({
      method: "POST",
      url: "/api/ai/generate",
      headers: { authorization: `Bearer ${sign(app)}` },
      payload: { prompt: "Auto-scale Kubernetes pods when CPU > 80%" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.nodes)).toBe(true);
    await app.close();
  });

  it("anomaly detection", async () => {
    const app = Fastify();
    await app.register(jwt, { secret: "test" });
    await app.register(aiCopilotRoutes, { prefix: "/api/ai" } as any);

    const res = await app.inject({
      method: "POST",
      url: "/api/ai/anomaly",
      headers: { authorization: `Bearer ${sign(app)}` },
      payload: { metrics: { cpu: 95, cost: 120 } },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.anomaly).toBe(true);
    expect(typeof body.suggestion).toBe("string");
    await app.close();
  });
});

