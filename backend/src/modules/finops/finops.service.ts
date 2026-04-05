import { detectCostAnomaly } from "./anomaly-detector";
import { collectCostRecords, getCostRecords } from "./cost-collector";
import { enforceBudget } from "./enforcer";
import { optimizeCost } from "./optimizer";
import { predictCost } from "./predictor";
import { publishFinopsEvent } from "./finops.stream";

export const finopsService = {
  async cost() {
    const collected = await collectCostRecords();
    publishFinopsEvent({ type: "cost_update", records: collected });
    return getCostRecords(200);
  },

  async anomaly() {
    const records = await getCostRecords(200);
    const out = detectCostAnomaly(records);
    if (out.anomaly) publishFinopsEvent({ type: "anomaly_alert", ...out });
    return out;
  },

  async predict() {
    const records = await getCostRecords(200);
    return predictCost(records);
  },

  async optimize() {
    const records = await getCostRecords(200);
    return optimizeCost(records);
  },

  async enforce(params?: { threshold?: number; provider?: "aws" | "gcp" | "azure" }) {
    const out = await enforceBudget(params);
    publishFinopsEvent({ type: "budget_enforcement", ...out });
    return out;
  },
};

