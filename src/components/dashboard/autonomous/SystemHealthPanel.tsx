import React from "react";
import { Activity, Cpu, Gauge, AlertTriangle } from "lucide-react";
import type { MetricsState } from "@/lib/ai-ops-learning";
import { cn } from "@/lib/utils";

function trendArrow(delta: number) {
  if (delta > 0.4) return "↑";
  if (delta < -0.4) return "↓";
  return "→";
}

function healthColor(v: number, invert = false) {
  const x = invert ? 100 - v : v;
  if (x >= 75) return "text-emerald-300";
  if (x >= 45) return "text-amber-300";
  return "text-rose-300";
}

export type SystemHealthPanelProps = {
  metrics?: MetricsState | null;
};

export const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({ metrics }) => {
  const cpu = metrics?.cpu ?? 72;
  const mem = metrics?.memory ?? 64;
  const lat = metrics?.latency ?? 168;
  const err = metrics?.errorRate ?? 1.2;
  const deltas = { cpu: -1.2, mem: 0.4, lat: -3.1, err: -0.2 };

  const rows = [
    { label: "CPU", value: `${cpu.toFixed(0)}%`, icon: Cpu, color: healthColor(cpu), d: deltas.cpu },
    { label: "Memory", value: `${mem.toFixed(0)}%`, icon: Activity, color: healthColor(mem), d: deltas.mem },
    { label: "Latency", value: `${lat.toFixed(0)} ms`, icon: Gauge, color: healthColor(100 - Math.min(100, lat / 3)), d: deltas.lat },
    { label: "Error rate", value: `${err.toFixed(1)}%`, icon: AlertTriangle, color: healthColor(100 - err * 10, true), d: deltas.err },
  ];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45 mb-3">System health</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <r.icon className="w-3.5 h-3.5 text-white/35" />
              <span
                className={cn("text-[10px] tabular-nums", r.d > 0 ? "text-rose-300/90" : "text-emerald-300/90")}
                title="vs prior window"
              >
                {trendArrow(r.d)}
              </span>
            </div>
            <p className="text-[10px] text-white/40 mt-1">{r.label}</p>
            <p className={cn("text-lg font-semibold tabular-nums tracking-tight", r.color)}>{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
