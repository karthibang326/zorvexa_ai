import React from "react";
import { Workflow, Settings, Zap, Clock } from "lucide-react";

const WorkflowMetadataPanel = () => {
  return (
    <div className="flex flex-col h-full bg-[#0B1220] overflow-hidden">
      <div className="p-6 border-b border-[#1F2937] bg-[#111827]/30">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B7280] mb-8">Workflow Metadata</h3>
        
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center">
                   <Workflow className="w-4 h-4 text-[#6366F1]" />
                </div>
                <div>
                   <p className="text-[10px] text-[#6B7280] uppercase tracking-wide">Resource Identity</p>
                   <p className="text-[13px] text-[#E5E7EB] font-semibold">Auto-Scale Prod v2.4</p>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.04]">
                <div>
                   <p className="text-[10px] text-[#6B7280] uppercase tracking-tight">Status</p>
                   <span className="text-[11px] text-[#10B981] font-bold">ACTIVE</span>
                </div>
                <div>
                   <p className="text-[10px] text-[#6B7280] uppercase tracking-tight">Version</p>
                   <span className="text-[11px] text-[#E5E7EB] font-bold">v6.4.2-STABLE</span>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Aggregate Metrics (24h)</h4>
             <div className="space-y-3">
                <div className="flex justify-between items-center text-[12px]">
                   <span className="text-[#6B7280]">Success Rate</span>
                   <span className="text-[#10B981] font-bold tabular-nums">99.8%</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                   <span className="text-[#6B7280]">Avg Duration</span>
                   <span className="text-[#E5E7EB] font-medium tabular-nums">1.42s</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                   <span className="text-[#6B7280]">Total Runs</span>
                   <span className="text-[#E5E7EB] font-medium tabular-nums">1,240</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="p-6 mt-auto">
         <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
            <div className="flex items-center gap-2">
               <Settings className="w-3.5 h-3.5 text-[#6B7280]" />
               <span className="text-[11px] font-semibold text-[#E5E7EB] uppercase tracking-wider text-center">Settings Registry</span>
            </div>
            <p className="text-[11px] text-[#6B7280] leading-relaxed italic">
               Workflow is currently locked to Cluster Alpha. Managed by Infrastructure Policy 8.4.
            </p>
         </div>
      </div>
    </div>
  );
};

export default WorkflowMetadataPanel;
