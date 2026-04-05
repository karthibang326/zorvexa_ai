import { Link } from "react-router-dom";
import { AstraOpsLogo } from "@/components/branding/AstraOpsLogo";

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/10 py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <AstraOpsLogo size={22} wordmarkClassName="text-[20px] text-white" />
        <nav className="flex items-center gap-6 text-sm text-slate-300">
          <Link to="/docs" className="transition-colors hover:text-white">
            Docs
          </Link>
          <a href="#" className="transition-colors hover:text-white">
            GitHub
          </a>
          <a href="#" className="transition-colors hover:text-white">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
