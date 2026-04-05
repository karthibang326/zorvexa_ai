import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { BRAND_PRODUCTION_ORIGINS } from "../shared/branding";

const rootEnvPath = path.resolve(__dirname, "../../../.env");
const backendEnvPath = path.resolve(__dirname, "../../.env");

/**
 * Load repo root `.env` first (shared secrets), then `backend/.env`.
 * Empty values in `backend/.env` must not wipe non-empty values from root (dotenv's default
 * "load backend first" + second file no-override caused root-only Stripe ids to be ignored).
 */
dotenv.config({ path: rootEnvPath });
if (fs.existsSync(backendEnvPath)) {
  const parsed = dotenv.parse(fs.readFileSync(backendEnvPath, "utf8"));
  for (const [key, raw] of Object.entries(parsed)) {
    const v = String(raw).trim();
    if (v !== "") process.env[key] = v;
  }
}

const stripeEnvString = z
  .string()
  .default("")
  .transform((s) => s.trim());

/**
 * Jest loads local `.env` (often `AUTH_PROVIDER=auth0` + `AUTH_ISSUER`).
 * Route tests use `app.jwt.sign` (HS256, no Auth0 `iss`); force local JWT path and skip issuer/audience checks.
 */
if (process.env.NODE_ENV === "test") {
  process.env.AUTH_PROVIDER = "local";
  process.env.AUTH_ISSUER = "";
  process.env.AUTH_AUDIENCE = "";
}

/**
 * Local DX: `npm run dev` / `dev:api` often run with no `AUTH_DEV_BYPASS` in `.env`.
 * Zod alone defaulted that to "false", so every Launch Setup / API call returned 401 until
 * users edited env files. Default bypass on only when not production or test; set
 * `AUTH_DEV_BYPASS=false` explicitly to force real auth locally.
 */
