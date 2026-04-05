import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Cloud,
  Copy,
  Eye,
  Gauge,
  Layers3,
  Loader2,
  Lock,
  Rocket,
  Shield,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import {
  connectCloud,
  createEnvironment,
  createOrganization,
  createProject,
  discoverCloudInfra,
  testCloudConnection,
  updateEnvironmentPolicy,
  type AllowedActionKind,
  type ApprovalScope,
  type AuthMethod,
  type AutonomyMode,
  type BlastRadiusScope,
  type CloudDiscovery,
  type CloudProvider,
  type CloudTestResult,
  type EnvironmentTier,
} from "@/lib/launch";
import { setDemoModeEnabled } from "@/lib/demo-mode";
import { ApiClientError, clearStoredApiSession } from "@/lib/api";
import { useContextStore } from "@/store/context";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type WizardStep = 1 | 2 | 3 | 4;

const NON_DESTRUCTIVE_ACTIONS: { id: AllowedActionKind; label: string }[] = [
  { id: "scale", label: "Scale workloads" },
  { id: "restart", label: "Restart services" },
  { id: "optimize", label: "Cost optimization" },
];
const DESTRUCTIVE_ACTIONS: { id: AllowedActionKind; label: string }[] = [
  { id: "deploy", label: "Deploy / rollouts" },
  { id: "rollback", label: "Rollback releases" },
];

function tierFromAutonomy(mode: AutonomyMode): EnvironmentTier {
  if (mode === "simulation") return "dev";
  if (mode === "assisted") return "staging";
  return "prod";
}

function blastLevelFromScope(scope: BlastRadiusScope): "low" | "medium" | "high" {
  if (scope === "service") return "low";
  if (scope === "namespace") return "medium";
  return "high";
}

const ACTIVATION_STEPS = [
  "Register workspace & environment",
  "Apply AI guardrails & policy",
  "Link control plane",
  "Enable Zorvexa AI Control",
] as const;

