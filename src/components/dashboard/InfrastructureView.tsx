import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, BrainCircuit, Globe, Sparkles } from "lucide-react";
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps";
import { Badge } from "@/components/ui/badge";
import ModuleHeader from "./ModuleHeader";
import { getAutonomousActions } from "@/lib/autonomous";
import { withContextQuery } from "@/lib/context";

type RegionId = "us-east" | "eu-west" | "apac";
type EventItem = { ts: string; type: string; reason: string; impact: string; confidence: number; route: [RegionId, RegionId] };

const worldTopo = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const REGIONS: Record<RegionId, { label: string; provider: string; coordinates: [number, number]; glow: string }> = {
  "us-east": { label: "US-East", provider: "AWS", coordinates: [-77.0369, 38.9072], glow: "bg-blue-400" },
  "eu-west": { label: "EU-West", provider: "GCP", coordinates: [2.3522, 48.8566], glow: "bg-violet-400" },
  apac: { label: "APAC", provider: "Azure", coordinates: [103.8198, 1.3521], glow: "bg-emerald-400" },
};

const SEED_TIMELINE: EventItem[] = [
  {
    ts: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    type: "reroute",
    reason: "Latency spike in US-East exceeded 160ms threshold",
    impact: "Shifted 22% traffic to EU-West, latency down by 37ms",
    confidence: 0.94,
    route: ["us-east", "eu-west"],
  },
  {
    ts: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    type: "cost-opt",
    reason: "APAC burst demand increased compute cost",
    impact: "Rebalanced 14% non-critical traffic to US-East, cost down 9%",
    confidence: 0.9,
    route: ["apac", "us-east"],
  },
  {
    ts: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    type: "stability",
    reason: "Transient packet loss detected on EU-West edge",
    impact: "Temporary route to APAC active for read replicas, error rate normalized",
    confidence: 0.92,
    route: ["eu-west", "apac"],
  },
];

