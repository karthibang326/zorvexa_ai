import React from "react";
import { cn } from "@/lib/utils";

interface ModuleHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /**
   * Sticky headers sit inside the dashboard’s scroll region and can overlap content below (maps, cards).
   * Default false — scroll the title away with the page.
   */
  sticky?: boolean;
}

const ModuleHeader: React.FC<ModuleHeaderProps> = ({ title, subtitle, actions, sticky = false }) => {
  return (
    <header
      className={cn(
        "border-b border-border/40 bg-background/50 backdrop-blur-md shrink-0 w-full min-w-0",
        "px-6 md:px-8 py-4 flex flex-col gap-2",
        sticky && "sticky top-0 z-40"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-base font-black tracking-tight text-foreground uppercase italic leading-tight shrink-0">
          {title}
        </h1>
        {actions ? <div className="flex items-center gap-4 shrink-0">{actions}</div> : null}
      </div>
      {subtitle ? (
        <p className="text-sm text-muted-foreground leading-relaxed text-left max-w-4xl pr-2">{subtitle}</p>
      ) : null}
    </header>
  );
};

export default ModuleHeader;
