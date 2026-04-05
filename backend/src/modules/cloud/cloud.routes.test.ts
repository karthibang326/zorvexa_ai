import Fastify from "fastify";
import { env } from "../../config/env";
import { signLocalJwt } from "../../lib/local-jwt";
import { cloudRoutes } from "./cloud.routes";

async function authHeader() {
  const t = await signLocalJwt(env.JWT_SECRET, { sub: "u1", role: "operator", email: "operator@test.com" });
  return `Bearer ${t}`;
}

describe("cloud routes", () => {
  it("executes cloud operation", async () => {
    const app = Fastify();
    await app.register(cloudRoutes, { prefix: "/api/cloud" } as any);

    const res = await app.inject({
      method: "POST",
      url: "/api/cloud/execute",
      headers: { authorization: await authHeader() },
      payload: {
        provider: "aws",
        operation: "scaleDeployment",
        deploymentName: "api",
        namespace: "prod",
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().provider).toBe("aws");
    await app.close();
  });

  it("returns multi-cloud status and metrics", async () => {
    const app = Fastify();
    await app.register(cloudRoutes, { prefix: "/api/cloud" } as any);

    const res = await app.inject({
      method: "GET",
      url: "/api/cloud/status",
      headers: { authorization: await authHeader() },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.controlPlanes)).toBe(true);
    expect(body.controlPlanes.length).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(body.metrics)).toBe(true);
    await app.close();
  });

  it("returns normalized metrics", async () => {
    const app = Fastify();
    await app.register(cloudRoutes, { prefix: "/api/cloud" } as any);

    const res = await app.inject({
      method: "GET",
      url: "/api/cloud/metrics",
      headers: { authorization: await authHeader() },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().metrics)).toBe(true);
    await app.close();
  });
});

