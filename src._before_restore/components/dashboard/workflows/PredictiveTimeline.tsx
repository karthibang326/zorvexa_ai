import React from "react";
import { cn } from "@/lib/utils";

export interface PredictiveTimelineEvent {
  id: string;
  workflowId: string;
  offsetLabel: "+5 min" | "+10 min" | "+30 min";
  title: string;
  detail: string;
  tone: "red" | "yellow" | "green";
}

interface PredictiveTimelineProps {
  currentLabel: string;
  events: PredictiveTimelineEvent[];
  onSelectEvent: (workflowId: string) => void;
}

const PredictiveTimeline: React.FC<PredictiveTimelineProps> = ({
  currentLabel,
  events,
  onSelectEvent,
}) => {
  return (
    <div className="border-b border-[#1F2937] px-8 py-3 shrink-0 bg-[#060D1B]">
      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#6B7280] italic mb-3">
        Predictive Timeline
      </p>
      <div className="relative grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="absolute left-0 right-0 top-5 h-px bg-white/10 hidden md:block" />
        <div className="rounded-xl border border-white/10 bg-[#0B1220] px-3 py-2 relative">
          <p className="text-[10px] text-white/40">Now</p>
          <p className="text-[11px] text-white/80 truncate">{currentLabel}</p>
        </div>
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelectEvent(event.workflowId)}
            className={cn(
              "rounded-xl border px-3 py-2 text-left transition-all duration-200 relative hover:brightness-110",
              event.tone === "red" && "border-red-500/25 bg-red-500/10",
              event.tone === "yellow" && "border-yellow-500/25 bg-yellow-500/10",
              event.tone === "green" && "border-emerald-500/25 bg-emerald-500/10"
            )}
          >
            <span
              className={cn(
                "absolute -top-1.5 left-3 w-3 h-3 rounded-full border-2 border-[#060D1B]",
                event.tone === "red" && "bg-red-400",
                event.tone === "yellow" && "bg-yellow-400",
                event.tone === "green" && "bg-emerald-400"
              )}
            />
            <p className="text-[10px] text-white/50">{event.offsetLabel}</p>
            <p className="text-[11px] text-white font-semibold">{event.title}</p>
            <p className="text-[10px] text-white/70">{event.detail}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PredictiveTimeline;
