import type { LogsAgentResult } from "./types";
import type { TelemetrySnapshot } from "./types";

function termsFromQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
}

export async function logsAgent(
  query: string,
  telemetry: TelemetrySnapshot
): Promise<LogsAgentResult> {
  const terms = termsFromQuery(query);
  const lines = telemetry.logs;

  const rank = (line: string) =>
    terms.reduce((n, t) => n + (line.toLowerCase().includes(t) ? 1 : 0), 0);

  const sorted = [...lines].sort((a, b) => rank(b) - rank(a));
  const summary = sorted.slice(0, 5);
  const anomalies = lines.filter(
    (l) =>
      /\b(ERROR|FATAL|panic|timeout)\b/i.test(l) ||
      l.toLowerCase().includes("error")
  );

  return {
    source: "loki-simulated",
    summary,
    anomalies,
    queryTerms: terms,
  };
}
