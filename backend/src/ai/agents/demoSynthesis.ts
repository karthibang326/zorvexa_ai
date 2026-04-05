import type { AgentBundle } from "./types";

function isShortGreeting(q: string): boolean {
  const t = q.trim().toLowerCase();
  return (
    t.length < 24 &&
    /^(hi|hey|hello|yo|sup|good\s+(morning|afternoon|evening)|thanks|thank you)[\s!?.]*$/i.test(
      t
    )
  );
}

/** Plain-text summary when OpenAI is not configured — readable in the chat UI without markdown. */
export function demoSynthesis(userQuery: string, b: AgentBundle): string {
  const greeting = isShortGreeting(userQuery);
  const intro = greeting
    ? "Demo mode — there’s no OpenAI key yet, so you’re seeing agent output on simulated data (not a GPT chat)."
    : "Demo mode — no OPENAI_API_KEY in your project root .env. Below is what the log, metrics, and K8s agents see on the simulated snapshot.";

  const lines: string[] = [
    intro,
    "",
    `You said: “${userQuery.trim()}”`,
    "",
    "── Snapshot ──",
    `Cluster: ${b.telemetry.cluster}`,
    `Load: ${b.telemetry.latency} · CPU ${b.telemetry.cpu} · RAM ${b.telemetry.memory}`,
    `Alerts: ${b.telemetry.alerts.length ? b.telemetry.alerts.join("; ") : "none"}`,
    `Pods (sim): ${b.telemetry.activePods}`,
  ];

  const logCap = greeting ? 3 : 5;
  const topLogs = b.logs.summary.slice(0, logCap);
  const shown = new Set(topLogs);
  const extraAnomalies = b.logs.anomalies.filter((a) => !shown.has(a));

  if (topLogs.length) {
    lines.push("", "── Logs (top) ──");
    topLogs.forEach((l) => lines.push(`• ${l}`));
  }

  if (extraAnomalies.length) {
    lines.push("", "── Anomalies ──");
    extraAnomalies.slice(0, 5).forEach((l) => lines.push(`• ${l}`));
  }

  lines.push(
    "",
    "── Metrics agent ──",
    `CPU ~${b.metrics.cpuPercent}% · ~${b.metrics.memoryGb} GiB · latency ~${b.metrics.latencyMs} ms · spike: ${b.metrics.cpuSpike}`,
    "",
    "── K8s hints ──"
  );
  b.k8s.signals.forEach((s) => lines.push(`• ${s}`));
  b.k8s.unhealthySummary.forEach((s) => lines.push(`• ${s}`));

  lines.push(
    "",
    "────────",
    "Full GPT answers: set OPENAI_API_KEY=sk-… in the project root .env (same file as VITE_SUPABASE_*), then restart: cd backend && npm run dev."
  );

  return lines.join("\n");
}
