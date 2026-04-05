import { CreditCard } from "lucide-react";

type PaymentMethodCardProps = {
  brand: string;
  last4: string;
  expiry: string;
};

export default function PaymentMethodCard({ brand, last4, expiry }: PaymentMethodCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827]/85 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Payment Method</p>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/10 p-2">
            <CreditCard className="h-4 w-4 text-slate-200" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{brand} ending in {last4}</p>
            <p className="text-xs text-slate-400">Expires {expiry}</p>
          </div>
        </div>
        <button className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10">
          Update
        </button>
      </div>
    </section>
  );
}
