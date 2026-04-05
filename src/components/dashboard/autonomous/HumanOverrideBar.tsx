import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, OctagonAlert, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { setAutonomousMode, stopK8sAutonomousLoop } from "@/lib/autonomous";
import { postOpsEmergencyStop } from "@/lib/ai-ops-learning";

export type HumanOverrideBarProps = {
  onAfterStop?: () => void;
  onAfterRollback?: () => void;
  /** When true, the strip starts expanded (e.g. operator already engaged manual override). */
  defaultExpanded?: boolean;
};

export const HumanOverrideBar: React.FC<HumanOverrideBarProps> = ({
  onAfterStop,
  onAfterRollback,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [stopOpen, setStopOpen] = useState(false);

  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [platformStopOpen, setPlatformStopOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const stopAi = async () => {
    setBusy(true);
    try {
      await setAutonomousMode({ enabled: false, manualOverride: true });
      await stopK8sAutonomousLoop().catch(() => {});
      toast.success("AI automation paused — manual override engaged.");
      onAfterStop?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Stop failed");
    } finally {
      setBusy(false);
      setStopOpen(false);
    }
  };

  const platformEmergencyStop = async () => {
    setBusy(true);
    try {
      await postOpsEmergencyStop();
      await setAutonomousMode({ enabled: false, manualOverride: true });
      await stopK8sAutonomousLoop().catch(() => {});
      toast.success("All AI loops stopped on the platform (ops + K8s + orchestrator).");
      onAfterStop?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Platform stop failed");
    } finally {
      setBusy(false);
      setPlatformStopOpen(false);
    }
  };

  const rollback = async () => {
    setBusy(true);
    try {
      toast.info("Rollback signal queued — reconciling last reversible change.");
      window.dispatchEvent(new CustomEvent("zorvexa:rollback-request"));
      onAfterRollback?.();
    } finally {
      setBusy(false);
      setRollbackOpen(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <button
          type="button"
          className="w-full px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-white/[0.04] transition-colors"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="flex items-start gap-2 min-w-0">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-white/45 shrink-0 mt-1" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white/45 shrink-0 mt-1" />
            )}
            <div>
              <p className="text-sm font-semibold text-white/90">Emergency controls</p>
              <p className="text-[11px] text-white/45 mt-0.5">
                Optional escalations — not an error. Use after &quot;Pause AI&quot; if you need K8s loop stop or rollback.
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-white/35 shrink-0">{expanded ? "Hide" : "Show"}</span>
        </button>

        {expanded ? (
          <div className="border-t border-rose-500/20 bg-rose-950/15 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <OctagonAlert className="w-5 h-5 text-rose-300/90 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-rose-100/95">Stop &amp; rollback</p>
                <p className="text-[11px] text-white/50 mt-0.5">
                  Confirmed actions only. Does not delete audit history.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-9"
                onClick={() => setStopOpen(true)}
              >
                Stop AI
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 border-rose-400/35 text-rose-100 hover:bg-rose-500/15"
                onClick={() => setRollbackOpen(true)}
              >
                <Undo2 className="w-3.5 h-3.5 mr-1.5" />
                Rollback last action
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 border-amber-500/40 text-amber-100 hover:bg-amber-500/15"
                onClick={() => setPlatformStopOpen(true)}
              >
                Stop all platform loops
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <AlertDialog open={stopOpen} onOpenChange={setStopOpen}>
        <AlertDialogContent className="bg-[#0f141c] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Stop all AI automation?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This disables autonomous mode and stops the Kubernetes AI loop. Operators retain full manual control.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-500"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void stopAi();
              }}
            >
              Confirm stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={platformStopOpen} onOpenChange={setPlatformStopOpen}>
        <AlertDialogContent className="bg-[#0f141c] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Stop all platform AI loops?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Stops the continuous ops learning loop, Kubernetes autonomous loop, and AI orchestrator on the server. Also
              engages manual override (same as Pause AI). Use for incidents or change freezes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-500"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void platformEmergencyStop();
              }}
            >
              Confirm platform stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rollbackOpen} onOpenChange={setRollbackOpen}>
        <AlertDialogContent className="bg-[#0f141c] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback last AI action?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Zorvexa will request rollback of the most recent reversible change. Irreversible mutations may require a
              pipeline rollback instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-500"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void rollback();
              }}
            >
              Confirm rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
