import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Code2, Sparkles } from "lucide-react";

const links = [
  {
    to: "/docs#quickstart",
    icon: BookOpen,
    title: "Quickstart",
    desc: "5-minute setup — connect cloud, deploy agent, enable control plane.",
  },
  {
    to: "/docs#api-sdk",
    icon: Code2,
    title: "API + SDK",
    desc: "Auth, Agent API, metrics, webhooks — ship integrations fast.",
  },
  {
    to: "/docs#ai-automation",
    icon: Sparkles,
    title: "AI automation guides",
    desc: "Policies, decision engine, prompts, and simulation before execution.",
  },
];

export default function DocsTeaser() {
  return (
    <section className="pb-16 pt-4 sm:pb-20" aria-label="Documentation">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/90">Documentation</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Ship faster with structured docs
          </h2>
          <p className="mt-4 text-sm text-slate-400 sm:text-base">
            Search-first layout, code examples, and paths for every role — from platform to security.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {links.map((item, i) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={item.to}
                className="group flex h-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-all hover:border-blue-500/25 hover:bg-white/[0.04]"
              >
                <item.icon className="h-5 w-5 text-blue-400/90" />
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-400">
                  Open docs
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
