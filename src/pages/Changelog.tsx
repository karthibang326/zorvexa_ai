import { useEffect, useMemo, useState } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  type ChangelogFilter,
  type ChangelogImpact,
  type ChangelogLine,
  type ChangelogRelease,
  CHANGELOG_RELEASES,
} from "@/data/changelog";

const FILTERS: { id: ChangelogFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "features", label: "Features" },
  { id: "improvements", label: "Improvements" },
  { id: "fixes", label: "Fixes" },
];

const INITIAL_VISIBLE = 2;

function impactLabel(impact: ChangelogImpact): string {
  const base =
    impact.kind === "performance"
      ? "Performance"
      : impact.kind === "cost"
        ? "Cost"
        : impact.kind === "stability"
          ? "Stability"
          : "Security";
  if (impact.value) return `${base} ${impact.value}`;
  return base;
}

function ImpactTag({ impact }: { impact: ChangelogImpact }) {
  const label = impactLabel(impact);
  const styles =
    impact.kind === "performance"
      ? "border-sky-500/35 bg-sky-500/10 text-sky-200"
      : impact.kind === "cost"
        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
        : impact.kind === "stability"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
          : "border-rose-500/35 bg-rose-500/10 text-rose-100";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles
      )}
    >
      {label}
    </span>
  );
}

function ChangelogRow({ line }: { line: ChangelogLine }) {
  return (
    <li className="group flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-white/[0.06] py-3 last:border-0">
      <p className="min-w-0 flex-1 text-[15px] leading-snug text-slate-200 transition-colors group-hover:text-white">
        {line.text}
      </p>
      {line.impact ? <ImpactTag impact={line.impact} /> : null}
    </li>
  );
}

const sectionMeta = {
  new: {
    title: "New",
    emoji: "🚀",
    chip: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  },
  improvements: {
    title: "Improvements",
    emoji: "⚡",
    chip: "border-purple-500/40 bg-purple-500/10 text-purple-200",
  },
  fixes: {
    title: "Fixes",
    emoji: "🛠",
    chip: "border-slate-500/40 bg-slate-500/15 text-slate-300",
  },
} as const;

function filterRelease(
  release: ChangelogRelease,
  filter: ChangelogFilter
): ChangelogRelease | null {
  if (filter === "all") return release;
  if (filter === "features") {
    if (release.new.length === 0) return null;
    return { ...release, improvements: [], fixes: [] };
  }
  if (filter === "improvements") {
    if (release.improvements.length === 0) return null;
    return { ...release, new: [], fixes: [] };
  }
  if (release.fixes.length === 0) return null;
  return { ...release, new: [], improvements: [] };
}

function ReleaseCard({ release }: { release: ChangelogRelease }) {
  const [open, setOpen] = useState(false);

  const sections = useMemo(() => {
    const out: {
      key: keyof typeof sectionMeta;
      lines: ChangelogLine[];
    }[] = [];
    if (release.new.length) out.push({ key: "new", lines: release.new });
    if (release.improvements.length)
      out.push({ key: "improvements", lines: release.improvements });
    if (release.fixes.length) out.push({ key: "fixes", lines: release.fixes });
    return out;
  }, [release]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-white/[0.08] bg-[#0c1018]/90 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-shadow hover:border-white/[0.12] hover:shadow-[0_28px_96px_rgba(37,99,235,0.08)]"
    >
      <div className="border-b border-white/[0.06] px-6 pb-5 pt-6 sm:px-8">
        <p className="font-mono text-[13px] font-bold tracking-tight text-white">
          {release.version}
        </p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {release.dateLabel}
        </p>
        <h2 className="mt-4 text-lg font-semibold leading-snug text-slate-100 sm:text-xl">
          {release.headline}
        </h2>
      </div>

      <div className="px-6 py-2 sm:px-8">
        {sections.map(({ key, lines }) => {
          const meta = sectionMeta[key];
          return (
            <div key={key} className="py-4 first:pt-5 last:pb-5">
              <div
                className={cn(
                  "mb-3 inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-semibold",
                  meta.chip
                )}
              >
                <span aria-hidden>{meta.emoji}</span>
                <span>{meta.title}</span>
              </div>
              <ul className="list-none">
                {lines.map((line, i) => (
                  <ChangelogRow key={`${key}-${i}`} line={line} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="border-t border-white/[0.06] px-6 py-3 sm:px-8">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <span>{open ? "Hide details" : "View details"}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <p className="pb-4 pt-1 text-sm leading-relaxed text-slate-400">
              {release.detail}
            </p>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </motion.article>
  );
}

const Changelog = () => {
  const [filter, setFilter] = useState<ChangelogFilter>("all");
  const [historyExpanded, setHistoryExpanded] = useState(false);

  useEffect(() => {
    setHistoryExpanded(false);
  }, [filter]);

  const filteredReleases = useMemo(() => {
    return CHANGELOG_RELEASES.map((r) => filterRelease(r, filter)).filter(
      (r): r is ChangelogRelease => r !== null
    );
  }, [filter]);

  const visibleReleases = historyExpanded
    ? filteredReleases
    : filteredReleases.slice(0, INITIAL_VISIBLE);

  const hasMoreHistory =
    filteredReleases.length > INITIAL_VISIBLE && !historyExpanded;

  return (
    <PublicLayout>
      <div className="relative pb-32 pt-10 sm:pt-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <motion.header
            className="mb-10 text-center sm:mb-12"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Changelog
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-base text-slate-400">
              Product updates, improvements, and fixes — focused on impact.
            </p>
          </motion.header>

          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                  filter === f.id
                    ? "border-blue-500/50 bg-blue-500/15 text-white shadow-[0_0_24px_rgba(37,99,235,0.2)]"
                    : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="popLayout">
            <motion.div className="space-y-8">
              {visibleReleases.map((release) => (
                <ReleaseCard key={release.version} release={release} />
              ))}
            </motion.div>
          </AnimatePresence>

          {filteredReleases.length === 0 ? (
            <p className="py-16 text-center text-slate-500">
              No entries for this filter.
            </p>
          ) : null}
        </div>

        {hasMoreHistory ? (
          <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 flex justify-center bg-gradient-to-t from-[#080a0e] via-[#080a0e]/95 to-transparent pb-6 pt-16">
            <div className="pointer-events-auto px-4">
              <Button
                type="button"
                size="lg"
                className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#2563eb] to-[#4f46e5] px-8 text-white shadow-[0_12px_40px_rgba(37,99,235,0.35)] hover:brightness-110"
                onClick={() => setHistoryExpanded(true)}
              >
                <History className="mr-2 h-4 w-4" />
                View all history
              </Button>
            </div>
          </div>
        ) : historyExpanded && filteredReleases.length > INITIAL_VISIBLE ? (
          <div className="mx-auto mt-12 flex max-w-3xl justify-center px-4">
            <Button
              type="button"
              variant="ghost"
              className="text-slate-400 hover:text-white"
              onClick={() => {
                setHistoryExpanded(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Show fewer releases
            </Button>
          </div>
        ) : null}
      </div>
    </PublicLayout>
  );
};

export default Changelog;
