import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function FinalCTA() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-blue-300/20 bg-gradient-to-br from-[#111827] via-[#1E1B4B] to-[#0B0F1A] p-10 text-center shadow-[0_20px_60px_rgba(79,70,229,0.28)] sm:p-14">
          <div className="pointer-events-none absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-blue-400/30 blur-3xl" />
          <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Start Automating Your Cloud Today
          </h2>
          <p className="relative mx-auto mt-4 max-w-2xl text-base text-slate-200">
            Move from manual operations to autonomous execution with AI-native orchestration.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-[0_12px_36px_rgba(37,99,235,0.35)] hover:brightness-110"
            >
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10">
              <a href="#product-visual">View Demo</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
