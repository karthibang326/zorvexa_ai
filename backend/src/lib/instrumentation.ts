import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { logger } from "./logger";

/**
 * Zorvexa Platform Instrumentation Layer (FAANG-grade Distributed Tracing)
 * Configures OpenTelemetry targeting a global OTLP Collector.
 */
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "zorvexa-api-v2",
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || "development",
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
    headers: {}, // Optional Auth tokens for SigNoz/Honeycomb
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": {
        enabled: false, // Too noisy
      },
    }),
  ],
});

export const startInstrumentation = () => {
  if (process.env.OTEL_ENABLED === "true" || process.env.NODE_ENV === "production") {
    logger.info("📡 STARTING OPEN TELEMETRY INSTRUMENTATION... (Service: zorvexa-api-v2)");
    sdk.start();
  } else {
    logger.info("❄️ OPEN TELEMETRIC INSTRUMENTATION IS IN SLEEPER MODE.");
  }
};

// Shutdown handler
process.on("SIGTERM", () => {
  sdk.shutdown()
    .then(() => logger.info("⚠️ OTEL SDK SHUTDOWN COMPLETE."))
    .catch((error) => logger.error("🚨 OTEL SDK SHUTDOWN ERROR:", error))
    .finally(() => process.exit(0));
});
