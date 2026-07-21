import React from "react";
import { ImageIcon, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** 渐变填充的 Bot 图标（粉 → 青） */
const BotGradientIcon: React.FC<{ className?: string }> = ({ className }) => {
  const id = React.useId();
  const gradientId = `${id}-botGradient`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke={`url(#${gradientId})`}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="24"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="hsl(var(--accent-pink))" />
          <stop offset="100%" stopColor="hsl(var(--accent-cyan))" />
        </linearGradient>
      </defs>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
};

export type HubMediaTab = "IMAGE" | "VIDEO" | "AGENT";

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
        <span className="relative inline-flex h-4 w-4 items-center justify-center">
          {/* 粉青渐变柔光背景 */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-accent-pink/30 to-accent-cyan/30 blur-[6px] animate-pulse" />
          <BotGradientIcon />
        </span>
      </button>
    </div>
  );
};
