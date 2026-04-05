export const BRAND = {
  name: "Zorvexa",
  shortName: "ZVX",
  tagline: "Autonomous Cloud Intelligence",
  description:
    "Enterprise AI control plane for autonomous infrastructure, cost intelligence, and multi-cloud operations",
} as const;

export const BRAND_PRIMARY_DOMAIN = "zoravexa-ai.com" as const;

export const BRAND_PRODUCTION_ORIGINS = [
  `https://${BRAND_PRIMARY_DOMAIN}`,
  `https://www.${BRAND_PRIMARY_DOMAIN}`,
] as const;

export const BRAND_ASSETS = {
  mark: "/branding/zorvexa-mark.svg",
  favicon: "/branding/zorvexa-favicon.svg",
  horizontalDark: "/branding/zorvexa-horizontal-dark.svg",
  horizontalLight: "/branding/zorvexa-horizontal-light.svg",
} as const;
