import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AstraOpsLogo } from "@/components/branding/AstraOpsLogo";

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const navLinks = [
    { name: "Features", href: isHome ? "#features" : "/#features" },
    { name: "How it Works", href: isHome ? "#how-it-works" : "/#how-it-works" },
    { name: "Pricing", href: isHome ? "#pricing" : "/#pricing" },
    { name: "Docs", href: "/docs" },
    { name: "Changelog", href: "/changelog" },
  ];

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="container flex items-center justify-between h-16 px-4">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 transition-opacity hover:opacity-90">
          <AstraOpsLogo size={22} className="hidden sm:inline-flex" wordmarkClassName="text-[20px]" />
          <AstraOpsLogo size={22} showWordmark={false} className="sm:hidden inline-flex" />
          <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full hidden sm:inline-block border border-primary/20">
            AI
          </span>
        </Link>

        {/* Center: Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isInternal = link.href.startsWith("/");
            return isInternal ? (
              <Link
                key={link.name}
                to={link.href}
                className={`text-sm font-medium transition-all duration-200 hover:text-primary ${
                  location.pathname === link.href ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.name}
              </Link>
            ) : (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-primary clickable"
              >
                {link.name}
              </a>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-foreground hover:text-primary transition-colors hidden sm:inline-flex font-medium">
            <Link to={user ? "/dashboard" : "/auth"}>{user ? "Dashboard" : "Sign in"}</Link>
          </Button>
          <Button asChild size="sm" className="font-bold gap-1.5 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Link to={user ? "/dashboard" : "/auth"}>
              {user ? "Open App" : "Get Started"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;

