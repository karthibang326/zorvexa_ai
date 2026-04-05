import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AstraOpsLogo } from "@/components/branding/AstraOpsLogo";

const links = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "/docs" },
];

export default function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B0F1A]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="transition-opacity hover:opacity-90">
          <AstraOpsLogo size={22} wordmarkClassName="text-[20px] text-white" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((item) =>
            item.href.startsWith("/") ? (
              <Link
                key={item.label}
                to={item.href}
                className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            )
          )}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            className="hidden text-slate-300 hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)] hover:brightness-110"
          >
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
