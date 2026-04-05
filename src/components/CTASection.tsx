import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BRAND } from "@/shared/branding";

const CTASection = () => {
  const { user } = useAuth();

  return (
    <section className="py-32 relative">
      <div className="absolute inset-0 bg-radial-fade opacity-50" />
      <div className="container relative z-10 px-4">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-display text-4xl sm:text-6xl mb-6 text-balance max-w-3xl mx-auto">
            Ship faster.
            <br />
            <span className="text-gradient-primary font-bold">Sleep better.</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-10 max-w-md mx-auto font-normal leading-relaxed">
            Join thousands of engineering teams using {BRAND.name} to automate their infrastructure and focus on building products.
          </p>
          <Button asChild size="lg" className="text-base px-10 py-6 glow-primary font-semibold tracking-tight">
            <Link to={user ? "/dashboard" : "/auth"}>
              {user ? "Open Dashboard" : "Start Free — No Credit Card"}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
