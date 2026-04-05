import { cn } from "@/lib/utils";
import { BRAND } from "@/shared/branding";
import { ZorvexaMark } from "@/components/branding/ZorvexaMark";

export type ZorvexaLogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  taglineClassName?: string;
  size?: number;
  markContainerSize?: number;
  /** Contained = squircle behind mark (app chrome). Inline = mark only (marketing / minimal). */
  variant?: "contained" | "inline";
  layout?: "horizontal" | "stacked";
  showWordmark?: boolean;
  showTagline?: boolean;
  theme?: "light" | "dark";
  title?: string;
};

export function ZorvexaLogo({
  className,
  markClassName,
  wordmarkClassName,
  taglineClassName,
  size = 22,
  markContainerSize,
  variant = "contained",
  layout = "horizontal",
  showWordmark = true,
  showTagline = false,
  theme = "dark",
  title,
}: ZorvexaLogoProps) {
  const textClass = theme === "light" ? "text-[#0B0F1A]" : "text-[#F8FAFC]";
  const subtextClass = theme === "light" ? "text-[#64748B]" : "text-[#9CA3AF]";
  const containerSize = markContainerSize ?? size + 10;
  const brandName = (
    <span
      className={cn(
        "font-semibold tracking-[-0.04em] leading-none text-[1.0625rem]",
        textClass,
        wordmarkClassName
      )}
    >
      Zorvexa
    </span>
  );

  const mark = <ZorvexaMark size={size} title={title} />;

  return (
    <div
      className={cn(
        "inline-flex",
        layout === "stacked" ? "flex-col items-center gap-2" : "items-center gap-2.5",
        className
      )}
    >
      {variant === "inline" ? (
        <span className={cn("flex items-center justify-center shrink-0", markClassName)}>{mark}</span>
      ) : (
        <div
          className={cn(
            "rounded-[10px] bg-[#0B0F1A] border border-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] flex items-center justify-center shrink-0",
            markClassName
          )}
          style={{ width: containerSize, height: containerSize }}
        >
          {mark}
        </div>
      )}
      <div className={cn("min-w-0", layout === "stacked" ? "text-center" : "leading-tight")}>
        {showWordmark && brandName}
        {showWordmark && showTagline && (
          <p className={cn("text-[11px] mt-1 leading-snug font-medium", subtextClass, taglineClassName)}>{BRAND.tagline}</p>
        )}
      </div>
    </div>
  );
}
