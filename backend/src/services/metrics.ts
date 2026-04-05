const counters = {
  runsTriggered: 0,
  runsSucceeded: 0,
  runsFailed: 0,
  runsRetried: 0,
};

export function incRunsTriggered() {
  counters.runsTriggered += 1;
}
export function incRunsSucceeded() {
  counters.runsSucceeded += 1;
}
export function incRunsFailed() {
  counters.runsFailed += 1;
}
export function incRunsRetried() {
  counters.runsRetried += 1;
}

export function renderPrometheusMetrics(): string {
  return [
    "# HELP quantumops_runs_triggered_total Total runs triggered",
    "# TYPE quantumops_runs_triggered_total counter",
    `quantumops_runs_triggered_total ${counters.runsTriggered}`,
    "# HELP quantumops_runs_succeeded_total Total runs succeeded",
    "# TYPE quantumops_runs_succeeded_total counter",
    `quantumops_runs_succeeded_total ${counters.runsSucceeded}`,
    "# HELP quantumops_runs_failed_total Total runs failed",
    "# TYPE quantumops_runs_failed_total counter",
    `quantumops_runs_failed_total ${counters.runsFailed}`,
    "# HELP quantumops_runs_retried_total Total runs retried",
    "# TYPE quantumops_runs_retried_total counter",
    `quantumops_runs_retried_total ${counters.runsRetried}`,
    "",
  ].join("\n");
}

