import { motion } from "framer-motion";
import { FileCheck, Lock, Server, Shield } from "lucide-react";

const items = [
  {
    icon: Server,
    title: "AWS · GCP · Azure",
    text: "Native integrations and consistent policy across major clouds.",
  },
  {
    icon: FileCheck,
    title: "SOC 2-ready controls",
    text: "Evidence and process alignment for enterprise security reviews.",
  },
  {
    icon: Lock,
    title: "Role-based access control",
    text: "Least privilege for humans and AI actions — mapped to your IdP.",
  },
  {
    icon: Shield,
    title: "Immutable audit logs",
    text: "Who, what, when — and which policy approved every change.",
  },
];

export default function EnterpriseTrust() {
  return (
    <section className="py-16 sm:py-24" aria-label="Enterprise readiness">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Enterprise</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Built for enterprise-scale infrastructure
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-left transition-colors hover:border-white/[0.12]"
            >
              <item.icon className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
              <h3 className="mt-4 text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
