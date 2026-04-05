import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const HeroSection = () => {
  const { user } = useAuth();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-radial-fade" />
      <div className="absolute inset-0 bg-grid opacity-30" />
      
      {/* Floating orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/5 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="container relative z-10 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full glass text-sm text-muted-foreground font-medium"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span>Now in Public Beta</span>
            <span className="text-primary font-medium">v2.0</span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-display text-5xl sm:text-7xl lg:text-8xl mb-6 max-w-5xl mx-auto">
            <span className="text-gradient-hero">DevOps</span>
            <br />
            <span className="text-gradient-primary">Reimagined</span>
          </h1>

          <p className="max-w-xl mx-auto text-base sm:text-lg text-muted-foreground mb-10 font-normal leading-[1.65]">
            AI agents that deploy, monitor, debug, and scale your infrastructure. 
            Automate everything from CI/CD to incident response.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-base px-10 py-6 glow-primary font-semibold tracking-tight">
              <Link to={user ? "/dashboard" : "/auth"}>
                {user ? "Open Dashboard" : "Get Started →"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-10 py-6 font-semibold tracking-tight bg-card/30 backdrop-blur-sm">
              <Link to="/dashboard">View Demo</Link>
            </Button>
          </div>

          {/* Social proof */}
          <motion.p
            className="mt-12 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Trusted by <span className="text-foreground font-semibold">2,400+</span> engineering teams worldwide
          </motion.p>
        </motion.div>

        {/* Terminal preview */}
        <motion.div
          className="mt-16 max-w-4xl mx-auto glass rounded-xl overflow-hidden"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-glow-warning/60" />
            <div className="w-3 h-3 rounded-full bg-primary/60" />
            <span className="ml-3 text-xs text-muted-foreground font-mono">quantumops — ai-workspace</span>
          </div>
          <div className="p-6 text-left font-mono text-sm space-y-2">
            <TerminalLine delay={0.8} prefix="$" text="quantumops deploy --cluster prod-us-east" />
            <TerminalLine delay={1.6} prefix="→" text="Analyzing 23 services... scanning for drift..." color="text-muted-foreground" />
            <TerminalLine delay={2.4} prefix="⚡" text="AI detected 3 config anomalies — auto-patching..." color="text-glow-warning" />
            <TerminalLine delay={3.2} prefix="✓" text="Deployed 23/23 services in 47s. Zero downtime." color="text-primary" />
            <TerminalLine delay={4.0} prefix="✓" text="Post-deploy health check passed. All systems nominal." color="text-primary" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const TerminalLine = ({ delay, prefix, text, color = "text-foreground" }: {
  delay: number; prefix: string; text: string; color?: string;
}) => (
  <motion.div
    className={`${color}`}
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.4 }}
  >
    <span className="text-muted-foreground mr-2">{prefix}</span>
    {text}
  </motion.div>
);

export default HeroSection;
