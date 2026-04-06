/**
 * db-guards — N+1 prevention patterns for Prisma.
 *
 * RULE: Never query inside a loop over Prisma results.
 * Always batch via `include`, `select`, or `Promise.all` on a fixed set.
 *
 * Use `batchByIds` for ad-hoc ID lookups outside of repository methods.
 *
 * @example — fetch workflows with their latest version in one query
 *   const workflows = await batchInclude(
 *     prisma.workflow.findMany({ where: { orgId }, take: 100 }),
 *     { versions: { orderBy: { version: "desc" }, take: 1 } }
 *   );
 *
 * @example — resolve a set of user IDs without a loop
 *   const users = await batchByIds(prisma.user, userIds);
 *   const userMap = Object.fromEntries(users.map(u => [u.id, u]));
 */

import { prisma } from "./prisma";

/**
 * Fetch records by an array of IDs in a single query.
 * Returns results in insertion order of `ids` (gaps for missing IDs are omitted).
 */
export async function batchByIds<T extends { id: string }>(
  model: { findMany: (args: { where: { id: { in: string[] } } }) => Promise<T[]> },
  ids: string[]
): Promise<T[]> {
  if (ids.length === 0) return [];
  const unique = [...new Set(ids)];
  const rows = await model.findMany({ where: { id: { in: unique } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return unique.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}

/**
 * Paginate a Prisma model with a parallel count.
 * Always prefer this over two sequential queries.
 *
 * @example
 *   const { items, total } = await paginate(
 *     prisma.auditLog,
 *     { where: { orgId }, orderBy: { createdAt: "desc" } },
 *     { page: 1, pageSize: 50 }
 *   );
 */
export async function paginate<T>(
  model: {
    findMany: (args: {
      where?: unknown;
      orderBy?: unknown;
      take?: number;
      skip?: number;
    }) => Promise<T[]>;
    count: (args: { where?: unknown }) => Promise<number>;
  },
  query: { where?: unknown; orderBy?: unknown },
  pagination: { page: number; pageSize: number }
): Promise<{ items: T[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    model.findMany({ ...query, take: pageSize, skip }),
    model.count({ where: query.where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * Detect and log potential N+1 risk in development.
 * Wrap repository calls that are suspected of being called in a loop.
 *
 * In production this is a no-op — zero overhead.
 */
let _callCount = 0;
let _resetAt = Date.now();

export function assertNotInLoop(label: string): void {
  if (process.env.NODE_ENV !== "development") return;

  const now = Date.now();
  if (now - _resetAt > 100) {
    _callCount = 0;
    _resetAt = now;
  }
  _callCount++;

  if (_callCount > 10) {
    console.warn(
      `[db-guards] Possible N+1: "${label}" called ${_callCount} times within 100 ms. ` +
        `Batch with include/select instead.`
    );
  }
}
