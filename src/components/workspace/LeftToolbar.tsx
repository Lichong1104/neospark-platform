import React from "react";
import {
  Eraser,
  Layers,
  Wand2,
  FolderOpen,
  Loader2,
  Camera,
  ImagePlus,
  Video,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { UserMenuDock } from "@/components/layout/UserMenuDock";

interface LeftToolbarProps {
  isActive: boolean;
  onToolSelect?: (toolId: string) => void;
  onAssetClick?: () => void;
  onAddImagePlaceholder?: () => void;
  onAddVideoPlaceholder?: () => void;
  processingState?: {
    isProcessing: boolean;
    type: string | null;
    progress: number;
  };
  onBgRemove?: () => void;
  onLayerSplit?: () => void;
  onUpscale?: (resolution: "2K" | "4K" | "8K") => void;
  onMultipleAngles?: (params: {
    horizontalAngle: number;
    verticalAngle: number;
    distance: number;
    prompt?: string;
    negativePrompt?: string;
    seed?: number;
  }) => void;
}

interface ToolItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  cost?: number;
  descriptionKey: string;
}

const processTools: ToolItem[] = [
  {
    id: "bg-remover",
    icon: <Eraser className="w-5 h-5" />,
    label: "BG",
    cost: 1,
    descriptionKey: "workspace.removeBackground",
  },
  {
    id: "layer-split",
    icon: <Layers className="w-5 h-5" />,
    label: "Split",
    cost: 2,
    descriptionKey: "workspace.splitLayers",
  },
  {
    id: "multiple-angles",
    icon: <Camera className="w-5 h-5" />,
    label: "Angles",
    cost: 5,
    descriptionKey: "workspace.multipleAngles",
  },
];

const enhanceTools: ToolItem[] = [
  {
    id: "enhance",
    icon: <Wand2 className="w-5 h-5" />,
    label: "Enhance",
    cost: 15,
    descriptionKey: "workspace.aiEnhance",
  },
];

const qualityLevels = [
  { label: "ORIGINAL", cost: 0 },
  { label: "2K", cost: 1, resolution: "2K" as const },
  { label: "4K", cost: 1, resolution: "4K" as const },
  { label: "8K", cost: 1, resolution: "8K" as const },
];

