import React from "react";
import { Play, CheckCircle2, AlertCircle, Database, Zap } from "lucide-react";

const ExecutionMetadataPanel = () => {
  return (
    <div className="flex flex-col h-full bg-[#0B1220] overflow-hidden">
      <div className="p-6 border-b border-[#1F2937] bg-[#111827]/30">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B7280] mb-8">Execution Metadata</h3>
        
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center">
                   <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                </div>
                <div>
                   <p className="text-[10px] text-[#6B7280] uppercase tracking-wide">Run ID</p>
                   <p className="text-[13px] text-[#E5E7EB] font-semibold">run-902</p>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.04]">
                <div>
                   <p className="text-[10px] text-[#6B7280] uppercase tracking-tight">Outcome</p>
                   <span className="text-[11px] text-[#10B981] font-bold">SUCCESS</span>
                </div>
                <div>
                   <p className="text-[10px] text-[#6B7280] uppercase tracking-tight">Duration</p>
                   <span className="text-[11px] text-[#E5E7EB] font-bold tabular-nums">1.4s</span>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Resource Origin</h4>
             <div className="space-y-3">
                <div className="flex items-start gap-3">
                   <div className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-[#6B7280]" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[12px] text-[#E5E7EB] font-medium">Cluster Alpha</span>
                      <span className="text-[10px] text-[#9CA3AF]">us-east-1 • Production</span>
                   </div>
                </div>
                <div className="flex items-start gap-3">
                   <div className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4 text-[#6B7280]" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[12px] text-[#E5E7EB] font-medium">Deployment 8.4</span>
                      <span className="text-[10px] text-[#9CA3AF]">commit b3f9a2 • Main</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="p-6 mt-auto">
         <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Diagnostic Outcome</h4>
            <p className="text-[11px] text-[#6B7280] font-medium leading-relaxed italic">
               Execution completed without downstream saturation. Performance is within nominal p99 thresholds.
            </p>
         </div>
      </div>
    </div>
  );
};

export default ExecutionMetadataPanel;
