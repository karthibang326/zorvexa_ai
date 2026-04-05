import { useId } from "react";
import { cn } from "@/lib/utils";

/** Brand gradient — matches `public/branding/zorvexa-mark.svg`. */
const GRADIENT_FROM = "#6C5CE7";
const GRADIENT_TO = "#00D4FF";

export type ZorvexaMarkProps = {
  className?: string;
  size?: number;
  title?: string;
};

/**
 * Zorvexa logomark: geometric Z on a 32×32 grid (round joins, scales to favicon and hero).
 */
export function ZorvexaMark({ className, size = 32, title }: ZorvexaMarkProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `zvx-grad-${uid}`;

  return (
    <svg
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradId} x1="5" y1="4" x2="27" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor={GRADIENT_FROM} />
          <stop offset="1" stopColor={GRADIENT_TO} />
        </linearGradient>
      </defs>
      <path
        d="M8 9h16M24 9L8 23M8 23h16"
        stroke={`url(#${gradId})`}
        strokeWidth="3.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
