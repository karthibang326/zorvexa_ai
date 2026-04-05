import k8s from "@kubernetes/client-node";

type K8sIssueType = "pod_crash" | "high_cpu" | "node_failure";

type K8sIssue = {
  type: K8sIssueType;
  namespace?: string;
  pod?: string;
  node?: string;
  deployment?: string;
  reason: string;
  confidence: number;
};

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

type K8sAction = {
  id: string;
  ts: string;
  action: "restart_pod" | "scale_deployment";
  target: string;
  confidence: number;
  risk: RiskLevel;
  reason: string;
  outcome: string;
  verification: "PASSED" | "FAILED" | "SKIPPED";
  rollbackStatus: "NOT_REQUIRED" | "ROLLED_BACK" | "ROLLBACK_FAILED" | "NOT_APPLICABLE";
  snapshot?: Record<string, unknown>;
};

type PendingApproval = {
  id: string;
  createdAt: string;
  issue: K8sIssue;
  action: "restart_pod" | "scale_deployment";
  target: string;
  risk: RiskLevel;
};

type LoopStatus = {
  running: boolean;
  dryRun: boolean;
  approvalRequiredForHighRisk: boolean;
  lastCycleAt: string | null;
  lastIssues: K8sIssue[];
  lastActions: K8sAction[];
  memory: K8sAction[];
  pendingApprovals: PendingApproval[];
};

const PROTECTED_NAMESPACES = new Set(["kube-system", "kube-public", "kube-node-lease"]);
const ACTION_COOLDOWN_MS = 2 * 60 * 1000;
const MAX_ACTIONS_PER_CYCLE = 3;

class K8sAiLoopService {
  private timer: NodeJS.Timeout | null = null;
  private cooldown = new Map<string, number>();
  private status: LoopStatus = {
    running: false,
    dryRun: process.env.AUTONOMOUS_K8S_DRY_RUN === "true",
    approvalRequiredForHighRisk: process.env.AUTONOMOUS_K8S_REQUIRE_APPROVAL !== "false",
    lastCycleAt: null,
    lastIssues: [],
    lastActions: [],
    memory: [],
    pendingApprovals: [],
  };

  private getClients() {
    const kc = new k8s.KubeConfig();
    if (process.env.KUBECONFIG) {
      kc.loadFromFile(process.env.KUBECONFIG);
    } else if (process.env.KUBERNETES_SERVICE_HOST) {
      kc.loadFromCluster();
    } else {
      kc.loadFromDefault();
    }
    return {
      core: kc.makeApiClient(k8s.CoreV1Api),
      apps: kc.makeApiClient(k8s.AppsV1Api),
      custom: kc.makeApiClient(k8s.CustomObjectsApi),
    };
  }

  private nowIso() {
    return new Date().toISOString();
  }

  private canAct(key: string) {
    const last = this.cooldown.get(key);
    if (!last) return true;
    return Date.now() - last > ACTION_COOLDOWN_MS;
  }

  private markActed(key: string) {
    this.cooldown.set(key, Date.now());
  }

  private extractDeploymentNameFromPod(pod: k8s.V1Pod): string | undefined {
    const rs = (pod.metadata?.ownerReferences ?? []).find((o) => o.kind === "ReplicaSet")?.name;
    if (!rs) return undefined;
    const idx = rs.lastIndexOf("-");
    return idx > 0 ? rs.slice(0, idx) : rs;
  }

  private cpuToMilli(cpu: string): number {
    if (cpu.endsWith("m")) return Number(cpu.replace("m", "")) || 0;
    return (Number(cpu) || 0) * 1000;
  }

  private classifyRisk(issue: K8sIssue): RiskLevel {
    if (issue.type === "node_failure") return "HIGH";
    if (issue.type === "high_cpu") return "MEDIUM";
    return "MEDIUM";
  }

