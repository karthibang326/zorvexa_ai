#!/usr/bin/env node
/**
 * Stops whatever is listening on the Vite dev port (default 5173).
 * Use when `npm run dev` says the port is already in use (leftover Vite/Node).
 */
import { execSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = process.env.PORT || "5173";

try {
  const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: "utf8" }).trim();
  const pids = [...new Set(out.split(/\s+/).filter(Boolean))];
  for (const pid of pids) {
    try {
      process.kill(Number(pid), "SIGTERM");
    } catch {
      /* ignore */
    }
  }
  if (pids.length) {
    console.log(`\x1b[32m[dev]\x1b[0m Sent SIGTERM to ${pids.length} process(es) on port \x1b[1m${port}\x1b[0m.\n`);
    await delay(400);
  }
} catch {
  /* lsof exits 1 when nothing is listening */
}
