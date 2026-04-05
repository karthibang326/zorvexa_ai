/**
 * Whether to persist via Prisma. Disabled under Jest: DATABASE_URL may exist while tables are not migrated.
 */
export function usePrismaPersistence(): boolean {
  if (process.env.JEST_WORKER_ID !== undefined) return false;
  return !!process.env.DATABASE_URL;
}
