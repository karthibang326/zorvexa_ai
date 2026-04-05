import React from "react";
import PublicNavbar from "@/components/layout/PublicNavbar";
import LandingFooter from "@/components/landing/LandingFooter";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-[#080a0e] text-foreground relative">
      <div className="pointer-events-none fixed inset-0 bg-[#080a0e]" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(37,99,235,0.14),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(79,70,229,0.08),transparent_45%)]"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <PublicNavbar />
        <main className="flex-1">{children}</main>
        <LandingFooter />
      </div>
    </div>
  );
}
