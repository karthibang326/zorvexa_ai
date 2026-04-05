import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { runRoutes } from "./run.routes";

describe("run routes", () => {
  const app = Fastify();

  beforeAll(async () => {
    await app.register(jwt, { secret: "test-secret" });
    await app.register(runRoutes, { prefix: "/api/runs" });
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires auth for trigger endpoint", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/runs/trigger",
      payload: { workflowId: "00000000-0000-0000-0000-000000000000", idempotencyKey: "idem-test-1234" },
    });
    expect(res.statusCode).toBe(401);
  });
});

