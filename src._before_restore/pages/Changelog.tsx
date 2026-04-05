import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Zap, TrendingUp, Bug, ArrowRight, ShieldCheck } from "lucide-react";
import { BRAND } from "@/shared/branding";

const updates = [
  {
    version: "v2.1.0",
    date: "March 24, 2026",
    type: "Major Release",
    title: "Multi-Cloud Governance & Fleet Management",
    description: "Deep visibility across AWS, GCP, and Azure with unified cost optimization and security health checks.",
    items: [
      { type: "Release Note", icon: Zap, label: "Fleet View", text: "New global dashboard for all your cloud resources." },
      { type: "Improvement", icon: TrendingUp, label: "AI Latency", text: "Reduced AI agent response times by 40%." },
      { type: "Fix", icon: Bug, label: "K8s Secrets", text: "Resolved an issue with RBAC inheritance in multi-tenant clusters." },
    ],
  },
  {
    version: "v2.0.4",
    date: "March 18, 2026",
    type: "Patch",
    title: "Enhanced Security & Audit Logging",
    description: "Full audit logs and SSO integration for enterprise teams.",
    items: [
      { type: "Release Note", icon: ShieldCheck, label: "Audit Logs", text: "Track every action across your entire infrastructure." },
      { type: "Improvement", icon: Zap, label: "UI Polish", text: "Refined dark mode contrasts and better mobile responsiveness." },
      { type: "Fix", icon: Bug, label: "DB Pools", text: "Optimized connection pooling for large-scale Postgres instances." },
    ],
  },
];

const Changelog = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-24">
        <div className="container px-4">
          <motion.div 
            className="max-w-4xl mx-auto mb-20 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-display text-4xl sm:text-6xl mb-6 font-bold tracking-tight">Changelog</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-normal">
              Stay up to date with the latest features, improvements, and fixes 
              for the {BRAND.name} platform.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-24">
            {updates.map((update, i) => (
              <motion.div
                key={update.version}
                className="relative pl-12 md:pl-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                {/* Timeline vertical line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border md:left-1/2 md:-ml-px hidden sm:block" />

                <div className="md:flex items-start justify-between gap-12">
                  {/* Left Side (Meta) */}
                  <div className="md:w-5/12 text-left md:text-right mb-8 md:mb-0">
                    <div className="sticky top-32">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-mono font-bold text-primary uppercase mb-4 tracking-widest">
                        {update.version}
                      </div>
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
                        {update.date}
                      </h3>
                      <h2 className="text-2xl font-bold tracking-tight leading-tight mb-4">
                        {update.title}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed italic">
                        {update.description}
                      </p>
                    </div>
                  </div>

                  {/* Right Side (Items) */}
                  <div className="md:w-5/12">
                    <div className="space-y-6">
                      {update.items.map((item, idx) => (
                        <div key={idx} className="glass p-6 rounded-2xl border border-border/50 hover:border-primary/20 transition-all group">
                           <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors">
                                 <item.icon className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                                 {item.type} — {item.label}
                              </span>
                           </div>
                           <p className="text-sm leading-relaxed text-foreground/90">
                              {item.text}
                           </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            className="mt-32 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
             <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20">
               View All History <ArrowRight className="w-4 h-4" />
             </button>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Changelog;
