import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUpIcon, SparklesIcon, PiggyBankIcon } from "lucide-react";

export function FinOpsSavings() {
  return (
    <Card className="border-white/10 bg-slate-900/40 backdrop-blur-md overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4">
        <SparklesIcon className="h-20 w-20 text-indigo-500/10 -rotate-12" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">
          AI Savings Applied
        </CardTitle>
        <PiggyBankIcon className="h-4 w-4 text-emerald-500" />
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-col space-y-1">
          <div className="text-4xl font-black text-white tracking-tighter">
            $12,450.82
          </div>
          <div className="flex items-center space-x-2 text-emerald-500 text-xs font-bold uppercase tracking-wide">
            <TrendingUpIcon className="h-3 w-3" />
            <span>+15.4% from last month</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Autonomous Rightsizing</span>
            <span className="font-mono text-emerald-400">+$4,210.00</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-[65%]" />
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Idle Resource Cleanup</span>
            <span className="font-mono text-emerald-400">+$2,840.82</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-[45%]" />
          </div>
        </div>
        
        <div className="mt-8 border-t border-white/5 pt-4">
            <button className="w-full text-xs font-bold text-slate-300 hover:text-white transition-colors uppercase tracking-widest bg-white/5 hover:bg-white/10 py-3 rounded-lg overflow-hidden relative group">
                <span className="relative z-10 font-bold tracking-widest text-[#6366F1]">View Savings Breakdown</span>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
        </div>
      </CardContent>
    </Card>
  );
}
