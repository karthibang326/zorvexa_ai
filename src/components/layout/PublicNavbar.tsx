import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ZorvexaLogo } from "@/components/branding/ZorvexaLogo";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "How it works", to: "/#how-it-works", hash: true },
  { label: "Live demo", to: "/live-demo", hash: false },
  { label: "Features", to: "/features", hash: false },
  { label: "Pricing", to: "/pricing", hash: false },
] as const;

export default function PublicNavbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleHashNav = (to: string) => {
    const hash = to.split("#")[1];
    if (!hash) return;

    const scrollToTarget = () => {
      const el = document.getElementById(hash);
      if (!el) return false;
      const y = el.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: y, behavior: "smooth" });
      return true;
    };

    if (location.pathname === "/") {
      scrollToTarget();
      return;
    }

    navigate(`/#${hash}`);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!scrollToTarget()) {
          window.setTimeout(scrollToTarget, 220);
        }
      });
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#080a0e]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="transition-opacity hover:opacity-90">
          <ZorvexaLogo size={22} wordmarkClassName="text-[20px] text-white" />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navItems.map((item) => {
            const exactRoute = !item.hash;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={exactRoute}
                onClick={(e) => {
                  if (item.hash) {
                    e.preventDefault();
                    handleHashNav(item.to);
                  }
                }}
                className={({ isActive }) =>
                  cn(
                    "cursor-pointer text-sm font-medium underline-offset-4 transition-all hover:underline hover:decoration-white/25",
                    isActive ? "text-white" : "text-slate-400 hover:text-white"
                  )
                }
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            asChild
            variant="ghost"
            className="h-9 px-3 text-slate-400 hover:bg-white/10 hover:text-white sm:h-10 sm:px-4"
          >
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button
            asChild
            className="rounded-xl bg-gradient-to-r from-[#2563eb] to-[#4f46e5] px-3 text-sm text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] hover:brightness-110 sm:px-5 sm:text-base"
          >
            <Link to="/dashboard?demo=1">Try demo</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
