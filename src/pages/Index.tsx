import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import Hero from "@/components/landing/Hero";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import Architecture from "@/components/landing/Architecture";
import HowItWorks from "@/components/landing/HowItWorks";
import FinOpsValue from "@/components/landing/FinOpsValue";
import DeveloperExperience from "@/components/landing/DeveloperExperience";
import FinalCTA from "@/components/landing/FinalCTA";
import TrustMetrics from "@/components/landing/TrustMetrics";

/**
 * Zorvexa Landing Experience: "A live AI system controlling the cloud"
 * Orchestrated by Principal Product Designer + Staff Frontend Architect (ex-FAANG).
 * Architecture, ROI, Process, and Developer Proof.
 */
const Index = () => {
  const location = useLocation();

  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (!id) return;
    const scroll = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: y, behavior: "smooth" });
    };
    requestAnimationFrame(() => requestAnimationFrame(scroll));
    const t = window.setTimeout(scroll, 220);
    return () => window.clearTimeout(t);
  }, [location.hash]);

  return (
    <PublicLayout>
      {/* 1. Split Hero (40/60) - Immediate Product Visibility */}
      <Hero />
      
      {/* 2. Trust Metrics - Proof at Scale */}
      <TrustMetrics />
      
      {/* 3. Core Capabilities - Bento Grid of 6 Features */}
      <FeaturesGrid />
      
      {/* 4. Architecture Blueprint - System Clarity */}
      <Architecture />
      
      {/* 5. Intelligence OODA Loop - Process Transparency */}
      <HowItWorks />
      
      {/* 6. FinOps - Business Impact & ROI */}
      <FinOpsValue />
      
      {/* 7. Developer Experience - SDK/YAML/HCL Proof */}
      <DeveloperExperience />
      
      {/* 8. Final Conversion CTA */}
      <FinalCTA />
    </PublicLayout>
  );
};

export default Index;