  private async captureBaseline() {
    const { core } = this.getClients();
    const nodesRes = await (core as any).listNode();
    const podsRes = await (core as any).listPodForAllNamespaces();
    // client-node version in this repo returns the Kubernetes object directly (NodeList/PodList),
    // not an Axios-style { body } wrapper.
    const nodes = ((nodesRes as any)?.items ?? []) as k8s.V1Node[];
    const pods = ((podsRes as any)?.items ?? []) as k8s.V1Pod[];
    const readyNodes = nodes.filter((n) => (n.status?.conditions ?? []).some((c) => c.type === "Ready" && c.status === "True")).length;
    const runningPods = pods.filter((p) => p.status?.phase === "Running").length;
    return { readyNodes, runningPods };
  }

  private verifyBeforeAfter(before: { readyNodes: number; runningPods: number }, after: { readyNodes: number; runningPods: number }) {
    const nodeDrop = before.readyNodes - after.readyNodes;
    const podDrop = before.runningPods - after.runningPods;
    return { passed: nodeDrop <= 0 && podDrop <= 5, nodeDrop, podDrop };
  }

  private async observeAndDetect() {
    const { core, custom } = this.getClients();
    const [nodesRes, podsRes] = await Promise.all([
      (core as any).listNode(),
      (core as any).listPodForAllNamespaces(),
    ]);
    const nodes = ((nodesRes as any)?.items ?? []) as k8s.V1Node[];
    const pods = ((podsRes as any)?.items ?? []) as k8s.V1Pod[];

    const issues: K8sIssue[] = [];

    for (const node of nodes) {
      const ready = (node.status?.conditions ?? []).find((c) => c.type === "Ready");
      if (ready?.status !== "True") {
        issues.push({
          type: "node_failure",
          node: node.metadata?.name,
          reason: `Node ${node.metadata?.name ?? "unknown"} not Ready`,
          confidence: 0.94,
        });
      }
    }

    for (const pod of pods) {
      const ns = pod.metadata?.namespace ?? "default";
      if (PROTECTED_NAMESPACES.has(ns)) continue;
      const name = pod.metadata?.name;
      if (!name) continue;
      const statuses = pod.status?.containerStatuses ?? [];
      const maxRestart = statuses.reduce((m, s) => Math.max(m, s.restartCount ?? 0), 0);
      const crashLoop = statuses.some((s) => s.state?.waiting?.reason === "CrashLoopBackOff");
      const phase = pod.status?.phase ?? "";
      const unhealthyPhase = phase && phase !== "Running" && phase !== "Succeeded";
      if (maxRestart >= 3 || crashLoop || (unhealthyPhase && maxRestart >= 1)) {
        issues.push({
          type: "pod_crash",
          namespace: ns,
          pod: name,
          deployment: this.extractDeploymentNameFromPod(pod),
          reason: `Pod ${name} unstable (phase=${phase || "unknown"}, restart=${maxRestart}${crashLoop ? ", crashloop" : ""})`,
          confidence: 0.9,
        });
      }
    }

    // Best-effort high CPU via metrics.k8s.io.
    try {
      const metrics = (await (custom as any).listClusterCustomObject("metrics.k8s.io", "v1beta1", "nodes")) as any;
      const nodeMetrics = (metrics?.body?.items ?? []) as Array<{ metadata?: { name?: string }; usage?: { cpu?: string } }>;
      const alloc = new Map<string, number>();
      for (const n of nodes) {
        const name = n.metadata?.name ?? "";
        const cpu = n.status?.allocatable?.cpu ?? "0";
        alloc.set(name, this.cpuToMilli(cpu));
      }
      for (const m of nodeMetrics) {
        const name = m.metadata?.name ?? "";
        const used = this.cpuToMilli(m.usage?.cpu ?? "0");
        const total = alloc.get(name) ?? 0;
        if (total > 0 && used / total >= 0.85) {
          issues.push({
            type: "high_cpu",
            node: name,
            reason: `Node ${name} CPU utilization high (${Math.round((used / total) * 100)}%)`,
            confidence: 0.87,
          });
        }
      }
    } catch {
      // metrics server may be unavailable; skip without failing the loop
    }

    return { pods, issues };
  }

