import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { saveWorkflow } from "@/lib/workflows";
import { streamRun, triggerRun } from "@/lib/runs";

/** Must match `src/lib/api.ts` default base (axios uses full URL against MSW). */
const API = "http://localhost:5002";

const server = setupServer(
  http.options(`${API}/api/*`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${API}/api/workflows/:id/save`, async () => {
    return HttpResponse.json({
      id: "wf-1",
      name: "Workflow",
      type: "agent",
      version: 2,
      nodes: [{ id: "n1" }],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),
  http.post(`${API}/api/runs/trigger`, async () => {
    return HttpResponse.json({
      id: "run-1",
      workflowId: "wf-1",
      workflowVersion: 2,
      status: "RUNNING",
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("frontend backend integration client", () => {
  it("saves workflow", async () => {
    const saved = await saveWorkflow("wf-1", { nodes: [{ id: "n1" }], edges: [] });
    expect(saved.version).toBe(2);
    expect(saved.nodes).toHaveLength(1);
  });

  it("triggers run", async () => {
    const run = await triggerRun({
      workflowId: "wf-1",
      version: 2,
      idempotencyKey: "wf-1:2:test",
    });
    expect(run.id).toBe("run-1");
    expect(run.status).toBe("RUNNING");
  });

  it("handles run stream updates", async () => {
    const listeners = new Map<string, (evt: MessageEvent) => void>();
    class EventSourceMock {
      addEventListener(event: string, cb: (evt: MessageEvent) => void) {
        listeners.set(event, cb);
      }
      close() {
        listeners.clear();
      }
    }
    vi.stubGlobal("EventSource", EventSourceMock as any);
    const onEvent = vi.fn();
    const unsubscribe = streamRun("run-1", onEvent);
    listeners.get("update")?.({ data: JSON.stringify({ type: "step.completed" }) } as MessageEvent);
    expect(onEvent).toHaveBeenCalledWith({ type: "step.completed" });
    unsubscribe();
    vi.unstubAllGlobals();
  });
});

