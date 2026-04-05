import React from "react";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { NAVIGATION_CONFIG } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { AstraOpsLogo } from "@/components/branding/AstraOpsLogo";

interface AppSidebarProps {
  activeTab: string;
  setActiveTab: (id: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  user: any;
  signOut: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
  signOut,
}) => {
  const initials = user?.email?.slice(0, 2).toUpperCase() || "OP";

  return (
    <aside className="bg-[#0f172a] border-r border-white/10 flex flex-col h-screen sticky top-0 z-50 overflow-hidden w-[228px] lg:w-[240px]">

      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0">
        <Link to="/" className="group">
          <AstraOpsLogo
            size={22}
            showTagline
            className="gap-3"
            markClassName="group-hover:scale-105 transition-transform duration-200"
            wordmarkClassName="text-[15px]"
            taglineClassName="text-[10px] text-primary/85 truncate max-w-[145px]"
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-5 px-3 space-y-6">
        {NAVIGATION_CONFIG.map((group) => (
          <div key={group.group}>
            {/* Group label */}
            <p className="px-3 mb-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-foreground/25 select-none">
              {group.group}
            </p>

            {/* Items */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 relative group",
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-foreground/55 hover:text-foreground hover:bg-white/[0.04]"
                    )}
                  >
                    <item.icon className={cn(
                      "w-[15px] h-[15px] shrink-0 transition-all",
                      isActive ? "text-primary" : "opacity-50 group-hover:opacity-80"
                    )} />
                    <span className={cn(
                      "text-[12px] tracking-tight shrink min-w-0 truncate font-medium",
                      isActive && "font-semibold"
                    )}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className={cn(
                        "ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md border tabular-nums",
                        isActive
                          ? "bg-primary/20 text-primary border-primary/30"
                          : "bg-background/60 text-foreground/30 border-white/8"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 pt-3 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 group">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-black text-primary italic shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground/80 truncate text-[11px] uppercase tracking-tight italic leading-none">
              {user?.email?.split("@")[0]}
            </p>
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 italic mt-0.5">
              Platform Engineer
            </p>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 text-foreground/25 hover:text-destructive/80 transition-colors rounded-lg hover:bg-white/5"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
