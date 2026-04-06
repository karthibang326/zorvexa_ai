import React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  TrendingDown, 
  Zap, 
  FileText, 
  ExternalLink, 
  Download, 
  Sparkles,
  Info,
  Calendar,
  CreditCard
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { UpgradeButton } from "../../components/billing/UpgradeButton";

interface BillingData {
  tenantId: string;
  customerEmail: string;
  plan: string;
  billingPercentage: number;
  totalSavingsToDate: number;
  monthlySpendUsd: number;
  subscriptionStatus: string;
  baseFee: number;
  usageFee: number;
  savingsPercentage: number;
  forecast: {
    nextMonthSavings: number;
    nextMonthBill: number;
    confidence: number;
  };
  aiInsights: {
    explanation: string;
    strategies: string[];
  };
  resources: { name: string; original: number; optimized: number; savings: number }[];
  invoices: { id: string; date: string; amount: number; status: string; stripeUrl: string }[];
}

// Mock API Call - In production, this targets /api/usage/summary and /api/ai/insights
const fetchBillingData = async (): Promise<BillingData> => {
  // Simulate API latency
  await new Promise(r => setTimeout(r, 1000));
  return {
    tenantId: "org-1",
    customerEmail: "user@example.com",
    plan: "FREE",
    billingPercentage: 0.15,
    totalSavingsToDate: 450.50,
    monthlySpendUsd: 142.20,
    subscriptionStatus: "active",
    baseFee: 0,
    usageFee: 0,
    savingsPercentage: 15.4,
    forecast: {
      nextMonthSavings: 1200,
      nextMonthBill: 179,
      confidence: 0.88
    },
    aiInsights: {
      explanation: "Initial savings driven by idle resource suspension and autonomous RDS right-sizing.",
      strategies: ["Predictive Scaling", "Idle Resource Suspension"]
    },
    resources: [
      { name: "Dev/Staging Nodes", original: 800, optimized: 150, savings: 650 },
      { name: "Frontend CDN (CloudFront)", original: 120, optimized: 85, savings: 35 },
    ],
    invoices: [
      { id: "inv_march", date: "2024-03-01", amount: 0, status: "PAID", stripeUrl: "#" }
    ]
  };
};

