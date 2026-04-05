import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StandardPageShellProps {
  title: string;
  subtitle?: string;
  controls?: React.ReactNode;
  main: React.ReactNode;
  rightPanel?: React.ReactNode;
  bottomPanel?: React.ReactNode;
  className?: string;
  hideTitleSection?: boolean;
  hideBottomSection?: boolean;
}

const StandardPageShell: React.FC<StandardPageShellProps> = ({
  title,
  subtitle,
  controls,
  main,
  rightPanel,
  bottomPanel,
  className,
  hideTitleSection = false,
  hideBottomSection = false,
}) => {
  const [bottomOpen, setBottomOpen] = useState(true);
  return (
    <div className={cn("h-full min-h-0 grid gap-6", hideTitleSection ? "grid-rows-[auto_1fr]" : hideBottomSection ? "grid-rows-[auto_auto_1fr]" : "grid-rows-[auto_auto_1fr_auto]", className)}>
      {hideTitleSection ? null : (
        <Card className="rounded-2xl border-white/10 bg-background/50 px-6 py-5">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </Card>
      )}

      <Card className="rounded-2xl border-white/10 bg-background/40 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">{controls}</div>
      </Card>

      <div className={cn("min-h-0 grid gap-6", rightPanel === null ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]")}>
        <Card className="rounded-2xl border-white/10 bg-background/30 p-4 min-h-0 overflow-auto custom-scrollbar">{main}</Card>
        {rightPanel === null ? null : (
          <Card className="rounded-2xl border-white/10 bg-background/30 p-4 min-h-0 overflow-hidden hidden xl:block">
            {rightPanel ?? <p className="text-sm text-muted-foreground">No context selected.</p>}
          </Card>
        )}
      </div>

      {hideBottomSection ? null : <Card className="rounded-2xl border-white/10 bg-background/30">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-sm font-medium">Logs and Details</p>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setBottomOpen((v) => !v)}>
            {bottomOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>
        {bottomOpen ? (
          <div className="px-4 py-3 max-h-56 overflow-hidden">
            {bottomPanel ?? <p className="text-sm text-muted-foreground">Execution and audit logs will appear here.</p>}
          </div>
        ) : null}
      </Card>}
    </div>
  );
};

export default StandardPageShell;
