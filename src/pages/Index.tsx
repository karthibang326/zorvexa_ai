import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import Hero from "@/components/landing/Hero";
import ProductPreview from "@/components/landing/ProductPreview";
import HowItWorks from "@/components/landing/HowItWorks";
import LiveDemo from "@/components/landing/LiveDemo";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import TrustMetrics from "@/components/landing/TrustMetrics";
import EnterpriseTrust from "@/components/landing/EnterpriseTrust";
import Pricing from "@/components/landing/Pricing";
import Differentiation from "@/components/landing/Differentiation";
import ChangelogTeaser from "@/components/landing/ChangelogTeaser";
import DocsTeaser from "@/components/landing/DocsTeaser";
import FinalCTA from "@/components/landing/FinalCTA";

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
      <Hero />
      <ProductPreview />
      <HowItWorks />
      <FeaturesGrid />
      <TrustMetrics />
      <EnterpriseTrust />
      <LiveDemo />
      <Pricing />
      <Differentiation />
      <ChangelogTeaser />
      <DocsTeaser />
      <FinalCTA />
    </PublicLayout>
  );
};

export default Index;
