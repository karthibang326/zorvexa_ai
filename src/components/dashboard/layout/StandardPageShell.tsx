import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import AIActivityStream from "./AIActivityStream";

interface StandardPageShellProps {
  title: string;
  subtitle?: string;
  /** Full-width block above the title card (e.g. autonomous status + KPI strip). */
  topChrome?: React.ReactNode;
  controls?: React.ReactNode;
  /** Latest AI decision — shown above the activity stream. */
  decisionPanel?: React.ReactNode;
  main: React.ReactNode;
  rightPanel?: React.ReactNode;
  bottomPanel?: React.ReactNode;
  className?: string;
  hideTitleSection?: boolean;
  hideBottomSection?: boolean;
  /** When set, replaces the default seeded AI activity stream. */
  activityStreamOverride?: React.ReactNode;
  /** Hide the built-in AI activity stream row entirely. */
  hideActivityStream?: boolean;
}

const shellCard =
  "rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_12px_40px_rgba(2,8,23,0.28)]";

const StandardPageShell: React.FC<StandardPageShellProps> = ({
  title,
  subtitle,
  topChrome,
  controls,
  decisionPanel,
  main,
  rightPanel,
  bottomPanel,
  className,
  hideTitleSection = false,
  hideBottomSection = false,
  activityStreamOverride,
  hideActivityStream = false,
}) => {
  const [bottomOpen, setBottomOpen] = useState(true);
  return (
    <div className={cn("grid gap-6", className)}>
      {topChrome ? <div className="w-full">{topChrome}</div> : null}
      {hideTitleSection ? null : (
        <Card className={cn(shellCard, "px-6 md:px-8 py-6 transition-all duration-200")}>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white/95">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm md:text-base text-white/55 leading-relaxed">{subtitle}</p> : null}
        </Card>
      )}

      <Card className={cn(shellCard, "px-6 py-4 transition-all duration-200")}>
        <div className="flex flex-wrap items-center gap-3">{controls}</div>
      </Card>

      {decisionPanel ? <div className="w-full">{decisionPanel}</div> : null}

      {hideActivityStream ? null : activityStreamOverride ?? <AIActivityStream />}

      <div className={cn("grid gap-6", rightPanel === null ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]")}>
        <Card className={cn(shellCard, "p-6 md:p-8 transition-all duration-200")}>{main}</Card>
        {rightPanel === null ? null : (
          <Card className={cn(shellCard, "p-6 hidden xl:block transition-all duration-200")}>
            {rightPanel ?? <p className="text-sm text-muted-foreground">No context selected.</p>}
          </Card>
        )}
      </div>

      {hideBottomSection ? null : <Card className={cn(shellCard, "border-white/[0.10] transition-all duration-200")}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <p className="text-sm font-medium tracking-tight text-white/90">Logs and Details</p>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setBottomOpen((v) => !v)}>
            {bottomOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>
        {bottomOpen ? (
          <div className="px-6 py-4">
            {bottomPanel ?? <p className="text-sm text-muted-foreground">Execution and audit logs will appear here.</p>}
          </div>
        ) : null}
      </Card>}
    </div>
  );
};

export default StandardPageShell;