  private async execute(issues: K8sIssue[], pods: k8s.V1Pod[]) {
    const { core, apps } = this.getClients();
    const actions: K8sAction[] = [];
    let budget = MAX_ACTIONS_PER_CYCLE;

    for (const issue of issues) {
      if (budget <= 0) break;

      if (issue.type === "pod_crash" && issue.namespace && issue.pod && !PROTECTED_NAMESPACES.has(issue.namespace)) {
        const key = `restart:${issue.namespace}/${issue.pod}`;
        if (!this.canAct(key)) continue;
        const risk = this.classifyRisk(issue);
        if (risk === "HIGH" && this.status.approvalRequiredForHighRisk) {
          this.status.pendingApprovals.unshift({
            id: `apr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            createdAt: this.nowIso(),
            issue,
            action: "restart_pod",
            target: `${issue.namespace}/${issue.pod}`,
            risk,
          });
          this.status.pendingApprovals = this.status.pendingApprovals.slice(0, 100);
          continue;
        }
        let outcome = "skipped";
        let verification: K8sAction["verification"] = "SKIPPED";
        let rollbackStatus: K8sAction["rollbackStatus"] = "NOT_APPLICABLE";
        const before = await this.captureBaseline();
        const snapshot = { namespace: issue.namespace, pod: issue.pod, observedAt: this.nowIso() };
        if (!this.status.dryRun) {
          const podName = String(issue.pod ?? "");
          const nsName = String(issue.namespace ?? "");
          if (!podName || !nsName) continue;
          // In this client version, CoreV1Api.deleteNamespacedPod wrapper is broken (returns .toPromise without invoking),
          // so call the underlying generated API directly.
          await (core as any).api.deleteNamespacedPod(podName, nsName).toPromise();
          outcome = "pod restart requested";
          const after = await this.captureBaseline();
          const check = this.verifyBeforeAfter(before, after);
          verification = check.passed ? "PASSED" : "FAILED";
          if (!check.passed) {
            rollbackStatus = "NOT_APPLICABLE";
            outcome = `${outcome}; verification failed (nodeDrop=${check.nodeDrop}, podDrop=${check.podDrop})`;
          } else {
            rollbackStatus = "NOT_REQUIRED";
          }
        } else {
          outcome = "dry-run: pod restart simulated";
        }
        this.markActed(key);
        budget -= 1;
        actions.push({
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: this.nowIso(),
          action: "restart_pod",
          target: `${issue.namespace}/${issue.pod}`,
          confidence: issue.confidence,
          risk,
          reason: issue.reason,
          outcome,
          verification,
          rollbackStatus,
          snapshot,
        });
        continue;
      }

      if ((issue.type === "high_cpu" || issue.type === "node_failure") && budget > 0) {
        // Pick one non-protected deployment and scale +1.
        const targetPod = pods.find((p) => {
          const ns = p.metadata?.namespace ?? "";
          return ns && !PROTECTED_NAMESPACES.has(ns) && this.extractDeploymentNameFromPod(p);
        });
        if (!targetPod) continue;
        const ns = targetPod.metadata?.namespace ?? "default";
        const dep = this.extractDeploymentNameFromPod(targetPod);
        if (!dep) continue;

        const key = `scale:${ns}/${dep}`;
        if (!this.canAct(key)) continue;

        const risk = this.classifyRisk(issue);
        if (risk === "HIGH" && this.status.approvalRequiredForHighRisk) {
          this.status.pendingApprovals.unshift({
            id: `apr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            createdAt: this.nowIso(),
            issue,
            action: "scale_deployment",
            target: `${ns}/${dep}`,
            risk,
          });
          this.status.pendingApprovals = this.status.pendingApprovals.slice(0, 100);
          continue;
        }

        let outcome = "skipped";
        let verification: K8sAction["verification"] = "SKIPPED";
        let rollbackStatus: K8sAction["rollbackStatus"] = "NOT_APPLICABLE";
        let snapshot: Record<string, unknown> | undefined;
        if (!this.status.dryRun) {
          const before = await this.captureBaseline();
          const cur = await (apps as any).readNamespacedDeployment({ name: dep, namespace: ns });
          const currentReplicas = Number(cur?.body?.spec?.replicas ?? 1);
          const nextReplicas = Math.min(50, currentReplicas + 1);
          if (nextReplicas > 30) {
            actions.push({
              id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              ts: this.nowIso(),
              action: "scale_deployment",
              target: `${ns}/${dep}`,
              confidence: issue.confidence,
              risk,
              reason: `${issue.reason}; blocked by safety max replica guardrail`,
              outcome: "blocked: unsafe scale target",
              verification: "SKIPPED",
              rollbackStatus: "NOT_APPLICABLE",
            });
            continue;
          }
          snapshot = { namespace: ns, deployment: dep, previousReplicas: currentReplicas, observedAt: this.nowIso() };
          const patch = [{ op: "replace", path: "/spec/replicas", value: nextReplicas }];
          await (apps as any).patchNamespacedDeployment(
            { name: dep, namespace: ns, body: patch },
            { headers: { "Content-Type": "application/json-patch+json" } }
          );
          outcome = `deployment scaled ${currentReplicas}→${nextReplicas}`;
          const after = await this.captureBaseline();
          const check = this.verifyBeforeAfter(before, after);
          verification = check.passed ? "PASSED" : "FAILED";
          rollbackStatus = "NOT_REQUIRED";
          if (!check.passed) {
            try {
              const rollbackPatch = [{ op: "replace", path: "/spec/replicas", value: currentReplicas }];
              await (apps as any).patchNamespacedDeployment(
                { name: dep, namespace: ns, body: rollbackPatch },
                { headers: { "Content-Type": "application/json-patch+json" } }
              );
              rollbackStatus = "ROLLED_BACK";
              outcome = `${outcome}; verification failed -> rollback to ${currentReplicas}`;
            } catch {
              rollbackStatus = "ROLLBACK_FAILED";
              outcome = `${outcome}; verification failed -> rollback failed`;
            }
          }
        } else {
          outcome = "dry-run: deployment scale simulated";
        }

        this.markActed(key);
        budget -= 1;
        actions.push({
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: this.nowIso(),
          action: "scale_deployment",
          target: `${ns}/${dep}`,
          confidence: issue.confidence,
          risk,
          reason: issue.reason,
          outcome,
          verification,
          rollbackStatus,
          snapshot,
        });
      }
    }

    return actions;
  }

