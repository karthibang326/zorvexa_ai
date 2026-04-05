import React from "react";
import { motion } from "framer-motion";

interface GraphCardProps {
  title: string;
  unit?: string;
  values: number[];
}

const GraphCard: React.FC<GraphCardProps> = ({ title, unit = "", values }) => {
  const max = Math.max(1, ...values);
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-white/10 bg-[#0B1220] p-4 shadow-[0_8px_24px_rgba(2,6,23,0.35)] hover:shadow-[0_14px_34px_rgba(2,6,23,0.5)] transition-all duration-200"
    >
      <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">{title}</p>
      <div className="h-28 flex items-end gap-1">
        {values.map((v, i) => (
          <div key={`${title}-${i}`} className="flex-1 rounded-t bg-gradient-to-t from-[#2563EB] to-[#4F46E5]" style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
        ))}
      </div>
      <p className="text-[11px] text-white/35 mt-2">Latest: {values[values.length - 1]?.toFixed(1)}{unit}</p>
    </motion.div>
  );
};

export default GraphCard;

