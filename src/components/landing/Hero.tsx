import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const BOOK_DEMO =
  "mailto:sales@zorvexa.com?subject=Book%20Live%20Demo%20%E2%80%94%20Zorvexa";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-12 sm:pt-32 sm:pb-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[#2563eb]/18 blur-[100px]" />
        <div className="absolute top-24 right-[10%] h-72 w-72 rounded-full bg-[#6366f1]/14 blur-[80px]" />
        <div className="absolute bottom-0 left-[15%] h-64 w-64 rounded-full bg-[#0ea5e9]/10 blur-[70px]" />
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.08] md:text-6xl"
        >
          Autonomous AI for Cloud Operations
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06 }}
          className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg"
        >
          Zorvexa continuously observes, decides, and acts — eliminating manual SRE work across multi-cloud
          environments.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="mt-4 text-xs font-medium tracking-wide text-slate-500"
        >
          Outcome-based · Multi-cloud · Governance-grade
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="mt-10 flex w-full max-w-lg flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4"
        >
          <Button
            asChild
            size="lg"
            className="h-12 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#4f46e5] px-8 text-base font-medium text-white shadow-[0_14px_40px_rgba(37,99,235,0.35)] transition-transform hover:scale-[1.02] hover:brightness-110"
          >
            <Link to="/dashboard?demo=1" className="inline-flex items-center justify-center gap-2">
              Try Demo (No Setup)
              <ArrowRight className="h-4 w-4 opacity-90" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 rounded-xl border-white/[0.14] bg-white/[0.04] px-7 text-base text-slate-100 hover:bg-white/[0.08]"
          >
            <a href={BOOK_DEMO} className="inline-flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" />
              Book Live Demo
            </a>
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="mt-8 text-xs text-slate-500 sm:text-sm"
        >
          <span className="text-slate-400">
            Reduce cloud costs by up to 30% · Resolve incidents before alerts
          </span>
        </motion.p>
      </div>
    </section>
  );
}
