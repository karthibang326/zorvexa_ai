import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-20 sm:pt-28 sm:pb-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#2563EB]/25 blur-3xl" />
        <div className="absolute top-20 right-[12%] h-56 w-56 rounded-full bg-[#4F46E5]/20 blur-3xl" />
        <motion.div
          className="absolute left-[8%] top-28 h-44 w-44 rounded-full bg-[#2563EB]/20 blur-3xl"
          animate={{ y: [0, -16, 0], opacity: [0.45, 0.7, 0.45] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-200"
        >
          Autonomous AI Cloud Operations Platform
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-7 max-w-4xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-6xl"
        >
          Run Your Cloud with AI
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 max-w-3xl text-pretty text-base leading-relaxed text-slate-300 sm:text-xl"
        >
          AstraOps turns workflows into autonomous systems - optimizing, healing, and scaling your infrastructure in real time.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Button
            asChild
            size="lg"
            className="h-12 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-7 text-base text-white shadow-[0_12px_36px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02] hover:brightness-110"
          >
            <Link to="/auth">Get Started</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 rounded-xl border-white/20 bg-white/5 px-7 text-base text-white hover:bg-white/10"
          >
            <a href="#product-visual">View Demo</a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
