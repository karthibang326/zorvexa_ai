export function calculateSavings(beforeCost: number, afterCost: number): number {
  const before = Number.isFinite(beforeCost) ? Math.max(0, beforeCost) : 0;
  const after = Number.isFinite(afterCost) ? Math.max(0, afterCost) : 0;
  return Math.max(0, Number((before - after).toFixed(2)));
}
