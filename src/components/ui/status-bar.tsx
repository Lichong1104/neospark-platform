import * as React from "react";
import { cn } from "@/lib/utils";

type StatusType = "ecommerce" | "optimizer" | "photographer" | "custom" | "offline";

interface StatusBarProps {
  status: StatusType;
  agentName?: string;
  className?: string;
}

const statusConfig: Record<StatusType, { bg: string; glow: string; text: string }> = {
  ecommerce: {
    bg: "bg-accent-orange",
    glow: "glow-orange",
    text: "ECOMMERCE_AGENT ONLINE",
  },
  optimizer: {
    bg: "bg-accent-green",
    glow: "glow-green",
    text: "OPTIMIZER_AGENT ONLINE",
  },
  photographer: {
    bg: "bg-accent-cyan",
    glow: "glow-cyan",
    text: "PHOTOGRAPHER_AGENT ONLINE",
  },
  custom: {
    bg: "bg-accent-yellow",
    glow: "glow-yellow",
    text: "CUSTOM_AGENT ONLINE",
  },
  offline: {
    bg: "bg-muted",
    glow: "",
    text: "STANDARD MODE",
  },
};

const StatusBar: React.FC<StatusBarProps> = ({ status, agentName, className }) => {
  const config = statusConfig[status];
  const displayText = agentName ? `${agentName.toUpperCase()}_AGENT ONLINE` : config.text;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider border-brutal border-foreground",
        config.bg,
        config.glow,
        className
      )}
    >
      <span className="text-foreground">&gt;&gt; SYSTEM:</span>
      <span className="text-foreground animate-pulse-glow">{displayText}</span>
    </div>
  );
};

export { StatusBar, type StatusType };
