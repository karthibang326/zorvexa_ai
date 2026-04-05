const counters = {
  requestsTotal: 0,
  runsTriggered: 0,
  runsFailed: 0,
  runsSucceeded: 0,
};

export function incRequest() {
  counters.requestsTotal += 1;
}
export function incRunTriggered() {
  counters.runsTriggered += 1;
}
export function incRunFailed() {
  counters.runsFailed += 1;
}
export function incRunSucceeded() {
  counters.runsSucceeded += 1;
}

export function metricsText() {
  return [
    "# TYPE qo_requests_total counter",
    `qo_requests_total ${counters.requestsTotal}`,
    "# TYPE qo_runs_triggered_total counter",
    `qo_runs_triggered_total ${counters.runsTriggered}`,
    "# TYPE qo_runs_failed_total counter",
    `qo_runs_failed_total ${counters.runsFailed}`,
    "# TYPE qo_runs_succeeded_total counter",
    `qo_runs_succeeded_total ${counters.runsSucceeded}`,
    "",
  ].join("\n");
}

