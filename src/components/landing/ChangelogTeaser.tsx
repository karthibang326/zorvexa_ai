import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { CHANGELOG_RELEASES } from "@/data/changelog";

/** Compact changelog strip — full experience lives on /changelog */
export default function ChangelogTeaser() {
  const latest = CHANGELOG_RELEASES[0];
  const previewLines = [...latest.new, ...latest.improvements].slice(0, 2);

  return (
    <section className="py-16 sm:py-20" aria-label="Latest changelog">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-y border-white/[0.08] py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Changelog</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Product evolution, outcome-first
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Every release grouped as New, Improvements, and Fixes — with impact tags, not vanity bullets.
            </p>
          </div>
          <Link
            to="/changelog"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
          >
            View full changelog
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-lg font-bold text-white">{latest.version}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {latest.dateLabel}
            </span>
          </div>
          <p className="mt-3 text-lg font-medium text-slate-200">{latest.headline}</p>
          <ul className="mt-5 space-y-2 text-sm text-slate-400">
            {previewLines.map((line) => (
              <li key={line.text} className="flex gap-2">
                <span className="text-slate-600">—</span>
                <span>{line.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
