import * as React from "react";
import { cn } from "@/lib/utils";

interface ModeSwitchProps {
  isAgentMode: boolean;
  onToggle: () => void;
  className?: string;
}

const ModeSwitch = React.forwardRef<HTMLButtonElement, ModeSwitchProps>(
  ({ isAgentMode, onToggle, className }, ref) => {
    return (
      <button
        ref={ref}
        onClick={onToggle}
        className={cn(
          "relative flex h-14 w-full border-brutal-heavy border-foreground font-mono font-bold uppercase tracking-wider transition-none",
          className
        )}
      >
        {/* Standard Side */}
        <div
          className={cn(
            "flex-1 flex items-center justify-center transition-none",
            !isAgentMode
              ? "bg-foreground text-background"
              : "bg-transparent text-foreground"
          )}
        >
          [ STANDARD ]
        </div>
        
        {/* Divider */}
        <div className="w-[3px] bg-foreground" />
        
        {/* Agent Side */}
        <div
          className={cn(
            "flex-1 flex items-center justify-center transition-none",
            isAgentMode
              ? "bg-accent-yellow text-foreground"
              : "bg-transparent text-foreground"
          )}
        >
          [ AGENT_MODE ]
        </div>
      </button>
    );
  }
);
ModeSwitch.displayName = "ModeSwitch";

export { ModeSwitch };
