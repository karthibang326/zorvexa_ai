import { AstraOpsLogo } from "@/components/branding/AstraOpsLogo";
import { BRAND } from "@/shared/branding";

const columns = [
  {
    title: "Product",
    links: [
      { name: "Features", href: "#features" },
      { name: "How it Works", href: "#how-it-works" },
      { name: "Pricing", href: "#pricing" },
      { name: "Changelog", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Documentation", href: "#" },
      { name: "API Reference", href: "#" },
      { name: "Tutorials", href: "#" },
      { name: "Blog", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Contact", href: "#" },
      { name: "Privacy", href: "#" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-16">
      <div className="container px-4">
        <div className="grid md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AstraOpsLogo size={22} wordmarkClassName="text-[19px]" />
              <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">AI</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{BRAND.description}</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-all duration-200">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border/50 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">© 2026 {BRAND.name}. All rights reserved.</p>
          <p className="text-xs text-muted-foreground font-mono">v2.0.0-beta</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
