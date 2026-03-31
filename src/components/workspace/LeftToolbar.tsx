import React from "react";
import { 
  Eraser, 
  Layers, 
  Layers2, 
  Maximize,
  Wand2,
  Palette,
  Sparkles,
  FolderOpen,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface LeftToolbarProps {
  isActive: boolean;
  onToolSelect?: (toolId: string) => void;
  onAssetClick?: () => void;
  processingState?: {
    isProcessing: boolean;
    type: string | null;
    progress: number;
  };
  onBgRemove?: () => void;
  onLayerSplit?: () => void;
  onUpscale?: (resolution: "2K" | "4K" | "8K") => void;
}

interface ToolItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  cost?: number;
  descriptionKey: string;
}

const processTools: ToolItem[] = [
  { id: "bg-remover", icon: <Eraser className="w-5 h-5" />, label: "BG", cost: 1, descriptionKey: "workspace.removeBackground" },
  { id: "layer-split", icon: <Layers className="w-5 h-5" />, label: "Split", cost: 2, descriptionKey: "workspace.splitLayers" },
  { id: "layers", icon: <Layers2 className="w-5 h-5" />, label: "Layers", descriptionKey: "workspace.layerManagement" },
  { id: "expand", icon: <Maximize className="w-5 h-5" />, label: "Expand", descriptionKey: "workspace.expandCanvas" },
];

const enhanceTools: ToolItem[] = [
  { id: "enhance", icon: <Wand2 className="w-5 h-5" />, label: "Enhance", cost: 15, descriptionKey: "workspace.aiEnhance" },
  { id: "colorize", icon: <Palette className="w-5 h-5" />, label: "Color", cost: 10, descriptionKey: "workspace.autoColorize" },
  { id: "upscale", icon: <Sparkles className="w-5 h-5" />, label: "Upscale", cost: 1, descriptionKey: "workspace.aiUpscale" },
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
  processingState,
  onBgRemove,
  onLayerSplit,
  onUpscale,
}) => {
  const { t } = useTranslation();
  const [selectedQuality, setSelectedQuality] = React.useState("ORIGINAL");
  const [showCostWarning, setShowCostWarning] = React.useState(false);
  const [pendingQuality, setPendingQuality] = React.useState<string | null>(null);
  const [activeTool, setActiveTool] = React.useState<string | null>(null);

  const isProcessing = processingState?.isProcessing ?? false;

  const handleQualitySelect = (quality: string) => {
    if (!isActive || isProcessing) {
      if (!isActive) toast.error(t("workspace.selectImageFirst"));
      return;
    }
    const qualityItem = qualityLevels.find(q => q.label === quality);
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
    if (tool.id === "upscale") {
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
        {/* Assets Button */}
        <button
          onClick={onAssetClick}
          className={cn(
            "w-full h-14 flex flex-col items-center justify-center border-b-brutal border-foreground transition-none",
            "hover:bg-accent-yellow hover:text-foreground"
          )}
          title={t("workspace.assets")}
        >
          <FolderOpen className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1 uppercase">{t("workspace.assets")}</span>
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

        {/* Process Section */}
        <div className="flex flex-col">
          <div className="px-1 py-2 text-[10px] font-bold uppercase text-center text-muted-foreground border-b border-foreground/15">
            {t("workspace.process")}
          </div>
          
          {processTools.map((tool) => {
            const isToolProcessing = isProcessing && processingState?.type === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                title={t(tool.descriptionKey)}
                className={cn(
                  "relative w-full h-11 flex items-center justify-center border-b border-foreground/10 transition-none",
                  isToolProcessing && "bg-accent-cyan/20 animate-pulse",
                  activeTool === tool.id && !isToolProcessing && "bg-foreground text-card",
                  isActive && !isProcessing
                    ? "hover:bg-foreground hover:text-card cursor-pointer"
                    : !isToolProcessing && "opacity-30 cursor-not-allowed"
                )}
              >
                {isToolProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : tool.icon}
                {tool.cost && !isToolProcessing && (
                  <span className="absolute top-1 right-1 text-[8px] font-bold bg-accent-cyan text-foreground px-1 leading-tight border border-foreground/30">
                    -{tool.cost}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Enhance Section */}
        <div className="flex flex-col">
          <div className="px-1 py-2 text-[10px] font-bold uppercase text-center text-muted-foreground border-b border-foreground/15 bg-accent-cyan/10">
            {t("workspace.enhance")}
          </div>
          
          {enhanceTools.map((tool) => {
            const isToolProcessing = isProcessing && processingState?.type === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                title={t(tool.descriptionKey)}
                className={cn(
                  "relative w-full h-11 flex items-center justify-center border-b border-foreground/10 transition-none",
                  isToolProcessing && "bg-accent-purple/20 animate-pulse",
                  activeTool === tool.id && !isToolProcessing && "bg-foreground text-card",
                  isActive && !isProcessing
                    ? "hover:bg-foreground hover:text-card cursor-pointer"
                    : !isToolProcessing && "opacity-30 cursor-not-allowed"
                )}
              >
                {isToolProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : tool.icon}
                {tool.cost && !isToolProcessing && (
                  <span className="absolute top-1 right-1 text-[8px] font-bold bg-accent-purple text-card px-1 leading-tight border border-foreground/30">
                    -{tool.cost}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quality Section - wired to Upscale API */}
        <div className="border-t border-foreground/15 mt-auto">
          <div className="px-1 py-2 text-[10px] font-bold uppercase text-center text-muted-foreground">
            {t("workspace.quality")}
          </div>
          
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
        <div className="px-1 py-2 bg-foreground text-card text-[10px] font-mono text-center leading-tight">
          X:0 Y:0
        </div>
      </div>

      {/* 8K Cost Warning Modal */}
      {showCostWarning && (
        <div className="fixed inset-0 bg-foreground/80 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-card border-brutal-heavy border-foreground brutal-shadow-heavy p-5 max-w-xs animate-scale-in">
            <div className="text-center mb-3">
              <div className="text-3xl mb-2">⚠️</div>
              <div className="text-sm font-bold uppercase text-accent-red">{t("workspace.highCostWarning")}</div>
            </div>
            <p className="text-xs text-center mb-5 font-mono" dangerouslySetInnerHTML={{ __html: t("workspace.highCostMessage") }} />
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
    </>
  );
};

export { LeftToolbar };