(function defaultAuthDevBypassForLocal() {
  const node = process.env.NODE_ENV;
  if (node === "production" || node === "test") return;
  const raw = process.env.AUTH_DEV_BYPASS;
  if (raw === undefined || String(raw).trim() === "") {
    process.env.AUTH_DEV_BYPASS = "true";
  }
})();

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(5002),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/quantumops?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(1).default("dev-secret-change-me"),
  /** When true, honor X-Forwarded-* from nginx/Caddy/LB for client IP (rate limits) and scheme. */
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  PRODUCTION_STRICT: z.enum(["true", "false"]).default("true"),
  AUTH_PROVIDER: z.enum(["local", "auth0", "clerk"]).default("local"),
  AUTH_ISSUER: z.string().default(""),
  AUTH_AUDIENCE: z.string().default(""),
  /** Same project URL as the SPA `VITE_SUPABASE_URL` — enables API auth with Supabase access tokens. */
  SUPABASE_URL: z.string().default(""),
  AUTH_DEV_BYPASS: z.enum(["true", "false"]).default("false"),
  SSO_GOOGLE_ENABLED: z.enum(["true", "false"]).default("false"),
  SSO_OKTA_ENABLED: z.enum(["true", "false"]).default("false"),
  SSO_MICROSOFT_ENABLED: z.enum(["true", "false"]).default("false"),
  MFA_REQUIRED: z.enum(["true", "false"]).default("false"),
  OPENAI_API_KEY: z.string().default(""),
  STRIPE_SECRET_KEY: stripeEnvString,
  STRIPE_WEBHOOK_SECRET: stripeEnvString,
  STRIPE_PRICE_STARTER: stripeEnvString,
  STRIPE_PRICE_GROWTH: stripeEnvString,
  STRIPE_PRICE_ENTERPRISE: stripeEnvString,
  /**
   * When true and NODE_ENV is development: allow fake checkout (redirect to successUrl without Stripe).
   * Default false — production-like secure checkout only via Stripe. Never enable in production.
   */
  BILLING_DUMMY_CHECKOUT: z.enum(["true", "false"]).default("false"),
  RAZORPAY_KEY_ID: z.string().default(""),
  RAZORPAY_KEY_SECRET: z.string().default(""),
  MTLS_ENABLED: z.enum(["true", "false"]).default("false"),
  TLS_ENABLED: z.enum(["true", "false"]).default("false"),
  DB_ENCRYPTION_ENABLED: z.enum(["true", "false"]).default("false"),
  BACKUP_MULTI_REGION_ENABLED: z.enum(["true", "false"]).default("false"),
  BACKUP_SCHEDULE: z.string().default("daily"),
  SECRETS_PROVIDER: z.enum(["local", "vault", "aws_secrets_manager"]).default("local"),
  SERVICE_SHARED_TOKEN: z.string().default(""),
  CORS_ORIGINS: z
    .string()
    .default(
      [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://localhost:5185",
        "http://127.0.0.1:5185",
        ...BRAND_PRODUCTION_ORIGINS,
      ].join(",")
    ),
  RUN_MAX_ATTEMPTS: z.coerce.number().default(3),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),
  SELF_HEAL_MAX_ACTIONS_PER_HOUR: z.coerce.number().default(20),
  SELF_HEAL_APPROVAL_MODE: z.enum(["auto", "manual"]).default("auto"),
  FINOPS_BUDGET_THRESHOLD_DAILY: z.coerce.number().default(300),
  FINOPS_MAX_ENFORCEMENTS_PER_DAY: z.coerce.number().default(10),
  FINOPS_APPROVAL_MODE: z.enum(["auto", "manual"]).default("auto"),
  INFRA_APPROVAL_REQUIRED: z.enum(["true", "false"]).default("true"),
  INFRA_DRY_RUN_DEFAULT: z.enum(["true", "false"]).default("true"),
  /** When true, AstraOps executor logs actions but does not call AWS/K8s */
  SIMULATION_MODE: z.enum(["true", "false"]).default("true"),
  /** Block executor if decision confidence is below this (0–1) */
  ASTRA_MIN_EXECUTOR_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.8),
  AWS_REGION: z.string().default(""),
  AWS_ACCESS_KEY_ID: z.string().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().default(""),
  /** When true with SIMULATION_MODE=false, AWS adapter scale/restart target ECS (below) before K8s bridge. */
  AWS_ECS_LIVE_EXECUTION: z.enum(["true", "false"]).default("false"),
  AWS_ECS_CLUSTER: z.string().default(""),
  AWS_ECS_SERVICE: z.string().default(""),
  /** Override AI target provider: aws | gcp | azure | kubernetes (empty = per-workload map) */
  ASTRA_DEFAULT_AI_PROVIDER: z.string().default(""),
  /**
   * Optional JSON object mapping workload/resource name → provider, e.g.
   * `{"payments-api":"aws","data-plane":"gcp","ml-batch":"azure"}`.
   * Merged over built-in demo map in `ai-target-provider.ts`.
   */
  MULTI_CLOUD_RESOURCE_MAP_JSON: z.string().default(""),
  ASTRA_K8S_NAMESPACE: z.string().default("default"),
  /** Deployment to scale/restart (e.g. payments-api) */
  ASTRA_K8S_DEPLOYMENT: z.string().default(""),
  /** Fixed replica count for scale_up; empty = current+1 */
  ASTRA_SCALE_UP_REPLICAS: z.string().default(""),
  /** Target replicas when action is optimize_cost */
  ASTRA_OPTIMIZE_COST_TARGET_REPLICAS: z.string().default("1"),
  ASTRA_EC2_INSTANCE_ID: z.string().default(""),
  /** When true, executor pauses at awaiting_approval until POST .../approve (skips for action "none") */
  ASTRA_APPROVAL_REQUIRED: z.enum(["true", "false"]).default("false"),
  /** When true, only owner/admin may approve or reject (operators cannot) */
  ASTRA_APPROVAL_ADMIN_ONLY: z.enum(["true", "false"]).default("false"),
  /** When true, viewers may list approvals and audit (default: auditors/operators/admins only) */
  ASTRA_VIEWER_CAN_READ_OPS: z.enum(["true", "false"]).default("false"),
  /** simulation | assisted | autonomous — overrides SIMULATION_MODE / ASTRA_APPROVAL_REQUIRED when set */
  ASTRA_AUTONOMY_MODE: z.string().default(""),
  /** Background OBSERVE→DETECT→enqueue pipeline */
  ASTRA_CONTROL_LOOP_ENABLED: z.enum(["true", "false"]).default("false"),
  ASTRA_CONTROL_LOOP_INTERVAL_MS: z.coerce.number().default(60_000),
  /** WebSocket AI stream: synthetic tick interval (ms) */
  AI_STREAM_INTERVAL_MS: z.coerce.number().default(3500),
  AI_STREAM_SYNTHETIC: z.enum(["true", "false"]).default("true"),
  AI_STREAM_USE_REDIS: z.enum(["true", "false"]).default("false"),
  AI_STREAM_PERSIST: z.enum(["true", "false"]).default("false"),
  AI_STREAM_PUBLISH_SYNTHETIC_TO_REDIS: z.enum(["true", "false"]).default("false"),
  /** Rule-based detect→decide→act→verify loop (replaces static demo text when true) */
  AI_DECISION_ENGINE: z.enum(["true", "false"]).default("true"),
  /** Persist AiDecisionRun rows for learning / audit */
  AI_DECISION_PERSIST: z.enum(["true", "false"]).default("true"),
  /** When true with SIMULATION_MODE=false, AI loop applies scale/restart to the cluster (see RBAC manifest) */
  AI_K8S_LIVE_EXECUTION: z.enum(["true", "false"]).default("false"),
  AI_K8S_MIN_REPLICAS: z.coerce.number().min(1).default(1),
  AI_K8S_ALLOW_SCALE_DOWN: z.enum(["true", "false"]).default("false"),
  AI_K8S_ALLOW_RESTART: z.enum(["true", "false"]).default("false"),
  /** Block live HIGH-risk actions unless explicitly approved (break-glass) */
  AI_K8S_REQUIRE_APPROVAL_HIGH_RISK: z.enum(["true", "false"]).default("true"),
  AI_K8S_HIGH_RISK_APPROVED: z.enum(["true", "false"]).default("false"),
  /**
   * When true with SIMULATION_MODE=false, AWS/GCP/Azure `scaleDeployment` / `restartService` call the
   * in-cluster Kubernetes API (same kubeconfig as AI_K8S_*). Use for EKS/GKE/AKS workloads.
   */
  CLOUD_ADAPTER_LIVE_K8S: z.enum(["true", "false"]).default("false"),
  /** Live mutations via cloud adapters (AWS/GCP/Azure); still requires SIMULATION_MODE=false */
  AI_CLOUD_LIVE_EXECUTION: z.enum(["true", "false"]).default("false"),
  AI_CLOUD_ALLOW_RESTART: z.enum(["true", "false"]).default("false"),
  AI_CLOUD_ALLOW_SCALE_DOWN: z.enum(["true", "false"]).default("false"),
  /** Persist ai_learning rows and use historical success in confidence / safety */
  AI_LEARNING_ENABLED: z.enum(["true", "false"]).default("true"),
  /** Minimum rolling success rate (0–1) before low-success guard can block */
  AI_LEARNING_MIN_SUCCESS_RATE: z.coerce.number().min(0).max(1).default(0.35),
  /** When true, block live execution if recent success rate for action+resource is below min */
  AI_LEARNING_LOW_SUCCESS_BLOCKS: z.enum(["true", "false"]).default("true"),
  /** Minimum past samples before applying learning to confidence */
  AI_LEARNING_MIN_SAMPLES: z.coerce.number().int().min(1).default(3),
  /** Bypass learning guard after human review */
  AI_LEARNING_APPROVED: z.enum(["true", "false"]).default("false"),
  /** Org id for server-side learning rows when no HTTP tenant context (AI stream / workers) */
  AI_LEARNING_ORG_ID: z.string().default("org-1"),
  /** Run AI ops continuous loop when API process starts (usually false in production; use external scheduler). */
  AI_OPS_LOOP_START_ON_BOOT: z.enum(["true", "false"]).default("false"),
  /** POST deploy-workflow events here when SIMULATION_MODE=false (CI/CD trigger). */
  CLOUD_DEPLOY_WEBHOOK_URL: z.string().default(""),
  CLOUD_DEPLOY_WEBHOOK_BEARER_TOKEN: z.string().default(""),
  /** AWS adapter: pull CPU from CloudWatch when dimensions JSON is set. */
  AWS_LIVE_ADAPTER_METRICS: z.enum(["true", "false"]).default("false"),
  AWS_CLOUDWATCH_NAMESPACE: z.string().default("AWS/EC2"),
  AWS_CLOUDWATCH_METRIC_NAME: z.string().default("CPUUtilization"),
  /** e.g. {"InstanceId":"i-0123456789abcdef0"} */
  AWS_CLOUDWATCH_DIMENSIONS_JSON: z.string().default(""),
  /** GCP adapter: pull CPU from Cloud Monitoring when filter + project are set (Application Default Credentials). */
  GCP_LIVE_ADAPTER_METRICS: z.enum(["true", "false"]).default("false"),
  /** Falls back to `GOOGLE_CLOUD_PROJECT` when empty. */
  GCP_PROJECT_ID: z.string().default(""),
  /**
   * Monitoring filter selecting one metric type, e.g.
   * `metric.type = "kubernetes.io/container/cpu/request_utilization" AND resource.labels.pod_name = "my-pod"`.
   */
  GCP_MONITORING_FILTER: z.string().default(""),
  /** Azure adapter: pull CPU from Azure Monitor Metrics (DefaultAzureCredential). */
  AZURE_LIVE_ADAPTER_METRICS: z.enum(["true", "false"]).default("false"),
  /** Full ARM resource ID, e.g. `/subscriptions/.../resourceGroups/.../providers/Microsoft.Compute/virtualMachines/vm1`. */
  AZURE_METRICS_RESOURCE_ID: z.string().default(""),
  /** Default suits VMs (`Percentage CPU`). Override for AKS nodes, App Service, etc. */
  AZURE_METRICS_NAME: z.string().default("Percentage CPU"),
  /** Optional metric namespace when querying non-default metrics. */
  AZURE_METRICS_NAMESPACE: z.string().default(""),
  /**
   * GET JSON used by the AI ops loop and cloud adapter `getMetrics` when set.
   * Shape: top-level `{ cpu, memory, cost }` or per-provider `{ "providers": { "aws"|"gcp"|"azure": { ... } } }`.
   */
  OPS_METRICS_URL: z.string().default(""),
  OPS_METRICS_BEARER_TOKEN: z.string().default(""),
  OPS_METRICS_TIMEOUT_MS: z.coerce.number().default(8000),
});

const parsedEnv = EnvSchema.parse(process.env);
process.env.DATABASE_URL = process.env.DATABASE_URL ?? parsedEnv.DATABASE_URL;
process.env.REDIS_URL = process.env.REDIS_URL ?? parsedEnv.REDIS_URL;
export const env = parsedEnv;

