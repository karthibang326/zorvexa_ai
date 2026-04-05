import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "success" | "failed" | "running" | "active" | "resolved";
}

const statusMap = {
  success: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
  resolved: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
  failed: "text-red-400 border-red-500/20 bg-red-500/10",
  running: "text-yellow-300 border-yellow-500/20 bg-yellow-500/10",
  active: "text-yellow-300 border-yellow-500/20 bg-yellow-500/10",
} as const;

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => (
  <span className={cn("px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-widest font-black", statusMap[status])}>
    {status}
  </span>
);

export default StatusBadge;

