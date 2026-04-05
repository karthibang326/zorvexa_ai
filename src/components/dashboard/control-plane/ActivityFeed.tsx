import React from "react";
import { getAIEmptyStateCopy } from "@/lib/ai-empty-state";

export interface ActivityItem {
  id: string;
  message: string;
  ts: string;
}

const ActivityFeed: React.FC<{ items: ActivityItem[]; title?: string }> = ({ items, title = "Autonomous Activity Feed" }) => {
  const empty = getAIEmptyStateCopy();
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0B1220] overflow-hidden">
      <div className="h-11 px-4 border-b border-white/10 flex items-center">
        <p className="text-[10px] uppercase tracking-widest text-white/45">{title}</p>
      </div>
      <div className="max-h-[320px] overflow-y-auto divide-y divide-white/5">
        {items.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-white/35">
            <p>{empty.title}</p>
            <p className="text-[11px] text-white/30 mt-1">{empty.subtitle}</p>
          </div>
        ) : (
          items.map((x) => (
            <div key={x.id} className="px-4 py-3">
              <p className="text-[13px] text-white/85">{x.message}</p>
              <p className="text-[11px] text-white/35 mt-1">{new Date(x.ts).toLocaleTimeString()}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default ActivityFeed;

