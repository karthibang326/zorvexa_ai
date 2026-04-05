import { Crown } from "lucide-react";

type PlanSummaryCardProps = {
  currentPlan: "starter" | "pro" | "enterprise";
  status: "active" | "trialing" | "past_due";
};

export default function PlanSummaryCard({ currentPlan, status }: PlanSummaryCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827]/85 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Current Plan</p>
          <div className="mt-2 flex items-center gap-2">
            <Crown className="h-4 w-4 text-blue-300" />
            <h3 className="text-xl font-semibold capitalize text-white">{currentPlan}</h3>
          </div>
        </div>
        <span className="rounded-full border border-emerald-300/35 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200">
          {status.replace("_", " ")}
        </span>
      </div>
    </section>
  );
}
