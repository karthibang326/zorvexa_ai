import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Building2, DollarSign, History, Shield } from "lucide-react";
import { getAuditLogs } from "@/lib/audit";
import { ApiClientError } from "@/lib/api";
import { syncContextToFirstAvailableOrg } from "@/lib/context";
import { getTenantBilling, getTenantSummary } from "@/lib/tenant";
import { useContextStore } from "@/store/context";
import { cn } from "@/lib/utils";

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  className,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">{value}</p>
          {hint ? <p className="mt-1 text-[11px] text-white/45 leading-snug">{hint}</p> : null}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
          <Icon className="h-5 w-5 text-indigo-300/90" />
        </div>
      </div>
    </div>
  );
}

const TenantConsoleView: React.FC = () => {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getTenantSummary>> | null>(null);
  const [billing, setBilling] = useState<Awaited<ReturnType<typeof getTenantBilling>> | null>(null);
  const [audit, setAudit] = useState<Awaited<ReturnType<typeof getAuditLogs>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const orgId = useContextStore((s) => s.orgId);
  const projectId = useContextStore((s) => s.projectId);
  const envId = useContextStore((s) => s.envId);

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    void (async function load(attempt = 0) {
      try {
        const [s, b, a] = await Promise.all([
          getTenantSummary(),
          getTenantBilling(),
          getAuditLogs({ limit: 25, offset: 0 }),
        ]);
        if (!cancelled) {
          setSummary(s);
          setBilling(b);
          setAudit(a);
        }
      } catch (e) {
        const is404 =
          e instanceof ApiClientError &&
          e.status === 404 &&
          /organization not found/i.test(String((e.details as { error?: string })?.error ?? e.message));
        if (is404 && attempt === 0) {
          try {
            const synced = await syncContextToFirstAvailableOrg();
            if (synced && !cancelled) {
              await load(1);
              return;
            }
          } catch {
            /* fall through */
          }
        }
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed to load tenant console");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, projectId, envId]);

  const fmtUsd = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Enterprise SaaS</p>
        <h2 className="mt-1 text-xl font-semibold text-white tracking-tight">Tenant console</h2>
        <p className="mt-1 text-sm text-white/55 max-w-2xl">
          Health, AI activity, billing, and audit trail for the active organization — scoped by your membership and
          workspace headers (strict tenant isolation).
        </p>
      </div>

      {err ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95 space-y-2">
          <p>{err}</p>
          <p className="text-[12px] text-amber-100/75">
            Your UI may still show a default workspace (e.g. org-1) while that row is missing in Postgres — restart the
            API after migrations, use the workspace switcher, or{" "}
            <Link to="/launch-setup" className="underline underline-offset-2 text-amber-50/95 hover:text-white">
              open Launch Mode
            </Link>{" "}
            to register a tenant.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Org health score"
          value={summary ? `${summary.healthScore}` : "—"}
          hint={summary ? `${summary.counts.deployments} deployments in this env` : undefined}
          icon={Shield}
        />
        <StatCard
          title="AI activity (24h est.)"
          value={summary ? `${summary.aiActivity.decisions24h}` : "—"}
          hint={summary ? `${summary.aiActivity.automationsApplied} automations applied` : undefined}
          icon={Activity}
        />
        <StatCard
          title="Monthly spend"
          value={billing ? fmtUsd(billing.monthlySpendUsd) : "—"}
          hint={billing ? `Plan: ${billing.plan}` : undefined}
          icon={DollarSign}
        />
        <StatCard
          title="AI savings"
          value={billing ? fmtUsd(billing.aiSavingsUsd) : "—"}
          hint={billing ? `Net effective ${fmtUsd(billing.netEffectiveUsd)}` : undefined}
          icon={Building2}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 text-white/90">
            <Activity className="h-4 w-4 text-indigo-300/90" />
            <h3 className="text-sm font-semibold tracking-tight">Scope</h3>
          </div>
          <dl className="mt-4 space-y-2 text-[13px]">
            <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
              <dt className="text-white/45">Organization</dt>
              <dd className="text-right text-white/90 truncate max-w-[60%]">{summary?.tenant.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
              <dt className="text-white/45">Org ID</dt>
              <dd className="text-right font-mono text-[11px] text-white/70 truncate max-w-[60%]">{summary?.scope.orgId}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
              <dt className="text-white/45">Project</dt>
              <dd className="text-right font-mono text-[11px] text-white/70">{summary?.scope.projectId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/45">Environment</dt>
              <dd className="text-right font-mono text-[11px] text-white/70">{summary?.scope.envId}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 text-white/90">
            <History className="h-4 w-4 text-indigo-300/90" />
            <h3 className="text-sm font-semibold tracking-tight">Recent audit events</h3>
          </div>
          <p className="mt-1 text-[11px] text-white/40">User and AI actions recorded for this tenant ({audit?.total ?? 0} total).</p>
          <div className="mt-3 max-h-[220px] overflow-y-auto rounded-lg border border-white/[0.06] bg-black/20">
            {audit?.items?.length ? (
              <ul className="divide-y divide-white/[0.06]">
                {audit.items.map((row) => (
                  <li key={row.id} className="px-3 py-2.5 text-[11px]">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-white/85">{row.action}</span>
                      <time className="text-white/35 tabular-nums">{new Date(row.createdAt).toLocaleString()}</time>
                    </div>
                    <p className="mt-0.5 text-white/45">
                      {row.resourceType}
                      {row.resourceId ? ` · ${row.resourceId}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-6 text-center text-[12px] text-white/40">No audit rows yet for this org.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantConsoleView;
