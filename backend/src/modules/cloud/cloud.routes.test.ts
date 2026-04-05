import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { cloudRoutes } from "./cloud.routes";

function sign(app: any) {
  return app.jwt.sign({ sub: "u1", role: "operator", email: "operator@test.com" });
}

describe("cloud routes", () => {
  it("executes cloud operation", async () => {
    const app = Fastify();
    await app.register(jwt, { secret: "test" });
    await app.register(cloudRoutes, { prefix: "/api/cloud" } as any);

    const res = await app.inject({
      method: "POST",
      url: "/api/cloud/execute",
      headers: { authorization: `Bearer ${sign(app)}` },
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
    await app.register(jwt, { secret: "test" });
    await app.register(cloudRoutes, { prefix: "/api/cloud" } as any);

    const res = await app.inject({
      method: "GET",
      url: "/api/cloud/status",
      headers: { authorization: `Bearer ${sign(app)}` },
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
    await app.register(jwt, { secret: "test" });
    await app.register(cloudRoutes, { prefix: "/api/cloud" } as any);

    const res = await app.inject({
      method: "GET",
      url: "/api/cloud/metrics",
      headers: { authorization: `Bearer ${sign(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().metrics)).toBe(true);
    await app.close();
  });
});

