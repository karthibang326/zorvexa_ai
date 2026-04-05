import { Check, X } from "lucide-react";

const rows = [
  { label: "Autonomous remediation", astra: true, trad: false },
  { label: "Outcome-based pricing", astra: true, trad: false },
  { label: "Explainable AI decisions", astra: true, trad: "partial" as const },
  { label: "Multi-cloud control plane", astra: true, trad: false },
  { label: "Static dashboards & alerts", astra: false, trad: true },
  { label: "Ticket-driven workflows", astra: false, trad: true },
];

export default function Differentiation() {
  return (
    <section id="differentiation" className="py-20 sm:py-28">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90">Why Zorvexa</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Why teams switch from passive tools</h2>
          <p className="mt-4 text-sm text-slate-400 sm:text-base">
            Alerts describe failure. Zorvexa executes recovery — with policy, proof, and rollback.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-white/[0.08]">
          <div className="grid grid-cols-[1fr_120px_120px] gap-px bg-white/[0.06] text-xs font-semibold uppercase tracking-wider text-slate-500">
            <div className="bg-[#0c1018] px-4 py-3 text-left sm:px-5">Capability</div>
            <div className="bg-[#0c1018] py-3 text-center text-indigo-200">Zorvexa</div>
            <div className="bg-[#0c1018] py-3 text-center text-slate-500">Typical tools</div>
          </div>
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[1fr_120px_120px] gap-px bg-white/[0.06] text-sm"
            >
              <div className="bg-[#0b0f14] px-4 py-3.5 text-slate-300 sm:px-5">{row.label}</div>
              <div className="flex items-center justify-center bg-[#0b0f14]">
                {row.astra ? (
                  <Check className="h-5 w-5 text-emerald-400" aria-label="Yes" />
                ) : (
                  <X className="h-5 w-5 text-slate-600" aria-label="No" />
                )}
              </div>
              <div className="flex items-center justify-center bg-[#0b0f14]">
                {row.trad === "partial" ? (
                  <span className="text-[11px] font-medium text-amber-300/90">Limited</span>
                ) : row.trad ? (
                  <Check className="h-5 w-5 text-slate-500" aria-label="Yes" />
                ) : (
                  <X className="h-5 w-5 text-slate-600" aria-label="No" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
