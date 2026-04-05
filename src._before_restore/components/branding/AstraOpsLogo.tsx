import { cn } from "@/lib/utils";
import { BRAND } from "@/shared/branding";
import { AstraOpsMark } from "@/components/branding/AstraOpsMark";

type AstraOpsLogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  taglineClassName?: string;
  size?: number;
  markContainerSize?: number;
  layout?: "horizontal" | "stacked";
  showWordmark?: boolean;
  showTagline?: boolean;
  theme?: "light" | "dark";
  title?: string;
};

export function AstraOpsLogo({
  className,
  markClassName,
  wordmarkClassName,
  taglineClassName,
  size = 22,
  markContainerSize,
  layout = "horizontal",
  showWordmark = true,
  showTagline = false,
  theme = "dark",
  title,
}: AstraOpsLogoProps) {
  const textClass = theme === "light" ? "text-[#0B0F1A]" : "text-foreground";
  const subtextClass = theme === "light" ? "text-[#334155]" : "text-muted-foreground";
  const containerSize = markContainerSize ?? size + 10;
  const brandName = (
    <span className={cn("font-semibold tracking-[-0.02em] leading-none", textClass, wordmarkClassName)}>
      <span className="font-semibold">Astra</span>
      <span className="font-normal">Ops</span>
    </span>
  );

  return (
    <div
      className={cn(
        "inline-flex",
        layout === "stacked" ? "flex-col items-center gap-2" : "items-center gap-2.5",
        className
      )}
    >
      <div
        className={cn(
          "rounded-lg bg-[#0B0F1A] border border-white/[0.08] flex items-center justify-center shrink-0",
          markClassName
        )}
        style={{ width: containerSize, height: containerSize }}
      >
        <AstraOpsMark size={size} title={title} />
      </div>
      <div className={cn("min-w-0", layout === "stacked" ? "text-center" : "leading-tight")}>
        {showWordmark && brandName}
        {showWordmark && showTagline && (
          <p className={cn("text-[11px] mt-1 leading-none", subtextClass, taglineClassName)}>
            {BRAND.tagline}
          </p>
        )}
      </div>
    </div>
  );
}
