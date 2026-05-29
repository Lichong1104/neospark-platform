import React, { useEffect, useMemo, useState } from "react";
import { Clock, Film, Maximize2, Ratio, Settings2, Sparkles } from "lucide-react";
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
import type { VideoModelConfig, VideoResolution } from "@/types/video";

type QuickMenuMode = "ratio" | "duration" | "resolution" | "all";

const composeChipClass =
  "inline-flex shrink-0 items-center gap-1 rounded-md font-mono text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground";

const composeChipEmbeddedClass = "h-6 px-1.5 text-[9px]";
const composeChipDefaultClass = "h-7 px-2 text-[10px]";

const composeChipActiveClass = "bg-foreground/[0.06] text-foreground";

const QuickDropdownMenu: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="absolute bottom-full left-0 z-50 mb-1 min-w-full w-max max-w-[220px] overflow-hidden border-brutal border-foreground bg-card py-0.5 brutal-shadow">
    {children}
  </div>
);

const QuickDropdownItem: React.FC<{
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ selected, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex w-full items-center px-2.5 py-1.5 text-left text-[11px] font-mono transition-none hover:bg-accent-yellow/70",
      selected && "bg-accent-cyan/15 font-bold"
    )}
  >
    {children}
  </button>
);

export interface VideoGenerationParamsProps {
  ratio: string;
  duration: string;
  resolution: VideoResolution;
  model: string;
  ratioOptions: string[];
  durationOptions: string[];
  resolutionOptions: string[];
  modelOptions: VideoModelConfig[];
  onRatioChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onResolutionChange: (value: VideoResolution) => void;
  onModelChange: (value: string) => void;
  className?: string;
  embedded?: boolean;
}

export const VideoGenerationParams: React.FC<VideoGenerationParamsProps> = ({
  ratio,
  duration,
  resolution,
  model,
  ratioOptions,
  durationOptions,
  resolutionOptions,
  modelOptions,
  onRatioChange,
  onDurationChange,
  onResolutionChange,
  onModelChange,
  className,
  embedded = false,
}) => {
  const { t } = useTranslation();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [activeMenu, setActiveMenu] = useState<QuickMenuMode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const modelDropdownOptions: DropdownOption[] = useMemo(
    () =>
      modelOptions.map((m) => ({
        value: m.id,
        label: m.name,
        icon: <Sparkles className="w-3 h-3" />,
      })),
    [modelOptions]
  );

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

  const pick = (mode: QuickMenuMode, fn: () => void) => {
    fn();
    if (activeMenu === mode) setActiveMenu(null);
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
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => toggleQuickMenu("ratio")}
          className={cn(
            chipClass,
            activeMenu === "ratio" && composeChipActiveClass
          )}
        >
          <Ratio className="h-3 w-3 shrink-0 opacity-70" />
          <span>{ratio}</span>
        </button>
        {activeMenu === "ratio" ? (
          <QuickDropdownMenu>
            {ratioOptions.map((opt) => (
              <QuickDropdownItem
                key={opt}
                selected={ratio === opt}
                onClick={() => pick("ratio", () => onRatioChange(opt))}
              >
                {opt}
              </QuickDropdownItem>
            ))}
          </QuickDropdownMenu>
        ) : null}
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => toggleQuickMenu("duration")}
          className={cn(
            chipClass,
            activeMenu === "duration" && composeChipActiveClass
          )}
        >
          <Clock className="h-3 w-3 shrink-0 opacity-70" />
          <span>{duration}s</span>
        </button>
        {activeMenu === "duration" ? (
          <QuickDropdownMenu>
            {durationOptions.map((opt) => (
              <QuickDropdownItem
                key={opt}
                selected={duration === opt}
                onClick={() => pick("duration", () => onDurationChange(opt))}
              >
                {opt}s
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
        >
          <Maximize2 className="h-3 w-3 shrink-0 opacity-70" />
          <span>{resolution}</span>
        </button>
        {activeMenu === "resolution" ? (
          <QuickDropdownMenu>
            {resolutionOptions.map((opt) => (
              <QuickDropdownItem
                key={opt}
                selected={resolution === opt}
                onClick={() =>
                  pick("resolution", () =>
                    onResolutionChange(opt as VideoResolution)
                  )
                }
              >
                {opt}
              </QuickDropdownItem>
            ))}
          </QuickDropdownMenu>
        ) : null}
      </div>

      <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
        <PopoverAnchor asChild>
          <button
            type="button"
            onClick={toggleSettings}
            className={cn(settingsBtnClass, settingsOpen && composeChipActiveClass)}
            aria-label={t("intelligenceHub.generationSettings")}
          >
            <Settings2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </PopoverAnchor>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          className="w-[min(100vw-2rem,280px)] rounded-none border-brutal border-foreground bg-card p-3 shadow-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("intelligenceHub.generationSettings")}
          </p>
          <section className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              {t("intelligenceHub.paramsModel")}
            </span>
            <BrutalDropdown
              options={modelDropdownOptions}
              value={model}
              onChange={onModelChange}
              icon={<Film className="w-3.5 h-3.5" />}
              fullWidth
            />
          </section>
        </PopoverContent>
      </Popover>
    </div>
  );
};
