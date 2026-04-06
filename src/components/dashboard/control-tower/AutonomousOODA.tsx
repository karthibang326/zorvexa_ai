import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SparklesIcon, CommandIcon, EyeIcon, SearchIcon, ActivityIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const OODA_STEPS = [
  { id: "OBSERVE", label: "Observe", icon: EyeIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "ORIENT", label: "Orient", icon: SearchIcon, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "DECIDE", label: "Decide", icon: SparklesIcon, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "ACT", label: "Act", icon: CommandIcon, color: "text-rose-500", bg: "bg-rose-500/10" },
];

export function AutonomousOODA() {
  const [activeStep, setActiveStep] = React.useState(0);

  // Mock circular progress
  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((s) => (s + 1) % OODA_STEPS.length);
    }, 4500); // Pulse every 4.5s
    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="border-white/10 bg-slate-950/50 backdrop-blur-xl h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">
          Autonomous Loop (OODA)
        </CardTitle>
        <div className="flex items-center space-x-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
            AI Active
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative flex justify-center items-center h-[240px]">
          {/* Animated SVG Ring */}
          <svg className="absolute w-[240px] h-[240px] rotate-[-90deg]">
            <circle
              cx="120"
              cy="120"
              r="100"
              className="stroke-slate-800 fill-none"
              strokeWidth="4"
            />
            {/* Active Highlight Arc */}
            <circle
              cx="120"
              cy="120"
              r="100"
              className="stroke-indigo-500 fill-none transition-all duration-1000 ease-in-out"
              strokeWidth="4"
              strokeDasharray="628" /* 2 * PI * 100 */
              strokeDashoffset={628 - (628 / 4)}
              style={{ transform: `rotate(${(activeStep * 360) / 4}deg)`, transformOrigin: "center" }}
            />
          </svg>

          {/* Central AI State */}
          <div className="z-10 text-center">
            <ActivityIcon className="h-10 w-10 mx-auto text-indigo-400 mb-2" />
            <div className="text-xl font-bold text-white tracking-widest uppercase">
              {OODA_STEPS[activeStep].label}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">
              Phase {activeStep + 1} of 4
            </div>
          </div>

          {/* Individual Phase Nodes */}
          {OODA_STEPS.map((step, i) => {
            const angle = (i * 360) / 4 - 90;
            const x = 120 + 100 * Math.cos((angle * Math.PI) / 180);
            const y = 120 + 100 * Math.sin((angle * Math.PI) / 180);
            const isActive = i === activeStep;

            return (
              <div
                key={step.id}
                role="status"
                aria-label={isActive ? `Active state: ${step.label}` : step.label}
                className={cn(
                  "absolute flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-500",
                  isActive 
                    ? "border-indigo-500 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110" 
                    : "border-slate-800 bg-slate-900"
                )}
                style={{ left: x - 24, top: y - 24 }}
              >
                <step.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-500")} />
              </div>
            );
          })}
        </div>
        
        {/* State Message */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-400 italic">
            "AI is currently {OODA_STEPS[activeStep].id.toLowerCase()}ing infrastructure drift in 'service-payments'..."
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
