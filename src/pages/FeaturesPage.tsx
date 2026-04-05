import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import FinalCTA from "@/components/landing/FinalCTA";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/shared/branding";

/** Dedicated /features — same capabilities as the home #features section, with full detail */
export default function FeaturesPage() {
  return (
    <PublicLayout>
      <section className="border-b border-white/[0.06] bg-[#080a0e]/80">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6C5CE7]/90">Platform</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-[2.5rem] md:leading-tight">
              Everything in {BRAND.name} — in one place
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-400 sm:text-lg">
              {BRAND.tagline}. Explore the capabilities that power autonomous cloud operations, from the control
              plane and incidents to FinOps, governance, and explainable AI.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="h-12 min-w-[200px] rounded-xl bg-gradient-to-r from-[#2563eb] to-[#4f46e5] px-8 text-base font-medium text-white shadow-[0_14px_40px_rgba(37,99,235,0.35)] hover:brightness-110"
              >
                <Link to="/dashboard?demo=1" className="inline-flex items-center justify-center gap-2">
                  Try demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-12 text-slate-300 hover:bg-white/[0.06] hover:text-white"
              >
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <FeaturesGrid variant="expanded" showHeading={false} />

      <FinalCTA />
    </PublicLayout>
  );
}
