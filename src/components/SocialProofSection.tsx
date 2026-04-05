import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { BRAND } from "@/shared/branding";

const logos = [
  { name: "Acme Corp", logo: "ACME" },
  { name: "Globex", logo: "GLOBEX" },
  { name: "Soylent Corp", logo: "SOYLENT" },
  { name: "Initech", logo: "INITECH" },
  { name: "Umbrella", logo: "UMBRELLA" },
  { name: "Hooli", logo: "HOOLI" },
];

const testimonials = [
  {
    quote: `${BRAND.name} has completely transformed how we handle incidents. The AI agents are like having a senior SRE on call 24/7.`,
    author: "Sarah Chen",
    role: "VP of Engineering, CloudScale",
  },
  {
    quote: "The cost optimization insights saved us 35% on our monthly AWS bill within the first week. It's a no-brainer for any scale-up.",
    author: "Marcus Thorne",
    role: "CTO, DataFlow",
  },
];

const SocialProofSection = () => {
  return (
    <section className="py-24 relative border-y border-border/50 bg-card/5">
      <div className="container px-4">
        <div className="text-center mb-16">
          <motion.p
            className="text-sm font-semibold text-primary uppercase tracking-[0.2em] mb-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Trusted by 2,400+ engineering teams
          </motion.p>
          
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            {logos.map((logo, i) => (
              <motion.div
                key={logo.name}
                className="text-xl md:text-2xl font-black tracking-tighter"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                {logo.logo}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-20">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              className="glass p-8 rounded-2xl relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
            >
              <Quote className="absolute top-6 right-8 w-8 h-8 text-primary/10" />
              <p className="text-lg mb-6 leading-relaxed italic text-foreground/90 font-medium">
                "{t.quote}"
              </p>
              <div>
                <h4 className="font-bold text-foreground">{t.author}</h4>
                <p className="text-sm text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
