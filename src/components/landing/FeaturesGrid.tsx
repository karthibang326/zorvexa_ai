import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { LANDING_FEATURES } from "@/data/landing-features";
import { cn } from "@/lib/utils";

export type FeaturesGridProps = {
  /** `compact` matches the home section; `expanded` adds capability bullets (e.g. /features). */
  variant?: "compact" | "expanded";
  /** When false, omit the section title block (e.g. page supplies its own hero). */
  showHeading?: boolean;
  className?: string;
};

export default function FeaturesGrid({
  variant = "compact",
  showHeading = true,
  className,
}: FeaturesGridProps) {
  const expanded = variant === "expanded";

  return (
    <section id={expanded ? undefined : "features"} className={cn("py-20 sm:py-28", className)}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {showHeading && (
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/90">Platform</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Enterprise AI for infrastructure outcomes
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
              Built for teams who need leverage at scale — not another passive tool.
            </p>
          </div>
        )}
        <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", showHeading ? "mt-14" : "mt-0")}>
          {LANDING_FEATURES.map((feature, idx) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className={cn(
                "rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-all hover:border-white/[0.14] hover:bg-white/[0.05] hover:shadow-[0_16px_48px_rgba(0,0,0,0.35)]",
                expanded && "lg:p-7"
              )}
            >
              <div className="inline-flex rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/15 p-2.5 text-blue-200 ring-1 ring-white/10">
                <feature.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.benefit}</p>
              {expanded && feature.highlights.length > 0 && (
                <ul className="mt-5 space-y-2.5 border-t border-white/[0.06] pt-5">
                  {feature.highlights.map((line) => (
                    <li key={line} className="flex gap-2.5 text-sm leading-snug text-slate-400">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/90"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
