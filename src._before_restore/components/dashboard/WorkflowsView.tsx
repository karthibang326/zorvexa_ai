import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import WorkflowList from "./workflows/WorkflowList";
import WorkflowBuilder from "./workflows/WorkflowBuilder";
import ExecutionView from "./workflows/ExecutionView";
import TriggerManagement from "./workflows/TriggerManagement";
import TemplateLibrary from "./workflows/TemplateLibrary";
import ModuleHeader from "./ModuleHeader";
import { postWorkflow } from "@/lib/workflows";
import { useOrchestrationStore } from "@/store/orchestration";
import { AIExecutiveSummary, ExecutiveBlockCard, GlobalAIControl } from "./ai-ceo/ExecutiveBlocks";

interface WorkflowsViewProps {
  activeView: string;
  createTrigger?: number;
}

const WorkflowsView: React.FC<WorkflowsViewProps> = ({ activeView, createTrigger = 0 }) => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [createContext, setCreateContext] = useState<{ filter?: string }>({});
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [aiMode, setAiMode] = useState<"assist" | "semi-auto" | "full-auto">("assist");
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
  const [approvalOn, setApprovalOn] = useState(true);
  const setActiveWorkflowId = useOrchestrationStore((s) => s.setActiveWorkflowId);

  useEffect(() => {
    setActiveWorkflowId(selectedWorkflowId);
  }, [selectedWorkflowId, setActiveWorkflowId]);

  useEffect(() => {
    if (!createTrigger || activeView !== "workflows") return;
    void (async () => {
      if (isCreatingWorkflow) return;
      try {
        setIsCreatingWorkflow(true);
        const created = await postWorkflow({
          name: "New Workflow",
          type: "agent",
          nodes: [],
          edges: [],
        });
        setSelectedWorkflowId(created.id);
        toast.success("Workflow created");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to create workflow";
        toast.error(msg);
      } finally {
        setIsCreatingWorkflow(false);
      }
    })();
  }, [createTrigger, activeView, isCreatingWorkflow]);

  const renderContent = () => {
    if (selectedWorkflowId && activeView === "workflows") {
      return <WorkflowBuilder workflowId={selectedWorkflowId} initialContext={createContext} />;
    }

    switch (activeView) {
      case "workflows":
        return (
          <WorkflowList
            onSelect={(id) => setSelectedWorkflowId(id)}
            onFilterChange={(f) => setCreateContext({ filter: f })}
          />
        );
      case "templates":
        return <TemplateLibrary />;
      case "integrations":
        return <TriggerManagement />;
      case "runs":
        return <ExecutionView />;
      default:
        return <WorkflowList onSelect={(id) => setSelectedWorkflowId(id)} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border border-white/5 overflow-hidden rounded-[2.5rem] shadow-sm relative">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <div className="px-5 pt-5 space-y-3">
          <AIExecutiveSummary
            tone={activeView === "runs" ? "degrading" : "healthy"}
            happened={["CI pipeline is executing with one delayed stage in build step 3."]}
            actions={["AI reordered non-blocking jobs and removed a bottleneck path in dependency install."]}
            impact="Delivery risk reduced and release velocity protected for current sprint."
            nextAction="Keep Assist mode for approval-safe optimization and auto re-run failed non-critical steps."
          />
          <GlobalAIControl mode={aiMode} setMode={setAiMode} risk={risk} setRisk={setRisk} approvalOn={approvalOn} setApprovalOn={setApprovalOn} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <ExecutiveBlockCard
              title="Workflow Status"
              lines={[
                "Status: Running",
                "What is happening: CI pipeline executing; stage 3 has a delay.",
                "AI Action: Reordered execution and removed bottleneck dependency chain.",
              ]}
            />
            <ExecutiveBlockCard
              title="Bottleneck Detection"
              lines={[
                "Detected issue: Slow build stage.",
                "Impact: Deployment delayed by ~4 minutes.",
                "AI Fix: Parallelized independent jobs and enabled cache reuse.",
              ]}
            />
            <ExecutiveBlockCard
              title="Workflow Optimization"
              lines={[
                "Time Saved: 35%",
                "Changes: Parallel steps + cached dependencies.",
                "AI can: Re-run failed steps, skip non-critical steps, optimize pipelines.",
              ]}
            />
          </div>
        </div>
        <ModuleHeader 
          title={activeView === "runs" ? "Runs" : "Workflows"} 
          subtitle={activeView === "runs" ? "Execution-only view: trigger, retry, and logs" : "Automate infrastructure orchestration"} 
          actions={null}
        />

        {/* View Container */}
        <main className="flex-1 overflow-hidden relative bg-secondary/40">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView + (selectedWorkflowId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default WorkflowsView;

