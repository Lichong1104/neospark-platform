import React, { useState, useEffect, useMemo, useCallback } from "react";
import storageApi from "@/api/storage";
import { toast } from "sonner";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { STATIC_BASE_URL } from "@/api/request";
import { 
  Send, 
  Zap, 
  Sparkles, 
  Camera, 
  Bot, 
  Terminal, 
  GitBranch,
  Grid3X3,
  Expand,
  Image,
  Image as ImageIcon,
  Video,
  Bookmark,
  Plus,
  ChevronDown,
  RectangleHorizontal,
  Square,
  RectangleVertical,
  Library,
  Loader2,
  X,
  ShoppingBag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrutalDropdown, type DropdownOption } from "@/components/ui/brutal-dropdown";
import { PresetLibrary } from "./PresetLibrary";
import { AgentChatArea } from "./AgentChatArea";
import { useTranslation } from "react-i18next";
import drawingApi from "@/api/drawing";
import type { ModelsConfigMap } from "@/types/drawing";
import { VideoGenerationPanel } from "./VideoGenerationPanel";

type StatusType = "ecommerce" | "optimizer" | "photographer" | "custom" | "offline";

// 默认选项（模型配置加载前使用）
const DEFAULT_ASPECT_RATIOS: DropdownOption[] = [
  { value: "1:1", label: "1:1", icon: <Square className="w-3 h-3" /> },
  { value: "16:9", label: "16:9", icon: <RectangleHorizontal className="w-3 h-3" /> },
  { value: "9:16", label: "9:16", icon: <RectangleVertical className="w-3 h-3" /> },
  { value: "4:3", label: "4:3", icon: <RectangleHorizontal className="w-3 h-3" /> },
  { value: "3:4", label: "3:4", icon: <RectangleVertical className="w-3 h-3" /> },
];

const DEFAULT_RESOLUTIONS: DropdownOption[] = [
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" },
];

const DEFAULT_MODELS: DropdownOption[] = [
  { value: "doubao-seedream-5-0-260128", label: "Seedream 5.0 Lite", icon: <Sparkles className="w-3 h-3" /> },
  { value: "doubao-seedream-4-5-251128", label: "Seedream 4.5", icon: <Zap className="w-3 h-3" /> },
  { value: "doubao-seedream-4-0-250828", label: "Seedream 4.0", icon: <Image className="w-3 h-3" /> },
];

const PRESET_PROMPTS = [
  { id: "1", name: "Cyberpunk", color: "bg-accent-cyan", preview: "Neon-lit dystopian cityscape, rain-soaked streets..." },
  { id: "2", name: "Ukiyo-e", color: "bg-accent-red", preview: "Traditional Japanese woodblock print style..." },
  { id: "3", name: "Retro Future", color: "bg-accent-orange", preview: "1970s vision of the future, chrome and curves..." },
  { id: "4", name: "Film Noir", color: "bg-accent-purple", preview: "High contrast black and white, dramatic shadows..." },
];

const NODE_CATEGORY_DEFS = [
  { id: "agents", nameKey: "intelligenceHub.nodeCat_agents", color: "bg-accent-pink" },
  { id: "tools", nameKey: "intelligenceHub.nodeCat_tools", color: "bg-accent-cyan" },
  { id: "data", nameKey: "intelligenceHub.nodeCat_data", color: "bg-accent-yellow" },
];

const AGENT_DEFS = [
  { 
    id: "ecommerce", 
    nameKey: "agents.ecommerce", 
    command: "/ecommerce",
    descKey: "agents.ecommerceDesc",
    icon: <ShoppingBag className="w-5 h-5" />,
    color: "bg-accent-orange"
  },
  { 
    id: "optimizer", 
    nameKey: "agents.optimizer", 
    command: "/optimizer",
    descKey: "agents.optimizerDesc",
    icon: <Sparkles className="w-5 h-5" />,
    color: "bg-accent-cyan"
  },
  { 
    id: "photographer", 
    nameKey: "agents.photographer", 
    command: "/photographer",
    descKey: "agents.photographerDesc",
    icon: <Camera className="w-5 h-5" />,
    color: "bg-accent-purple"
  },
  { 
    id: "custom", 
    nameKey: "agents.custom", 
    command: "/custom",
    descKey: "agents.customDesc",
    icon: <Bot className="w-5 h-5" />,
    color: "bg-accent-pink"
  },
];

