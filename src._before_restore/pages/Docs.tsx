import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Book, Code, GraduationCap, ChevronRight, Search } from "lucide-react";
import { BRAND } from "@/shared/branding";

const Docs = () => {
  const sections = [
    {
      title: "Getting Started",
      icon: Book,
      description: "Learn how to connect your first cluster and deploy in minutes.",
      links: ["Quickstart Guide", "Installation", "Core Concepts", "First Deployment"],
    },
    {
      title: "API Reference",
      icon: Code,
      description: "Interactive API documentation for developers and automated workflows.",
      links: ["Authentication", "Agent API", "Metrics & Logs", "Webhooks"],
    },
    {
      title: "Guides",
      icon: GraduationCap,
      description: "In-depth guides for advanced infrastructure management and AI triggers.",
      links: ["Multi-Cloud Setup", "Auto-scaling Policies", "Custom AI Prompts", "Security Best Practices"],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-24">
        <div className="container px-4">
          <motion.div 
            className="max-w-4xl mx-auto mb-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-display text-4xl sm:text-6xl mb-6">Documentation</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-normal">
              Everything you need to build, deploy, and scale with {BRAND.name}. 
              Search our guides, API reference, and interactive tutorials.
            </p>
            
            <div className="mt-10 max-w-xl mx-auto relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search documentation..."
                className="w-full h-14 bg-card border border-border rounded-xl pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-not-allowed"
                readOnly
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-muted border border-border text-[10px] font-mono text-muted-foreground">⌘K</div>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                className="glass p-8 rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <section.icon className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-3 tracking-tight">{section.title}</h2>
                <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                  {section.description}
                </p>
                
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm font-medium text-foreground/80 hover:text-primary flex items-center justify-between group/link transition-colors">
                        {link}
                        <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div 
            className="mt-24 p-10 rounded-2xl glass border border-primary/20 bg-primary/[0.02] text-center max-w-5xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-2xl font-bold mb-4">Need help?</h3>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Our engineering team is always available to help you with architecture reviews or complex migrations.
            </p>
            <div className="flex gap-4 justify-center">
               <button className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all">
                 Join our Slack
               </button>
               <button className="px-6 py-3 rounded-xl bg-card border border-border font-bold text-sm hover:bg-muted transition-all">
                 Contact Support
               </button>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Docs;
