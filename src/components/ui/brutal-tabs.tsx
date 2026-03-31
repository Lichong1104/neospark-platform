import * as React from "react";
import { cn } from "@/lib/utils";

interface BrutalTabsProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

const BrutalTabs: React.FC<BrutalTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
}) => {
  return (
    <div className={cn("flex border-b-brutal border-foreground", className)}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            "flex-1 px-6 py-4 font-mono font-bold text-lg uppercase tracking-widest transition-none border-r-brutal border-foreground last:border-r-0",
            activeTab === tab
              ? "bg-foreground text-background"
              : "bg-background text-foreground hover:bg-secondary"
          )}
        >
          [ {tab} ]
        </button>
      ))}
    </div>
  );
};

export { BrutalTabs };
