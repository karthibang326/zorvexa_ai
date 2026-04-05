export async function getContext() {
  // Simulate live dynamic telemetry with variance
  const latencyBase = 120;
  const cpuBase = 60;
  const jitter = Math.floor(Math.random() * 40);

  return {
    cluster: "prod-us-east-1",
    latency: `${latencyBase + jitter}ms`,
    cpu: `${cpuBase + (jitter / 2)}%`,
    memory: `${(4.2 + (Math.random() * 0.2)).toFixed(1)}GB`,
    activePods: 24,
    alerts: jitter > 30 ? ["auth-service latency spike detected"] : [],
    logs: [
      `${new Date().toISOString()} [INFO] Incoming request to /v1/auth/login`,
      `${new Date().toISOString()} [DEBUG] RDS connection pool at 82% utilization`,
      jitter > 25 ? `${new Date().toISOString()} [ERROR] Connection timeout in auth-service (upstream)` : `${new Date().toISOString()} [INFO] Auth-service health check passed`
    ],
  };
}
