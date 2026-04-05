import LandingNavbar from "@/components/landing/LandingNavbar";
import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import HowItWorks from "@/components/landing/HowItWorks";
import ProductVisual from "@/components/landing/ProductVisual";
import Pricing from "@/components/landing/Pricing";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="pointer-events-none fixed inset-0 bg-[#0B0F1A]" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.12),transparent_42%)]"
        aria-hidden
      />
      <div className="relative z-10">
        <LandingNavbar />
        <Hero />
        <TrustBar />
        <FeaturesGrid />
        <HowItWorks />
        <ProductVisual />
        <Pricing />
        <FinalCTA />
        <LandingFooter />
      </div>
    </div>
  );
};

export default Index;
