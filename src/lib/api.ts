import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { useContextStore } from "@/store/context";

/**
 * Dev: Vite proxies `/api` → backend :5002.
 * Production: same-origin `/api` (reverse proxy / platform rewrite) unless `VITE_WORKFLOWS_API_URL` is set at build time.
 */
const API_BASE = import.meta.env.VITE_WORKFLOWS_API_URL?.trim()
  ? `${import.meta.env.VITE_WORKFLOWS_API_URL.replace(/\/$/, "")}/api`
  : "/api";

function getToken(): string | null {
  try {
    return localStorage.getItem("quantumops_jwt") || localStorage.getItem("astraops_jwt");
  } catch {
    return null;
  }
}

/**
 * Demo `authStore` login/signup stores opaque strings `astraops_<uuid>` — not JWTs.
 * Sending them as Bearer breaks Auth0/JWKS or HS256 verification. In dev, omit the header so
 * `AUTH_DEV_BYPASS` can apply.
 */
function isDemoOpaqueApiToken(token: string): boolean {
  return /^astraops_[0-9a-f-]{36}$/i.test(token.trim());
}

/** Effective Bearer token for this request, or null to skip Authorization. */
function resolveAuthorizationBearer(): string | null {
  const fromDefault = api.defaults.headers.common.Authorization;
  let raw: string | null = null;
  if (typeof fromDefault === "string" && fromDefault.startsWith("Bearer ")) {
    raw = fromDefault.slice(7).trim() || null;
  }
  if (!raw) raw = getToken();
  if (!raw) return null;
  if (import.meta.env.DEV && isDemoOpaqueApiToken(raw)) return null;
  return raw;
}

/**
 * Tenant headers for every `/api/*` request.
 * Prefer Zustand (synchronous) — persisted localStorage can lag one tick behind `setContext`
 * (Launch Mode activation updates store then immediately calls `updateEnvironmentPolicy`).
 */
function getContextHeaders() {
  try {
    const s = useContextStore.getState();
    if (s.orgId?.trim() && s.projectId?.trim() && s.envId?.trim()) {
      return { orgId: s.orgId, projectId: s.projectId, envId: s.envId };
    }
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem("astraops_context_v1");
    const parsed = raw ? JSON.parse(raw) : null;
    const state = parsed?.state ?? parsed;
    const orgId = state?.orgId ?? "org-1";
    const projectId = state?.projectId ?? "proj-1";
    const envId = state?.envId ?? "env-prod";
    return { orgId, projectId, envId };
  } catch {
    return { orgId: "org-1", projectId: "proj-1", envId: "env-prod" };
  }
}

export function setApiAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete api.defaults.headers.common.Authorization;
}

/** Removes browser JWT keys and axios default Authorization (fixes 401 when dev bypass expects no Bearer token). */
export function clearStoredApiSession() {
  try {
    localStorage.removeItem("quantumops_jwt");
    localStorage.removeItem("astraops_jwt");
  } catch {
    /* ignore */
  }
  setApiAuthToken(null);
}

export class ApiClientError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

const RETRY_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fastify JSON error payloads — must not be treated as "Vite proxy cannot reach upstream". */
function responseLooksLikeFastifyJsonError(data: unknown): boolean {
  if (data == null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return typeof o.error === "string" || typeof o.hint === "string";
}

/** Vite proxy returns 5xx when upstream (Fastify on :5002) is not listening — not a real API error body. */
function looksLikeDevProxyBackendDown(error: AxiosError<any>): boolean {
  if (!import.meta.env.DEV) return false;
  const st = error.response?.status;
  const d = error.response?.data;
  if (responseLooksLikeFastifyJsonError(d)) {
    return false;
  }
  const blob =
    typeof d === "string"
      ? d
      : d != null && typeof d === "object"
        ? JSON.stringify(d)
        : "";
  if (st === 502 || st === 503 || st === 504) return true;
  if (
    st === 500 &&
    /ECONNREFUSED|connect ECONNREFUSED|proxy error|127\.0\.0\.1:5002|http proxy error/i.test(blob)
  ) {
    return true;
  }
  // Vite may return 500 with an empty body when the proxy cannot connect to the upstream (dev only).
  if (import.meta.env.DEV && st === 500 && (d === undefined || d === null || d === "")) {
    return true;
  }
  return false;
}

const BACKEND_DOWN_HINT =
  "Backend API is not running on port 5002. From the project root run: npm run dev (starts API + UI), or npm run dev:api in a second terminal — then retry.";

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { orgId, projectId, envId } = getContextHeaders();
  const bearerToken = resolveAuthorizationBearer();
  if (bearerToken) {
    config.headers.Authorization = `Bearer ${bearerToken}`;
  } else {
    delete config.headers.Authorization;
  }
  config.headers["x-org-id"] = orgId;
  config.headers["x-project-id"] = projectId;
  config.headers["x-env-id"] = envId;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { __retryCount?: number }) | undefined;
    const status = error.response?.status;
    const proxyBackendDown = looksLikeDevProxyBackendDown(error);
    const shouldRetry =
      !proxyBackendDown &&
      !!cfg &&
      (cfg.method?.toUpperCase() === "GET" || cfg.method?.toUpperCase() === "POST") &&
      (!!status && RETRY_STATUS.has(status));

    if (shouldRetry) {
      cfg.__retryCount = cfg.__retryCount ?? 0;
      if (cfg.__retryCount < MAX_RETRIES) {
        cfg.__retryCount += 1;
        await sleep(250 * Math.pow(2, cfg.__retryCount));
        return api(cfg);
      }
    }

    let message =
      error.response?.data?.error ||
      error.response?.data?.details ||
      error.message ||
      "API request failed";
    if (proxyBackendDown) {
      message = BACKEND_DOWN_HINT;
    } else if (status === 401) {
      const raw = String(
        error.response?.data?.error ?? error.response?.data?.message ?? message ?? ""
      ).trim();
      const generic = !raw || /^unauthorized$/i.test(raw);
      if (generic) {
        message = import.meta.env.DEV
          ? "Not signed in to the API (401). Sign in with Auth0, or for local dev set AUTH_DEV_BYPASS=true and NODE_ENV=development in backend/.env. If you used demo Sign in, that token is not a real JWT — use \"Clear stored token & retry\" or ensure NODE_ENV=development on the API, then restart the API."
          : "Your session expired or you are not signed in. Please sign in again.";
      }
    } else if (!error.response && message === "Network Error") {
      message = import.meta.env.DEV
        ? "Cannot reach the API (backend not running, wrong URL, or request blocked). Start the backend on port 5002 or use the Vite /api proxy."
        : "Cannot reach the API. Ensure your host proxies `/api` to the backend, or rebuild with VITE_WORKFLOWS_API_URL set to your API origin.";
    } else if (
      import.meta.env.DEV &&
      status === 500 &&
      !error.response?.data?.error &&
      !error.response?.data?.details &&
      /^Request failed with status code 500$/i.test(String(error.message).trim())
    ) {
      message = `${message} ${BACKEND_DOWN_HINT}`;
    }
    throw new ApiClientError(message, status, error.response?.data);
  }
);

