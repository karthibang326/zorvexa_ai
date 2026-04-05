import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
const signupHref = "/auth/signup";

export default function FinalCTA() {
  return (
    <section className="pb-24 pt-8 sm:pb-32">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#111827] via-[#1e1b4b]/80 to-[#0b0f14] px-8 py-14 text-center shadow-[0_24px_80px_rgba(15,23,42,0.5)] sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-indigo-500/20 blur-[100px]" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-cyan-500/15 blur-[80px]" />

          <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-[2.5rem] md:leading-tight">
            Start running autonomous cloud operations today
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Launch the interactive demo or create an account — explore the control plane with your team in minutes.
          </p>
          <div className="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button
              asChild
              size="lg"
              className="h-12 min-w-[200px] rounded-xl bg-gradient-to-r from-[#2563eb] to-[#4f46e5] px-8 text-base font-medium text-white shadow-[0_14px_40px_rgba(37,99,235,0.35)] hover:brightness-110"
            >
              <Link to="/dashboard?demo=1" className="inline-flex items-center justify-center gap-2">
                Try Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 min-w-[200px] rounded-xl border-white/[0.15] bg-transparent text-slate-200 hover:bg-white/[0.06]"
            >
              <Link to={signupHref}>Create Account</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
