import CircuitBreaker from "opossum";
import { logger } from "@/lib/logger";

const defaultOptions = {
  timeout: 30000, // 30s timeout for AI/Cloud calls
  errorThresholdPercentage: 50, // Open circuit if 50% fail
  resetTimeout: 15000, // Wait 15s before half-open
};

export class ResilienceService {
  private static breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * FAANG-style Circuit Breaker wrapper
   * @param name The feature/service name (e.g. 'OpenAI', 'AWS-Lambda')
   * @param fn The async function to execute
   * @param args The arguments for the function
   */
  static async execute<T, Args extends any[]>(
    name: string,
    fn: (...args: Args) => Promise<T>,
    ...args: Args
  ): Promise<T> {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(fn, {
        ...defaultOptions,
        name: `Breaker-${name}`,
      });

      breaker.on("open", () =>
        logger.warn(`🚨 CIRCUIT BREAKER OPENED: ${name}. External dependencies are failing.`)
      );

      breaker.on("halfOpen", () =>
        logger.info(`🔄 CIRCUIT BREAKER HALF-OPEN: ${name}. Testing recovery.`)
      );

      breaker.on("close", () =>
        logger.info(`✅ CIRCUIT BREAKER CLOSED: ${name}. Service is healthy.`)
      );

      breaker.on("fallback", () =>
        logger.error(`⚠️ CIRCUIT BREAKER FALLBACK: ${name}. Returning safety response.`)
      );

      this.breakers.set(name, breaker);
    }

    const breaker = this.breakers.get(name)!;
    // We update the function reference in case of dynamic scope changes
    return (breaker.fire as any)(...args) as Promise<T>;
  }
}
