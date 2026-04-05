import React from "react";
import { motion } from "framer-motion";
import { LogOut, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { NAVIGATION_CONFIG } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { ZorvexaLogo } from "@/components/branding/ZorvexaLogo";

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
    <aside className="bg-[#0B0F1A] border-r border-white/[0.06] flex flex-col h-screen sticky top-0 z-50 overflow-hidden w-[228px] lg:w-[248px]">

      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/[0.06] shrink-0">
        <Link to="/" className="group">
          <ZorvexaLogo
            size={22}
            showTagline
            className="gap-3"
            markClassName="group-hover:scale-105 transition-transform duration-200 border-[#6C5CE7]/20"
            wordmarkClassName="text-[15px]"
            taglineClassName="text-[10px] text-[#9CA3AF] truncate max-w-[150px]"
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-5 px-3 space-y-6">
        {NAVIGATION_CONFIG.map((group) => (
          <div key={group.group}>
            {/* Group label */}
            <p className="px-3 mb-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-white/35 select-none">
              {group.group}
            </p>

            {/* Items — active: blue→violet gradient; inactive: dark card */}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] transition-all duration-200 relative group border",
                      isActive
                        ? "bg-gradient-to-br from-[#6C5CE7] to-[#5b4cdb] text-white shadow-[0_6px_24px_rgba(108,92,231,0.35)] border-transparent"
                        : "text-[#9CA3AF] hover:text-white bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10"
                    )}
                  >
                    <item.icon className={cn(
                      "w-[15px] h-[15px] shrink-0 transition-all",
                      isActive ? "text-white" : "text-white/45 group-hover:text-white/75"
                    )} />
                    <span className={cn(
                      "text-[12px] tracking-tight shrink min-w-0 truncate font-medium",
                      isActive && "font-semibold text-white"
                    )}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className={cn(
                        "ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md border tabular-nums",
                        isActive
                          ? "bg-white/20 text-white border-white/25"
                          : "bg-white/[0.06] text-white/40 border-white/10"
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
      <div className="px-3 pb-4 pt-3 border-t border-white/[0.06] shrink-0">
        <Link
          to="/launch-setup"
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#6C5CE7] to-[#00D4FF]/80 px-3 py-2.5 text-[11px] font-semibold text-white shadow-[0_6px_24px_rgba(108,92,231,0.3)] transition-all duration-200 hover:shadow-[0_8px_28px_rgba(0,212,255,0.2)] hover:brightness-[1.03] active:scale-[0.99]"
        >
          <Rocket className="w-3.5 h-3.5 text-white shrink-0" />
          Launch Mode
        </Link>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-[14px] bg-white/[0.03] border border-white/[0.07] group">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#6C5CE7]/25 to-[#00D4FF]/20 border border-white/10 flex items-center justify-center text-[11px] font-bold text-white/90 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate text-[11px] leading-none">
              {user?.email?.split("@")[0]}
            </p>
            <p className="text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF] mt-0.5">Operator</p>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/10"
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
