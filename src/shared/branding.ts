export const BRAND = {
  name: "Zorvexa",
  shortName: "ZVX",
  tagline: "Autonomous Cloud Intelligence",
  description:
    "Enterprise AI control plane for autonomous infrastructure, cost intelligence, and multi-cloud operations",
} as const;

/** Public hostname only (no scheme). DNS / Site URL / cookie domain hints. */
export const BRAND_PRIMARY_DOMAIN = "zorvexa-ai.com" as const;

/**
 * HTTPS origins allowed in default backend CORS (apex + www). If you serve the app on
 * `app.zorvexa-ai.com`, add `https://app.zorvexa-ai.com` to `CORS_ORIGINS` in production.
 */
export const BRAND_PRODUCTION_ORIGINS = [
  `https://${BRAND_PRIMARY_DOMAIN}`,
  `https://www.${BRAND_PRIMARY_DOMAIN}`,
] as const;

/** Static SVG lockups for email, decks, and `<img>` usage (see `public/branding/`). */
export const BRAND_ASSETS = {
  mark: "/branding/zorvexa-mark.svg",
  favicon: "/branding/zorvexa-favicon.svg",
  horizontalDark: "/branding/zorvexa-horizontal-dark.svg",
  horizontalLight: "/branding/zorvexa-horizontal-light.svg",
} as const;

/**
 * TOTP / Google Authenticator — passed to Supabase `mfa.enroll` as `issuer` so the otpauth URI
 * shows a professional name instead of the project UUID (e.g. Lovable / Supabase ref).
 */
export const BRAND_TOTP_ISSUER = "Zorvexa";

/** Factor display name in Supabase + account subtitle in many authenticator apps. */
export const BRAND_TOTP_FRIENDLY_NAME = "Zorvexa · Enterprise (FAANG-grade)";
