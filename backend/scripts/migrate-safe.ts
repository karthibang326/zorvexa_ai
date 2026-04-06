/**
 * migrate-safe — Expand/Contract pattern enforcer for Prisma migrations.
 *
 * The Expand/Contract pattern prevents downtime during schema changes:
 *
 *   PHASE 1 — EXPAND   Add new column/table. Old code still works (column nullable or has default).
 *   PHASE 2 — MIGRATE  Backfill data. Both old & new code work simultaneously.
 *   PHASE 3 — CONTRACT Remove old column/table once all code uses new shape.
 *
 * This script:
 *   1. Validates the latest migration file does not contain breaking changes.
 *   2. Checks the migration is backward-compatible before applying it.
 *   3. Runs `prisma migrate deploy` if safe, or exits 1 with guidance.
 *
 * Usage (add to CI before kubectl apply):
 *   ts-node backend/scripts/migrate-safe.ts
 *   node dist/scripts/migrate-safe.js
 *
 * Run directly in development:
 *   npx ts-node backend/scripts/migrate-safe.ts --dry-run
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const DRY_RUN = process.argv.includes("--dry-run");

// ── Patterns that signal a BREAKING (contract-phase) change ──────────────────
const BREAKING_PATTERNS: Array<{ pattern: RegExp; advice: string }> = [
  {
    pattern: /ALTER\s+TABLE\s+\S+\s+DROP\s+COLUMN/i,
    advice:
      "DROP COLUMN is a CONTRACT-phase step. Ensure all app code no longer reads this column before applying.",
  },
  {
    pattern: /DROP\s+TABLE/i,
    advice:
      "DROP TABLE is a CONTRACT-phase step. Confirm no live code references this table.",
  },
  {
    pattern: /ALTER\s+TABLE\s+\S+\s+ALTER\s+COLUMN\s+\S+\s+SET\s+NOT\s+NULL/i,
    advice:
      "Adding NOT NULL to an existing column is breaking if NULLs exist. " +
      "Run a backfill migration first (EXPAND phase), then add the constraint.",
  },
  {
    pattern: /ALTER\s+TABLE\s+\S+\s+RENAME\s+COLUMN/i,
    advice:
      "RENAME COLUMN breaks old code. Use EXPAND: add the new column, dual-write, backfill, then CONTRACT to drop the old one.",
  },
  {
    pattern: /ALTER\s+TABLE\s+\S+\s+RENAME\s+TO/i,
    advice:
      "RENAME TABLE breaks old code. Create a view or use a two-phase rename.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function findLatestMigration(): string | null {
  const migrationsDir = path.resolve(__dirname, "../prisma/migrations");
  if (!fs.existsSync(migrationsDir)) return null;

  const dirs = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse();

  for (const dir of dirs) {
    const sql = path.join(migrationsDir, dir, "migration.sql");
    if (fs.existsSync(sql)) return sql;
  }
  return null;
}

function validate(sqlPath: string): { safe: boolean; violations: string[] } {
  const sql = fs.readFileSync(sqlPath, "utf-8");
  const violations: string[] = [];

  for (const { pattern, advice } of BREAKING_PATTERNS) {
    if (pattern.test(sql)) {
      violations.push(`  [BREAKING] ${advice}`);
    }
  }

  return { safe: violations.length === 0, violations };
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const migrationPath = findLatestMigration();

  if (!migrationPath) {
    console.log("[migrate-safe] No migrations found. Nothing to validate.");
    process.exit(0);
  }

  console.log(`[migrate-safe] Validating: ${migrationPath}`);
  const { safe, violations } = validate(migrationPath);

  if (!safe) {
    console.error("\n[migrate-safe] ❌  Breaking migration detected:\n");
    violations.forEach((v) => console.error(v));
    console.error(
      "\n[migrate-safe] Fix the migration to follow Expand/Contract before deploying.\n" +
        "  See: https://planetscale.com/blog/safely-making-database-schema-changes\n"
    );
    process.exit(1);
  }

  console.log("[migrate-safe] ✓  Migration is backward-compatible (Expand phase safe).");

  if (DRY_RUN) {
    console.log("[migrate-safe] --dry-run: skipping prisma migrate deploy.");
    process.exit(0);
  }

  console.log("[migrate-safe] Running: prisma migrate deploy...");
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("[migrate-safe] ✓  Migration deployed successfully.");
  } catch {
    console.error("[migrate-safe] ❌  prisma migrate deploy failed.");
    process.exit(1);
  }
}

main();
