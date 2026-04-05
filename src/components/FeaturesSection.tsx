import { motion } from "framer-motion";
import { Bot, MessageSquare, Cloud, TrendingDown, Eye, Shield } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "AI Copilot",
    description: "Pair program with an AI that understands your infrastructure as well as your code.",
    accent: "primary",
  },
  {
    icon: Bot,
    title: "AI Agents",
    description: "Autonomous agents that monitor, debug, and resolve incidents 24/7.",
    accent: "accent",
  },
  {
    icon: Cloud,
    title: "Multi-Cloud",
    description: "Unified control plane for AWS, GCP, Azure, and on-premise Kubernetes clusters.",
    accent: "primary",
  },
  {
    icon: TrendingDown,
    title: "Cost Optimization",
    description: "AI-driven insights to reduce cloud waste and optimize resource allocation.",
    accent: "accent",
  },
  {
    icon: Eye,
    title: "Observability",
    description: "Deep visibility into metrics, logs, and traces with automated anomaly detection.",
    accent: "primary",
  },
  {
    icon: Shield,
    title: "Security",
    description: "Automated vulnerability scanning, secret management, and compliance auditing.",
    accent: "accent",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-32 relative bg-card/10">
      <div className="container px-4">
        <motion.div
           className="text-center mb-20"
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
        >

          <p className="text-overline text-primary mb-4 font-medium">Capabilities</p>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
            Everything you need.
            <br />
            <span className="text-muted-foreground font-normal">Nothing you don&apos;t.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group glass rounded-xl p-8 hover:border-primary/30 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={`inline-flex p-3 rounded-lg mb-5 ${
                feature.accent === "primary" ? "bg-primary/10" : "bg-accent/10"
              }`}>
                <feature.icon className={`w-6 h-6 ${
                  feature.accent === "primary" ? "text-primary" : "text-accent"
                }`} />
              </div>
              <h3 className="text-lg font-semibold tracking-tight mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
