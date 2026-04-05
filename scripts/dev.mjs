#!/usr/bin/env node
/**
 * If something already serves /health on :5002, start Vite only (avoids EADDRINUSE when an old API holds the port).
 * Otherwise start API + Vite via dev:all.
 */
import http from "http";
import net from "net";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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
