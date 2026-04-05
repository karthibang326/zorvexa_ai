import React from "react";
import { Button } from "@/components/ui/button";

const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}> = ({ icon, title, description, ctaLabel, onCta }) => {
  return (
    <div className="h-52 flex flex-col items-center justify-center text-center px-6">
      <div className="w-11 h-11 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/55 mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold text-white/90">{title}</p>
      <p className="text-[12px] text-white/45 mt-1">{description}</p>
      {ctaLabel && onCta ? (
        <Button
          type="button"
          onClick={onCta}
          className="mt-4 h-9 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white text-[11px] font-semibold hover:brightness-110 active:scale-[0.98] transition-all duration-200"
        >
          {ctaLabel}
        </Button>
      ) : null}
    </div>
  );
};

export default EmptyState;

