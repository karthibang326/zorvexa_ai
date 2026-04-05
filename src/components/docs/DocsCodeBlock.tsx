import type { DocCodeBlock as DocCodeBlockType } from "@/data/documentation";
import { cn } from "@/lib/utils";

export function DocsCodeBlock({ label, language, code }: DocCodeBlockType) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#05070b] shadow-inner">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-md border border-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-slate-500",
            language === "json" && "text-emerald-400/90",
            language === "yaml" && "text-violet-300/90",
            language === "bash" && "text-sky-300/90"
          )}
        >
          {language}
        </span>
      </div>
      <pre className="max-h-[min(420px,55vh)] overflow-auto p-4 font-mono text-[12px] leading-relaxed text-slate-300 sm:text-[13px]">
        <code className="[word-break:break-word]">{code.trimEnd()}</code>
      </pre>
    </div>
  );
}
