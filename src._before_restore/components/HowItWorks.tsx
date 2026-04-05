import { motion } from "framer-motion";
import { Network, Brain, MessageSquare, Zap, ChevronRight } from "lucide-react";
import { BRAND } from "@/shared/branding";

const steps = [
  {
    id: "01",
    title: "Connect Infrastructure",
    description: "Connect AWS, GCP, Azure, and Kubernetes. Auto-ingest logs and metrics.",
    items: ["AWS, GCP, Azure, K8s", "Auto-ingest logs & metrics"],
    icon: Network,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "02",
    title: "AI Understands Everything",
    description: "Correlates logs, metrics, and traces. Detects anomalies instantly.",
    items: ["Correlates all data", "Detects anomalies"],
    icon: Brain,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    id: "03",
    title: "Ask or Automate",
    description: "Chat with AI Copilot or trigger workflows automatically.",
    items: ["Chat with AI Copilot", "Trigger workflows"],
    icon: MessageSquare,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "04",
    title: "Execute & Optimize",
    description: "Deploy fixes and optimize cost and performance.",
    items: ["Deploy fixes", "Optimize cost & performance"],
    icon: Zap,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-display text-4xl sm:text-5xl mb-4">How {BRAND.name} Works</h2>
          <p className="text-lg text-muted-foreground font-medium">From insight to action — powered by AI</p>
        </motion.div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {/* Connector Arrows (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 -translate-y-1/2 z-0">
            <div className="flex justify-around items-center px-12 opacity-20">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.2 }}
                >
                  <ChevronRight className="w-8 h-8 text-primary" />
                </motion.div>
              ))}
            </div>
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={step.id}
              className="group relative z-10"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
            >
              <div className="glass rounded-2xl p-6 h-full border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group-hover:-translate-y-1">
                {/* Step ID */}
                <div className="absolute top-4 right-6 text-sm font-mono text-muted-foreground/30 font-bold group-hover:text-primary/20 transition-colors">
                  {step.id}
                </div>

                {/* Icon */}
                <div className={`inline-flex p-3 rounded-xl mb-6 ${step.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                  <step.icon className={`w-6 h-6 ${step.color}`} />
                </div>

                <h3 className="text-xl font-semibold tracking-tight mb-4 group-hover:text-primary transition-colors">
                  {step.title}
                </h3>

                <ul className="space-y-3">
                  {step.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-snug">
                       <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${step.bgColor} ${step.color.replace('text-', 'bg-')}`} />
                       {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
