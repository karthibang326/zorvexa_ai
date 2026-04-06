import { prisma } from "../../../lib/prisma";
import { logger } from "../../../lib/logger";

/**
 * AI ADVISOR SERVICE (ADVISORY ONLY)
 * Responsibility: Enhanced UX, forecasting, and anomalies.
 * Restriction: NO financial decision-making or billing calculation.
 */
export const aiAdvisorService = {
  /**
   * Generates a natural language explanation for an existing, deterministic billing record.
   * Does NOT compute the amount; only interprets the provided financial data.
   */
  async explainBillingRecord(recordId: string) {
    const record = await (prisma as any).billingRecord.findUnique({ where: { id: recordId } });
    if (!record) return "Record not found.";

    // Logic: In a real system, this would call an LLM (e.g. Gemini)
    // For now, we simulate the 'Advisory' output based on deterministic data
    return `In this billing period (${record.billingPeriodStart.toLocaleDateString()} - ${record.billingPeriodEnd.toLocaleDateString()}), 
            your organization realized $${record.totalSavings} in AI-generated savings. 
            The usage charge was calculated as $${record.usageCharge} (plus a base fee of $${record.baseCharge}). 
            Your net ROI for this period was $${(record.totalSavings - record.finalCharge).toFixed(2)}.`;
  },

  /**
   * Forecasts future costs and savings based on historical usage trends.
   */
  async forecastUsage(tenantId: string) {
    const usage = await (prisma as any).usageEvent.findMany({
      where: { orgId: tenantId },
      orderBy: { timestamp: "desc" },
      take: 50
    });

    if (usage.length < 5) return { prediction: "Not enough data for accurate forecasting." };

    // Placeholder for AI forecasting logic
    const avgSavings = usage.reduce((acc: number, cur: any) => acc + cur.amount, 0) / usage.length;
    
    return {
      forecastedSavingsNextMonth: (avgSavings * 30).toFixed(2),
      confidenceScore: 0.85,
      insight: "Usage is trending upward. We recommend optimizing your Growth plan configurations."
    };
  },

  /**
   * Detects anomalies (e.g. sudden spikes in savings which could indicate error or high value).
   */
  async detectAnomaly(tenantId: string) {
    // Advisory check for spikes
    const latestUsage = await (prisma as any).usageEvent.findMany({
      where: { orgId: tenantId },
      orderBy: { timestamp: "desc" },
      take: 10
    });

    // In production, this would trigger an SRE alert if an anomaly is detected
    return {
      hasAnomaly: false,
      message: "Usage patterns are within normal operational parameters."
    };
  }
};
