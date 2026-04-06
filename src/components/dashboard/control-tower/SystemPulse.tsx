import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { ArrowDownIcon, ArrowUpIcon, ActivityIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricData {
  value: number;
  label: string;
  unit: string;
  trend: number;
  data: { val: number }[];
  color: string;
}

const metrics: MetricData[] = [
  {
    label: "CPU Usage",
    value: 42,
    unit: "%",
    trend: -5,
    color: "#6366F1",
    data: Array.from({ length: 20 }, () => ({ val: Math.random() * 20 + 30 })),
  },
  {
    label: "Latency",
    value: 124,
    unit: "ms",
    trend: 12,
    color: "#F43F5E",
    data: Array.from({ length: 20 }, () => ({ val: Math.random() * 50 + 100 })),
  },
  {
    label: "Error Rate",
    value: 0.02,
    unit: "%",
    trend: -1,
    color: "#10B981",
    data: Array.from({ length: 20 }, () => ({ val: Math.random() * 0.1 })),
  },
  {
    label: "Cloud Cost",
    value: 1240,
    unit: "$",
    trend: -2,
    color: "#F59E0B",
    data: Array.from({ length: 20 }, () => ({ val: Math.random() * 200 + 1000 })),
  },
];

export function SystemPulse() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <Card key={m.label} className="overflow-hidden border-white/10 bg-slate-950/50 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              {m.label}
            </CardTitle>
            <ActivityIcon className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold tracking-tight text-white">
                {m.value.toLocaleString()}
                <span className="text-lg font-normal text-slate-500 ml-1">
                  {m.unit}
                </span>
              </span>
              <div
                className={cn(
                  "flex items-center text-xs font-medium",
                  m.trend > 0 ? "text-rose-500" : "text-emerald-500"
                )}
              >
                {m.trend > 0 ? (
                  <ArrowUpIcon className="mr-1 h-3 w-3" />
                ) : (
                  <ArrowDownIcon className="mr-1 h-3 w-3" />
                )}
                {Math.abs(m.trend)}%
              </div>
            </div>
            <div className="h-[40px] mt-4 w-full">
              <ChartContainer config={{ [m.label]: { color: m.color } }}>
                <AreaChart data={m.data}>
                  <defs>
                    <linearGradient id={`gradient-${m.label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={m.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="val"
                    stroke={m.color}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#gradient-${m.label})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
