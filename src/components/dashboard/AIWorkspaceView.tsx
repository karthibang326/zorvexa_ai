import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, Send, Sparkles, Activity, 
  Terminal, Bell, ArrowUpRight, 
  RefreshCw, TrendingUp, Target, 
  DollarSign, CheckCircle2, AlertCircle,
  Zap, Cpu, Shield, Plus, MessageSquare,
  Search, Code, Library, Layout, Settings,
  Globe, TerminalSquare, Brain, Command,
  Database, Server, BarChart3, CloudRain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ModuleHeader from "./ModuleHeader";
import ChatPanel from "./ai-workspace/ChatPanel";
import PromptPanel from "./ai-workspace/PromptPanel";
import KnowledgePanel from "./ai-workspace/KnowledgePanel";
import ContextEngine from "./ai-workspace/ContextEngine";
import SuggestedActions from "./ai-workspace/SuggestedActions";

interface AIWorkspaceViewProps {
  activePanel?: string;
  prefillQuery?: string | null;
  prefillNonce?: number;
}

const AIWorkspaceView: React.FC<AIWorkspaceViewProps> = ({
  activePanel = "chat",
  prefillQuery,
  prefillNonce,
}) => {
  const renderContent = () => {
    switch (activePanel) {
      case "chat":
        return <ChatPanel initialQuery={prefillQuery} initialNonce={prefillNonce} />;
      case "prompt": return <PromptPanel />;
      case "knowledge": return <KnowledgePanel />;
      default: return <ChatPanel />;
    }
  };

  return (
    <div className="h-full w-full bg-background flex flex-col overflow-hidden">
      {renderContent()}
    </div>
  );
};
export default AIWorkspaceView;

