import React from "react";
import { cn } from "@/lib/utils";
import {
  Workflow, FileStack,
  Zap, Bell, Clock,
  Activity, AlertCircle, Terminal,
  Search
} from "lucide-react";
import { motion } from "framer-motion";

interface SidebarSectionProps {
  title: string;
  items: {
    id: string;
    label: string;
    icon: any;
    count?: number;
    color?: string;
  }[];
  activeId: string;
  onSelect: (id: string) => void;
}

const SidebarSection = ({ title, items, activeId, onSelect }: SidebarSectionProps) => (
  <div className="mb-5">
    <h3 className="px-4 mb-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[#6B7280]">
      {title}
    </h3>
    <div className="space-y-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-[8px] transition-colors group relative",
            activeId === item.id 
              ? "bg-[#6366F1]/10 text-white border-l-2 border-[#6366F1]" 
              : "text-[#9CA3AF] hover:bg-white/[0.04] hover:text-[#E5E7EB] border-l-2 border-transparent"
          )}
        >
          <item.icon className={cn(
            "w-4 h-4",
            activeId === item.id ? "text-[#6366F1]" : "text-[#6B7280] group-hover:text-[#9CA3AF]"
          )} />
          <span className={cn(
            "text-[13px] font-medium flex-1 text-left",
            activeId === item.id ? "text-[#E5E7EB]" : ""
          )}>{item.label}</span>
          
          {item.count !== undefined && (
            <span className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full",
              activeId === item.id 
                ? "bg-[#1F2937] text-[#9CA3AF]" 
                : "bg-[#1F2937] text-[#6B7280]"
            )}>
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  </div>
);

interface WorkflowSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const WorkflowSidebar = ({ activeView, setActiveView }: WorkflowSidebarProps) => {
  const SECTIONS = [
    {
      title: "Workflows",
      items: [
        { id: "all-workflows", label: "Workflows", icon: Workflow, count: 10 },
      ]
    },
    {
      title: "Automation",
      items: [
        { id: "webhooks", label: "Webhooks", icon: Bell, count: 12 },
        { id: "events", label: "Events", icon: Zap },
        { id: "schedules", label: "Schedules", icon: Clock, count: 5 },
      ]
    },
    {
      title: "Execution",
      items: [
        { id: "runs", label: "Runs", icon: Activity },
        { id: "failures", label: "Failures", icon: AlertCircle, count: 2 },
        { id: "logs", label: "Live Logs", icon: Terminal },
      ]
    }
  ];

  return (
    <aside className="w-1/4 max-w-[280px] border-r border-[#1F2937] bg-[#0B1220] flex flex-col h-full z-10">
      <div className="p-4 pb-2">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] group-focus-within:text-[#6366F1] transition-colors" />
          <input 
            type="text" 
            placeholder="Search workflows..." 
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-[#111827] border border-[#1F2937] focus:border-[#6366F1]/50 focus:ring-1 focus:ring-[#6366F1]/20 outline-none text-[13px] text-[#E5E7EB] transition-all placeholder:text-[#6B7280]"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar px-0 py-4">
        {SECTIONS.map((section) => (
          <SidebarSection 
            key={section.title}
            title={section.title}
            items={section.items}
            activeId={activeView}
            onSelect={setActiveView}
          />
        ))}
      </div>
      
      <div className="p-5 border-t border-[#1F2937]">
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
             <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6B7280]">System Health</span>
             <span className="px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] text-[10px] font-bold tracking-tight">OPTIMAL</span>
          </div>
          <div className="h-1 w-full bg-[#1F2937] rounded-full overflow-hidden">
             <div className="h-full bg-[#10B981] w-[65%]" />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default WorkflowSidebar;
