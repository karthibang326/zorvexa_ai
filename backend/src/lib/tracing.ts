/**
 * OpenTelemetry distributed tracing.
 * MUST be imported before any other module in the entrypoint (server.ts / worker.ts)
 * so instrumentation patches load before the frameworks they observe.
 *
 * Exports:
 *   initTracing()  — call once at process start
 *   tracer         — named tracer for manual spans
 *   withSpan()     — convenience helper to wrap async work in a span
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { FastifyInstrumentation } from "@opentelemetry/instrumentation-fastify";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { trace, context, SpanStatusCode, type Span } from "@opentelemetry/api";

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? "zorvexa-backend";
const SERVICE_VERSION = process.env.npm_package_version ?? "1.0.0";
const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "";

let sdk: NodeSDK | null = null;

export function initTracing(): void {
  if (process.env.OTEL_DISABLED === "true" || !OTEL_ENDPOINT) {
    // No-op when tracing is explicitly disabled or no collector endpoint set.
    // Local dev works fine without a collector — spans are simply dropped.
    return;
  }

  const exporter = new OTLPTraceExporter({ url: `${OTEL_ENDPOINT}/v1/traces` });

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
      "deployment.environment": process.env.NODE_ENV ?? "development",
    }),
    traceExporter: exporter,
    instrumentations: [
      new HttpInstrumentation({
        // Don't trace health/readiness/metrics polling — it's noise.
        ignoreIncomingRequestHook: (req) => {
          const url = req.url ?? "";
          return url === "/health" || url === "/ready" || url === "/metrics";
        },
      }),
      new FastifyInstrumentation(),
      new PgInstrumentation({ enhancedDatabaseReporting: false }),
    ],
  });

  sdk.start();

  process.on("SIGTERM", () => sdk?.shutdown().catch(() => {}));
  process.on("SIGINT", () => sdk?.shutdown().catch(() => {}));
}

/** Named tracer — use this for manual instrumentation inside service methods. */
export const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);

/**
 * Wraps an async function in a named span.
 * Sets span status to ERROR automatically on throw.
 *
 * @example
 *   const result = await withSpan("workflow.execute", async (span) => {
 *     span.setAttribute("workflow.id", id);
 *     return executeDAG(nodes);
 *   });
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes: Record<string, string | number | boolean> = {}
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    for (const [k, v] of Object.entries(attributes)) {
      span.setAttribute(k, v);
    }
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      span.end();
    }
  });
}

/** Returns the current active trace ID for logging correlation. */
export function currentTraceId(): string {
  const span = trace.getActiveSpan();
  if (!span) return "";
  return span.spanContext().traceId;
}
