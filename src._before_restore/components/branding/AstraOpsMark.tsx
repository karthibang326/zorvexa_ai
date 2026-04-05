import { useId } from "react";
import { cn } from "@/lib/utils";

/** Variation 1: geometric “A” + orchestration flow lines — works on light and dark. */
const GRADIENT_FROM = "#2563EB";
const GRADIENT_TO = "#4F46E5";

type AstraOpsMarkProps = {
  className?: string;
  /** Pixel size of the square viewBox (default 32). */
  size?: number;
  /** When set, the mark is exposed to assistive tech (e.g. icon-only button). */
  title?: string;
};

export function AstraOpsMark({ className, size = 32, title }: AstraOpsMarkProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `astra-grad-${uid}`;

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
        <linearGradient id={gradId} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor={GRADIENT_FROM} />
          <stop offset="1" stopColor={GRADIENT_TO} />
        </linearGradient>
      </defs>
      {/* Flow / orchestration lines */}
      <path
        d="M3 11c2.5-1.2 5-1.2 7.5 0"
        stroke={`url(#${gradId})`}
        strokeWidth="1.35"
        strokeLinecap="round"
        opacity={0.55}
      />
      <path
        d="M3 16c2.5-1.2 5-1.2 7.5 0"
        stroke={`url(#${gradId})`}
        strokeWidth="1.35"
        strokeLinecap="round"
        opacity={0.75}
      />
      <path
        d="M3 21c2.5-1.2 5-1.2 7.5 0"
        stroke={`url(#${gradId})`}
        strokeWidth="1.35"
        strokeLinecap="round"
        opacity={0.55}
      />
      {/* Stylized A */}
      <path
        d="M12 26 L16 6 L20 26 M13.2 18.5h5.6"
        stroke={`url(#${gradId})`}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
