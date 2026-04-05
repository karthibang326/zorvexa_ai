import React, { useEffect, useMemo, useState } from "react";
import { Activity, DollarSign, Gauge, Shield, Sparkles, TrendingUp } from "lucide-react";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { cn } from "@/lib/utils";

type ActivityEntry = {
  id: string;
  ts: string;
  action: string;
  outcome: string;
};

const LIVE_ACTIONS: Array<{ action: string; outcome: string }> = [
  { action: "Scaled Payments API +2 nodes", outcome: "Latency stabilized within SLO thresholds" },
  { action: "Reduced AWS cost by 18%", outcome: "Idle compute removed and rightsizing applied" },
  { action: "Fixed latency spike", outcome: "p95 dropped from 214ms to 139ms" },
  { action: "Blocked suspicious IP", outcome: "Threat source isolated by AI firewall policy" },
];

const DEMO_ACTIONS: Array<{ action: string; outcome: string }> = [
  { action: "Scaled Payments API +2 nodes", outcome: "Simulated traffic surge handled automatically" },
  { action: "Reduced AWS cost by 18%", outcome: "Demo optimizer rebalanced workloads in real time" },
  { action: "Fixed latency spike", outcome: "Simulated p95 returned to healthy baseline" },
  { action: "Blocked suspicious IP", outcome: "Demo security engine prevented malicious retries" },
];

function iconForAction(action: string) {
  const a = action.toLowerCase();
  if (a.includes("scale") || a.includes("node")) return TrendingUp;
  if (a.includes("cost") || a.includes("aws")) return DollarSign;
  if (a.includes("block") || a.includes("ip") || a.includes("threat")) return Shield;
  if (a.includes("latency") || a.includes("spike")) return Gauge;
  return Activity;
}

const AIActivityStream: React.FC = () => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const demoMode = useMemo(() => isDemoModeEnabled(), []);

  useEffect(() => {
    const source = demoMode ? DEMO_ACTIONS : LIVE_ACTIONS;
    const now = Date.now();
    setEntries([
      {
        id: `seed-${now}-0`,
        ts: new Date(now).toISOString(),
        action: source[0].action,
        outcome: source[0].outcome,
      },
      {
        id: `seed-${now}-1`,
        ts: new Date(now - 12000).toISOString(),
        action: source[1].action,
        outcome: source[1].outcome,
      },
      {
        id: `seed-${now}-2`,
        ts: new Date(now - 24000).toISOString(),
        action: source[2].action,
        outcome: source[2].outcome,
      },
    ]);

    let cursor = 0;
    const timer = window.setInterval(() => {
      const next = source[cursor % source.length];
      cursor += 1;
      const item: ActivityEntry = {
        id: `live-${Date.now()}-${cursor}`,
        ts: new Date().toISOString(),
        action: next.action,
        outcome: next.outcome,
      };
      setEntries((prev) => [item, ...prev].slice(0, 8));
    }, 5000);

    return () => window.clearInterval(timer);
  }, [demoMode]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl",
        "shadow-[0_12px_40px_rgba(2,8,23,0.28)] overflow-hidden"
      )}
    >
      <div className="h-11 px-4 border-b border-white/[0.06] flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-violet-300/90" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">AI activity stream</p>
      </div>
      <div className="max-h-[240px] overflow-y-auto divide-y divide-white/[0.05]">
        {entries.map((item) => {
          const Icon = iconForAction(item.action);
          return (
            <div key={item.id} className="grid grid-cols-[88px_auto_1fr] gap-3 px-4 py-3 items-start">
              <span className="text-[11px] text-white/35 tabular-nums pt-0.5">{new Date(item.ts).toLocaleTimeString()}</span>
              <div className="flex justify-center pt-0.5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-violet-200/90">
                  <Icon className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-[13px] text-white/[0.92] leading-snug">{item.action}</p>
                <p className="text-[12px] text-emerald-200/85 leading-snug">
                  <span className="text-white/35 mr-1.5">Outcome</span>
                  {item.outcome}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AIActivityStream;
