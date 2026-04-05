import { NormalizedCostRecord } from "./cost-collector";

export function predictCost(records: NormalizedCostRecord[]) {
  if (!records.length) {
    return { nextDay: 0, nextMonth: 0, model: "moving_average" };
  }
  const window = records.slice(-Math.min(7, records.length));
  const avg = window.reduce((s, r) => s + r.cost, 0) / window.length;
  return {
    nextDay: Number(avg.toFixed(2)),
    nextMonth: Number((avg * 30).toFixed(2)),
    model: "moving_average",
  };
}

