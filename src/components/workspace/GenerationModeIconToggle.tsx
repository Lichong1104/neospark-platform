import React from "react";
import { Bot, ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const GenerationModeIconToggle: React.FC<{
  isAgentMode: boolean;
  onModeToggle: (agentMode: boolean) => void;
  id?: string;
  className?: string;
}> = ({ isAgentMode, onModeToggle, id, className }) => {
  const { t } = useTranslation();

  return (
    <div
      id={id}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-md bg-foreground/[0.04] p-0.5",
        className
      )}
      role="tablist"
      aria-label={t("intelligenceHub.generationMode")}
    >
      <button
        type="button"
        role="tab"
        aria-selected={!isAgentMode}
        title={t("intelligenceHub.standardMode")}
        onClick={() => onModeToggle(false)}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors",
          !isAgentMode
            ? "bg-foreground text-card shadow-sm"
            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        )}
      >
        <ImageIcon className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isAgentMode}
        title={t("intelligenceHub.agentMode")}
        onClick={() => onModeToggle(true)}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors",
          isAgentMode
            ? "bg-accent-cyan text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        )}
      >
        <Bot className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
};