function formatActivationError(e: unknown): string {
  if (e instanceof ApiClientError) {
    const d = e.details as { error?: string; hint?: string; details?: string } | undefined;
    const m = e.message ?? "";
    const st = e.status;

    // Do not match bare "5002" — it appears in appended help text and caused false "unreachable" for real server errors.
    // Do not use status 502/503/504 alone — the API may return those with JSON { error, hint } (e.g. DB unavailable).
    const connectivityFailure =
      /Backend API is not running on port 5002/i.test(m) ||
      /Cannot reach the API \(backend not running/i.test(m) ||
      /ECONNREFUSED|connect ECONNREFUSED|proxy error|http proxy error/i.test(m) ||
      (!st && /Network Error/i.test(m));

    if (connectivityFailure) {
      return "API unreachable — start the backend on port 5002. From the repo root run: npm run dev (starts API + UI). If you only need the UI: npm run dev:web plus npm run dev:api in another terminal. Then retry activation.";
    }
    if (d?.hint) return `${d.error ?? m} — ${d.hint}`;
    if (d?.error) return d.details ? `${d.error} (${d.details})` : d.error;
    return m || "Activation failed";
  }
  return e instanceof Error ? e.message : "Activation failed";
}

type ActivationPhase = "idle" | "loading" | "success" | "error";
type AiSurfacePhase = "observing" | "acting";

const defaultAwsRoleArn = "arn:aws:iam::123456789012:role/zorvexa-autonomous";

/** Example trust policy — attach to your IAM role; replace Principal with Zorvexa AWS account from onboarding docs. */
const AWS_TRUST_POLICY_JSON = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowZorvexaAssumeRole",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111122223333:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "your-external-id-if-required"
        }
      }
    }
  ]
}`;

const ORG_SUGGESTIONS = [
  { label: "Acme Corp", value: "acme-corp" },
  { label: "Stripe", value: "stripe" },
  { label: "Netflix", value: "netflix" },
] as const;

const PROJECT_SUGGESTIONS = [
  { label: "Payments Platform", value: "payments-platform" },
  { label: "Checkout API", value: "checkout-api" },
  { label: "User Service", value: "user-service" },
] as const;

const ENVIRONMENT_OPTIONS = ["production", "staging", "dev", "prod-us-east-1", "prod-eu-west-1"] as const;
type EnvironmentOption = (typeof ENVIRONMENT_OPTIONS)[number];

const DEMO_WORKSPACE = {
  org: "acme-corp",
  project: "payments-platform",
  env: "staging" as EnvironmentOption,
};

/** Lowercase, spaces → hyphens, strip invalid slug chars. */
function normalizeWorkspaceSegment(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type FieldStatus = "idle" | "valid" | "warning" | "error";

function WorkspaceHint({ status, message }: { status: FieldStatus; message?: string }) {
  if (!message) return null;
  if (status === "idle") return <p className="text-xs mt-1.5 text-white/45 leading-snug">{message}</p>;
  return (
    <p
      className={cn(
        "text-xs mt-1.5 flex items-start gap-1.5 leading-snug",
        status === "valid" && "text-emerald-400/95",
        status === "warning" && "text-amber-300/95",
        status === "error" && "text-red-400/95"
      )}
    >
      {status === "valid" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />}
      {status === "warning" && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />}
      {status === "error" && <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />}
      <span>{message}</span>
    </p>
  );
}

function authMethodForProvider(p: CloudProvider): AuthMethod {
  if (p === "aws") return "iam_role";
  if (p === "gcp") return "gcp_sa";
  return "azure_sp";
}

const LaunchSetup = () => {
  const [step, setStep] = useState<WizardStep>(1);
  const [orgName, setOrgName] = useState("acme-corp");
  const [projectName, setProjectName] = useState("payments-platform");
  const [envName, setEnvName] = useState<EnvironmentOption>("prod-eu-west-1");

  const [provider, setProvider] = useState<CloudProvider>("aws");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("iam_role");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [roleArn, setRoleArn] = useState(defaultAwsRoleArn);
  const [externalId, setExternalId] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [gcpSaJson, setGcpSaJson] = useState('{"type":"service_account","project_id":"demo-project"}');
  const [azureTenantId, setAzureTenantId] = useState("");
  const [azureClientId, setAzureClientId] = useState("");
  const [azureClientSecret, setAzureClientSecret] = useState("");
  const [azureSubscriptionId, setAzureSubscriptionId] = useState("");

  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [lastTest, setLastTest] = useState<CloudTestResult | null>(null);
  const [lastCloudHttpStatus, setLastCloudHttpStatus] = useState<number | null>(null);
  const [discovery, setDiscovery] = useState<CloudDiscovery | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [connectionSaved, setConnectionSaved] = useState(false);

  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>("assisted");
  const [approvalScope, setApprovalScope] = useState<ApprovalScope>("medium_risk");
  const [blastRadiusScope, setBlastRadiusScope] = useState<BlastRadiusScope>("namespace");
  const [allowedActions, setAllowedActions] = useState<Set<AllowedActionKind>>(
    () => new Set<AllowedActionKind>(["scale", "restart", "optimize"])
  );
  const [allowDestructiveActions, setAllowDestructiveActions] = useState(false);
  const [monthlyBudgetUsd, setMonthlyBudgetUsd] = useState(6000);
  const [maxActionsPerHour, setMaxActionsPerHour] = useState(40);
  const [autoRollback, setAutoRollback] = useState(true);
  const [rollbackOnPerformanceDegradation, setRollbackOnPerformanceDegradation] = useState(true);
  const [pauseAutomationWhenBudgetExceeded, setPauseAutomationWhenBudgetExceeded] = useState(true);
  const [minConfidenceToAutoExecute, setMinConfidenceToAutoExecute] = useState(85);

  const [busy, setBusy] = useState(false);
  /** Dev-only: /health is proxied by Vite to the Fastify backend (port 5002). */
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);

  /** Ensure API calls in this wizard always send org/project/env (Launch runs before activation creates DB rows). */
  useEffect(() => {
    const s = useContextStore.getState();
    if (!s.orgId?.trim() || !s.projectId?.trim() || !s.envId?.trim()) {
      s.setContext({ orgId: "org-1", projectId: "proj-1", envId: "env-prod" });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        const r = await fetch("/health", { method: "GET", cache: "no-store" });
        if (!cancelled) setApiReachable(r.ok);
      } catch {
        if (!cancelled) setApiReachable(false);
      }
    };
    void ping();
    const id = window.setInterval(() => void ping(), 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);
  const [result, setResult] = useState<string[]>([]);
  const [activateOpen, setActivateOpen] = useState(false);
  const navigate = useNavigate();
  const [activationPhase, setActivationPhase] = useState<ActivationPhase>("idle");
  const [activationStep, setActivationStep] = useState(0);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [aiSurfacePhase, setAiSurfacePhase] = useState<AiSurfacePhase>("observing");
  const [persistedAiControl, setPersistedAiControl] = useState<{ active: boolean; autonomyMode?: AutonomyMode } | null>(null);
  const activationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (activationIntervalRef.current) clearInterval(activationIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("astraops_ai_control");
      if (!raw) return;
      const j = JSON.parse(raw) as {
        active?: boolean;
        autonomyMode?: AutonomyMode;
        surfacePhase?: AiSurfacePhase;
      };
      if (j.active) {
        setPersistedAiControl({ active: true, autonomyMode: j.autonomyMode });
        if (j.surfacePhase === "acting" || j.surfacePhase === "observing") setAiSurfacePhase(j.surfacePhase);
      }
    } catch {
      // ignore
    }
  }, []);

  const progress = useMemo(() => (step / 4) * 100, [step]);

  const workspacePreviewLine = useMemo(() => `${orgName} / ${projectName} / ${envName}`, [orgName, projectName, envName]);

  const orgField = useMemo((): { status: FieldStatus; message?: string } => {
    const v = orgName.trim();
    if (!v) return { status: "idle", message: "Required — min 2 characters" };
    if (v.length < 2) return { status: "error", message: "Use at least 2 characters" };
    if (v.length <= 3) return { status: "warning", message: "Short slug — confirm uniqueness" };
    return { status: "valid", message: "Valid organization slug" };
  }, [orgName]);

  const projectField = useMemo((): { status: FieldStatus; message?: string } => {
    const v = projectName.trim();
    if (!v) return { status: "idle", message: "Required — spaces become hyphens automatically" };
    if (v.includes(" ")) return { status: "error", message: "Spaces not allowed — use hyphens" };
    if (v.length < 2) return { status: "error", message: "Use at least 2 characters" };
    if (v.length <= 3) return { status: "warning", message: "Short name — confirm scope" };
    return { status: "valid", message: "Valid project slug" };
  }, [projectName]);

  const envField = useMemo((): { status: FieldStatus; message?: string } => {
    const ok = (ENVIRONMENT_OPTIONS as readonly string[]).includes(envName);
    if (!ok) return { status: "error", message: "Choose an environment from the list" };
    return { status: "valid", message: "Allowed environment" };
  }, [envName]);

  const safeAutonomousReady = useMemo(() => {
    return (
      autonomyMode === "assisted" &&
      !allowDestructiveActions &&
      pauseAutomationWhenBudgetExceeded &&
      minConfidenceToAutoExecute >= 75 &&
      blastRadiusScope !== "cluster"
    );
  }, [autonomyMode, allowDestructiveActions, pauseAutomationWhenBudgetExceeded, minConfidenceToAutoExecute, blastRadiusScope]);

  const buildCredentialsPayload = useCallback((): Record<string, string | undefined> => {
    if (provider === "aws") {
      if (authMethod === "iam_role") {
        return { roleArn: roleArn.trim(), externalId: externalId.trim() || undefined, region: awsRegion.trim() || undefined };
      }
      return {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        region: awsRegion.trim() || undefined,
      };
    }
    if (provider === "gcp") return { serviceAccountJson: gcpSaJson };
    return {
      tenantId: azureTenantId.trim(),
      clientId: azureClientId.trim(),
      clientSecret: azureClientSecret.trim(),
      subscriptionId: azureSubscriptionId.trim(),
    };
  }, [
    provider,
    authMethod,
    roleArn,
    externalId,
    awsRegion,
    accessKeyId,
    secretAccessKey,
    gcpSaJson,
    azureTenantId,
    azureClientId,
    azureClientSecret,
    azureSubscriptionId,
  ]);

  const buildConnectCredentials = useCallback((): Record<string, string | undefined> => {
    const raw = buildCredentialsPayload();
    const out: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v !== undefined && v !== "") out[k] = v;
    }
    return out;
  }, [buildCredentialsPayload]);

  const selectProvider = (p: CloudProvider) => {
    setProvider(p);
    setAuthMethod(authMethodForProvider(p));
    setTestStatus("idle");
    setLastTest(null);
    setDiscovery(null);
    setConnectionSaved(false);
    if (p === "aws") setRoleArn(defaultAwsRoleArn);
  };

  const onTestConnection = async () => {
    setTestStatus("testing");
    setLastTest(null);
    setLastCloudHttpStatus(null);
    try {
      const { result: res } = await testCloudConnection({
        provider,
        authMethod,
        credentials: buildCredentialsPayload(),
      });
      setLastTest(res);
      if (res.ok) {
        setTestStatus("success");
        toast.success("Connection test passed");
        setDiscovering(true);
        try {
          const { discovery: d } = await discoverCloudInfra(provider, awsRegion);
          setDiscovery(d);
          try {
            localStorage.setItem(
              "zorvexa_connected_infra",
              JSON.stringify({ provider: provider.toUpperCase(), region: awsRegion, accountId: d.accountId })
            );
          } catch {
            // ignore
          }
        } catch {
          toast.error("Discovery could not complete — use Discover infrastructure to retry.");
        } finally {
          setDiscovering(false);
        }
      } else {
        setTestStatus("failed");
        toast.error(res.message);
      }
    } catch (e) {
      setTestStatus("failed");
      const httpStatus = e instanceof ApiClientError ? e.status : undefined;
      setLastCloudHttpStatus(httpStatus ?? null);
      setLastTest({ ok: false, message: e instanceof Error ? e.message : "Request failed" });
      toast.error(e instanceof Error ? e.message : "Connection test failed");
    }
  };

  const onDiscover = async () => {
    if (testStatus !== "success") return;
    setDiscovering(true);
    try {
      const { discovery: d } = await discoverCloudInfra(provider, awsRegion);
      setDiscovery(d);
      try {
        localStorage.setItem(
          "zorvexa_connected_infra",
          JSON.stringify({ provider: provider.toUpperCase(), region: awsRegion, accountId: d.accountId })
        );
      } catch {
        // ignore
      }
      toast.success("Infrastructure scan complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  };

  const saveCloudConnection = async () => {
    if (testStatus !== "success") return;
    setBusy(true);
    try {
      await connectCloud(provider, `${provider.toUpperCase()} · ${envName}`, buildConnectCredentials());
      setConnectionSaved(true);
      toast.success("Connection registered (credentials not stored server-side in this build)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not register connection");
    } finally {
      setBusy(false);
    }
  };

  const readiness = useMemo(() => {
    if (testStatus === "idle") return "partial" as const;
    if (testStatus === "failed" || (lastTest && !lastTest.ok)) return "failed" as const;
    if (testStatus !== "success" || !lastTest?.ok) return "partial" as const;
    if (!discovery) return "partial" as const;
    const ratio = discovery.nodes.total ? discovery.nodes.ready / discovery.nodes.total : 0;
    if (discovery.clusters.length === 0 || ratio < 0.85) return "partial" as const;
    return "ready" as const;
  }, [provider, testStatus, lastTest, discovery]);

  const checklist = useMemo(() => {
    const useIam = provider === "aws" && authMethod === "iam_role";
    const approvalOk = approvalScope === "all_actions" || approvalScope === "medium_risk";
    return [
      { ok: testStatus === "success", label: "Cloud connectivity verified" },
      { ok: Boolean(discovery?.clusters.length), label: "Clusters & services discovered" },
      { ok: useIam, label: "IAM Role preferred (least privilege, no long-lived keys)" },
      { ok: approvalOk || autonomyMode === "simulation", label: "Approval policy in place" },
      { ok: monthlyBudgetUsd > 0 && pauseAutomationWhenBudgetExceeded, label: "Budget guardrails configured" },
    ];
  }, [
    testStatus,
    discovery,
    provider,
    authMethod,
    approvalScope,
    autonomyMode,
    monthlyBudgetUsd,
    pauseAutomationWhenBudgetExceeded,
  ]);

  const cloudAccountLabel = useMemo(
    () => lastTest?.accountId ?? discovery?.accountId ?? null,
    [lastTest, discovery]
  );

  const cloudRegionLabel = useMemo(() => {
    if (lastTest?.regions?.length) return lastTest.regions.join(", ");
    if (awsRegion.trim()) return awsRegion.trim();
    return null;
  }, [lastTest, awsRegion]);

  const authLabel = useMemo(() => {
    if (provider === "aws") return authMethod === "iam_role" ? "IAM Role" : "Access keys";
    if (provider === "gcp") return "Service account";
    return "Service principal";
  }, [provider, authMethod]);

  const guardrailsSummaryLines = useMemo(
    () => [
      { k: "Autonomy", v: autonomyMode },
      { k: "Approvals", v: approvalScope.replace(/_/g, " ") },
      { k: "Blast radius", v: blastRadiusScope },
      { k: "Rate limit", v: `${maxActionsPerHour}/hr` },
      { k: "Budget", v: `$${monthlyBudgetUsd}/mo` },
      { k: "Min confidence", v: `${minConfidenceToAutoExecute}%` },
      { k: "Destructive", v: allowDestructiveActions ? "allowed" : "off" },
    ],
    [
      autonomyMode,
      approvalScope,
      blastRadiusScope,
      maxActionsPerHour,
      monthlyBudgetUsd,
      minConfidenceToAutoExecute,
      allowDestructiveActions,
    ]
  );

  const canContinueStep1 =
    orgField.status !== "error" &&
    projectField.status !== "error" &&
    envField.status !== "error" &&
    orgName.trim().length >= 2 &&
    projectName.trim().length >= 2 &&
    (ENVIRONMENT_OPTIONS as readonly string[]).includes(envName);
  const canContinueStep2 = testStatus === "success" && discovery !== null;
  const canContinueStep3 =
    allowedActions.size > 0 &&
    monthlyBudgetUsd > 0 &&
    maxActionsPerHour > 0 &&
    minConfidenceToAutoExecute >= 50 &&
    minConfidenceToAutoExecute <= 100;

  const riskLevel = useMemo(() => {
    if (autonomyMode === "simulation") {
      return { label: "Low", detail: "Simulation only — no mutating changes are executed against production." };
    }
    if (approvalScope === "all_actions") {
      return { label: "Controlled", detail: "Every mutating action requires explicit approval before execution." };
    }
    if (blastRadiusScope === "cluster" && autonomyMode === "autonomous") {
      return { label: "High", detail: "Cluster-wide impact with autonomous execution — ensure observability and rollback." };
    }
    if (autonomyMode === "autonomous") {
      return { label: "High", detail: "Autonomous execution within allowed actions and confidence threshold." };
    }
    return {
      label: "Moderate",
      detail: "Assisted mode with policy gates — AI proposes changes; approvals depend on risk class.",
    };
  }, [autonomyMode, approvalScope, blastRadiusScope]);

  const simulationPreview = useMemo(() => {
    const clusters = discovery?.clusters.length ?? 0;
    const svc = discovery?.services.length ?? 0;
    const estActions = Math.min(maxActionsPerHour, Math.max(4, clusters * 6 + svc * 2));
    const costLabel =
      autonomyMode === "simulation"
        ? "No live spend (simulation only)"
        : "~4–12% optimization potential (modelled from your discovery)";
    const perfLabel =
      autonomyMode === "simulation"
        ? "Zero production impact — observe-only"
        : "p95 & SLO protected by your confidence & rollback guardrails";
    return { estActions, costLabel, perfLabel };
  }, [discovery, maxActionsPerHour, autonomyMode]);

  const autonomyModeLabel = useMemo(() => {
    if (autonomyMode === "simulation") return "Simulation";
    if (autonomyMode === "assisted") return "Assisted";
    return "Autonomous";
  }, [autonomyMode]);

  const cloudConnectionSummary = useMemo(() => {
    if (testStatus === "failed") return "Connection failed — fix credentials and re-test";
    if (testStatus !== "success") return "Not verified — complete Step 2";
    if (!connectionSaved) return "Verified — you can register the connection (optional)";
    return "Connected & registered";
  }, [testStatus, connectionSaved]);

  const discoverySummary = useMemo(() => {
    if (!discovery) return "No discovery yet — run Test & Discover in Step 2";
    return `${discovery.clusters.length} clusters · ${discovery.services.length} services · ${discovery.nodes.ready}/${discovery.nodes.total} nodes ready`;
  }, [discovery]);

  const estimatedActionBullets = useMemo(() => {
    const out: string[] = [];
    if (allowedActions.has("scale")) out.push("Evaluate scale & capacity signals");
    if (allowedActions.has("restart")) out.push("Safe restarts within blast radius");
    if (allowedActions.has("optimize")) out.push("Cost & utilization optimizations");
    if (allowedActions.has("deploy")) out.push("Controlled rollouts (if enabled)");
    if (allowedActions.has("rollback")) out.push("Rollback paths when guardrails trip");
    if (out.length === 0) out.push("Policy registration only — enable actions in Step 3");
    return out.slice(0, 8);
  }, [allowedActions]);

  const canEnableAiControl = canContinueStep2 && canContinueStep3;

  const executeActivation = async (): Promise<{ orgId: string; projectId: string; envId: string }> => {
    const effectiveAllowed = Array.from(allowedActions).filter((a) => {
      if (a === "deploy" || a === "rollback") return allowDestructiveActions;
      return true;
    });
    if (effectiveAllowed.length === 0) {
      throw new Error("Select at least one allowed action");
    }

    const org = await createOrganization(orgName);
    const project = await createProject(org.organization.id, projectName);
    const environment = await createEnvironment(project.project.id, envName);
    // Policy PUT is scoped by x-org-id / x-project-id / x-env-id — must match the workspace we just created (see api.ts getContextHeaders).
    useContextStore.getState().setContext({
      orgId: org.organization.id,
      projectId: project.project.id,
      envId: environment.environment.id,
    });
    const savedPolicy = await updateEnvironmentPolicy({
      tier: tierFromAutonomy(autonomyMode),
      autonomyMode,
      approvalScope,
      approvalRequired: approvalScope === "medium_risk" || approvalScope === "all_actions",
      maxActionsPerHour,
      monthlyBudgetUsd,
      blastRadiusScope,
      blastRadius: blastLevelFromScope(blastRadiusScope),
      sloAvailabilityTarget: autonomyMode === "autonomous" ? 99.95 : 99.5,
      autoRollback,
      rollbackOnPerformanceDegradation,
      pauseAutomationWhenBudgetExceeded,
      minConfidenceToAutoExecute,
      allowDestructiveActions,
      allowedActionKinds: effectiveAllowed,
      complianceTags: ["launch-setup", autonomyMode, approvalScope],
    });
    setResult([
      `Organization: ${org.organization.name}`,
      `Project: ${project.project.name}`,
      `Environment: ${environment.environment.name}`,
      `Cloud: ${provider.toUpperCase()} · connection registered`,
      discovery
        ? `Discovery: ${discovery.clusters.length} clusters · ${discovery.services.length} services · ${discovery.nodes.ready}/${discovery.nodes.total} nodes ready`
        : "Discovery: —",
      `Autonomy: ${savedPolicy.policy.autonomyMode} · approval scope: ${savedPolicy.policy.approvalScope} · blast: ${savedPolicy.policy.blastRadiusScope}`,
      `Guardrails: confidence ≥${savedPolicy.policy.minConfidenceToAutoExecute}% · rollback=${savedPolicy.policy.autoRollback ? "on" : "off"} · perf rollback=${savedPolicy.policy.rollbackOnPerformanceDegradation ? "on" : "off"} · budget pause=${savedPolicy.policy.pauseAutomationWhenBudgetExceeded ? "on" : "off"} · $${savedPolicy.policy.monthlyBudgetUsd}/mo`,
      `Allowed actions: ${savedPolicy.policy.allowedActionKinds.join(", ")}`,
    ]);

    return {
      orgId: org.organization.id,
      projectId: project.project.id,
      envId: environment.environment.id,
    };
  };

  const handleConfirmActivation = async () => {
    setActivateOpen(false);
    setActivationError(null);
    setActivationPhase("loading");
    setActivationStep(0);
    setBusy(true);
    setAiSurfacePhase(autonomyMode === "autonomous" ? "acting" : "observing");
    if (activationIntervalRef.current) clearInterval(activationIntervalRef.current);
    activationIntervalRef.current = setInterval(() => {
      setActivationStep((s) => Math.min(s + 1, ACTIVATION_STEPS.length - 1));
    }, 520);
    try {
      const workspaceIds = await executeActivation();
      useContextStore.getState().setContext({
        orgId: workspaceIds.orgId,
        projectId: workspaceIds.projectId,
        envId: workspaceIds.envId,
      });
      if (activationIntervalRef.current) {
        clearInterval(activationIntervalRef.current);
        activationIntervalRef.current = null;
      }
      setActivationStep(ACTIVATION_STEPS.length);
      setActivationPhase("success");
      const surface: AiSurfacePhase = autonomyMode === "autonomous" ? "acting" : "observing";
      setAiSurfacePhase(surface);
      try {
        localStorage.setItem(
          "astraops_ai_control",
          JSON.stringify({
            active: true,
            autonomyMode,
            surfacePhase: surface,
            activatedAt: new Date().toISOString(),
            orgId: workspaceIds.orgId,
            projectId: workspaceIds.projectId,
            envId: workspaceIds.envId,
          })
        );
        setPersistedAiControl({ active: true, autonomyMode });
      } catch {
        // ignore
      }
      toast.success("Zorvexa AI Control is live");
      window.setTimeout(() => {
        const q = new URLSearchParams({
          tab: "hybrid-control",
          aiActive: "1",
          launchOrg: workspaceIds.orgId,
          launchProject: workspaceIds.projectId,
          launchEnv: workspaceIds.envId,
        });
        navigate(`/dashboard?${q.toString()}`);
      }, 2400);
    } catch (e) {
      if (activationIntervalRef.current) {
        clearInterval(activationIntervalRef.current);
        activationIntervalRef.current = null;
      }
      const msg = formatActivationError(e);
      setActivationError(msg);
      setActivationPhase("error");
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1020] text-white p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition-all duration-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Launch Mode Setup</h1>
          <p className="mt-2 text-sm text-white/60">
            Enterprise onboarding — secure cloud linking, discovery, and guarded autonomy.
          </p>
          <div className="mt-4">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 grid grid-cols-4 text-[11px] text-white/60 gap-1">
              <span className={step === 1 ? "text-white" : ""}>1. Workspace</span>
              <span className={step === 2 ? "text-white" : ""}>2. Cloud</span>
              <span className={step === 3 ? "text-white" : ""}>3. Guardrails</span>
              <span className={step === 4 ? "text-white" : ""}>4. Activate</span>
            </div>
          </div>
        </div>

        {apiReachable === false ? (
          <div
            className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-50/95"
            role="status"
          >
            <p className="font-medium text-amber-100">Backend API is not reachable</p>
            <p className="mt-1 text-[13px] text-amber-100/85 leading-relaxed">
              Cloud Connect and other steps need the API on{" "}
              <code className="rounded bg-black/30 px-1 py-0.5 text-xs">127.0.0.1:5002</code>. From the repo root run{" "}
              <code className="rounded bg-black/30 px-1 py-0.5 text-xs">npm run dev</code> (API + UI) — or{" "}
              <code className="rounded bg-black/30 px-1 py-0.5 text-xs">npm run dev:api</code> — then retry Test
              connection.
            </p>
          </div>
        ) : null}

        {activationPhase === "error" || (activationPhase === "idle" && persistedAiControl?.active) ? (
          <div
            data-testid="global-ai-status-bar"
            className={cn(
              "rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors",
              activationPhase === "error" && "border-red-500/40 bg-red-950/30",
              activationPhase === "idle" && persistedAiControl?.active && "border-emerald-500/30 bg-emerald-950/25"
            )}
          >
            <div className="flex items-start gap-3 min-w-0">
              {activationPhase === "error" ? (
                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <Activity className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {activationPhase === "error" ? "Activation did not complete" : "AI Active"}
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  {activationPhase === "error" ? (
                    <>
                      {activationError ?? "Unknown error"}
                      <span className="block mt-1 text-white/45">
                        Check network access to the API, confirm allowed actions in Step 3, then retry. Cloud registration must
                        succeed before activation.
                      </span>
                    </>
                  ) : (
                    <>
                      {persistedAiControl?.autonomyMode === "autonomous" ? "Acting" : "Observing"} ·{" "}
                      {persistedAiControl?.autonomyMode === "simulation"
                        ? "Simulation"
                        : persistedAiControl?.autonomyMode === "assisted"
                          ? "Assisted"
                          : persistedAiControl?.autonomyMode === "autonomous"
                            ? "Autonomous"
                            : autonomyModeLabel}
                    </>
                  )}
                </p>
              </div>
            </div>
            {activationPhase === "error" ? (
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActivationPhase("idle");
                    setActivationError(null);
                  }}
                  className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white/90 hover:bg-white/10"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => setActivateOpen(true)}
                  className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-xs font-semibold text-white"
                >
                  Review & retry
                </button>
              </div>
            ) : (
              <Link
                to="/dashboard?tab=hybrid-control"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/25 shrink-0 text-center"
              >
                Open Control Plane
              </Link>
            )}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-6 space-y-4">
            {step === 1 ? (
              <>
                <div className="inline-flex items-center gap-2 text-blue-300">
                  <Layers3 className="w-4 h-4" /> Step 1 · Workspace
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Slugs normalize as you type: lowercase, spaces become hyphens (e.g.{" "}
                  <span className="text-white/65">Payments API</span> →{" "}
                  <span className="font-mono text-white/80">payments-api</span>).
                </p>

                <div
                  data-testid="workspace-preview"
                  className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 font-mono text-[13px] text-emerald-200/95 tracking-tight"
                >
                  {workspacePreviewLine}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="org-input" className="text-xs text-white/55">
                    Organization
                  </Label>
                  <input
                    id="org-input"
                    data-testid="org-input"
                    autoComplete="organization"
                    spellCheck={false}
                    className={cn(
                      "w-full rounded-xl bg-black/30 border px-3 py-2 text-sm text-white font-mono placeholder:text-white/35 focus:outline-none focus:ring-1 transition-colors",
                      orgField.status === "error" && "border-red-400/50 focus:ring-red-400/40",
                      orgField.status === "warning" && "border-amber-400/35 focus:ring-amber-400/30",
                      orgField.status === "valid" && "border-emerald-500/35 focus:ring-emerald-500/30",
                      orgField.status === "idle" && "border-white/15 focus:ring-white/20"
                    )}
                    value={orgName}
                    onChange={(e) => setOrgName(normalizeWorkspaceSegment(e.target.value))}
                    placeholder="acme-corp"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ORG_SUGGESTIONS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setOrgName(s.value)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70 hover:bg-white/10 hover:text-white/90 transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <WorkspaceHint status={orgField.status} message={orgField.message} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="project-input" className="text-xs text-white/55">
                    Project
                  </Label>
                  <input
                    id="project-input"
                    data-testid="project-input"
                    autoComplete="off"
                    spellCheck={false}
                    className={cn(
                      "w-full rounded-xl bg-black/30 border px-3 py-2 text-sm text-white font-mono placeholder:text-white/35 focus:outline-none focus:ring-1 transition-colors",
                      projectField.status === "error" && "border-red-400/50 focus:ring-red-400/40",
                      projectField.status === "warning" && "border-amber-400/35 focus:ring-amber-400/30",
                      projectField.status === "valid" && "border-emerald-500/35 focus:ring-emerald-500/30",
                      projectField.status === "idle" && "border-white/15 focus:ring-white/20"
                    )}
                    value={projectName}
                    onChange={(e) => setProjectName(normalizeWorkspaceSegment(e.target.value))}
                    placeholder="payments-platform"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {PROJECT_SUGGESTIONS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setProjectName(s.value)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70 hover:bg-white/10 hover:text-white/90 transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <WorkspaceHint status={projectField.status} message={projectField.message} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="env-select" className="text-xs text-white/55">
                    Environment
                  </Label>
                  <Select
                    value={envName}
                    onValueChange={(v) => setEnvName(v as EnvironmentOption)}
                  >
                    <SelectTrigger
                      id="env-select"
                      data-testid="env-select"
                      className={cn(
                        "w-full rounded-xl bg-black/30 border font-mono text-sm h-10 text-white focus:ring-1",
                        envField.status === "valid" && "border-emerald-500/35 focus:ring-emerald-500/30",
                        envField.status === "error" && "border-red-400/50"
                      )}
                    >
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141a2e] border-white/15 text-white">
                      {ENVIRONMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt} className="font-mono text-sm focus:bg-white/10">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <WorkspaceHint status={envField.status} message={envField.message} />
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5 transition-all duration-300 ease-out">
                <div className="inline-flex items-center gap-2 text-violet-300">
                  <Cloud className="w-4 h-4" /> Step 2 · Cloud Connect
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Link your cloud account with least-privilege access. Defaults to <span className="text-white/70">AWS</span>{" "}
                  and <span className="text-white/70">IAM Role</span> (recommended).
                </p>

                <div>
                  <p className="text-xs text-white/50 mb-2">Cloud provider</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(["aws", "gcp", "azure"] as CloudProvider[]).map((p) => (
                      <button
                        data-testid={`connect-${p}`}
                        key={p}
                        type="button"
                        disabled={busy}
                        onClick={() => selectProvider(p)}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-sm text-left transition-all duration-200 ease-out",
                          provider === p
                            ? "border-violet-300/50 bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/30 shadow-[0_0_20px_-8px_rgba(139,92,246,0.5)]"
                            : "border-white/15 bg-black/20 text-white/85 hover:bg-white/10 hover:border-white/25"
                        )}
                      >
                        <span className="font-semibold flex items-center gap-2">
                          {p.toUpperCase()}
                          {p === "aws" ? (
                            <span className="text-[10px] font-normal uppercase tracking-wide text-emerald-300/90">Default</span>
                          ) : null}
                        </span>
                        <span className="block text-[11px] text-white/55 mt-1">
                          {p === "aws" ? "EKS, EC2, IAM" : p === "gcp" ? "GKE, IAM" : "AKS, Entra ID"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {provider === "aws" ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-white/50 mb-2">Authentication</p>
                      <div className="inline-flex rounded-xl border border-white/10 bg-black/25 p-0.5 gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMethod("iam_role");
                            setTestStatus("idle");
                            setLastTest(null);
                          }}
                          className={cn(
                            "rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200",
                            authMethod === "iam_role"
                              ? "bg-emerald-500/20 text-emerald-100 shadow-sm"
                              : "text-white/60 hover:text-white/90"
                          )}
                        >
                          IAM Role (recommended)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMethod("access_keys");
                            setTestStatus("idle");
                            setLastTest(null);
                          }}
                          className={cn(
                            "rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200",
                            authMethod === "access_keys"
                              ? "bg-amber-500/20 text-amber-100 shadow-sm"
                              : "text-white/60 hover:text-white/90"
                          )}
                        >
                          Access key (advanced)
                        </button>
                      </div>
                    </div>

                    {authMethod === "iam_role" ? (
                      <div className="space-y-3 animate-in fade-in duration-300">
                        <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-white/[0.03]">
                            <span className="text-xs font-medium text-white/75">Trust policy (JSON)</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 border-white/15 bg-white/5 text-white text-xs hover:bg-white/10"
                              onClick={() => {
                                void navigator.clipboard
                                  .writeText(AWS_TRUST_POLICY_JSON)
                                  .then(() => toast.success("Policy JSON copied"))
                                  .catch(() => toast.error("Could not copy"));
                              }}
                            >
                              <Copy className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                              Copy
                            </Button>
                          </div>
                          <pre className="text-[11px] leading-relaxed font-mono text-white/80 p-3 max-h-40 overflow-auto whitespace-pre-wrap">
                            {AWS_TRUST_POLICY_JSON}
                          </pre>
                          <p className="text-[10px] text-white/45 px-3 pb-2">
                            Attach to your role’s trust relationship. Replace Principal with the Zorvexa AWS account from your
                            onboarding email.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label className="text-xs text-white/55">Default region</Label>
                            <input
                              className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm font-mono text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition-shadow"
                              value={awsRegion}
                              onChange={(e) => setAwsRegion(e.target.value)}
                              placeholder="us-east-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-white/55">IAM Role ARN</Label>
                          <input
                            data-testid="role-arn-input"
                            className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm font-mono text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition-shadow"
                            value={roleArn}
                            onChange={(e) => setRoleArn(e.target.value)}
                            placeholder="arn:aws:iam::123456789012:role/ZorvexaIntegration"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-white/55">External ID (optional)</Label>
                          <input
                            className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition-shadow"
                            value={externalId}
                            onChange={(e) => setExternalId(e.target.value)}
                            placeholder="Cross-account trust — if your policy requires it"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 animate-in fade-in duration-300">
                        <Alert className="border-amber-400/35 bg-amber-500/[0.08] text-amber-100/95 [&>svg]:text-amber-400">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle className="text-sm">Advanced: long-lived access keys</AlertTitle>
                          <AlertDescription className="text-xs text-amber-100/75">
                            Keys do not expire automatically. Rotate regularly, scope to least privilege, and prefer IAM Role for
                            production.
                          </AlertDescription>
                        </Alert>
                        <div>
                          <Label className="text-xs text-white/55">Access Key ID</Label>
                          <input
                            className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-500/35"
                            value={accessKeyId}
                            onChange={(e) => setAccessKeyId(e.target.value)}
                            autoComplete="off"
                            placeholder="AKIA..."
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-white/55">Secret Access Key</Label>
                          <input
                            type="password"
                            className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-500/35"
                            value={secretAccessKey}
                            onChange={(e) => setSecretAccessKey(e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-white/55">Region</Label>
                          <input
                            className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm font-mono text-white"
                            value={awsRegion}
                            onChange={(e) => setAwsRegion(e.target.value)}
                            placeholder="us-east-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {provider === "gcp" ? (
                  <div className="animate-in fade-in duration-300">
                    <Label className="text-xs text-white/55">Service account JSON</Label>
                    <textarea
                      className="mt-1 w-full min-h-[120px] rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                      value={gcpSaJson}
                      onChange={(e) => setGcpSaJson(e.target.value)}
                    />
                  </div>
                ) : null}

                {provider === "azure" ? (
                  <div className="grid gap-3 sm:grid-cols-2 animate-in fade-in duration-300">
                    <div>
                      <Label className="text-xs text-white/55">Tenant ID</Label>
                      <input
                        className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
                        value={azureTenantId}
                        onChange={(e) => setAzureTenantId(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-white/55">Client ID</Label>
                      <input
                        className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
                        value={azureClientId}
                        onChange={(e) => setAzureClientId(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-white/55">Client Secret</Label>
                      <input
                        type="password"
                        className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
                        value={azureClientSecret}
                        onChange={(e) => setAzureClientSecret(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-white/55">Subscription ID</Label>
                      <input
                        className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
                        value={azureSubscriptionId}
                        onChange={(e) => setAzureSubscriptionId(e.target.value)}
                      />
                    </div>
                  </div>
                ) : null}

                <Alert className="border-cyan-500/20 bg-cyan-500/[0.06] text-white/90 [&>svg]:text-cyan-300">
                  <Lock className="h-4 w-4 shrink-0" />
                  <AlertTitle className="text-cyan-100/95 text-sm">Security & trust</AlertTitle>
                  <AlertDescription className="text-xs text-white/65 space-y-1.5">
                    <p>No credential storage in this session — values are used only to validate and register the connection.</p>
                    <p>Temporary access only — assume-role sessions where applicable; nothing long-lived except what you explicitly choose.</p>
                    <p>Least privilege — grant only the IAM / RBAC actions required for discovery and automation.</p>
                  </AlertDescription>
                </Alert>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    data-testid="test-connection-btn"
                    type="button"
                    disabled={busy || testStatus === "testing"}
                    onClick={() => void onTestConnection()}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 disabled:opacity-40 transition-colors duration-200"
                  >
                    {testStatus === "testing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Test connection
                  </button>
                  <button
                    data-testid="discover-btn"
                    type="button"
                    disabled={testStatus !== "success" || discovering}
                    onClick={() => void onDiscover()}
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-500/25 disabled:opacity-40 transition-colors duration-200"
                  >
                    {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Discover infrastructure
                  </button>
                  <button
                    data-testid="register-connection-btn"
                    type="button"
                    disabled={testStatus !== "success" || busy}
                    onClick={() => void saveCloudConnection()}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40 transition-colors duration-200"
                  >
                    Register connection
                  </button>
                </div>

                <div
                  data-testid="cloud-test-result"
                  className={cn(
                    "rounded-xl border p-3 transition-all duration-300 ease-out",
                    testStatus === "testing" && "border-white/15 bg-white/[0.04]",
                    testStatus === "success" && "border-emerald-500/35 bg-emerald-500/[0.08]",
                    testStatus === "failed" && "border-red-500/40 bg-red-500/[0.08]",
                    testStatus === "idle" && "hidden"
                  )}
                >
                  {testStatus === "testing" ? (
                    <div className="flex items-center gap-2 text-sm text-white/75">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-300" />
                      Validating credentials…
                    </div>
                  ) : null}
                  {testStatus === "success" && lastTest ? (
                    <div className="space-y-2">
                      <p data-testid="cloud-connected-state" className="text-sm text-emerald-200 font-medium inline-flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Connection verified
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-black/25 px-2 py-1.5 border border-white/10">
                          <span className="text-white/45 block">Account ID</span>
                          <span className="font-mono text-white/90">{cloudAccountLabel ?? "—"}</span>
                        </div>
                        <div className="rounded-lg bg-black/25 px-2 py-1.5 border border-white/10">
                          <span className="text-white/45 block">Region(s)</span>
                          <span className="font-mono text-white/90">{cloudRegionLabel ?? "—"}</span>
                        </div>
                      </div>
                      {lastTest.message ? <p className="text-[11px] text-white/50">{lastTest.message}</p> : null}
                    </div>
                  ) : null}
                  {testStatus === "failed" && lastTest ? (
                    <div className="space-y-3">
                      <p data-testid="connection-error" className="text-sm text-red-300 inline-flex items-start gap-2">
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{lastTest.message}</span>
                      </p>
                      {import.meta.env.DEV && lastCloudHttpStatus === 401 ? (
                        <button
                          type="button"
                          data-testid="clear-token-retry-btn"
                          onClick={() => {
                            void supabase.auth.signOut();
                            clearStoredApiSession();
                            toast.message("Cleared session token; retrying connection test…");
                            void onTestConnection();
                          }}
                          className="text-xs font-medium rounded-lg border border-amber-400/40 bg-amber-500/15 text-amber-100 px-3 py-2 hover:bg-amber-500/25 transition-colors"
                        >
                          Clear stored token &amp; retry
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {discovery ? (
                  <div
                    data-testid="discovery-counts"
                    className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 transition-all duration-300 ease-out"
                  >
                    <p className="text-xs font-medium text-violet-200/95 mb-3">Infrastructure snapshot</p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-lg bg-black/20 border border-white/10 py-3 px-2">
                        <p className="text-2xl font-semibold text-white tabular-nums">{discovery.clusters.length}</p>
                        <p className="text-[10px] uppercase tracking-wide text-white/50 mt-1">Clusters</p>
                      </div>
                      <div className="rounded-lg bg-black/20 border border-white/10 py-3 px-2">
                        <p className="text-2xl font-semibold text-white tabular-nums">{discovery.services.length}</p>
                        <p className="text-[10px] uppercase tracking-wide text-white/50 mt-1">Services</p>
                      </div>
                      <div className="rounded-lg bg-black/20 border border-white/10 py-3 px-2">
                        <p className="text-2xl font-semibold text-white tabular-nums">
                          {discovery.nodes.ready}/{discovery.nodes.total}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-white/50 mt-1">Nodes ready</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5 transition-all duration-300 ease-out">
                <div className="inline-flex items-center gap-2 text-amber-300">
                  <Shield className="w-4 h-4" /> Step 3 · AI Guardrails
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Enterprise controls inspired by IAM guardrails and Kubernetes RBAC — you decide what AI may execute, where it
                  may act, and when humans stay in the loop.
                </p>

                <div>
                  <p className="text-xs text-white/50 mb-2">Autonomy mode</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        { id: "simulation" as const, label: "Simulation", hint: "No live mutations" },
                        { id: "assisted" as const, label: "Assisted", hint: "Default · gated" },
                        { id: "autonomous" as const, label: "Autonomous", hint: "Within policy only" },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setAutonomyMode(m.id)}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200",
                          autonomyMode === m.id
                            ? "border-amber-300/45 bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/25"
                            : "border-white/15 bg-black/20 text-white/85 hover:bg-white/10"
                        )}
                      >
                        <span className="font-semibold block">{m.label}</span>
                        <span className="text-[11px] text-white/50 mt-0.5 block">{m.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-white/50 mb-2">Approval scope</p>
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        { id: "high_risk" as const, label: "High-risk only", sub: "Deploy, rollback, destructive" },
                        { id: "medium_risk" as const, label: "Medium & high-risk", sub: "Includes restart, optimize, scale-down" },
                        { id: "all_actions" as const, label: "All actions", sub: "Human approval for every mutation" },
                      ] as const
                    ).map((o) => (
                      <label
                        key={o.id}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors",
                          approvalScope === o.id ? "border-amber-400/35 bg-amber-500/10" : "border-white/10 bg-black/20 hover:bg-white/[0.04]"
                        )}
                      >
                        <input
                          type="radio"
                          name="approval-scope"
                          className="mt-1 accent-amber-400"
                          checked={approvalScope === o.id}
                          onChange={() => setApprovalScope(o.id)}
                        />
                        <span>
                          <span className="text-sm text-white block">{o.label}</span>
                          <span className="text-[11px] text-white/50">{o.sub}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-white/50 mb-2">Allowed actions</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {NON_DESTRUCTIVE_ACTIONS.map((a) => (
                      <label key={a.id} className="flex items-center gap-2 text-sm text-white/85 cursor-pointer">
                        <Checkbox
                          checked={allowedActions.has(a.id)}
                          onCheckedChange={(c) => {
                            setAllowedActions((prev) => {
                              const next = new Set(prev);
                              if (c === true) next.add(a.id);
                              else next.delete(a.id);
                              return next;
                            });
                          }}
                        />
                        {a.label}
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">Destructive actions</p>
                        <p className="text-[11px] text-white/50">Off by default — deploy & rollback</p>
                      </div>
                      <Switch
                        checked={allowDestructiveActions}
                        onCheckedChange={(on) => {
                          setAllowDestructiveActions(on);
                          if (!on) {
                            setAllowedActions((prev) => {
                              const next = new Set(prev);
                              next.delete("deploy");
                              next.delete("rollback");
                              return next;
                            });
                          }
                        }}
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 opacity-100">
                      {DESTRUCTIVE_ACTIONS.map((a) => (
                        <label
                          key={a.id}
                          className={cn(
                            "flex items-center gap-2 text-sm cursor-pointer",
                            allowDestructiveActions ? "text-white/85" : "text-white/35 cursor-not-allowed"
                          )}
                        >
                          <Checkbox
                            disabled={!allowDestructiveActions}
                            checked={allowedActions.has(a.id)}
                            onCheckedChange={(c) => {
                              if (!allowDestructiveActions) return;
                              setAllowedActions((prev) => {
                                const next = new Set(prev);
                                if (c === true) next.add(a.id);
                                else next.delete(a.id);
                                return next;
                              });
                            }}
                          />
                          {a.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-white/55">Monthly budget (USD)</Label>
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
                      value={monthlyBudgetUsd}
                      onChange={(e) => setMonthlyBudgetUsd(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/55">Max actions / hour</Label>
                    <input
                      type="number"
                      min={1}
                      className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
                      value={maxActionsPerHour}
                      onChange={(e) => setMaxActionsPerHour(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">Pause automation if budget exceeded</p>
                    <p className="text-xs text-white/55">Stop auto-actions until the next budget window</p>
                  </div>
                  <Switch checked={pauseAutomationWhenBudgetExceeded} onCheckedChange={setPauseAutomationWhenBudgetExceeded} />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">Auto rollback</p>
                    <p className="text-xs text-white/55">Revert failed or harmful changes when safe</p>
                  </div>
                  <Switch checked={autoRollback} onCheckedChange={setAutoRollback} />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">Rollback on performance degradation</p>
                    <p className="text-xs text-white/55">Trigger rollback when SLO / latency regresses</p>
                  </div>
                  <Switch
                    checked={rollbackOnPerformanceDegradation}
                    onCheckedChange={setRollbackOnPerformanceDegradation}
                  />
                </div>

                <div>
                  <p className="text-xs text-white/50 mb-2">Blast radius scope</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        { id: "service" as const, label: "Service", hint: "Narrowest" },
                        { id: "namespace" as const, label: "Namespace", hint: "Balanced" },
                        { id: "cluster" as const, label: "Cluster", hint: "Widest" },
                      ] as const
                    ).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBlastRadiusScope(b.id)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-left text-xs transition-all",
                          blastRadiusScope === b.id
                            ? "border-violet-400/40 bg-violet-500/15 text-violet-100"
                            : "border-white/15 bg-black/20 text-white/80 hover:bg-white/10"
                        )}
                      >
                        <span className="font-semibold block">{b.label}</span>
                        <span className="text-[10px] text-white/45">{b.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-white/55">Minimum AI confidence to auto-execute</Label>
                    <span className="text-xs font-mono text-emerald-300/95">{minConfidenceToAutoExecute}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={99}
                    step={1}
                    className="w-full accent-emerald-500"
                    value={minConfidenceToAutoExecute}
                    onChange={(e) => setMinConfidenceToAutoExecute(Number(e.target.value))}
                  />
                  <p className="text-[10px] text-white/45 mt-1">Recommend ≥80% for production automation.</p>
                </div>

                <div
                  data-testid="guardrails-step-preview"
                  className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-emerald-200/95">Guardrails preview</p>
                    {safeAutonomousReady ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/20">
                        Safe autonomous ready
                      </span>
                    ) : null}
                  </div>
                  <ul className="text-[11px] text-white/70 space-y-1 font-mono">
                    {guardrailsSummaryLines.map((line) => (
                      <li key={line.k}>
                        <span className="text-white/45">{line.k}:</span> {line.v}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-5">
                <div>
                  <div className="inline-flex items-center gap-2 text-emerald-300">
                    <Rocket className="w-4 h-4" /> Step 4 · Activation
                  </div>
                  <p className="text-sm text-white/70 mt-2">
                    Review summaries below, then confirm. This registers your workspace and policy with the control plane —
                    full transparency before any live automation.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Final system summary</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <p className="text-[10px] text-white/45 uppercase tracking-wide">Workspace</p>
                      <p className="text-xs font-mono text-white/90 mt-1 break-all">{workspacePreviewLine}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <p className="text-[10px] text-white/45 uppercase tracking-wide">Cloud connection</p>
                      <p className="text-xs text-white/85 mt-1">{cloudConnectionSummary}</p>
                      <p className="text-[10px] text-white/40 mt-1">
                        {provider.toUpperCase()} · {authLabel}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <p className="text-[10px] text-white/45 uppercase tracking-wide">Infrastructure discovery</p>
                      <p className="text-xs text-white/85 mt-1">{discoverySummary}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/90">AI configuration</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-white/45 mb-1">Mode</p>
                      <p className="text-white font-medium">{autonomyModeLabel}</p>
                      <p className="text-[10px] text-white/45 mt-0.5">
                        {autonomyMode === "simulation" && "Dry-run — no production mutations"}
                        {autonomyMode === "assisted" && "Human-in-the-loop per your approval scope"}
                        {autonomyMode === "autonomous" && "Executes within policy when confidence is met"}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/45 mb-1">Blast radius</p>
                      <p className="text-white font-medium capitalize">{blastRadiusScope}</p>
                      <p className="text-[10px] text-white/45 mt-0.5">Scope for automated changes</p>
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-3 space-y-1.5 text-[11px] text-white/75">
                    <p>
                      <span className="text-white/45">Approvals:</span> {approvalScope.replace(/_/g, " ")} ·{" "}
                      <span className="text-white/45">Budget:</span> ${monthlyBudgetUsd}/mo ·{" "}
                      <span className="text-white/45">Rate:</span> {maxActionsPerHour}/hr
                    </p>
                    <p>
                      <span className="text-white/45">Rollback:</span> {autoRollback ? "on" : "off"} ·{" "}
                      <span className="text-white/45">Perf rollback:</span> {rollbackOnPerformanceDegradation ? "on" : "off"} ·{" "}
                      <span className="text-white/45">Confidence floor:</span> {minConfidenceToAutoExecute}%
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
                  <p className="text-xs font-semibold text-cyan-100/95 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" /> Trust & security
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[11px] text-white/70">
                    <li className="flex gap-2">
                      <Lock className="w-3.5 h-3.5 text-cyan-300/80 shrink-0 mt-0.5" />
                      No credential storage in the control plane — connect values are used to validate only.
                    </li>
                    <li className="flex gap-2">
                      <Shield className="w-3.5 h-3.5 text-cyan-300/80 shrink-0 mt-0.5" />
                      Least-privilege IAM / RBAC — grant only what discovery and automation require.
                    </li>
                    <li className="flex gap-2">
                      <Activity className="w-3.5 h-3.5 text-cyan-300/80 shrink-0 mt-0.5" />
                      Full audit logging of AI recommendations and executed actions.
                    </li>
                    <li className="flex gap-2">
                      <Gauge className="w-3.5 h-3.5 text-cyan-300/80 shrink-0 mt-0.5" />
                      Reversible control — pause automation, tighten approvals, or roll back per policy.
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-4 space-y-2">
                  <p className="text-sm font-semibold text-amber-100/95 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> Risk disclosure
                  </p>
                  <p className="text-xs text-amber-100/80 leading-relaxed">
                    In <strong>Autonomous</strong> mode, the system may execute approved action kinds without a human click on
                    each step, subject to confidence, blast radius, and budget guardrails. Simulation mode never mutates
                    production; Assisted mode keeps humans in the loop per your approval scope.
                  </p>
                  <p className="text-xs text-amber-50/90 bg-black/20 rounded-lg px-3 py-2 border border-amber-500/20">
                    <strong>Recommendation:</strong> start with <strong>Assisted</strong> mode in production, validate audit
                    trails, then widen autonomy deliberately.
                  </p>
                  <p className="text-[11px] text-amber-100/65">
                    Assessed risk: <strong>{riskLevel.label}</strong> — {riskLevel.detail}
                  </p>
                </div>

                <div
                  data-testid="simulation-preview-activation"
                  className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 space-y-2"
                >
                  <p className="text-xs font-semibold text-emerald-200/95 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Simulation preview
                  </p>
                  <p className="text-[11px] text-white/65">
                    Estimated automated evaluations in the first hour (capped by your rate limit):{" "}
                    <strong className="text-white/90 tabular-nums">{simulationPreview.estActions}</strong>
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-black/20 border border-white/10 px-3 py-2">
                      <p className="text-white/45 text-[10px] uppercase">Cost impact</p>
                      <p className="text-white/85 mt-0.5">{simulationPreview.costLabel}</p>
                    </div>
                    <div className="rounded-lg bg-black/20 border border-white/10 px-3 py-2">
                      <p className="text-white/45 text-[10px] uppercase">Performance</p>
                      <p className="text-white/85 mt-0.5">{simulationPreview.perfLabel}</p>
                    </div>
                  </div>
                  <ul className="text-[11px] text-white/70 space-y-1 list-disc list-inside">
                    {estimatedActionBullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>

                <div className="w-full" data-testid="enable-astraops-ai-control-btn">
                  <button
                    data-testid="enable-autonomous-btn"
                    type="button"
                    onClick={() => setActivateOpen(true)}
                    disabled={busy || activationPhase === "loading" || !canEnableAiControl}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_8px_30px_-8px_rgba(16,185,129,0.45)]"
                  >
                    <Zap className="w-4 h-4" />
                    Enable Zorvexa AI Control
                  </button>
                </div>
                {!canEnableAiControl ? (
                  <p className="text-[11px] text-center text-amber-200/80">
                    Complete Steps 2–3 (verified cloud, registered connection, guardrails) to enable control.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, (s - 1) as WizardStep))}
                disabled={step === 1 || busy}
                className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 disabled:opacity-40"
              >
                Back
              </button>
              {step === 1 ? (
                <Link
                  to="/dashboard?demo=1"
                  onClick={() => {
                    setDemoModeEnabled(true);
                    setOrgName(DEMO_WORKSPACE.org);
                    setProjectName(DEMO_WORKSPACE.project);
                    setEnvName(DEMO_WORKSPACE.env);
                  }}
                  className="rounded-xl border border-cyan-300/30 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 transition-all duration-200"
                >
                  Try Demo (No Setup)
                </Link>
              ) : null}
              {step < 4 ? (
                <button
                  data-testid="continue-btn"
                  type="button"
                  onClick={() => setStep((s) => Math.min(4, (s + 1) as WizardStep))}
                  disabled={
                    (step === 1 && !canContinueStep1) ||
                    (step === 2 && !canContinueStep2) ||
                    (step === 3 && !canContinueStep3) ||
                    busy
                  }
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Continue
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 p-5 space-y-4">
            <p className="text-xs uppercase tracking-widest text-white/45">System Preview</p>

            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs text-white/50 block">Final status</span>
                <span className="text-[10px] text-white/40">
                  {readiness === "ready"
                    ? "Cloud verified & discovery complete"
                    : readiness === "failed"
                      ? "Fix connection errors to continue"
                      : "Complete test & discovery"}
                </span>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-full transition-colors duration-300",
                  readiness === "ready" && "bg-emerald-500/20 text-emerald-200",
                  readiness === "partial" && "bg-amber-500/20 text-amber-200",
                  readiness === "failed" && "bg-red-500/20 text-red-200"
                )}
              >
                {readiness === "ready" ? "Ready" : readiness === "partial" ? "Partial" : "Failed"}
              </span>
            </div>

            <div className="space-y-2 text-sm border-t border-white/10 pt-3">
              <p className="text-white/80">
                <span className="text-white/45">Workspace:</span>{" "}
                <span className="font-mono text-[13px] text-white/90">{workspacePreviewLine}</span>
              </p>

              <div className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-white/45">Cloud</p>
                <p className="text-white/85 text-sm">
                  {provider.toUpperCase()} · <span className="text-white/70">{authLabel}</span>
                </p>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  <p className="text-white/80">
                    <span className="text-white/45">Account:</span>{" "}
                    <span className="font-mono">{cloudAccountLabel ?? "—"}</span>
                  </p>
                  <p className="text-white/80">
                    <span className="text-white/45">Region(s):</span>{" "}
                    <span className="font-mono">{cloudRegionLabel ?? "—"}</span>
                  </p>
                  {connectionSaved ? (
                    <p className="text-emerald-400/90 text-[11px]">Connection registered</p>
                  ) : (
                    <p className="text-white/40 text-[11px]">Register after a successful test</p>
                  )}
                </div>
              </div>

              {discovery ? (
                <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/45 mb-2">Resources</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="font-semibold text-white tabular-nums">{discovery.clusters.length}</p>
                      <p className="text-[10px] text-white/45">Clusters</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white tabular-nums">{discovery.services.length}</p>
                      <p className="text-[10px] text-white/45">Services</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white tabular-nums">
                        {discovery.nodes.ready}/{discovery.nodes.total}
                      </p>
                      <p className="text-[10px] text-white/45">Nodes</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40 mt-2 truncate" title={discovery.clusters.map((c) => c.name).join(", ")}>
                    {discovery.clusters.slice(0, 2).map((c) => c.name).join(", ")}
                    {discovery.clusters.length > 2 ? ` +${discovery.clusters.length - 2}` : ""}
                  </p>
                </div>
              ) : (
                <p className="text-white/45 text-[11px]">Run Test connection to discover clusters, services, and nodes.</p>
              )}
            </div>

            <div className="border-t border-white/10 pt-3">
              <p className="text-xs uppercase tracking-wider text-white/45 mb-2">AI readiness</p>
              <ul className="space-y-1.5 text-xs">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-start gap-2 text-white/80">
                    {c.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-white/25 shrink-0 mt-0.5" />
                    )}
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-white/10 pt-3 text-xs text-white/70 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-white/45 uppercase tracking-wider text-[10px]">Guardrails</p>
                {safeAutonomousReady ? (
                  <span className="text-[10px] font-semibold text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/20">
                    Safe autonomous ready
                  </span>
                ) : null}
              </div>
              <ul className="space-y-1 font-mono text-[11px]">
                {guardrailsSummaryLines.map((line) => (
                  <li key={line.k}>
                    <span className="text-white/45">{line.k}:</span> <span className="text-white/85">{line.v}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-white/40 pt-1">
                Rollback {autoRollback ? "on" : "off"} · Perf rollback {rollbackOnPerformanceDegradation ? "on" : "off"} · Budget
                pause {pauseAutomationWhenBudgetExceeded ? "on" : "off"}
              </p>
            </div>
          </div>
        </div>

        {result.length ? (
          <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-6">
            <div className="inline-flex items-center gap-2 text-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Launch Summary
            </div>
            <div className="mt-3 space-y-1 text-sm text-white/85">
              {result.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {(activationPhase === "loading" || activationPhase === "success") && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050814]/85 backdrop-blur-md p-4"
          role="alertdialog"
          aria-busy={activationPhase === "loading"}
          aria-label={activationPhase === "loading" ? "Activating Zorvexa AI Control" : "Zorvexa AI Control activated"}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0f1629] shadow-2xl p-6 space-y-5">
            {activationPhase === "loading" ? (
              <>
                <div className="flex items-center gap-3">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin shrink-0" />
                  <div>
                    <p className="text-lg font-semibold text-white">Enabling Zorvexa AI Control</p>
                    <p className="text-xs text-white/55 mt-0.5">Do not close this window.</p>
                  </div>
                </div>
                <ol className="space-y-2">
                  {ACTIVATION_STEPS.map((label, i) => {
                    const done = i < activationStep;
                    const current = i === activationStep;
                    return (
                      <li key={label} className="flex items-center gap-3 text-sm">
                        {done ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : current ? (
                          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-white/20 shrink-0" />
                        )}
                        <span className={cn(current ? "text-white font-medium" : done ? "text-white/75" : "text-white/40")}>
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <div className="text-center space-y-3 py-2">
                <div className="inline-flex rounded-full bg-emerald-500/20 p-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <p className="text-xl font-semibold text-white">AI Control is active</p>
                <p className="text-sm text-white/60">
                  {aiSurfacePhase === "acting" ? "Acting" : "Observing"} · {autonomyModeLabel} mode
                </p>
                <p className="text-xs text-white/45">Opening Control Plane dashboard…</p>
              </div>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={activateOpen} onOpenChange={setActivateOpen}>
        <AlertDialogContent className="bg-[#12182c] border-white/15 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Zorvexa AI Control</AlertDialogTitle>
            <AlertDialogDescription className="text-white/65 space-y-3 text-left">
              <p className="text-sm text-white/80">
                You are enabling AI operations for{" "}
                <strong className="text-white/95 font-mono">
                  {orgName} / {projectName} / {envName}
                </strong>
                . Summary of what will be registered:
              </p>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2 text-xs">
                <p>
                  <span className="text-white/45">Mode & scope:</span>{" "}
                  <strong className="text-white/90">{autonomyModeLabel}</strong> · approvals{" "}
                  <strong className="text-white/90">{approvalScope.replace(/_/g, " ")}</strong> · blast{" "}
                  <strong className="text-white/90">{blastRadiusScope}</strong>
                </p>
                <p>
                  <span className="text-white/45">Guardrails:</span> confidence ≥{minConfidenceToAutoExecute}% · rollback{" "}
                  {autoRollback ? "on" : "off"} · budget ${monthlyBudgetUsd}/mo · max {maxActionsPerHour}/hr
                </p>
                <p>
                  <span className="text-white/45">Allowed actions:</span>{" "}
                  {Array.from(allowedActions).join(", ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Estimated actions (preview)</p>
                <ul className="text-xs text-white/75 space-y-1 list-disc list-inside border border-white/10 rounded-lg p-3 bg-black/20">
                  {estimatedActionBullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
              <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-amber-100/90 text-xs">
                <strong>Risk:</strong> {riskLevel.label} — {riskLevel.detail}
              </p>
              <p className="text-[11px] text-white/50">
                Cloud secrets are not stored by the control plane. You can cancel and adjust guardrails in Step 3.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="border-white/20 bg-transparent text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-500"
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmActivation();
              }}
              disabled={busy || !canEnableAiControl}
            >
              Confirm & enable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LaunchSetup;
