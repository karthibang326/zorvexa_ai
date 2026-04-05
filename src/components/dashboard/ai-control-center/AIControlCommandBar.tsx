import React, { useState } from "react";
import { Command } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  onSubmit: (cmd: string) => void;
  placeholder?: string;
};

export const AIControlCommandBar: React.FC<Props> = ({
  onSubmit,
  placeholder = "> Fix latency in production · Scale api-gateway · Show cost report",
}) => {
  const [value, setValue] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky bottom-0 z-20 mt-4 -mb-2 px-1"
    >
      <div className="rounded-2xl border border-white/10 bg-[#05080f]/95 backdrop-blur-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.55)] px-4 py-3 flex items-center gap-3">
        <Command className="w-4 h-4 text-white/35 shrink-0" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const t = value.trim();
              if (t) {
                onSubmit(t);
                setValue("");
              }
            }
          }}
          className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/30 font-mono"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => {
            const t = value.trim();
            if (t) {
              onSubmit(t);
              setValue("");
            }
          }}
          className="text-[11px] uppercase tracking-widest font-bold text-violet-300 hover:text-violet-200 px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10"
        >
          Run
        </button>
      </div>
    </motion.div>
  );
};