function getApiBase() {
  const root = (import.meta.env.VITE_WORKFLOWS_API_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
  return `${root}/api`;
}

function parseRoutingEvent(raw: { ts?: string; type?: string; payload?: Record<string, unknown> }): EventItem | null {
  const payload = raw.payload ?? {};
  const target = String(payload.target ?? "");
  const action = String(payload.action ?? raw.type ?? "reroute");
  const reason = String(payload.reason ?? `AI ${action} executed`);
  const impact = String(payload.impact ?? payload.result ?? "Traffic redistributed to improve resilience");
  const confidence = Number(payload.confidence ?? 0.9);

  let route: [RegionId, RegionId] = ["us-east", "eu-west"];
  if (target.includes("ap")) route = ["eu-west", "apac"];
  else if (target.includes("eu")) route = ["us-east", "eu-west"];
  else if (target.includes("us")) route = ["apac", "us-east"];

  return {
    ts: raw.ts ?? new Date().toISOString(),
    type: action,
    reason,
    impact,
    confidence: Number.isFinite(confidence) ? confidence : 0.9,
    route,
  };
}

const InfrastructureView: React.FC = () => {
  const [timeline, setTimeline] = useState<EventItem[]>(SEED_TIMELINE);
  const [replayIndex, setReplayIndex] = useState(0);
  const [liveTick, setLiveTick] = useState(0);

  useEffect(() => {
    void getAutonomousActions().then((actions) => {
      const mapped: EventItem[] = actions.slice(0, 6).map((a, idx) => ({
        ts: a.createdAt ?? new Date().toISOString(),
        type: a.type ?? "reroute",
        reason: a.decision ?? "AI routing optimization",
        impact: `Outcome: ${a.status}`,
        confidence: Number(a.confidence ?? 0.9),
        route: idx % 2 === 0 ? ["us-east", "eu-west"] : ["eu-west", "apac"],
      }));
      if (mapped.length) setTimeline((prev) => [...mapped, ...prev].slice(0, 20));
    }).catch(() => {
      // keep seeded timeline
    });
  }, []);

  useEffect(() => {
    const es = new EventSource(withContextQuery(`${getApiBase()}/autonomous/stream`));
    const handler = (ev: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(ev.data) as { ts?: string; type?: string; payload?: Record<string, unknown> };
        const item = parseRoutingEvent(parsed);
        if (!item) return;
        setTimeline((prev) => [item, ...prev].slice(0, 30));
        setReplayIndex(0);
      } catch {
        // no-op
      }
    };
    es.addEventListener("signal", handler as EventListener);
    es.addEventListener("decision", handler as EventListener);
    es.addEventListener("action", handler as EventListener);
    return () => es.close();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setLiveTick((n) => (n + 1) % 1000), 900);
    return () => window.clearInterval(id);
  }, []);

  const selectedEvent = timeline[Math.min(replayIndex, Math.max(0, timeline.length - 1))];
  const activeFlows = useMemo(() => {
    if (!selectedEvent) return [];
    const [from, to] = selectedEvent.route;
    return [{ from, to, key: `${from}-${to}-${selectedEvent.ts}` }];
  }, [selectedEvent]);

  return (
    <div className="space-y-6 pb-10">
      <ModuleHeader
        title="Global Infrastructure Visualization"
        subtitle="Live world routing map with AI-driven traffic orchestration"
      />

      <div className="rounded-2xl border border-white/15 bg-[#050a16] p-6 backdrop-blur-xl shadow-[0_16px_48px_rgba(2,8,23,0.45)] relative isolate">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          aria-hidden
        >
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
        </div>
        <div className="flex items-center justify-between mb-4 relative z-[1]">
          <div className="inline-flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-300" />
            <p className="text-sm font-semibold tracking-tight text-white/90">Global Traffic Fabric</p>
          </div>
          <Badge className="bg-emerald-500/20 border border-emerald-300/30 text-emerald-200">
            Live AI routing
          </Badge>
        </div>
        <div className="relative z-[1] rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <ComposableMap projectionConfig={{ scale: 145 }} width={980} height={420} style={{ width: "100%", height: "auto" }}>
            <Geographies geography={worldTopo}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#0B1326"
                    stroke="#1e2a44"
                    strokeWidth={0.45}
                    style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}
                  />
                ))
              }
            </Geographies>

            {activeFlows.map((flow) => {
              const from = REGIONS[flow.from];
              const to = REGIONS[flow.to];
              return (
                <g key={flow.key}>
                  <Line
                    from={from.coordinates}
                    to={to.coordinates}
                    stroke="#60a5fa"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeDasharray="8 8"
                    style={{ opacity: 0.85 }}
                  />
                  <motion.circle
                    cx={((from.coordinates[0] + 180) / 360) * 980}
                    cy={((90 - from.coordinates[1]) / 180) * 420}
                    r={3}
                    fill="#93c5fd"
                    animate={{
                      cx: [
                        ((from.coordinates[0] + 180) / 360) * 980,
                        ((to.coordinates[0] + 180) / 360) * 980,
                      ],
                      cy: [
                        ((90 - from.coordinates[1]) / 180) * 420,
                        ((90 - to.coordinates[1]) / 180) * 420,
                      ],
                    }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                  />
                </g>
              );
            })}

            {(Object.keys(REGIONS) as RegionId[]).map((id) => (
              <Marker key={id} coordinates={REGIONS[id].coordinates}>
                <g>
                  <motion.circle
                    r={13}
                    fill="rgba(59,130,246,0.18)"
                    animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.9, 0.45] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: id === "us-east" ? 0 : id === "eu-west" ? 0.5 : 1 }}
                  />
                  <circle r={5} fill="#93c5fd" />
                </g>
              </Marker>
            ))}
          </ComposableMap>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-[1]">
          {(Object.keys(REGIONS) as RegionId[]).map((id) => (
            <div key={id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-semibold tracking-tight text-white/90">{REGIONS[id].label}</p>
              <p className="text-[11px] text-white/55 mt-1">{REGIONS[id].provider}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="rounded-2xl border border-white/15 bg-[#070d1b] p-6 backdrop-blur-xl shadow-[0_16px_48px_rgba(2,8,23,0.35)]">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-blue-300" />
            <p className="text-sm font-semibold tracking-tight text-white/90">Timeline Playback</p>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, timeline.length - 1)}
            value={replayIndex}
            onChange={(e) => setReplayIndex(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] text-white/50">
              Event {Math.min(replayIndex + 1, timeline.length)} of {timeline.length}
            </p>
            <p className="text-xs text-white/60 mt-1">{selectedEvent ? new Date(selectedEvent.ts).toLocaleString() : "No events yet"}</p>
            <p className="text-sm text-white/85 mt-3">{selectedEvent?.reason ?? "AI stream initializing..."}</p>
            <Badge className="mt-3 bg-indigo-500/20 border border-indigo-300/30 text-indigo-200">
              Confidence {Math.round((selectedEvent?.confidence ?? 0.92) * 100)}%
            </Badge>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-[#070d1b] p-6 backdrop-blur-xl shadow-[0_16px_48px_rgba(2,8,23,0.35)]">
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit className="w-4 h-4 text-violet-300" />
            <p className="text-sm font-semibold tracking-tight text-white/90">AI Routing Panel</p>
          </div>
          <div className="space-y-3 max-h-[340px] overflow-y-auto custom-scrollbar">
            {timeline.slice(0, 8).map((item, i) => (
              <motion.button
                key={`${item.ts}-${i}`}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setReplayIndex(i)}
                className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-white/50">{new Date(item.ts).toLocaleTimeString()}</p>
                  <Badge className="bg-blue-500/20 border border-blue-300/30 text-blue-200">{item.type}</Badge>
                </div>
                <p className="text-xs text-white/85 mt-2">{item.reason}</p>
                <p className="text-[11px] text-emerald-300 mt-1">{item.impact}</p>
              </motion.button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="inline-flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <p className="text-[11px] text-white/65">Live flow pulse: {liveTick % 2 === 0 ? "active" : "syncing"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfrastructureView;
