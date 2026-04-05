import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, hint, tone = "default" }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-white/10 bg-[#0B1220] px-4 py-4 shadow-[0_8px_24px_rgba(2,6,23,0.35)] hover:shadow-[0_14px_34px_rgba(2,6,23,0.5)] transition-all duration-200"
    >
      <p className="text-[10px] uppercase tracking-widest text-white/45">{label}</p>
      <p
        className={cn(
          "text-3xl font-bold mt-2",
          tone === "good" && "text-emerald-400",
          tone === "warn" && "text-yellow-300",
          tone === "bad" && "text-red-400",
          tone === "default" && "text-white"
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-[11px] text-white/35 mt-1">{hint}</p> : null}
    </motion.div>
  );
};

export default MetricCard;

