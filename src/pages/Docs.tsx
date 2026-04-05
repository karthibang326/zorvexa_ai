import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Keyboard,
  LifeBuoy,
  MessageSquare,
  Search,
  Slack,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock";
import { HighlightText } from "@/components/docs/HighlightText";
import {
  DOC_COMMON_TASKS,
  DOC_QUICKSTART,
  DOC_SEARCH_INDEX,
  DOC_SECTIONS,
  type DocSearchItem,
} from "@/data/documentation";

function filterDocSearch(query: string, items: DocSearchItem[]): DocSearchItem[] {
  const s = query.trim().toLowerCase();
  if (!s) return [];
  return items.filter(
    (i) =>
      i.title.toLowerCase().includes(s) ||
      i.keywords.toLowerCase().includes(s) ||
      i.section.toLowerCase().includes(s)
  );
}

const Docs = () => {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  /** React Router navigates to `/docs#anchor` but does not scroll — align with landing / footer deep links */
  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (!id) return;
    const scrollToId = () => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToId);
    });
    const retry = window.setTimeout(scrollToId, 200);
    return () => clearTimeout(retry);
  }, [location.pathname, location.hash]);

  const results = useMemo(() => filterDocSearch(query, DOC_SEARCH_INDEX).slice(0, 14), [query]);

  const navigateToHash = useCallback((href: string) => {
    if (href.startsWith("#")) {
      const id = href.slice(1);
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (href.startsWith("/#")) {
      window.location.href = href;
    } else {
      window.location.href = href;
    }
    setCmdOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) setSearchFocused(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const groupedForCommand = useMemo(() => {
    const m = new Map<string, DocSearchItem[]>();
    for (const item of DOC_SEARCH_INDEX) {
      const list = m.get(item.section) ?? [];
      list.push(item);
      m.set(item.section, list);
    }
    return m;
  }, []);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
          {/* Sidebar — aligns with top of main column (title + search + body) */}
          <aside className="order-2 hidden w-56 shrink-0 lg:order-1 lg:block">
            <nav className="sticky top-32 space-y-8 text-sm">
              <div>
                <a
                  href="#quickstart"
                  className="mb-3 block font-semibold text-slate-200 transition-colors hover:text-white"
                >
                  On this page
                </a>
                <ul className="space-y-1 border-l border-white/[0.08] pl-3">
                  <li>
                    <a
                      href="#quickstart"
                      className="block py-1 text-slate-400 transition-colors hover:text-white"
                    >
                      Quickstart
                    </a>
                  </li>
                  {DOC_SECTIONS.map((sec) => (
                    <li key={sec.id}>
                      <a
                        href={`#${sec.id}`}
                        className="block py-1 font-medium text-slate-300 transition-colors hover:text-white"
                      >
                        {sec.emoji} {sec.title}
                      </a>
                      <ul className="ml-2 mt-1 space-y-0.5 border-l border-white/[0.06] pl-2">
                        {sec.nav.map((n) => (
                          <li key={n.id}>
                            <a
                              href={`#${sec.id}-${n.id}`}
                              className="block py-0.5 text-[13px] text-slate-500 transition-colors hover:text-slate-200"
                            >
                              {n.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                  <li>
                    <a
                      href="#common-tasks"
                      className="block py-1 text-slate-400 transition-colors hover:text-white"
                    >
                      Common tasks
                    </a>
                  </li>
                  <li>
                    <a
                      href="#help"
                      className="block py-1 text-slate-400 transition-colors hover:text-white"
                    >
                      Help
                    </a>
                  </li>
                </ul>
              </div>
            </nav>
          </aside>

          <div className="order-1 min-w-0 flex-1 lg:order-2">
            <header className="text-left">
              <motion.h1
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Documentation
              </motion.h1>
              <p className="mt-3 max-w-2xl text-base text-slate-400">
                Build, deploy, and run autonomous cloud operations with Zorvexa
              </p>
            </header>

            {/* Sticky search — same width as content below */}
            <div
              ref={searchWrapRef}
              className="sticky top-16 z-40 -mx-4 mb-8 mt-8 border-b border-white/[0.06] bg-[#080a0e]/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-10 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none"
            >
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  placeholder="Search docs, APIs, or guides..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  className="h-12 w-full rounded-xl border border-white/[0.1] bg-[#0c1018] pl-11 pr-24 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  aria-label="Search documentation"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setCmdOpen(true)}
                  className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-slate-500 transition-colors hover:border-white/20 hover:text-slate-300 sm:flex"
                  title="Open command palette"
                >
                  <Keyboard className="h-3 w-3" />
                  K
                </button>

                <AnimatePresence>
                  {searchFocused && query.trim().length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(360px,50vh)] overflow-auto rounded-xl border border-white/[0.1] bg-[#0c1018] py-2 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
                    >
                      {results.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-slate-500">No matches</p>
                      ) : (
                        <ul className="divide-y divide-white/[0.06]">
                          {results.map((item) => (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  navigateToHash(item.href);
                                  setSearchFocused(false);
                                }}
                                className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
                              >
                                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                  {item.section}
                                </span>
                                <span className="text-sm font-medium text-slate-100">
                                  <HighlightText text={item.title} query={query} />
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <main className="space-y-14 lg:space-y-20">
            {/* Mobile section jump */}
            <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <a
                href="#quickstart"
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300"
              >
                Start
              </a>
              {DOC_SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300"
                >
                  {s.emoji} {s.title}
                </a>
              ))}
              <a
                href="#common-tasks"
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300"
              >
                Tasks
              </a>
            </div>

            {/* Quickstart */}
            <section
              id="quickstart"
              className="scroll-mt-28 rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/[0.12] via-[#0c1018] to-[#0c1018] p-6 shadow-[0_24px_80px_rgba(37,99,235,0.12)] sm:p-8"
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300/90">
                    Most important
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {DOC_QUICKSTART.title}
                  </h2>
                  <ol className="mt-6 space-y-3 text-slate-200">
                    {DOC_QUICKSTART.steps.map((step, i) => (
                      <li key={step} className="flex gap-3 text-[15px] leading-snug">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 font-mono text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <Button
                  asChild
                  className="h-11 shrink-0 rounded-xl bg-white text-[#080a0e] hover:bg-slate-100"
                >
                  <a href={DOC_QUICKSTART.ctaHref} className="inline-flex items-center gap-2">
                    {DOC_QUICKSTART.ctaLabel}
                  </a>
                </Button>
              </div>
            </section>

            {/* Major sections */}
            {DOC_SECTIONS.map((sec) => (
              <section
                key={sec.id}
                id={sec.id}
                className="scroll-mt-28 border-t border-white/[0.06] pt-14 first:border-0 first:pt-0"
              >
                <div className="mb-8 flex flex-wrap items-baseline gap-3">
                  <span className="text-2xl" aria-hidden>
                    {sec.emoji}
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {sec.title}
                  </h2>
                </div>
                <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-slate-400">
                  {sec.blurb}
                </p>

                <div className="mb-12 grid gap-4 sm:grid-cols-2">
                  {sec.nav.map((n) => (
                    <div
                      key={n.id}
                      id={`${sec.id}-${n.id}`}
                      className="scroll-mt-32 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                    >
                      <div className="flex items-start gap-2">
                        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                        <div>
                          <h3 className="font-semibold text-slate-100">{n.label}</h3>
                          <p className="mt-1 text-[13px] text-slate-500">
                            See examples below · action-oriented reference
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Code & config
                  </h3>
                  <div className="grid gap-6 lg:grid-cols-1">
                    {sec.examples.map((ex) => (
                      <DocsCodeBlock key={ex.label} {...ex} />
                    ))}
                  </div>
                </div>
              </section>
            ))}

            {/* Common tasks */}
            <section id="common-tasks" className="scroll-mt-28 border-t border-white/[0.06] pt-14">
              <h2 className="text-2xl font-bold tracking-tight text-white">Common tasks</h2>
              <p className="mt-2 max-w-xl text-[15px] text-slate-400">
                Jump straight to what you need — each task maps to the sections above.
              </p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-3">
                {DOC_COMMON_TASKS.map((t) => (
                  <li key={t.id}>
                    <a
                      href={t.anchor}
                      className="group flex h-full flex-col rounded-xl border border-white/[0.08] bg-[#0c1018] p-4 transition-all hover:border-blue-500/30 hover:bg-white/[0.03]"
                    >
                      <span className="font-medium text-slate-100 group-hover:text-white">
                        {t.label}
                      </span>
                      <span className="mt-2 text-xs text-slate-500">{t.hint}</span>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-400">
                        Open
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            {/* Help */}
            <section
              id="help"
              className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-[#0c1018]/80 p-6 sm:p-8"
            >
              <h2 className="text-xl font-bold text-white">Help</h2>
              <p className="mt-2 text-sm text-slate-400">
                Stuck? Reach the team on your channel — we respond fast during business hours.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <a
                  href="https://slack.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <Slack className="h-5 w-5 text-slate-300" />
                  <span className="mt-3 font-semibold text-white">Slack</span>
                  <span className="mt-1 text-sm text-slate-500">Community & product updates</span>
                </a>
                <Link
                  to="/auth"
                  className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <LifeBuoy className="h-5 w-5 text-slate-300" />
                  <span className="mt-3 font-semibold text-white">Support</span>
                  <span className="mt-1 text-sm text-slate-500">Sign in for priority tickets</span>
                </Link>
                <a
                  href="mailto:engineering@zorvexa.com?subject=Zorvexa%20—%20Engineering"
                  className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <MessageSquare className="h-5 w-5 text-slate-300" />
                  <span className="mt-3 font-semibold text-white">Talk to an engineer</span>
                  <span className="mt-1 text-sm text-slate-500">Architecture & onboarding</span>
                </a>
              </div>
            </section>
          </main>
          </div>
        </div>
      </div>

      <CommandDialog
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        contentClassName="border border-white/10 bg-[#0c1018] text-slate-100 sm:max-w-xl"
      >
        <CommandInput
          placeholder="Search docs, APIs, or guides..."
          className="placeholder:text-slate-500"
        />
        <CommandList className="max-h-[min(420px,50vh)]">
          <CommandEmpty>No results found.</CommandEmpty>
          {[...groupedForCommand.entries()].map(([section, items]) => (
            <CommandGroup key={section} heading={section}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${item.keywords} ${item.section}`}
                  onSelect={() => navigateToHash(item.href)}
                  className="cursor-pointer data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                >
                  <span className="truncate">{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </PublicLayout>
  );
};

export default Docs;
