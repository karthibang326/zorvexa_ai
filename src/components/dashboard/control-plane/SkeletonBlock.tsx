import React from "react";
import { cn } from "@/lib/utils";

const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-xl bg-white/5 animate-pulse",
      className
    )}
  />
);

export default SkeletonBlock;