export const BillingDashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-summary"],
    queryFn: fetchBillingData
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 bg-zinc-50/50 dark:bg-zinc-950 min-h-screen font-sans antialiased text-zinc-900 dark:text-zinc-100">
      {/* Header Area */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Savings</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2 text-sm leading-relaxed font-medium">
             Maximize your cloud efficiency with AI-driven ROI tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm flex items-center gap-2">
            <div className={`w-2 h-2 ${data.plan === 'FREE' ? 'bg-zinc-400' : 'bg-emerald-500'} rounded-full animate-pulse`} />
            <span className="text-xs font-bold uppercase tracking-wider">Plan: {data.plan}</span>
          </div>
          <UpgradeButton plan={data.plan} tenantId={data.tenantId} customerEmail={data.customerEmail} />
        </div>
      </header>

      {/* Top Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-zinc-900 dark:bg-zinc-800 p-6 rounded-2xl text-white shadow-xl group border border-zinc-800 dark:border-zinc-700"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-24 h-24 rotate-12" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span className="text-zinc-400 text-sm font-semibold uppercase tracking-wider">AI Savings This Month</span>
          </div>
          <div className="text-4xl lg:text-5xl font-black mb-2">${data.totalSavingsToDate.toLocaleString()}</div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-400/10 self-start px-2 py-1 rounded">
            <TrendingDown className="w-4 h-4" />
            <span>{data.savingsPercentage}% reduction</span>
          </div>
        </motion.div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-zinc-400" />
            <span className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">Cost Breakdown</span>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500">Base Subscription</span>
              <span className="font-mono font-bold">${data.baseFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500">Usage Fee (10% of Savings)</span>
              <span className="font-mono font-bold">${data.usageFee.toFixed(2)}</span>
            </div>
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <span className="font-bold">Total Estimated Bill</span>
              <span className="text-2xl font-black">${(data.baseFee + data.usageFee).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              <span className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">AI Forecast</span>
            </div>
            <div className="text-sm text-zinc-500 mb-2 font-medium">Predicted April Savings</div>
            <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
              ${data.forecast.nextMonthSavings.toLocaleString()}
            </div>
          </div>
          <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg text-xs leading-relaxed text-indigo-700 dark:text-indigo-300">
            <strong>Insight:</strong> Your savings are projected to grow by 22% next month as more workloads move to autonomous scaling.
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Savings Chart & Table */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              Resource-Level Optimization Breakdown
              <span className="text-xs font-normal bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-500">Live Audit</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-zinc-400 text-xs font-bold uppercase border-b border-zinc-100 dark:border-zinc-800">
                    <th className="pb-4">Resource</th>
                    <th className="pb-4">Original Cost</th>
                    <th className="pb-4">Optimized</th>
                    <th className="pb-4 pr-0 text-right">Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {data.resources.map((res, i) => (
                    <tr key={i} className="group hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-4 font-medium text-sm">{res.name}</td>
                      <td className="py-4 font-mono text-sm text-zinc-500 text-zinc-500 line-through decoration-zinc-300 dark:decoration-zinc-700">${res.original}</td>
                      <td className="py-4 font-mono text-sm text-emerald-600 dark:text-emerald-400 font-bold">${res.optimized}</td>
                      <td className="py-4 text-right font-bold text-sm bg-zinc-50 group-hover:bg-transparent dark:bg-zinc-800/50 rounded-r-lg">
                        +${res.savings}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm h-[350px]">
            <h3 className="font-bold text-lg mb-6">Savings History</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { month: "Jan", savings: 8200 },
                { month: "Feb", savings: 10100 },
                { month: "Mar", savings: 12450 },
                { month: "Apr", savings: 15200, pred: true }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(v) => `$${v/1000}k`} />
                <RechartsTooltip 
                  cursor={{fill: '#f4f4f5'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="savings" radius={[6, 6, 0, 0]}>
                  {[8200, 10100, 12450, 15200].map((entry, index) => (
                    <Cell key={index} fill={index === 3 ? '#6366f1' : '#18181b'} fillOpacity={index === 3 ? 0.3 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-8">
          <div className="bg-zinc-50 dark:bg-zinc-900 border-2 border-indigo-200 dark:border-indigo-900/50 p-6 rounded-2xl shadow-inner-white text-indigo-900 dark:text-indigo-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-indigo-600 p-1 rounded-md">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight">AI ROI Insight</h3>
            </div>
            <p className="text-sm leading-relaxed mb-6 font-medium">
              {data.aiInsights.explanation}
            </p>
            <div className="space-y-2">
              {data.aiInsights.strategies.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-2 px-3 bg-white/50 dark:bg-white/5 border border-indigo-100 dark:border-indigo-900/40 rounded-lg">
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                  {s}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-zinc-400 uppercase mb-6 flex items-center justify-between">
              Recent Invoices
              <FileText className="w-4 h-4" />
            </h3>
            <div className="space-y-4">
              {data.invoices.map((inv, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                  <div>
                    <div className="text-sm font-bold">{inv.id}</div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">{inv.date}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono font-bold">${inv.amount.toFixed(2)}</div>
                    <a 
                      href={inv.stripeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4 text-zinc-400" />
                    </a>
                  </div>
                </div>
              ))}
              <button className="w-full py-3 text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                View All Billing History
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-transparent flex gap-4">
            <div className="flex-shrink-0">
               <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                  <Info className="w-5 h-5 text-zinc-500" />
               </div>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase mb-1">Billing Policy</h4>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Monthly base fees are charged in advance. Usage fees (10% of generated savings) are calculated and charged monthly in arrears. Detailed logs available in Audit Dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
