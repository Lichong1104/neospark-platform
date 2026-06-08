import React from "react";
import { Bot, ImageIcon, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type HubMediaTab = "IMAGE" | "VIDEO";

export const GenerationModeIconToggle: React.FC<{
  isAgentMode: boolean;
  onModeToggle: (agentMode: boolean) => void;
  activeTab: HubMediaTab;
  onTabChange: (tab: HubMediaTab) => void;
  id?: string;
  className?: string;
}> = ({
  isAgentMode,
  onModeToggle,
  activeTab,
  onTabChange,
  id,
  className,
}) => {
  const { t } = useTranslation();
  const isImageStandard = activeTab === "IMAGE" && !isAgentMode;

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
        aria-selected={isImageStandard}
        title={t("intelligenceHub.standardMode")}
        onClick={() => {
          onTabChange("IMAGE");
          onModeToggle(false);
        }}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors",
          isImageStandard
            ? "bg-foreground text-card shadow-sm"
            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        )}
      >
        <ImageIcon className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "VIDEO"}
        title={t("intelligenceHub.videoTab")}
        onClick={() => onTabChange("VIDEO")}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors",
          activeTab === "VIDEO"
            ? "bg-foreground text-card shadow-sm"
            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        )}
      >
        <Video className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "IMAGE" && isAgentMode}
        title={t("intelligenceHub.agentMode")}
        onClick={() => {
          onTabChange("IMAGE");
          onModeToggle(true);
        }}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors",
          activeTab === "IMAGE" && isAgentMode
            ? "bg-accent-cyan text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        )}
      >
        <Bot className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
};
