import React from "react";
import { motion } from "framer-motion";

interface ModuleHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const ModuleHeader: React.FC<ModuleHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <header className="h-16 border-b border-border/40 bg-background/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0 sticky top-0 z-40">
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-black tracking-tight text-foreground uppercase italic leading-none">
            {title}
          </h1>
          <div className="h-4 w-[1px] bg-border/60 mx-1 hidden sm:block" />
          {subtitle && (
            <span className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] leading-none hidden sm:block">
              {subtitle}
            </span>
          )}
        </div>
        {/* Mobile subtitle */}
        {subtitle && (
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest mt-1 sm:hidden">
            {subtitle}
          </span>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-4">
          {actions}
        </div>
      )}
    </header>
  );
};

export default ModuleHeader;
