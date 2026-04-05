type BillingActionsCardProps = {
  onUpgrade: () => void;
  onDowngrade: () => void;
};

export default function BillingActionsCard({ onUpgrade, onDowngrade }: BillingActionsCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827]/85 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Plan Actions</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          onClick={onUpgrade}
          className="h-11 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition duration-200 hover:brightness-110"
        >
          Upgrade Plan
        </button>
        <button
          onClick={onDowngrade}
          className="h-11 rounded-xl border border-white/20 bg-white/5 text-sm font-semibold text-slate-100 transition duration-200 hover:bg-white/10"
        >
          Downgrade Plan
        </button>
      </div>
    </section>
  );
}
