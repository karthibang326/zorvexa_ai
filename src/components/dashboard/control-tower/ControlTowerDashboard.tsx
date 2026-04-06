import * as React from "react";
import { SystemPulse } from "./SystemPulse";
import { AutonomousOODA } from "./AutonomousOODA";
import { FinOpsSavings } from "./FinOpsSavings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListIcon, PlayIcon, SparklesIcon, ShieldAlertIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function ControlTowerDashboard() {
  return (
    <div className="flex flex-col space-y-6 w-full p-6 animate-in fade-in duration-700 h-full overflow-y-auto no-scrollbar">
      {/* 1. Header with Global Context */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Control Tower</h1>
          <p className="text-slate-400 text-sm mt-1">
            Autonomous Engine: <span className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] ml-1">Live Loop Running</span>
          </p>
        </div>
        <div className="flex space-x-2">
           <button className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                <SparklesIcon className="h-4 w-4" />
                <span>Ask Zorvexa</span>
           </button>
        </div>
      </div>

      {/* 2. System Pulse (High-Density Metrics) */}
      <SystemPulse />

      {/* 3. Main Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        
        {/* Left Column: Flow & Learning (OODA) */}
        <div className="lg:col-span-2 space-y-6">
          <AutonomousOODA />
          <FinOpsSavings />
        </div>

        {/* Right Column: Execution Tracking & Alerts */}
        <div className="lg:col-span-4 space-y-6">
            
          {/* Active Workflows/Jobs */}
          <Card className="border-white/10 bg-slate-950/40 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/5">
              <CardTitle className="text-sm font-medium text-slate-300">
                Active Execution Stream
              </CardTitle>
              <PlayIcon className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                <TableHeader className="bg-slate-900/50">
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Workflow Task</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Environment</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-slate-500 tracking-wider text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: "1", name: "payments-api:scale-up", env: "Production", status: "Running", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
                    { id: "2", name: "cleanup:idle-volumes", env: "Staging", status: "Healthy", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
                    { id: "3", name: "alert:p99-latency-spike", env: "Production", status: "Critical", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
                  ].map((job) => (
                    <TableRow key={job.id} className="hover:bg-white/5 border-white/5 transition-colors cursor-pointer group">
                      <TableCell className="font-mono text-sm text-slate-300 group-hover:text-white">{job.name}</TableCell>
                      <TableCell className="text-xs text-slate-500 font-semibold">{job.env}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`${job.color} border py-0 text-[10px] uppercase font-black`}>
                           {job.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* AI Critical Insights */}
          <Card className="border-white/10 bg-indigo-950/20 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8">
               <ShieldAlertIcon className="h-24 w-24 text-rose-500/5 group-hover:text-rose-500/10 transition-colors" />
            </div>
            <CardHeader>
               <CardTitle className="text-sm font-bold text-rose-400 flex items-center">
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  AI Prediction: Resource Depletion
               </CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-slate-300 leading-relaxed max-w-md">
                  Based on current traffic acceleration in <strong>us-east-1</strong>, we predict memory exhaustion in the <strong>auth-cluster</strong> within 4 hours. 
                  <br /><br />
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Autonomous recommendation applied: </span>
                  <strong className="text-emerald-400 ml-1">Pre-scaling to 4 replicas.</strong>
               </p>
               <div className="mt-6 flex space-x-3">
                  <button className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded transition-all">
                     View Analysis
                  </button>
                  <button className="text-[10px] font-black uppercase tracking-widest border border-white/10 text-slate-400 hover:text-white px-4 py-2 rounded transition-all">
                     Audit Decision
                  </button>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
