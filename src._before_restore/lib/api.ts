import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

const API_BASE = import.meta.env.VITE_WORKFLOWS_API_URL
  ? `${import.meta.env.VITE_WORKFLOWS_API_URL.replace(/\/$/, "")}/api`
  : "http://localhost:8080/api";

function getToken(): string | null {
  try {
    return localStorage.getItem("quantumops_jwt") || localStorage.getItem("astraops_jwt");
  } catch {
    return null;
  }
}

function getContextHeaders() {
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

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  const { orgId, projectId, envId } = getContextHeaders();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
    const shouldRetry =
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

    const message =
      error.response?.data?.details ||
      error.response?.data?.error ||
      error.message ||
      "API request failed";
    throw new ApiClientError(message, status, error.response?.data);
  }
);

