import React, { useEffect, useMemo, useState } from "react";
import { Bot, Rocket, Play, Workflow, Activity, AlertTriangle, RotateCcw, Sparkles, Search } from "lucide-react";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onNavigate: (tab: string) => void;
  onCreateWorkflow: () => Promise<void> | void;
  onExecuteWorkflow: () => Promise<void> | void;
  onDeploy: () => void;
  onRollback: () => Promise<void> | void;
  onAiPrompt: (prompt: string) => void;
}

type Cmd = {
  id: string;
  label: string;
  group: "Navigation" | "Actions" | "AI Commands";
  shortcut?: string;
  icon: React.ReactNode;
  run: () => Promise<void> | void;
};

const HISTORY_KEY = "astraops.command.history";

const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  onNavigate,
  onCreateWorkflow,
  onExecuteWorkflow,
  onDeploy,
  onRollback,
  onAiPrompt,
}) => {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setHistory(parsed.slice(0, 10));
    } catch {
      // no-op
    }
  }, []);

  const remember = (id: string) => {
    const next = [id, ...history.filter((x) => x !== id)].slice(0, 10);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // no-op
    }
  };

  const commands = useMemo<Cmd[]>(() => [
    { id: "nav-workflows", label: "Go to Workflows", group: "Navigation", shortcut: "G W", icon: <Workflow className="w-4 h-4" />, run: () => onNavigate("workflows") },
    { id: "nav-runs", label: "Go to Runs", group: "Navigation", shortcut: "G R", icon: <Activity className="w-4 h-4" />, run: () => onNavigate("runs") },
    { id: "nav-deploy", label: "Go to Deployments", group: "Navigation", shortcut: "G D", icon: <Rocket className="w-4 h-4" />, run: () => onNavigate("deployments") },
    { id: "nav-incidents", label: "Go to Incidents", group: "Navigation", shortcut: "G I", icon: <AlertTriangle className="w-4 h-4" />, run: () => onNavigate("incidents") },
    { id: "act-create-workflow", label: "Create Workflow", group: "Actions", shortcut: "A C", icon: <Workflow className="w-4 h-4" />, run: onCreateWorkflow },
    { id: "act-execute-workflow", label: "Execute Workflow", group: "Actions", shortcut: "A E", icon: <Play className="w-4 h-4" />, run: onExecuteWorkflow },
    { id: "act-deploy", label: "Deploy", group: "Actions", shortcut: "A D", icon: <Rocket className="w-4 h-4" />, run: onDeploy },
    { id: "act-rollback", label: "Trigger Rollback", group: "Actions", shortcut: "A R", icon: <RotateCcw className="w-4 h-4" />, run: onRollback },
    { id: "ai-fix-memory", label: "Fix memory issue", group: "AI Commands", shortcut: "AI 1", icon: <Bot className="w-4 h-4" />, run: () => onAiPrompt("Fix memory issue") },
    { id: "ai-opt-cost", label: "Optimize cost", group: "AI Commands", shortcut: "AI 2", icon: <Sparkles className="w-4 h-4" />, run: () => onAiPrompt("Optimize cost") },
    { id: "ai-scale-cluster", label: "Scale cluster", group: "AI Commands", shortcut: "AI 3", icon: <Bot className="w-4 h-4" />, run: () => onAiPrompt("Scale cluster") },
  ], [onCreateWorkflow, onDeploy, onExecuteWorkflow, onNavigate, onRollback, onAiPrompt]);

  const historySorted = useMemo(() => {
    if (!history.length) return commands;
    const rank = new Map(history.map((id, idx) => [id, idx]));
    return [...commands].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  }, [commands, history]);

  const execute = async (cmd: Cmd) => {
    try {
      await cmd.run();
      remember(cmd.id);
      onOpenChange(false);
      setQuery("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Command failed");
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="bg-[#0B1220] text-white border border-white/10 rounded-xl">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search commands and actions..."
          className="bg-[#0B1220] text-white placeholder:text-white/35"
        />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>
            <div className="py-8 text-white/45 text-sm flex items-center justify-center gap-2">
              <Search className="w-4 h-4" /> No matching commands
            </div>
          </CommandEmpty>

          {(["Navigation", "Actions", "AI Commands"] as const).map((group) => (
            <CommandGroup key={group} heading={group}>
              {historySorted
                .filter((c) => c.group === group)
                .map((cmd) => (
                  <CommandItem
                    key={cmd.id}
                    value={`${cmd.label} ${cmd.group}`}
                    onSelect={() => void execute(cmd)}
                    className="text-white data-[selected=true]:bg-white/10 data-[selected=true]:text-white rounded-lg"
                  >
                    {cmd.icon}
                    <span>{cmd.label}</span>
                    {cmd.shortcut ? <CommandShortcut>{cmd.shortcut}</CommandShortcut> : null}
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </div>
    </CommandDialog>
  );
};

export default CommandPalette;

