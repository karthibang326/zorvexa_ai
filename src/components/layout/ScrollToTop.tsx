import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router keeps window scroll position across navigations. Going from a long page
 * (e.g. home) to a shorter one (e.g. /changelog) clamps scroll to the bottom — looks like
 * the new page "opens at the footer". Reset on pathname change; hash-only changes on the
 * same path are left to page-level handlers (e.g. Docs).
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