const LeftToolbar: React.FC<LeftToolbarProps> = ({
  isActive,
  onToolSelect,
  onAssetClick,
  onAddImagePlaceholder,
  onAddVideoPlaceholder,
  processingState,
  onBgRemove,
  onLayerSplit,
  onUpscale,
  onMultipleAngles,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedQuality, setSelectedQuality] = React.useState("ORIGINAL");
  const [showCostWarning, setShowCostWarning] = React.useState(false);
  const [pendingQuality, setPendingQuality] = React.useState<string | null>(
    null
  );
  const [activeTool, setActiveTool] = React.useState<string | null>(null);
  const [showAnglesModal, setShowAnglesModal] = React.useState(false);
  const [anglesParams, setAnglesParams] = React.useState({
    horizontalAngle: 45,
    verticalAngle: 0,
    distance: 1,
    prompt: "",
    negativePrompt: "",
    seed: -1,
  });

  const isProcessing = processingState?.isProcessing ?? false;

  const handleQualitySelect = (quality: string) => {
    if (!isActive || isProcessing) {
      if (!isActive) toast.error(t("workspace.selectImageFirst"));
      return;
    }
    const qualityItem = qualityLevels.find((q) => q.label === quality);
    if (quality === "ORIGINAL") {
      setSelectedQuality(quality);
      onToolSelect?.(`quality-original`);
      return;
    }
    if (quality === "8K") {
      setPendingQuality(quality);
      setShowCostWarning(true);
    } else if (qualityItem?.resolution) {
      setSelectedQuality(quality);
      onUpscale?.(qualityItem.resolution);
    }
  };

  const confirmHighCost = () => {
    if (pendingQuality) {
      setSelectedQuality(pendingQuality);
      onUpscale?.("8K");
    }
    setShowCostWarning(false);
    setPendingQuality(null);
  };

  const handleToolClick = (tool: ToolItem) => {
    if (!isActive || isProcessing) {
      if (!isActive) toast.error(t("workspace.selectImageFirst"));
      return;
    }

    // Trigger actual API calls for supported tools
    if (tool.id === "bg-remover") {
      onBgRemove?.();
      return;
    }
    if (tool.id === "layer-split") {
      onLayerSplit?.();
      return;
    }
    if (tool.id === "multiple-angles") {
      setShowAnglesModal(true);
      return;
    }
    // NOTE: "AI enhance" and "AI upscale" click actions are swapped per product UI.
    if (tool.id === "enhance") {
      onUpscale?.("4K");
      return;
    }

    setActiveTool(tool.id === activeTool ? null : tool.id);
    onToolSelect?.(tool.id);
    toast.success(t("workspace.activated", { tool: t(tool.descriptionKey) }));
  };

  return (
    <>
      <div className="h-full w-16 bg-card border-r-brutal border-foreground flex flex-col select-none">
        <button
          type="button"
          id="onboarding-sidebar-logo"
          onClick={() => navigate("/")}
          className="group w-full h-14 shrink-0 flex items-center justify-center border-b-brutal border-foreground cursor-pointer transition-none hover:bg-accent-yellow"
          title="NEOSPARK"
          aria-label="NEOSPARK"
        >
          <div className="w-8 h-8 bg-accent-cyan text-foreground flex items-center justify-center font-black text-base border-brutal border-foreground brutal-shadow-cyan group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] transition-transform">
            N
          </div>
        </button>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {/* Assets Button */}
        <button
          id="onboarding-toolbar-assets"
          onClick={onAssetClick}
          className={cn(
            "w-full h-14 flex flex-col items-center justify-center border-b-brutal border-foreground transition-none",
            "hover:bg-accent-yellow hover:text-foreground"
          )}
          title={t("workspace.assets")}
        >
          <FolderOpen className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1 uppercase">
            {t("workspace.assets")}
          </span>
        </button>

        <button
          id="onboarding-toolbar-gen-image"
          type="button"
          onClick={onAddImagePlaceholder}
          className={cn(
            "w-full h-11 flex flex-col items-center justify-center border-b border-foreground/10 transition-none",
            "hover:bg-accent-cyan/15 hover:text-foreground text-muted-foreground"
          )}
          title={t("workspace.genImage")}
        >
          <ImagePlus className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5 uppercase leading-tight text-center px-0.5">
            {t("workspace.genImageShort")}
          </span>
        </button>

        <button
          id="onboarding-toolbar-gen-video"
          type="button"
          onClick={onAddVideoPlaceholder}
          className={cn(
            "w-full h-11 flex flex-col items-center justify-center border-b-brutal border-foreground transition-none",
            "hover:bg-accent-purple/15 hover:text-foreground text-muted-foreground"
          )}
          title={t("workspace.genVideo")}
        >
          <Video className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5 uppercase leading-tight text-center px-0.5">
            {t("workspace.genVideoShort")}
          </span>
        </button>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="px-1 py-2 bg-accent-cyan/20 border-b border-foreground/15 flex flex-col items-center gap-1">
            <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
            <span className="text-[8px] font-bold uppercase text-accent-cyan">
              {processingState?.progress ?? 0}%
            </span>
          </div>
        )}

        {/* Process Section (no sub-categories) */}
        <div id="onboarding-toolbar-process" className="flex flex-col">
          <div className="px-1 py-2 text-[10px] font-bold uppercase text-center text-muted-foreground border-b border-foreground/15">
            {t("workspace.process")}
          </div>

          {[...processTools, ...enhanceTools].map((tool) => {
            const isToolProcessing =
              isProcessing && processingState?.type === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                title={t(tool.descriptionKey)}
                className={cn(
                  "relative w-full h-11 flex items-center justify-center border-b border-foreground/10 transition-none",
                  isToolProcessing && "bg-accent-cyan/20 animate-pulse",
                  activeTool === tool.id &&
                    !isToolProcessing &&
                    "bg-foreground text-card",
                  isActive && !isProcessing
                    ? "hover:bg-foreground hover:text-card cursor-pointer"
                    : !isToolProcessing && "opacity-30 cursor-not-allowed"
                )}
              >
                {isToolProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  tool.icon
                )}
                {tool.cost && !isToolProcessing && (
                  <span className="absolute top-1 right-1 text-[8px] font-bold bg-accent-cyan text-foreground px-1 leading-tight border border-foreground/30">
                    -{tool.cost}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        </div>
        {/* Quality presets - also belong to Process */}
        <div id="onboarding-toolbar-quality" className="shrink-0">
          {qualityLevels.map((quality) => (
            <button
              key={quality.label}
              onClick={() => handleQualitySelect(quality.label)}
              className={cn(
                "w-full py-2 text-xs font-bold uppercase text-center border-b border-foreground/10 transition-none flex items-center justify-center gap-1",
                selectedQuality === quality.label
                  ? "bg-foreground text-card"
                  : quality.label === "8K"
                  ? "text-accent-red hover:bg-accent-red/10"
                  : "hover:bg-secondary",
                (!isActive || isProcessing) && "opacity-30 cursor-not-allowed"
              )}
            >
              {quality.label}
              {quality.cost > 0 && (
                <span className="text-[8px] opacity-60">-{quality.cost}</span>
              )}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="shrink-0 px-1 py-2 bg-foreground text-card text-[10px] font-mono text-center leading-tight border-t border-foreground/15">
          X:0 Y:0
        </div>

        <UserMenuDock variant="sidebar" />
      </div>

      {/* 8K Cost Warning Modal */}
      {showCostWarning && (
        <div className="fixed inset-0 bg-foreground/80 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-card border-brutal-heavy border-foreground brutal-shadow-heavy p-5 max-w-xs animate-scale-in">
            <div className="text-center mb-3">
              <div className="text-3xl mb-2">⚠️</div>
              <div className="text-sm font-bold uppercase text-accent-red">
                {t("workspace.highCostWarning")}
              </div>
            </div>
            <p
              className="text-xs text-center mb-5 font-mono"
              dangerouslySetInnerHTML={{
                __html: t("workspace.highCostMessage"),
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCostWarning(false)}
                className="flex-1 py-2 border-brutal border-foreground font-bold uppercase text-xs bg-card hover:bg-secondary brutal-shadow brutal-press"
              >
                {t("workspace.cancel")}
              </button>
              <button
                onClick={confirmHighCost}
                className="flex-1 py-2 border-brutal border-foreground font-bold uppercase text-xs bg-accent-red text-card hover:brightness-110 brutal-shadow-red brutal-press"
              >
                {t("workspace.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multiple Angles Parameter Modal */}
      {showAnglesModal && (
        <div className="fixed inset-0 bg-foreground/80 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-card border-brutal-heavy border-foreground brutal-shadow-heavy p-5 max-w-xs animate-scale-in w-full">
            <div className="text-center mb-4">
              <div className="text-lg font-bold uppercase">
                {t("workspace.multipleAnglesTitle", { defaultValue: "Multiple Angles" })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("workspace.multipleAnglesDesc", { defaultValue: "Generate new camera perspective" })}
              </div>
            </div>

            {/* Horizontal Angle */}
            <div className="mb-3">
              <label className="text-[10px] font-bold uppercase block mb-1">
                {t("workspace.horizontalAngle", { defaultValue: "Horizontal" })}
              </label>
              <div className="flex gap-1">
                {[-90, -45, 0, 45, 90].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAnglesParams((p) => ({ ...p, horizontalAngle: v }))}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-bold border-brutal border-foreground brutal-shadow brutal-press transition-none",
                      anglesParams.horizontalAngle === v
                        ? "bg-foreground text-card"
                        : "bg-card hover:bg-secondary"
                    )}
                  >
                    {v}°
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Angle */}
            <div className="mb-3">
              <label className="text-[10px] font-bold uppercase block mb-1">
                {t("workspace.verticalAngle", { defaultValue: "Vertical" })}
              </label>
              <div className="flex gap-1">
                {[-30, 0, 30, 60].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAnglesParams((p) => ({ ...p, verticalAngle: v }))}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-bold border-brutal border-foreground brutal-shadow brutal-press transition-none",
                      anglesParams.verticalAngle === v
                        ? "bg-foreground text-card"
                        : "bg-card hover:bg-secondary"
                    )}
                  >
                    {v}°
                  </button>
                ))}
              </div>
            </div>

            {/* Distance */}
            <div className="mb-3">
              <label className="text-[10px] font-bold uppercase block mb-1">
                {t("workspace.distance", { defaultValue: "Distance" })}
              </label>
              <div className="flex gap-1">
                {[
                  { value: 0, label: t("workspace.distanceClose", { defaultValue: "Close" }) },
                  { value: 1, label: t("workspace.distanceMedium", { defaultValue: "Medium" }) },
                  { value: 2, label: t("workspace.distanceWide", { defaultValue: "Wide" }) },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setAnglesParams((p) => ({ ...p, distance: item.value }))}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-bold border-brutal border-foreground brutal-shadow brutal-press transition-none",
                      anglesParams.distance === item.value
                        ? "bg-foreground text-card"
                        : "bg-card hover:bg-secondary"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Prompt */}
            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase block mb-1">
                {t("workspace.optionalPrompt", { defaultValue: "Prompt (optional)" })}
              </label>
              <input
                type="text"
                value={anglesParams.prompt}
                onChange={(e) => setAnglesParams((p) => ({ ...p, prompt: e.target.value }))}
                placeholder={t("workspace.promptPlaceholder", { defaultValue: "Describe the desired view..." })}
                className="w-full px-2 py-1.5 text-xs bg-card border-brutal border-foreground font-mono focus:outline-none focus:ring-0"
              />
            </div>

            {/* Cost */}
            <div className="text-center mb-4">
              <span className="text-[10px] font-bold bg-accent-cyan text-foreground px-2 py-0.5 border border-foreground/30">
                -5 {t("header.credits", { defaultValue: "Credits" })}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAnglesModal(false)}
                className="flex-1 py-2 border-brutal border-foreground font-bold uppercase text-xs bg-card hover:bg-secondary brutal-shadow brutal-press"
              >
                {t("workspace.cancel")}
              </button>
              <button
                onClick={() => {
                  onMultipleAngles?.({
                    horizontalAngle: anglesParams.horizontalAngle,
                    verticalAngle: anglesParams.verticalAngle,
                    distance: anglesParams.distance,
                    prompt: anglesParams.prompt || undefined,
                    negativePrompt: anglesParams.negativePrompt || undefined,
                    seed: anglesParams.seed,
                  });
                  setShowAnglesModal(false);
                }}
                className="flex-1 py-2 border-brutal border-foreground font-bold uppercase text-xs bg-foreground text-card hover:brightness-110 brutal-shadow brutal-press"
              >
                {t("workspace.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export { LeftToolbar };
