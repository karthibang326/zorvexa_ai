import React, { useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { postAstraSimulate, type MetricsState } from "@/lib/astra";

const DEFAULT_STATE: MetricsState = { cpu: 87, latency: 310, errorRate: 1.2, cost: 18 };

export const SimulationPanel: React.FC = () => {
  const [action, setAction] = useState("scale_replicas");
  const [replicas, setReplicas] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ machine: Record<string, unknown>; human: string } | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const out = await postAstraSimulate({
        action,
        replicas,
        resource: "api-gateway",
        state: DEFAULT_STATE,
      });
      setResult(out);
      toast.success("Digital twin simulation updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const m = result?.machine as
    | {
        predicted_latency_pct?: number;
        cpu_reduction_pct?: number;
        cost_delta_usd?: number;
        risk?: string;
      }
    | undefined;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#070b14]/80 backdrop-blur-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <FlaskConical className="w-4 h-4 text-cyan-400" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Digital twin</span>
      </div>
      <p className="text-[11px] text-white/40 mb-3">
        Simulate actions before execution — predicted latency, CPU, cost delta, risk.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-9 rounded-lg bg-black/40 border border-white/10 text-xs text-white px-2"
        >
          <option value="scale_replicas">scale_replicas</option>
          <option value="canary_scale">canary_scale</option>
          <option value="rollback_deployment">rollback_deployment</option>
          <option value="restart_pods">restart_pods</option>
        </select>
        <input
          type="number"
          min={1}
          max={50}
          value={replicas}
          onChange={(e) => setReplicas(Number(e.target.value))}
          className="h-9 w-20 rounded-lg bg-black/40 border border-white/10 text-xs text-white px-2"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void run()}
          className="h-9 px-3 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-[11px] font-semibold inline-flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run sim
        </button>
      </div>

      {result && m && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <Metric label="Δ Latency" value={`${m.predicted_latency_pct ?? 0}%`} />
            <Metric label="Δ CPU" value={`${m.cpu_reduction_pct ?? 0}%`} />
            <Metric label="Δ Cost" value={`$${m.cost_delta_usd ?? 0}`} />
            <div className="rounded-lg border border-white/5 px-2 py-1.5">
              <p className="text-white/40 uppercase text-[9px]">Risk</p>
              <p className={cn("font-mono", m.risk === "high" ? "text-red-300" : m.risk === "medium" ? "text-amber-300" : "text-emerald-300")}>
                {m.risk}
              </p>
            </div>
          </div>
          <p className="text-[12px] text-white/70 leading-relaxed border-l-2 border-cyan-500/40 pl-2">{result.human}</p>
        </motion.div>
      )}
    </div>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5">
      <p className="text-white/40 uppercase text-[9px]">{label}</p>
      <p className="text-white/90 font-mono text-[12px]">{value}</p>
    </div>
  );
}
