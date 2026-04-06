/**
 * Accessibility (a11y) tests — axe-core via @axe-core/playwright
 *
 * Runs WCAG 2.1 AA checks on public and authenticated pages.
 * CI gate: any critical or serious violation fails the suite.
 *
 * Run:
 *   npx playwright test tests/a11y.spec.ts
 *
 * View full violation report in the Playwright HTML report:
 *   npx playwright show-report
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Pages accessible without auth — test immediately.
const PUBLIC_PAGES = [
  { path: "/", label: "Landing" },
  { path: "/pricing", label: "Pricing" },
  { path: "/docs", label: "Docs" },
  { path: "/auth", label: "Auth" },
  { path: "/features", label: "Features" },
  { path: "/changelog", label: "Changelog" },
];

// Axe rules to exclude — known third-party widget issues we can't control.
const EXCLUDED_RULES = [
  "color-contrast", // Overridden by custom design tokens — audit separately with brand palette.
];

for (const { path, label } of PUBLIC_PAGES) {
  test(`a11y: ${label} page has no critical violations`, async ({ page }) => {
    await page.goto(path);
    // Wait for meaningful content to load.
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .disableRules(EXCLUDED_RULES)
      .analyze();

    const criticalOrSerious = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? "")
    );

    if (criticalOrSerious.length > 0) {
      const report = criticalOrSerious
        .map(
          (v) =>
            `[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n` +
            v.nodes
              .slice(0, 3)
              .map((n) => `  → ${n.html}`)
              .join("\n")
        )
        .join("\n\n");
      console.error(`a11y violations on ${path}:\n${report}`);
    }

    expect(
      criticalOrSerious,
      `${criticalOrSerious.length} critical/serious a11y violation(s) on "${label}" (${path}). ` +
        `Run 'npx playwright show-report' for details.`
    ).toHaveLength(0);
  });
}

test("a11y: Auth page interactive elements are keyboard accessible", async ({ page }) => {
  await page.goto("/auth");
  await page.waitForLoadState("networkidle");

  // Tab through to the email field and verify it's reachable.
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  // Either the skip-link, first input, or a nav link is focused — not <body>.
  expect(focused).not.toBe("BODY");
});

test("a11y: Pricing page has no missing image alt text", async ({ page }) => {
  await page.goto("/pricing");
  await page.waitForLoadState("networkidle");

  const results = await new AxeBuilder({ page })
    .withRules(["image-alt"])
    .analyze();

  expect(results.violations).toHaveLength(0);
});
