import React from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";

export type HealthTone = "healthy" | "degrading" | "critical";

const toneLabel: Record<HealthTone, string> = {
  healthy: "🟢 Healthy",
  degrading: "🟡 Degrading",
  critical: "🔴 Critical",
};

export const AIExecutiveSummary: React.FC<{
  tone: HealthTone;
  happened: string[];
  actions: string[];
  impact: string;
  nextAction: string;
}> = ({ tone, happened, actions, impact, nextAction }) => {
  return (
    <Card className="rounded-2xl border-white/10 bg-background/50 p-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground">AI Executive Summary</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">System Health: {toneLabel[tone]}</Badge>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <p><span className="text-muted-foreground">What Happened:</span> {happened.join(" ")}</p>
        <p><span className="text-muted-foreground">What AI Did:</span> {actions.join(" ")}</p>
        <p><span className="text-muted-foreground">Business Impact:</span> {impact}</p>
        <p><span className="text-muted-foreground">Next Action:</span> {nextAction}</p>
      </div>
    </Card>
  );
};

export const GlobalAIControl: React.FC<{
  mode: "assist" | "semi-auto" | "full-auto";
  setMode: (v: "assist" | "semi-auto" | "full-auto") => void;
  risk: "low" | "medium" | "high";
  setRisk: (v: "low" | "medium" | "high") => void;
  approvalOn: boolean;
  setApprovalOn: (v: boolean) => void;
}> = ({ mode, setMode, risk, setRisk, approvalOn, setApprovalOn }) => (
  <Card className="rounded-2xl border-white/10 bg-background/40 p-4">
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">AI Mode</Badge>
      {(["assist", "semi-auto", "full-auto"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className={`h-8 px-3 rounded-md text-xs ${mode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          {m}
        </button>
      ))}
      <Badge variant="outline" className="ml-2">Risk</Badge>
      {(["low", "medium", "high"] as const).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setRisk(r)}
          className={`h-8 px-3 rounded-md text-xs ${risk === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          {r}
        </button>
      ))}
      <label className="inline-flex items-center gap-2 ml-2 text-xs text-muted-foreground">
        Approval
        <Switch checked={approvalOn} onCheckedChange={setApprovalOn} />
      </label>
    </div>
  </Card>
);

export const ExecutiveBlockCard: React.FC<{
  title: string;
  lines: string[];
}> = ({ title, lines }) => (
  <Card className="rounded-2xl border-white/10 bg-background/35 p-4">
    <p className="text-xs font-semibold tracking-wide text-muted-foreground">{title}</p>
    <div className="mt-2 space-y-1 text-sm">
      {lines.map((line, idx) => (
        <p key={`${title}-${idx}`}>{line}</p>
      ))}
    </div>
  </Card>
);
