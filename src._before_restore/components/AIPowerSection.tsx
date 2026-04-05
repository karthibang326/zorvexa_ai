import { motion } from "framer-motion";
import { MessageSquare, Zap, BarChart3, Bot, Send, Search, Sparkles } from "lucide-react";
import { BRAND } from "@/shared/branding";

const AIPowerSection = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-fade opacity-30" />
      
      <div className="container px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Native Platform</span>
            </div>
            <h2 className="text-display text-4xl sm:text-6xl mb-6">
              The power of AI,
              <br />
              <span className="text-gradient-primary">at your service.</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed font-normal">
              {BRAND.name} isn't just another DevOps tool. It's an intelligent platform that learns your infrastructure and automates the boring parts.
            </p>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 shadow-sm group hover:border-primary/50 transition-colors">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Intelligent Chat Interface</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ask questions about your infra in plain English. "Why is US-East-1 slow?" or "Deploy the latest staging build."
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 shadow-sm group hover:border-primary/50 transition-colors">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Autonomous Automation</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Set up agents that monitor logs and automatically trigger scaling or failover workflows based on real-time needs.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 shadow-sm group hover:border-primary/50 transition-colors">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Predictive Insights</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Detect anomalies before they become incidents. AI scans for drift, cost spikes, and security vulnerabilities.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* AI Chat Preview Mockup */}
            <div className="glass rounded-2xl overflow-hidden border border-border/50 shadow-2xl relative">
              <div className="px-5 py-4 border-b border-border/50 bg-card/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Quantum Assistant</h4>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
                      <span className="text-[10px] text-muted-foreground font-medium">Listening to infra...</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono text-muted-foreground">US-EAST-1</div>
                </div>
              </div>

              <div className="p-6 space-y-6 h-[400px] overflow-y-auto font-sans">
                <div className="flex gap-3 justify-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 max-w-[80%]">
                    <p className="text-sm">Why did the high-latency alert trigger on the auth-service?</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4 max-w-[85%] space-y-3">
                    <p className="text-sm">AI detected a sudden spike in DB connection pool usage. It correlates with a 300% increase in login requests from an unidentifiable IP range.</p>
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                       <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Recommended Action</span>
                          <span className="text-[10px] font-bold text-status-warning">Urgent</span>
                       </div>
                       <p className="text-xs mb-3">Scale up RDS connections and enable WAF rate-limiting for auth endpoints.</p>
                       <button className="w-full py-1.5 bg-primary rounded-lg text-xs font-bold text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-1.5">
                         <Zap className="w-3 h-3" /> Execute Fix Now
                       </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 max-w-[80%]">
                    <p className="text-sm">Execute the fix and notify the on-call team.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-card/80 border-t border-border/50">
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-muted-foreground">
                    <Search className="w-4 h-4" />
                  </div>
                  <input 
                    type="text" 
                    readOnly 
                    placeholder="Ask anything about your infra..." 
                    className="w-full bg-muted/50 border border-border rounded-xl pl-11 pr-12 py-3 text-sm focus:outline-none cursor-not-allowed"
                  />
                  <div className="absolute right-3 p-1.5 rounded-lg bg-primary/20 text-primary">
                    <Send className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative background glow */}
            <div className="absolute -inset-4 bg-primary/10 blur-[100px] -z-10 rounded-full" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AIPowerSection;