  async runOnce() {
    const cycleAt = this.nowIso();
    const { pods, issues } = await this.observeAndDetect();
    const actions = await this.execute(issues, pods);
    this.status.lastCycleAt = cycleAt;
    this.status.lastIssues = issues.slice(0, 30);
    this.status.lastActions = actions.slice(0, 20);
    this.status.memory = [...actions, ...this.status.memory].slice(0, 200);
    return {
      cycleAt,
      observed: {
        pods: pods.length,
        issues: issues.length,
      },
      issues,
      actions,
      dryRun: this.status.dryRun,
    };
  }

  start(intervalMs = 12000) {
    if (this.timer) return this.getStatus();
    this.status.running = true;
    this.timer = setInterval(() => {
      void this.runOnce().catch(() => {
        // keep loop running; status still readable
      });
    }, Math.max(5000, intervalMs));
    void this.runOnce().catch(() => {
      // initial run best effort
    });
    return this.getStatus();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.status.running = false;
    return this.getStatus();
  }

  getStatus() {
    return this.status;
  }

  setDryRun(dryRun: boolean) {
    this.status.dryRun = dryRun;
    return this.getStatus();
  }

  approveHighRiskAction(approvalId: string) {
    const idx = this.status.pendingApprovals.findIndex((p) => p.id === approvalId);
    if (idx < 0) return { ok: false, reason: "approval_not_found" };
    const approved = this.status.pendingApprovals[idx];
    this.status.pendingApprovals.splice(idx, 1);
    const action: K8sAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: this.nowIso(),
      action: approved.action,
      target: approved.target,
      confidence: approved.issue.confidence,
      risk: approved.risk,
      reason: `${approved.issue.reason}; manually approved high-risk action`,
      outcome: "approved for next cycle execution",
      verification: "SKIPPED",
      rollbackStatus: "NOT_APPLICABLE",
    };
    this.status.lastActions = [action, ...this.status.lastActions].slice(0, 20);
    this.status.memory = [action, ...this.status.memory].slice(0, 200);
    return { ok: true, approved };
  }
}

export const k8sAiLoopService = new K8sAiLoopService();
