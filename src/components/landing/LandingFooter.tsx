import { Link } from "react-router-dom";
import { ZorvexaLogo } from "@/components/branding/ZorvexaLogo";
import { cn } from "@/lib/utils";

const footerLinkClass = cn(
  "inline-block cursor-pointer rounded-sm text-sm text-slate-400 underline-offset-4 transition-all",
  "hover:text-white hover:underline hover:decoration-white/35 hover:shadow-[0_0_20px_rgba(59,130,246,0.12)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
);

type FooterLinkItem = { label: string; to: string } | { label: string; href: string };

const cols: { title: string; links: FooterLinkItem[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", to: "/features" },
      { label: "Pricing", to: "/pricing" },
      { label: "Live Demo", to: "/live-demo" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Docs", to: "/docs" },
      { label: "API Reference", to: "/docs#api-sdk" },
      { label: "SDKs", to: "/docs#api-sdk-agent-api" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Changelog", to: "/changelog" },
      { label: "Careers", href: "mailto:careers@zorvexa.com?subject=Careers%20%E2%80%94%20Zorvexa" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact Support", to: "/docs#help" },
      { label: "Talk to Sales", href: "mailto:sales@zorvexa.com?subject=Sales%20%E2%80%94%20Zorvexa" },
      { label: "Status Page", to: "/changelog" },
    ],
  },
];

function FooterLink({ item }: { item: FooterLinkItem }) {
  if ("href" in item) {
    const isHttp = item.href.startsWith("http");
    return (
      <a
        href={item.href}
        className={footerLinkClass}
        {...(isHttp ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link to={item.to} className={footerLinkClass}>
      {item.label}
    </Link>
  );
}

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/10 py-14">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div>
            <Link to="/" className="inline-block transition-opacity hover:opacity-90">
              <ZorvexaLogo size={22} wordmarkClassName="text-[20px] text-white" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              Autonomous AI for cloud operations — observe, decide, and act across multi-cloud estates.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{col.title}</p>
              <ul className="mt-4 space-y-3">
                {col.links.map((item) => (
                  <li key={item.label}>
                    <FooterLink item={item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/[0.06] pt-8 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Zorvexa. All rights reserved.</p>
          <p className="text-slate-500">Outcome-based · Multi-cloud · Governance-grade</p>
        </div>
      </div>
    </footer>
  );
}
