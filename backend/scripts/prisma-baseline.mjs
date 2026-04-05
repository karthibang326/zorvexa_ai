#!/usr/bin/env node
/**
 * When `migrate deploy` fails with P3005, run once to mark existing migrations as applied.
 * Then `npm run db:deploy` works. New migrations still apply SQL normally.
 */
import { readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const migrationsDir = join(root, "prisma/migrations");
const dirs = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

for (const name of dirs) {
  try {
    execSync(`npx prisma migrate resolve --applied "${name}"`, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
  } catch {
    console.warn(`(skip or already applied) ${name}`);
  }
}
console.log("Done. Run: npm run db:deploy");
