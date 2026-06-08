import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Images,
  Maximize2,
  Ratio,
  Settings2,
  Wand2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  BrutalDropdown,
  type DropdownOption,
} from "@/components/ui/brutal-dropdown";
import { DrawingModelIcon } from "@/components/icons/DrawingModelIcon";

export type GptImageQuality = "low" | "medium" | "high";

type QuickMenuMode = "quality" | "aspectRatio" | "resolution";

export interface ImageGenerationParamsProps {
  aspectRatio: string;
  resolution: string;
  model: string;
  isGptImage2: boolean;
  gptImageQuality?: GptImageQuality;
  onGptImageQualityChange?: (value: GptImageQuality) => void;
  aspectRatioOptions: DropdownOption[];
  resolutionOptions: DropdownOption[];
  modelOptions: DropdownOption[];
  onAspectRatioChange: (value: string) => void;
  onResolutionChange: (value: string) => void;
  onModelChange: (value: string) => void;
  leadingSlot?: React.ReactNode;
  optimizeStandardPrompt?: boolean;
  onOptimizeStandardPromptChange?: (value: boolean) => void;
  batchMode?: boolean;
  onBatchModeChange?: (value: boolean) => void;
  batchSelectedCount?: number;
  className?: string;
  settingsTriggerId?: string;
  /** 画布节点内嵌：更紧凑的 chip */
  embedded?: boolean;
}

const composeChipClass =
  "inline-flex shrink-0 items-center gap-1 rounded-md font-mono text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground";

const composeChipEmbeddedClass = "h-6 px-1.5 text-[9px]";
const composeChipDefaultClass = "h-7 px-2 text-[10px]";

const composeChipActiveClass = "bg-foreground/[0.06] text-foreground";

function shortModelLabel(label: string): string {
  const paren = label.indexOf("(");
  if (paren > 0) return label.slice(0, paren).trim();
  if (label.length > 14) return `${label.slice(0, 12)}…`;
  return label;
}

const QuickDropdownMenu: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div
    className={cn(
      "absolute bottom-full left-0 z-50 mb-1 min-w-full w-max max-w-[220px] overflow-hidden border-brutal border-foreground bg-card py-0.5 brutal-shadow",
      className
    )}
  >
    {children}
  </div>
);

const QuickDropdownItem: React.FC<{
  selected?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ selected, onClick, icon, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-mono transition-none hover:bg-accent-yellow/70",
      selected && "bg-accent-cyan/15 font-bold"
    )}
  >
    {icon ? <span className="shrink-0 opacity-70">{icon}</span> : null}
    <span className="min-w-0 flex-1 truncate">{children}</span>
    {selected ? (
      <Check className="h-3 w-3 shrink-0 text-accent-cyan" strokeWidth={2.5} />
    ) : (
      <span className="h-3 w-3 shrink-0" aria-hidden />
    )}
  </button>
);

const QualitySegment: React.FC<{
  value: GptImageQuality;
  onChange: (value: GptImageQuality) => void;
}> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const options: { value: GptImageQuality; label: string }[] = [
    { value: "low", label: t("intelligenceHub.gptQualityShortLow") },
    { value: "medium", label: t("intelligenceHub.gptQualityShortMedium") },
    { value: "high", label: t("intelligenceHub.gptQualityShortHigh") },
  ];

  return (
    <div className="inline-flex w-full border border-foreground/20 bg-secondary/20 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-none",
            value === opt.value
              ? "bg-card text-foreground border border-foreground/25 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

function parseAspectRatio(value: string): { w: number; h: number } | null {
  const match = value.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { w: Number(match[1]), h: Number(match[2]) };
}

function aspectRatioPreviewSize(
  w: number,
  h: number,
  maxSize = 26
): { width: number; height: number } {
  const ratio = w / h;
  if (ratio >= 1) {
    return { width: maxSize, height: Math.max(8, Math.round(maxSize / ratio)) };
  }
  return { width: Math.max(8, Math.round(maxSize * ratio)), height: maxSize };
}

const AspectRatioShape: React.FC<{
  ratio: string;
  selected: boolean;
}> = ({ ratio, selected }) => {
  const dims = parseAspectRatio(ratio);
  const { width, height } = dims
    ? aspectRatioPreviewSize(dims.w, dims.h)
    : { width: 20, height: 20 };

  return (
    <div
      className="flex h-[30px] w-full items-center justify-center"
      aria-hidden
    >
      <div
        className={cn(
          "shrink-0 border-2 transition-none",
          selected
            ? "border-foreground bg-foreground/12"
            : "border-foreground/30 bg-muted/40"
        )}
        style={{ width, height }}
      />
    </div>
  );
};

const AspectRatioGrid: React.FC<{
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="grid grid-cols-4 gap-1">
    {options.map((opt) => {
      const selected = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex min-h-[52px] flex-col items-center justify-center gap-0.5 border px-1 py-1.5 text-[9px] font-mono transition-none",
            selected
              ? "border-foreground/40 bg-secondary/50 text-foreground"
              : "border-foreground/15 bg-background text-muted-foreground hover:border-foreground/30"
          )}
        >
          <AspectRatioShape ratio={opt.value} selected={selected} />
          <span className="w-full truncate text-center">{opt.value}</span>
        </button>
      );
    })}
  </div>
);