const useAgents = () => {
  const { t } = useTranslation();
  return AGENT_DEFS.map(a => ({
    id: a.id,
    name: t(a.nameKey),
    command: a.command,
    description: t(a.descKey),
    icon: a.icon,
    color: a.color,
  }));
};

interface IntelligenceHubProps {
  onImagesGenerated?: (images: { url: string; local_path: string }[]) => void;
  onVideoGenerated?: (videoUrl: string) => void;
  selectedCanvasImage?: { src: string; name: string; type?: "image" | "video" } | null;
}

const IntelligenceHub: React.FC<IntelligenceHubProps> = ({
  onImagesGenerated,
  onVideoGenerated,
  selectedCanvasImage,
}) => {
  const { t } = useTranslation();
  const AGENTS = useAgents();
  const [activeTab, setActiveTab] = useState<"CHAT" | "WORKFLOW">("CHAT");
  const [genSubTab, setGenSubTab] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [agentStatus, setAgentStatus] = useState<StatusType>("offline");
  const [showPresets, setShowPresets] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [modelsConfig, setModelsConfig] = useState<ModelsConfigMap | null>(null);
  
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  const [model, setModel] = useState("gemini-2.5-flash-image");
  const [standardSessionId, setStandardSessionId] = useState<string | null>(null);
  const [isStandardGenerating, setIsStandardGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{ url: string; local_path: string }[]>([]);
  const [generationCost, setGenerationCost] = useState<number | null>(null);
  const [pastedImage, setPastedImage] = useState<{ preview: string; path: string } | null>(null);
  const [isUploadingPaste, setIsUploadingPaste] = useState(false);
  const polling = useGenerationPolling();

  const handlePasteImage = useCallback(async (file: File) => {
    setIsUploadingPaste(true);
    try {
      const preview = URL.createObjectURL(file);
      const res = await storageApi.uploadFile(file, "image");
      const path = res.path || res.url || "";
      setPastedImage({ preview, path });
      toast.success(t("intelligenceHub.imagePasted"));
    } catch {
      toast.error(t("intelligenceHub.imageUploadFailed"));
    } finally {
      setIsUploadingPaste(false);
    }
  }, [t]);

  useEffect(() => {
    drawingApi.getModelsConfig().then(setModelsConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (polling.status === "completed" && polling.images.length > 0) {
      setGeneratedImages(polling.images);
      setGenerationCost(polling.actualCost || null);
      setIsStandardGenerating(false);
      onImagesGenerated?.(polling.images);
      polling.reset();
      toast.success(t("intelligenceHub.imageGenerated"));
    } else if (polling.status === "failed") {
      setIsStandardGenerating(false);
      toast.error(polling.error || t("intelligenceHub.generateFailed"));
      polling.reset();
    }
  }, [polling.status, polling.images, polling.error]);

  const modelOptions: DropdownOption[] = useMemo(() => {
    if (!modelsConfig) return DEFAULT_MODELS;
    return Object.entries(modelsConfig).map(([id, cfg]) => ({
      value: id,
      label: cfg.name,
      icon: <Sparkles className="w-3 h-3" />,
    }));
  }, [modelsConfig]);

  const currentModelConfig = modelsConfig?.[model];

  useEffect(() => {
    if (!modelsConfig) return;

    const modelIds = Object.keys(modelsConfig);
    if (!modelIds.length) return;

    if (!modelsConfig[model]) {
      const firstModelId = modelIds[0];
      const firstModel = modelsConfig[firstModelId];
      setModel(firstModelId);
      setResolution(firstModel.supported_resolutions[0]?.value ?? "1K");
      setAspectRatio(firstModel.supported_aspect_ratios[0]?.value ?? "1:1");
    }
  }, [modelsConfig, model]);

  useEffect(() => {
    if (!currentModelConfig) return;

    const hasResolution = currentModelConfig.supported_resolutions.some((r) => r.value === resolution);
    if (!hasResolution) {
      setResolution(currentModelConfig.supported_resolutions[0]?.value ?? "1K");
    }

    const hasAspectRatio = currentModelConfig.supported_aspect_ratios.some((ar) => ar.value === aspectRatio);
    if (!hasAspectRatio) {
      setAspectRatio(currentModelConfig.supported_aspect_ratios[0]?.value ?? "1:1");
    }
  }, [currentModelConfig, resolution, aspectRatio]);

  const resolutionOptions: DropdownOption[] = useMemo(() => {
    if (!currentModelConfig) return DEFAULT_RESOLUTIONS;
    return currentModelConfig.supported_resolutions.map((r) => ({
      value: r.value,
      label: r.label,
    }));
  }, [currentModelConfig]);

  const aspectRatioOptions: DropdownOption[] = useMemo(() => {
    if (!currentModelConfig) return DEFAULT_ASPECT_RATIOS;
    return currentModelConfig.supported_aspect_ratios.map((ar) => ({
      value: ar.value,
      label: ar.value,
    }));
  }, [currentModelConfig]);

  const handleModeToggle = (mode: boolean) => {
    setIsAgentMode(mode);
    setAgentStatus(mode ? "ecommerce" : "offline");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isStandardGenerating) return;
    const prompt = inputValue.trim();
    setInputValue("");
    setIsStandardGenerating(true);
    setGeneratedImages([]);
    setGenerationCost(null);

    try {
      let sid = standardSessionId;
      if (!sid) {
        const session = await drawingApi.createSession({ title: prompt.slice(0, 20) });
        sid = session.session_id;
        setStandardSessionId(sid);
      }

      const params: import("@/types/drawing").GenerateImageParams = {
        prompt,
        model,
        resolution,
        aspect_ratio: aspectRatio,
        num_images: 1,
        provider: currentModelConfig?.provider ?? (model.startsWith("gemini") ? "gemini" : "ark"),
        optimize_prompt: true,
        ...(pastedImage?.path && currentModelConfig?.supports_image_to_image !== false
          ? { ref_image_path: pastedImage.path }
          : {}),
      };
      setPastedImage(null);

      const res = await drawingApi.generateImage(sid, params);
      toast.info(t("intelligenceHub.generatingCost", { cost: res.estimated_cost }));
      polling.startPolling(res.message_id);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || t("intelligenceHub.generateFailed");
      toast.error(msg);
      setIsStandardGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-l-brutal border-foreground overflow-hidden">
      {/* Tabs (temporarily hidden) */}
      {false && (
        <div className="flex border-b-brutal border-foreground">
          <button
            onClick={() => setActiveTab("CHAT")}
            className={cn(
              "flex-1 px-6 py-4 font-mono font-bold text-sm uppercase tracking-wider transition-none flex items-center justify-center gap-2",
              activeTab === "CHAT" ? "bg-foreground text-card" : "bg-card text-foreground/50 hover:text-foreground"
            )}
          >
            <Terminal className="w-4 h-4" />
            {t("intelligenceHub.chat")}
          </button>
          <button
            onClick={() => setActiveTab("WORKFLOW")}
            className={cn(
              "flex-1 px-6 py-4 font-mono font-bold text-sm uppercase tracking-wider transition-none flex items-center justify-center gap-2 border-l-brutal border-foreground",
              activeTab === "WORKFLOW" ? "bg-foreground text-card" : "bg-card text-foreground/50 hover:text-foreground"
            )}
          >
            <GitBranch className="w-4 h-4" />
            {t("intelligenceHub.workflow")}
          </button>
        </div>
      )}

      {activeTab === "WORKFLOW" ? (
        <WorkflowView />
      ) : (
        <>
          {/* IMAGE / VIDEO sub-tabs */}
          <div className="flex border-b border-foreground/10">
            <button
              onClick={() => setGenSubTab("IMAGE")}
              className={cn(
                "flex-1 py-2.5 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-none",
                genSubTab === "IMAGE"
                  ? "bg-accent-yellow text-foreground border-b-2 border-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {t("intelligenceHub.imageTab")}
            </button>
            <button
              onClick={() => setGenSubTab("VIDEO")}
              className={cn(
                "flex-1 py-2.5 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-none border-l border-foreground/10",
                genSubTab === "VIDEO"
                  ? "bg-accent-purple text-foreground border-b-2 border-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <Video className="w-3.5 h-3.5" />
              {t("intelligenceHub.videoTab")}
            </button>
          </div>

          {genSubTab === "IMAGE" ? (
            <ChatView
              isAgentMode={isAgentMode}
              agentStatus={agentStatus}
              inputValue={inputValue}
              showPresets={showPresets}
              aspectRatio={aspectRatio}
              resolution={resolution}
              model={model}
              aspectRatioOptions={aspectRatioOptions}
              resolutionOptions={resolutionOptions}
              modelOptions={modelOptions}
              isGenerating={isStandardGenerating}
              generatedImages={generatedImages}
              generationCost={generationCost}
              onAspectRatioChange={setAspectRatio}
              onResolutionChange={setResolution}
              onModelChange={setModel}
              onModeToggle={handleModeToggle}
              onInputChange={handleInputChange}
              onSend={handleSend}
              onTogglePresets={() => setShowPresets(!showPresets)}
              onSelectPreset={(prompt) => { setInputValue(prompt); setShowPresets(false); }}
              onImagesGenerated={onImagesGenerated}
              pastedImage={pastedImage}
              onPasteImage={setPastedImage}
              isUploadingPaste={isUploadingPaste}
              selectedCanvasImage={selectedCanvasImage ?? null}
            />
          ) : (
            <VideoGenerationPanel onVideoGenerated={onVideoGenerated} selectedCanvasImage={selectedCanvasImage ?? null} />
          )}
        </>
      )}
    </div>
  );
};

interface ChatViewProps {
  isAgentMode: boolean;
  agentStatus: StatusType;
  inputValue: string;
  showPresets: boolean;
  aspectRatio: string;
  resolution: string;
  model: string;
  aspectRatioOptions: DropdownOption[];
  resolutionOptions: DropdownOption[];
  modelOptions: DropdownOption[];
  isGenerating: boolean;
  generatedImages: { url: string; local_path: string }[];
  generationCost: number | null;
  onAspectRatioChange: (value: string) => void;
  onResolutionChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onModeToggle: (mode: boolean) => void;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onTogglePresets: () => void;
  onSelectPreset: (prompt: string) => void;
  onImagesGenerated?: (images: { url: string; local_path: string }[]) => void;
  pastedImage: { preview: string; path: string } | null;
  onPasteImage: (image: { preview: string; path: string } | null) => void;
  isUploadingPaste: boolean;
  selectedCanvasImage: { src: string; name: string; type?: "image" | "video" } | null;
}

const ChatView: React.FC<ChatViewProps> = ({
  isAgentMode,
  agentStatus,
  inputValue,
  showPresets,
  aspectRatio,
  resolution,
  model,
  aspectRatioOptions,
  resolutionOptions,
  modelOptions,
  isGenerating,
  generatedImages,
  generationCost,
  onAspectRatioChange,
  onResolutionChange,
  onModelChange,
  onModeToggle,
  onInputChange,
  onSend,
  onTogglePresets,
  onSelectPreset,
  onImagesGenerated,
  pastedImage,
  onPasteImage,
  isUploadingPaste,
  selectedCanvasImage,
}) => {
  const { t } = useTranslation();
  const AGENTS = useAgents();
  const currentAgent = AGENTS.find(a => a.id === agentStatus) || AGENTS[0];

  if (isAgentMode) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-foreground/10">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase text-muted-foreground">
            <Sparkles className="w-4 h-4 text-accent-pink" />
            {t("intelligenceHub.generationMode")}
          </div>
          <div className="flex border-brutal border-foreground overflow-hidden">
            <button
              onClick={() => onModeToggle(false)}
              className="flex-1 py-2 font-bold text-sm uppercase tracking-wider transition-none bg-card text-foreground hover:bg-secondary"
            >
              {t("intelligenceHub.standardMode")}
            </button>
            <button
              onClick={() => onModeToggle(true)}
              className="flex-1 py-2 font-bold text-sm uppercase tracking-wider transition-none border-l-brutal border-foreground bg-accent-cyan text-foreground"
            >
              {t("intelligenceHub.agentMode")}
            </button>
          </div>
        </div>
        <AgentChatArea
          agentStatus={agentStatus}
          agents={AGENTS}
          onImagesGenerated={onImagesGenerated}
          selectedCanvasImage={selectedCanvasImage}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div className="p-4 border-b border-foreground/10">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase text-muted-foreground">
          <Sparkles className="w-4 h-4 text-accent-pink" />
          {t("intelligenceHub.generationMode")}
        </div>
        <div className="flex border-brutal border-foreground overflow-hidden">
          <button
            onClick={() => onModeToggle(false)}
            className="flex-1 py-2 font-bold text-sm uppercase tracking-wider transition-none bg-foreground text-card"
          >
            {t("intelligenceHub.standardMode")}
          </button>
          <button
            onClick={() => onModeToggle(true)}
            className="flex-1 py-2 font-bold text-sm uppercase tracking-wider transition-none border-l-brutal border-foreground bg-card text-foreground hover:bg-secondary"
          >
            {t("intelligenceHub.agentMode")}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pt-6 relative">
        {isGenerating ? (
          /* ===== Improved generating loading UI ===== */
          <div className="flex flex-col items-center justify-center pt-12 gap-5">
            <div className="relative">
              <div className="w-20 h-20 border-brutal border-foreground/20 flex items-center justify-center bg-accent-cyan/5">
                <Sparkles className="w-10 h-10 text-accent-cyan" />
              </div>
              <div className="absolute -inset-2 border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" style={{ animationDuration: "1.5s" }} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold uppercase tracking-widest">{t("intelligenceHub.generating")}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{t("intelligenceHub.generatingHint")}</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 120}ms`, animationDuration: "0.8s" }}
                />
              ))}
            </div>
          </div>
        ) : generatedImages.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
              <Image className="w-4 h-4 text-accent-green" />
              {t("intelligenceHub.generationResult")}
              {generationCost && <span className="text-accent-green">-{generationCost} pts</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {generatedImages.map((img, idx) => {
                const imgUrl = img.url.startsWith("http") ? img.url : `${STATIC_BASE_URL}${img.url}`;
                return (
                  <a
                    key={idx}
                    href={imgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border-brutal border-foreground overflow-hidden hover:brightness-110"
                  >
                    <img src={imgUrl} alt={`Generated ${idx + 1}`} className="w-full h-auto object-cover" loading="lazy" />
                  </a>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4 pt-6">
            <div className="w-16 h-16 border-brutal border-foreground/30 flex items-center justify-center flex-shrink-0">
              <Zap className="w-8 h-8 text-foreground/30" />
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="text-lg font-bold uppercase tracking-widest mb-2">{t("intelligenceHub.startCreating")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
                {t("intelligenceHub.startCreatingDesc")}
              </p>
            </div>
          </div>
        )}
      </div>

      <PresetLibrary
        isOpen={showPresets}
        onClose={onTogglePresets}
        onSelectPreset={onSelectPreset}
      />

      <div className="flex-1 flex flex-col p-4 border-t-brutal border-foreground bg-card">
        <button
          onClick={onTogglePresets}
          className="w-full mb-3 py-2 font-bold text-sm uppercase flex items-center justify-center gap-2 border-brutal border-foreground transition-none brutal-press bg-accent-pink text-foreground brutal-shadow hover:brightness-110"
        >
          <Library className="w-4 h-4" />
          {t("intelligenceHub.promptArsenal")}
        </button>

        {/* Pasted image preview */}
        {(pastedImage || isUploadingPaste) && (
          <div className="mb-2 flex items-center gap-2">
            {isUploadingPaste ? (
              <div className="w-16 h-16 border-brutal border-foreground/30 flex items-center justify-center bg-secondary">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : pastedImage ? (
              <div className="relative group">
                <img src={pastedImage.preview} alt="ref" className="w-16 h-16 object-cover border-brutal border-foreground/30" />
                <button
                  onClick={() => onPasteImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-accent-red text-card flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : null}
            <span className="text-[10px] font-mono text-muted-foreground">
              {isUploadingPaste
                ? t("intelligenceHub.uploading")
                : t("intelligenceHub.refImage")}
            </span>
          </div>
        )}

        <div className="relative flex-1">
          <textarea
            value={inputValue}
            onChange={onInputChange}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), onSend())}
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (!items) return;
              for (const item of Array.from(items)) {
                if (item.type.startsWith("image/")) {
                  e.preventDefault();
                  const file = item.getAsFile();
                  if (file) {
                    // Trigger upload via parent
                    const upload = async () => {
                      const { default: sApi } = await import("@/api/storage");
                      const preview = URL.createObjectURL(file);
                      onPasteImage({ preview, path: "" }); // show preview immediately
                      try {
                        const res = await sApi.uploadFile(file, "image");
                        onPasteImage({ preview, path: res.path || res.url || "" });
                      } catch {
                        onPasteImage(null);
                        toast.error(t("intelligenceHub.imageUploadFailed"));
                      }
                    };
                    upload();
                  }
                  break;
                }
              }
            }}
            placeholder={t("intelligenceHub.inputPlaceholder")}
            className="w-full h-full min-h-[200px] p-3 border-brutal border-foreground bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-cyan"
          />
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
            <BrutalDropdown options={aspectRatioOptions} value={aspectRatio} onChange={onAspectRatioChange} icon={<Grid3X3 className="w-3.5 h-3.5" />} />
            <BrutalDropdown options={resolutionOptions} value={resolution} onChange={onResolutionChange} />
            <BrutalDropdown options={modelOptions} value={model} onChange={onModelChange} icon={<Sparkles className="w-3.5 h-3.5" />} />
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={onSend}
              disabled={isGenerating || !inputValue.trim()}
              className={cn(
                "w-8 h-8 flex items-center justify-center border-brutal border-foreground brutal-press",
                isGenerating || !inputValue.trim()
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-accent-cyan text-foreground hover:brightness-110"
              )}
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkflowView: React.FC = () => {
  const { t } = useTranslation();
  const [activeNodeCategory, setActiveNodeCategory] = useState("agents");

  const PRESET_WORKFLOWS = [
    { 
      id: "batch", 
      name: t("workflows.batchEnhance"), 
      description: t("workflows.batchEnhanceDesc"),
      icons: [<Zap key="zap" className="w-4 h-4" />, <Image key="img" className="w-4 h-4" />],
      colors: ["bg-accent-yellow", "bg-accent-cyan"]
    },
    { 
      id: "reference", 
      name: t("workflows.referenceGen"), 
      description: t("workflows.referenceGenDesc"),
      icons: [<GitBranch key="branch" className="w-4 h-4" />, <Sparkles key="spark" className="w-4 h-4" />],
      colors: ["bg-accent-purple", "bg-accent-green"]
    },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="p-5 border-b-brutal border-foreground">
        <div className="flex items-center gap-3 mb-4 text-xs font-bold uppercase text-muted-foreground">
          <Bookmark className="w-4 h-4 text-accent-pink" />
          {t("intelligenceHub.presetWorkflows")}
        </div>
        <div className="space-y-2.5">
          {PRESET_WORKFLOWS.map((workflow) => (
            <button
              key={workflow.id}
              className="w-full p-3.5 text-left bg-card border-brutal border-foreground brutal-shadow brutal-press hover:bg-secondary"
            >
              <div className="font-bold text-sm uppercase tracking-wide">{workflow.name}</div>
              <div className="text-xs text-muted-foreground mt-1.5">{workflow.description}</div>
              <div className="flex gap-1.5 mt-2.5">
                {workflow.icons.map((icon, i) => (
                  <div key={i} className={cn("w-6 h-6 flex items-center justify-center border border-foreground", workflow.colors[i])}>
                    {icon}
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center gap-3 mb-4 text-xs font-bold uppercase text-muted-foreground border-l-4 border-accent-green pl-2.5">
          {t("intelligenceHub.nodeLibrary")}
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t("intelligenceHub.dragNodesHint")}</p>

        <div className="flex gap-1.5 mb-4">
          {NODE_CATEGORY_DEFS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveNodeCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold uppercase border-brutal border-foreground transition-none",
                activeNodeCategory === cat.id ? cn(cat.color, "brutal-shadow") : "bg-card hover:bg-secondary"
              )}
            >
              {t(cat.nameKey)}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          {activeNodeCategory === "agents" && (
            <>
              <NodeItem name={t("intelligenceHub.node_optimizer")} icon={<Sparkles className="w-4 h-4" />} color="bg-accent-green" />
              <NodeItem name={t("intelligenceHub.node_photographer")} icon={<Camera className="w-4 h-4" />} color="bg-accent-cyan" />
              <NodeItem name={t("intelligenceHub.node_customAgent")} icon={<Bot className="w-4 h-4" />} color="bg-accent-yellow" />
            </>
          )}
          {activeNodeCategory === "tools" && (
            <>
              <NodeItem name={t("intelligenceHub.node_urlScraper")} icon={<GitBranch className="w-4 h-4" />} color="bg-accent-purple" />
              <NodeItem name={t("intelligenceHub.node_formatConvert")} icon={<Image className="w-4 h-4" />} color="bg-accent-cyan" />
            </>
          )}
          {activeNodeCategory === "data" && (
            <>
              <NodeItem name={t("intelligenceHub.node_assetGroup")} icon={<Image className="w-4 h-4" />} color="bg-muted" />
              <NodeItem name={t("intelligenceHub.node_dataInput")} icon={<Plus className="w-4 h-4" />} color="bg-accent-green" />
            </>
          )}
        </div>
      </div>

      <div className="p-3 border-t-brutal border-foreground bg-card">
        <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-muted-foreground">
          <span><span className="text-accent-pink">●</span> {t("intelligenceHub.dragNodes")}</span>
          <span><span className="text-accent-cyan">●</span> {t("intelligenceHub.clickConnect")}</span>
          <span><span className="text-accent-green">●</span> {t("intelligenceHub.doubleClickConfigure")}</span>
        </div>
      </div>
    </div>
  );
};

interface NodeItemProps {
  name: string;
  icon: React.ReactNode;
  color: string;
}

const NodeItem: React.FC<NodeItemProps> = ({ name, icon, color }) => (
  <div className="flex items-center gap-3 p-3 bg-card border-brutal border-foreground cursor-grab hover:bg-secondary brutal-shadow brutal-press">
    <div className={cn("w-8 h-8 flex items-center justify-center border-brutal border-foreground", color)}>
      {icon}
    </div>
    <span className="font-bold text-sm uppercase">{name}</span>
  </div>
);

export { IntelligenceHub };
