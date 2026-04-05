import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Lock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SafetyMode } from "./types";

const MODES: { id: SafetyMode; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: "suggest_only", label: "Suggest only", hint: "Plans & analysis — no execution", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { id: "approval_required", label: "Approval required", hint: "Actions queue for sign-off", icon: <Lock className="w-3.5 h-3.5" /> },
  { id: "auto_execute", label: "Auto execute", hint: "Safe actions within policy", icon: <Zap className="w-3.5 h-3.5" /> },
];

type Props = {
  value: SafetyMode;
  onChange: (m: SafetyMode) => void;
};

export const SafetyModeToggle: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#070b14]/80 backdrop-blur-xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45 mb-3">Safety mode</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {MODES.map((m) => (
          <motion.button
            key={m.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(m.id)}
            className={cn(
              "rounded-xl border px-3 py-3 text-left transition-colors",
              value === m.id
                ? "border-violet-500/50 bg-violet-500/10 text-white"
                : "border-white/10 bg-white/[0.02] text-white/55 hover:bg-white/[0.05]"
            )}
          >
            <div className="flex items-center gap-2 text-[12px] font-semibold">
              <span className={value === m.id ? "text-violet-300" : "text-white/40"}>{m.icon}</span>
              {m.label}
            </div>
            <p className="text-[10px] text-white/40 mt-1 leading-snug">{m.hint}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
