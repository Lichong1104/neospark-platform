import React, { useState } from "react";
import { 
  Settings, 
  CheckCircle, 
  Pencil, 
  RefreshCw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Palette,
  Camera,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface PromptConfig {
  sceneName: string;
  style?: string;
  lighting?: string;
  composition?: string;
  quality?: string;
  negativePrompt?: string;
}

interface AgentResponseCardProps {
  config: PromptConfig;
  onRegenerate: () => void;
  onModify: () => void;
  onConfirm: () => void;
  onViewDetails: () => void;
  timestamp?: string;
}

const AgentResponseCard: React.FC<AgentResponseCardProps> = ({
  config,
  onRegenerate,
  onModify,
  onConfirm,
  onViewDetails,
  timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}) => {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<"up" | "down" | null>(null);

  const handleCopy = () => {
    const text = `Scene: ${config.sceneName}\nStyle: ${config.style || "Realistic"}\nLighting: ${config.lighting || "Natural"}\nQuality: ${config.quality || "HD"}`;
    navigator.clipboard.writeText(text);
    toast.success("已复制配置");
  };

  return (
    <div className="w-full animate-fade-in">
      {/* Agent header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-accent-cyan border-brutal border-foreground flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-xs">OPTIMIZER_AGENT</span>
          <span className="text-[10px] text-muted-foreground ml-1.5">{timestamp}</span>
        </div>
      </div>

      {/* Understanding message */}
      <div className="bg-secondary/30 border border-foreground/10 px-2.5 py-2 mb-3">
        <p className="text-xs text-muted-foreground">
          {t("agentChat.understood")}
        </p>
      </div>

      {/* Config preview card */}
      <div className="bg-card border-brutal border-foreground p-3 mb-3">
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-5 h-5 bg-accent-yellow flex items-center justify-center">
            <Layers className="w-3 h-3" />
          </div>
          <span className="font-bold text-[10px] uppercase tracking-wider">{t("agentResponse.promptConfigPreview")}</span>
        </div>

        {/* Scene name */}
        <div className="bg-secondary/30 border border-foreground/10 px-2.5 py-2 mb-3">
          <div className="text-[9px] text-muted-foreground mb-0.5 uppercase">{t("agentResponse.sceneName")}</div>
          <div className="font-bold text-xs">{config.sceneName}</div>
        </div>

        {/* Params grid — more compact */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="bg-secondary/30 border border-foreground/10 p-2 text-center">
            <Palette className="w-3.5 h-3.5 mx-auto mb-1 text-accent-purple" />
            <div className="font-bold text-xs truncate">{config.style || "Realistic"}</div>
            <div className="text-[8px] text-muted-foreground">{t("agentResponse.style")}</div>
          </div>
          <div className="bg-secondary/30 border border-foreground/10 p-2 text-center">
            <Camera className="w-3.5 h-3.5 mx-auto mb-1 text-accent-cyan" />
            <div className="font-bold text-xs truncate">{config.lighting || "Natural"}</div>
            <div className="text-[8px] text-muted-foreground">{t("agentResponse.lighting")}</div>
          </div>
          <div className="bg-secondary/30 border border-foreground/10 p-2 text-center">
            <Target className="w-3.5 h-3.5 mx-auto mb-1 text-accent-green" />
            <div className="font-bold text-xs truncate">{config.quality || "HD"}</div>
            <div className="text-[8px] text-muted-foreground">{t("agentResponse.qualityLabel")}</div>
          </div>
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between py-1.5 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <span>{t("agentResponse.detailedParams").replace("{{count}}", config.composition ? "4" : "3")}</span>
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showDetails && (
          <div className="mt-2 p-2 bg-secondary/20 border border-foreground/10 text-[10px] font-mono space-y-1 animate-fade-in">
            <div><span className="text-accent-cyan">style:</span> {config.style || "realistic"}</div>
            <div><span className="text-accent-cyan">lighting:</span> {config.lighting || "natural light"}</div>
            <div><span className="text-accent-cyan">composition:</span> {config.composition || "centered"}</div>
            <div><span className="text-accent-cyan">quality:</span> {config.quality || "high quality, 4k, detailed"}</div>
            {config.negativePrompt && (
              <div><span className="text-accent-red">negative:</span> {config.negativePrompt}</div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons — more compact */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button onClick={onViewDetails} className="flex items-center gap-1 px-2.5 py-1.5 border-brutal border-foreground bg-card hover:bg-secondary font-bold text-[10px] uppercase brutal-press">
          <Settings className="w-3 h-3" />
          {t("agentResponse.details")}
        </button>
        <button onClick={onConfirm} className="flex items-center gap-1 px-2.5 py-1.5 border-brutal border-foreground bg-accent-green text-foreground font-bold text-[10px] uppercase brutal-press hover:brightness-110">
          <CheckCircle className="w-3 h-3" />
          {t("agentResponse.confirmBtn")}
        </button>
        <button onClick={onModify} className="flex items-center gap-1 px-2.5 py-1.5 border-brutal border-foreground bg-card hover:bg-secondary font-bold text-[10px] uppercase brutal-press">
          <Pencil className="w-3 h-3" />
          {t("agentResponse.modify")}
        </button>
        <button onClick={onRegenerate} className="flex items-center gap-1 px-2.5 py-1.5 border-brutal border-foreground bg-accent-cyan text-foreground font-bold text-[10px] uppercase brutal-press hover:brightness-110">
          <RefreshCw className="w-3 h-3" />
          {t("agentResponse.regenerate")}
        </button>
      </div>

      {/* Feedback row */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <button onClick={handleCopy} className="p-1 hover:bg-secondary hover:text-foreground transition-none" title="Copy">
          <Copy className="w-3 h-3" />
        </button>
        <button onClick={() => setFeedbackGiven("up")} className={cn("p-1 hover:bg-secondary transition-none", feedbackGiven === "up" ? "text-accent-green" : "hover:text-foreground")}>
          <ThumbsUp className="w-3 h-3" />
        </button>
        <button onClick={() => setFeedbackGiven("down")} className={cn("p-1 hover:bg-secondary transition-none", feedbackGiven === "down" ? "text-accent-red" : "hover:text-foreground")}>
          <ThumbsDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export { AgentResponseCard, type PromptConfig };
