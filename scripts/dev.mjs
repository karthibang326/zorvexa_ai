#!/usr/bin/env node
/**
 * If something already serves /health on :5002, start Vite only (avoids EADDRINUSE when an old API holds the port).
 * Otherwise start API + Vite via dev:all.
 */
import fs from "fs";
import http from "http";
import net from "net";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Same merge as vite.config: parent `.env` then app `.env` (app wins). */
function parseViteSupabaseFromDotenv(appRootDir) {
  let url = "";
  let key = "";
  const parentDir = join(appRootDir, "..");
  for (const rootDir of [parentDir, appRootDir]) {
    for (const name of [".env", ".env.local", ".env.development", ".env.development.local"]) {
      let raw = "";
      try {
        raw = fs.readFileSync(join(rootDir, name), "utf8");
      } catch {
        continue;
      }
      for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        if (t.startsWith("VITE_SUPABASE_URL=")) {
          url = t.slice("VITE_SUPABASE_URL=".length).trim();
        }
        if (t.startsWith("VITE_SUPABASE_PUBLISHABLE_KEY=")) {
          key = t.slice("VITE_SUPABASE_PUBLISHABLE_KEY=".length).trim();
        }
      }
    }
  }
  return { url, key };
}

function warnIfSupabaseEnvIncomplete() {
  const { url, key } = parseViteSupabaseFromDotenv(root);
  if (url && key) return;
  const innerEnv = resolve(root, ".env");
  const parentEnv = resolve(root, "..", ".env");
  console.error(
    "\n\x1b[33m[dev]\x1b[0m \x1b[1mSupabase\x1b[0m is not configured for the UI — \x1b[1m/auth\x1b[0m will show “sign-in required”.\n" +
      "    Put \x1b[1mVITE_SUPABASE_URL\x1b[0m + \x1b[1mVITE_SUPABASE_PUBLISHABLE_KEY\x1b[0m in \x1b[1meither\x1b[0m file (anon key from Supabase → Settings → API):\n" +
      `      \x1b[36m${parentEnv}\x1b[0m  (parent folder — often easier to find)\n` +
      `      \x1b[36m${innerEnv}\x1b[0m  (next to vite.config.ts)\n` +
      "    No empty value after \x1b[1m=\x1b[0m; then \x1b[1mrestart\x1b[0m dev (Ctrl+C, run again).\n"
  );
}

const VITE_PORT = Number(process.env.PORT) || 5173;

function apiHealthy() {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:5002/health", { timeout: 1000 }, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/** True if nothing is listening on this TCP port (same check Vite needs with strictPort). */
function portIsFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port);
  });
}

const ok = await apiHealthy();

function run(cmd, args) {
  const child = spawn(cmd, args, {
    stdio: "inherit",
    shell: false,
    cwd: root,
    env: process.env,
  });
  child.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    if (signal) process.exit(1);
    process.exit(code ?? 0);
  });
}

warnIfSupabaseEnvIncomplete();

if (!(await portIsFree(VITE_PORT))) {
  console.error(
    `\n\x1b[31m[dev]\x1b[0m Port \x1b[1m${VITE_PORT}\x1b[0m is already in use (Vite uses strictPort for Auth0 callback URLs).\n\n` +
      `  \x1b[1mQuick fix:\x1b[0m free the port and start (stops listeners on ${VITE_PORT}):\n` +
      `       \x1b[36mnpm run dev:free\x1b[0m\n\n` +
      `  Or stop the other dev server (Ctrl+C), or inspect:\n` +
      `       \x1b[36mlsof -nP -iTCP:${VITE_PORT} -sTCP:LISTEN\x1b[0m\n\n` +
      `  Different port (update Auth0 Callback / Logout / Web Origin to match):\n` +
      `       \x1b[36mPORT=5185 npm run dev\x1b[0m\n`
  );
  process.exit(1);
}

if (ok) {
  console.log(
    "\n\x1b[32m[dev]\x1b[0m Backend already up on \x1b[1m:5002\x1b[0m (/health OK) — starting \x1b[1mVite only\x1b[0m.\n" +
      "    \x1b[33mIf you edited backend/.env (Stripe, billing, auth), that process still has the old env.\x1b[0m\n" +
      "    Stop whatever is listening on :5002, then run \x1b[1mnpm run dev:all\x1b[0m (or restart \x1b[1mcd backend && npm run dev\x1b[0m).\n"
  );
  run("npx", ["vite", "--port", String(VITE_PORT), "--strictPort"]);
} else {
  run("npm", ["run", "dev:all"]);
}