export const ImageGenerationParams: React.FC<ImageGenerationParamsProps> = ({
  aspectRatio,
  resolution,
  model,
  isGptImage2,
  gptImageQuality = "low",
  onGptImageQualityChange,
  aspectRatioOptions,
  resolutionOptions,
  modelOptions,
  onAspectRatioChange,
  onResolutionChange,
  onModelChange,
  leadingSlot,
  optimizeStandardPrompt,
  onOptimizeStandardPromptChange,
  batchMode,
  onBatchModeChange,
  batchSelectedCount = 0,
  className,
  settingsTriggerId,
  embedded = false,
}) => {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeMenu, setActiveMenu] = useState<QuickMenuMode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const selectedModelOption = useMemo(
    () => modelOptions.find((o) => o.value === model),
    [model, modelOptions]
  );

  const modelLabel = useMemo(() => {
    return selectedModelOption
      ? shortModelLabel(selectedModelOption.label)
      : model;
  }, [model, selectedModelOption]);

  const qualityShort = useMemo(() => {
    if (!isGptImage2) return null;
    const map: Record<GptImageQuality, string> = {
      low: t("intelligenceHub.gptQualityShortLow"),
      medium: t("intelligenceHub.gptQualityShortMedium"),
      high: t("intelligenceHub.gptQualityShortHigh"),
    };
    return map[gptImageQuality];
  }, [gptImageQuality, isGptImage2, t]);

  const qualityOptions = useMemo(
    (): { value: GptImageQuality; label: string }[] => [
      { value: "low", label: t("agentChat.gptImageQualityLow") },
      { value: "medium", label: t("agentChat.gptImageQualityMedium") },
      { value: "high", label: t("agentChat.gptImageQualityHigh") },
    ],
    [t]
  );

  const summaryTitle = useMemo(() => {
    const parts: string[] = [];
    if (qualityShort) parts.push(qualityShort);
    parts.push(resolution, aspectRatio, modelLabel);
    return parts.join(" · ");
  }, [qualityShort, resolution, aspectRatio, modelLabel]);

  const showStandardExtras =
    onOptimizeStandardPromptChange != null || onBatchModeChange != null;

  const toggleQuickMenu = (mode: QuickMenuMode) => {
    setSettingsOpen(false);
    setActiveMenu((prev) => (prev === mode ? null : mode));
  };

  const toggleSettings = () => {
    setActiveMenu(null);
    setSettingsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!activeMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [activeMenu]);

  const pickQuality = (value: GptImageQuality) => {
    onGptImageQualityChange?.(value);
    setActiveMenu(null);
  };

  const pickAspectRatio = (value: string) => {
    onAspectRatioChange(value);
    setActiveMenu(null);
  };

  const pickResolution = (value: string) => {
    onResolutionChange(value);
    setActiveMenu(null);
  };

  const chipClass = cn(
    composeChipClass,
    embedded ? composeChipEmbeddedClass : composeChipDefaultClass
  );
  const settingsBtnClass = cn(
    "inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground",
    embedded ? "h-6 w-6" : "h-7 w-7"
  );

  return (
    <div
      ref={rootRef}
      className={cn("flex min-w-0 items-center gap-0.5", className)}
    >
      {leadingSlot}

      {qualityShort && isGptImage2 && onGptImageQualityChange ? (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => toggleQuickMenu("quality")}
            className={cn(
              chipClass,
              activeMenu === "quality" && composeChipActiveClass
            )}
            title={t("intelligenceHub.paramsQuality")}
            aria-expanded={activeMenu === "quality"}
          >
            <Wand2 className="h-3 w-3 shrink-0 opacity-70" />
            <span>{qualityShort}</span>
          </button>
          {activeMenu === "quality" ? (
            <QuickDropdownMenu>
              {qualityOptions.map((opt) => (
                <QuickDropdownItem
                  key={opt.value}
                  selected={gptImageQuality === opt.value}
                  onClick={() => pickQuality(opt.value)}
                >
                  {opt.label}
                </QuickDropdownItem>
              ))}
            </QuickDropdownMenu>
          ) : null}
        </div>
      ) : null}

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => toggleQuickMenu("aspectRatio")}
          className={cn(
            chipClass,
            activeMenu === "aspectRatio" && composeChipActiveClass
          )}
          title={t("intelligenceHub.paramsAspectRatio")}
          aria-expanded={activeMenu === "aspectRatio"}
        >
          <Ratio className="h-3 w-3 shrink-0 opacity-70" />
          <span>{aspectRatio}</span>
        </button>
        {activeMenu === "aspectRatio" ? (
          <QuickDropdownMenu className="max-h-48 overflow-y-auto">
            {aspectRatioOptions.map((opt) => (
              <QuickDropdownItem
                key={opt.value}
                selected={aspectRatio === opt.value}
                icon={opt.icon}
                onClick={() => pickAspectRatio(opt.value)}
              >
                {opt.label}
              </QuickDropdownItem>
            ))}
          </QuickDropdownMenu>
        ) : null}
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => toggleQuickMenu("resolution")}
          className={cn(
            chipClass,
            activeMenu === "resolution" && composeChipActiveClass
          )}
          title={t("intelligenceHub.paramsResolution")}
          aria-expanded={activeMenu === "resolution"}
        >
          <Maximize2 className="h-3 w-3 shrink-0 opacity-70" />
          <span>{resolution}</span>
        </button>
        {activeMenu === "resolution" ? (
          <QuickDropdownMenu>
            {resolutionOptions.map((opt) => (
              <QuickDropdownItem
                key={opt.value}
                selected={resolution === opt.value}
                onClick={() => pickResolution(opt.value)}
              >
                {opt.label}
              </QuickDropdownItem>
            ))}
          </QuickDropdownMenu>
        ) : null}
      </div>

      <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
        <PopoverAnchor asChild>
          <button
            id={settingsTriggerId}
            type="button"
            onClick={toggleSettings}
            className={cn(
              settingsBtnClass,
              settingsOpen && composeChipActiveClass
            )}
            title={summaryTitle}
            aria-label={t("intelligenceHub.generationSettings")}
            aria-expanded={settingsOpen}
          >
            <Settings2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </PopoverAnchor>

        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          className="w-[min(100vw-2rem,320px)] overflow-hidden rounded-none border-brutal border-foreground bg-card p-0 shadow-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p className="shrink-0 px-3 pt-3 pb-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("intelligenceHub.generationSettings")}
          </p>

          <div className="scrollbar-brutal max-h-[min(60vh,420px)] overflow-y-auto overflow-x-hidden">
            <div className="space-y-3 px-3 pb-3">
            {isGptImage2 && onGptImageQualityChange ? (
              <section className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  {t("intelligenceHub.paramsQuality")}
                </span>
                <QualitySegment
                  value={gptImageQuality}
                  onChange={onGptImageQualityChange}
                />
              </section>
            ) : null}

            <section className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                {t("intelligenceHub.paramsAspectRatio")}
              </span>
              <AspectRatioGrid
                options={aspectRatioOptions}
                value={aspectRatio}
                onChange={onAspectRatioChange}
              />
            </section>

            <section className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                {t("intelligenceHub.paramsResolution")}
              </span>
              <BrutalDropdown
                options={resolutionOptions}
                value={resolution}
                onChange={onResolutionChange}
                fullWidth
              />
            </section>

            <section className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                {t("intelligenceHub.paramsModel")}
              </span>
              <BrutalDropdown
                options={modelOptions}
                value={model}
                onChange={onModelChange}
                icon={
                  selectedModelOption?.icon ?? (
                    <DrawingModelIcon modelId={model} className="h-3.5 w-3.5" />
                  )
                }
                fullWidth
              />
              <p className="text-[9px] font-mono text-muted-foreground/80 truncate">
                {modelLabel}
              </p>
            </section>

            {showStandardExtras ? (
              <section className="space-y-2 border-t border-foreground/10 pt-3">
                {onOptimizeStandardPromptChange != null ? (
                  <button
                    type="button"
                    onClick={() =>
                      onOptimizeStandardPromptChange(!optimizeStandardPrompt)
                    }
                    className={cn(
                      "w-full h-8 px-2 inline-flex items-center justify-center gap-1.5 text-[10px] font-mono border border-foreground/20 transition-none",
                      optimizeStandardPrompt
                        ? "bg-accent-cyan/15 text-foreground border-accent-cyan/40"
                        : "bg-background text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 shrink-0 border border-foreground/40",
                        optimizeStandardPrompt
                          ? "bg-accent-cyan"
                          : "bg-transparent"
                      )}
                    />
                    <span className="truncate">
                      {t("intelligenceHub.optimizePromptShort")}
                    </span>
                  </button>
                ) : null}
                {onBatchModeChange != null ? (
                  <button
                    type="button"
                    onClick={() => onBatchModeChange(!batchMode)}
                    className={cn(
                      "w-full h-8 px-2 inline-flex items-center justify-center gap-1.5 text-[10px] font-mono border border-foreground/20 transition-none",
                      batchMode
                        ? "bg-accent-pink/15 text-foreground border-accent-pink/40"
                        : "bg-background text-muted-foreground"
                    )}
                  >
                    <Images className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {t("intelligenceHub.batchMode")}
                    </span>
                    {batchSelectedCount > 1 ? (
                      <span className="shrink-0 text-[9px] text-accent-pink font-bold">
                        {batchSelectedCount}
                      </span>
                    ) : null}
                  </button>
                ) : null}
              </section>
            ) : null}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
