import path from "path";
import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";

/** Project root `.env` (same folder as Vite app — shared secrets). */
export const REPO_ROOT_ENV_PATH = path.resolve(__dirname, "../../../.env");

/** `backend/.env` — server-only overrides e.g. PORT. */
export const BACKEND_ENV_PATH = path.resolve(__dirname, "../../.env");

// Root first (OpenAI key lives next to VITE_*), then backend (PORT, etc.).
// Later file does not override existing vars, so OPENAI from root wins over any old backend placeholder.
dotenv.config({ path: REPO_ROOT_ENV_PATH });
const backendDotenv = dotenv.config({ path: BACKEND_ENV_PATH });

if (backendDotenv.error && process.env.NODE_ENV !== "test") {
  console.warn(
    `[env] Could not read ${BACKEND_ENV_PATH}: ${backendDotenv.error.message}`
  );
}

if (
  process.env.NODE_ENV !== "test" &&
  !fs.existsSync(REPO_ROOT_ENV_PATH) &&
  !fs.existsSync(BACKEND_ENV_PATH)
) {
  console.warn(
    `[env] No .env at ${REPO_ROOT_ENV_PATH} or ${BACKEND_ENV_PATH}`
  );
}

function rawKey(): string | undefined {
  let k = process.env.OPENAI_API_KEY?.trim();
  if (!k) return undefined;
  // Common mistake: OPENAI_API_KEY="sk-..." — strip matching quotes
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  return k || undefined;
}

/** Non-null if Copilot cannot call OpenAI until `.env` is fixed. */
/** Dev-only: accept API key from request body (browser). Disabled in production. */
export function devOpenAiKeyFromRequest(bodyKey: unknown): string | null {
  if (process.env.NODE_ENV === "production") return null;
  if (typeof bodyKey !== "string") return null;
  let k = bodyKey.trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  if (!k.startsWith("sk-") || k.length < 20) return null;
  const lower = k.toLowerCase();
  if (
    lower.includes("placeholder") ||
    lower.includes("your_openai") ||
    lower.includes("replace_me")
  ) {
    return null;
  }
  return k;
}

export function openAiConfigurationError(): string | null {
  const key = rawKey();
  if (!key) {
    return `OPENAI_API_KEY is not set. Add OPENAI_API_KEY=sk-... to ${REPO_ROOT_ENV_PATH} (recommended) or ${BACKEND_ENV_PATH}. See https://platform.openai.com/account/api-keys`;
  }
  const lower = key.toLowerCase();
  if (
    key === "your_openai_api_key_here" ||
    lower.includes("your_openai") ||
    lower.includes("placeholder") ||
    lower.includes("replace_me")
  ) {
    return `OPENAI_API_KEY is still a placeholder. Replace with a real key in ${REPO_ROOT_ENV_PATH} or ${BACKEND_ENV_PATH} and restart the backend.`;
  }
  return null;
}

export const openai = new OpenAI({
  apiKey: rawKey() ?? "missing-openai-key",
});
