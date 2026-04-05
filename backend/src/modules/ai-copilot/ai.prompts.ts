export function analysisPrompt(nodes: unknown[], edges: unknown[]) {
  return [
    "Analyze this DAG workflow and suggest optimizations, latency improvements, and risks.",
    "Return STRICT JSON with keys: optimizations (string[]), latencyReduction (string), risk (\"LOW\"|\"MEDIUM\"|\"HIGH\").",
    "",
    "DAG JSON:",
    JSON.stringify({ nodes, edges }),
  ].join("\n");
}

export function generationPrompt(userPrompt: string) {
  return [
    `Generate a workflow DAG in JSON format for: ${userPrompt}`,
    "Return STRICT JSON with keys: nodes (array), edges (array).",
    "Each node must include: id, type, label.",
    "Each edge must include: source, target.",
  ].join("\n");
}

export function anomalyPrompt(metrics: Record<string, unknown>) {
  return [
    "Detect anomalies based on metrics and suggest remediation.",
    "Return STRICT JSON with keys: anomaly (boolean), reason (string), suggestion (string).",
    "",
    "metrics:",
    JSON.stringify(metrics),
  ].join("\n");
}

