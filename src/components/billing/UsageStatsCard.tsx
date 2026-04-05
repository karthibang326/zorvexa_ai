type UsageStatsCardProps = {
  workflowsUsed: number;
  workflowLimit: number;
  monthlyRuns: number;
};

export default function UsageStatsCard({
  workflowsUsed,
  workflowLimit,
  monthlyRuns,
}: UsageStatsCardProps) {
  const workflowPercent = Math.min(100, Math.round((workflowsUsed / workflowLimit) * 100));

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827]/85 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Usage Stats</p>
      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm text-slate-300">
            <span>Workflows</span>
            <span>{workflowsUsed}/{workflowLimit}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#4F46E5]"
              style={{ width: `${workflowPercent}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
          Monthly Runs: <span className="font-semibold text-white">{monthlyRuns.toLocaleString()}</span>
        </div>
      </div>
    </section>
  );
}
