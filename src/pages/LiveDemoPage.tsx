import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import LiveDemo from "@/components/landing/LiveDemo";
import { Button } from "@/components/ui/button";

const BOOK =
  "mailto:sales@zorvexa.com?subject=Book%20Demo%20with%20Engineer%20%E2%80%94%20Zorvexa";

/** Dedicated /live-demo route — same interactive preview as the home page, without dead space */
export default function LiveDemoPage() {
  return (
    <PublicLayout>
      <section className="border-b border-white/[0.06] bg-[#080a0e]/60">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">Live demo</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Experience Zorvexa in action
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Open the interactive control plane in simulation mode — no cloud credentials required to explore
            autonomous decisions, cost signals, and governance trails.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button
              asChild
              size="lg"
              className="h-12 min-w-[220px] rounded-xl bg-gradient-to-r from-[#2563eb] to-[#4f46e5] px-8 text-base font-medium text-white shadow-[0_14px_40px_rgba(37,99,235,0.35)] hover:brightness-110"
            >
              <Link to="/dashboard?demo=1" className="inline-flex items-center justify-center gap-2">
                Try Demo (No Setup)
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 min-w-[220px] rounded-xl border-white/[0.14] bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
            >
              <a href={BOOK} className="inline-flex items-center justify-center gap-2">
                <Calendar className="h-4 w-4" />
                Book with engineer
              </a>
            </Button>
          </div>
          <p className="mt-8 text-sm text-slate-500">
            <a
              href="#live-demo"
              className="text-cyan-400/90 underline-offset-4 hover:text-cyan-300 hover:underline"
            >
              Jump to the simulation preview
            </a>{" "}
            below — or see the same block on the{" "}
            <Link to="/#live-demo" className="text-slate-400 underline-offset-4 hover:text-white hover:underline">
              home page
            </Link>
            .
          </p>
        </div>
      </section>

      <LiveDemo omitIntro hideClosingCta />
    </PublicLayout>
  );
}
