import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import storageApi from "@/api/storage";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorMessage";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { STATIC_BASE_URL } from "@/api/request";
import type { MessageStatusResponse } from "@/types/drawing";
import {
  Send,
  Zap,
  Sparkles,
  Camera,
  Bot,
  Terminal,
  GitBranch,
  Expand,
  Image,
  Image as ImageIcon,
  Images,
  Bookmark,
  Plus,
  RectangleHorizontal,
  Square,
  RectangleVertical,
  Library,
  Loader2,
  X,
  ShoppingBag,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type DropdownOption } from "@/components/ui/brutal-dropdown";
import { PresetLibrary } from "./PresetLibrary";
import { AgentChatArea } from "./AgentChatArea";
import { AgentHubChatArea } from "./AgentHubChatArea";
import { VideoGenerationPanel } from "./VideoGenerationPanel";
import { useTranslation } from "react-i18next";
import drawingApi from "@/api/drawing";
import { optimizePrompt } from "@/api/prompts";
import type { CanvasImage } from "./CanvasArea";
import {
  canvasImageSlotLabel,
  promptHasCanvasSlotMention,
  resolveImagesFromPromptSlots,
  validatePromptCanvasSlots,
} from "@/lib/canvasImageSlots";
import { InlineCanvasMentionEditor } from "./InlineCanvasMentionEditor";
import { ImageGenerationParams } from "./ImageGenerationParams";
import {
  GenerationModeIconToggle,
  type HubMediaTab,
} from "./GenerationModeIconToggle";
import { drawingModelOptionIcon } from "@/components/icons/DrawingModelIcon";
import {
  DEFAULT_DRAWING_MODEL,
  type ModelsConfigMap,
  type GenerateMultiRefParams,
} from "@/types/drawing";

type StatusType =
  | "ecommerce"
  | "optimizer"
  | "photographer"
  | "custom"
  | "offline";

// 默认选项（模型配置加载前使用）
const DEFAULT_ASPECT_RATIOS: DropdownOption[] = [
  { value: "1:1", label: "1:1 (Square)", icon: <Square className="w-3 h-3" /> },
  {
    value: "16:9",
    label: "16:9 (Wide)",
    icon: <RectangleHorizontal className="w-3 h-3" />,
  },
  {
    value: "9:16",
    label: "9:16 (Vertical)",
    icon: <RectangleVertical className="w-3 h-3" />,
  },
  {
    value: "4:3",
    label: "4:3 (Classic)",
    icon: <RectangleHorizontal className="w-3 h-3" />,
  },
  {
    value: "3:4",
    label: "3:4 (Portrait)",
    icon: <RectangleVertical className="w-3 h-3" />,
  },
];

const DEFAULT_RESOLUTIONS: DropdownOption[] = [
  { value: "1K", label: "1K (1024px)" },
  { value: "2K", label: "2K (2048px)" },
  { value: "4K", label: "4K (4096px)" },
];

const DEFAULT_MODELS: DropdownOption[] = [
  {
    value: "gpt-image-2",
    label: "GPT Image 2",
    icon: drawingModelOptionIcon("gpt-image-2", "GPT Image 2", "tengda"),
  },
  {
    value: "gemini-3.1-flash-image-preview",
    label: "Gemini 3.1 Flash (Image)",
    icon: drawingModelOptionIcon(
      "gemini-3.1-flash-image-preview",
      "Gemini 3.1 Flash (Image)",
      "gemini"
    ),
  },
  {
    value: "gemini-3-pro-image-preview",
    label: "Gemini 3 Pro (Image)",
    icon: drawingModelOptionIcon(
      "gemini-3-pro-image-preview",
      "Gemini 3 Pro (Image)",
      "gemini"
    ),
  },
  {
    value: "gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash (Image)",
    icon: drawingModelOptionIcon(
      "gemini-2.5-flash-image",
      "Gemini 2.5 Flash (Image)",
      "gemini"
    ),
  },
];

/** Convert canvas/static URL to backend-accepted server path */
const toServerPath = (fullUrl: string) => {
  if (!fullUrl) return "";
  if (fullUrl.startsWith(STATIC_BASE_URL)) {
    return fullUrl.slice(STATIC_BASE_URL.length);
  }
  if (fullUrl.startsWith("http")) {
    try {
      return new URL(fullUrl).pathname;
    } catch {
      return fullUrl;
    }
  }
  return fullUrl;
};

const NODE_CATEGORY_DEFS = [
  {
    id: "agents",
    nameKey: "intelligenceHub.nodeCat_agents",
    color: "bg-accent-pink",
  },
  {
    id: "tools",
    nameKey: "intelligenceHub.nodeCat_tools",
    color: "bg-accent-cyan",
  },
  {
    id: "data",
    nameKey: "intelligenceHub.nodeCat_data",
    color: "bg-accent-yellow",
  },
];

const AGENT_DEFS = [
  {
    id: "ecommerce",
    nameKey: "agents.ecommerce",
    command: "/ecommerce",
    descKey: "agents.ecommerceDesc",
    icon: <ShoppingBag className="w-5 h-5" />,
    color: "bg-accent-orange",
  },
  {
    id: "optimizer",
    nameKey: "agents.optimizer",
    command: "/optimizer",
    descKey: "agents.optimizerDesc",
    icon: <Sparkles className="w-5 h-5" />,
    color: "bg-accent-cyan",
  },
  {
    id: "photographer",
    nameKey: "agents.photographer",
    command: "/photographer",
    descKey: "agents.photographerDesc",
    icon: <Camera className="w-5 h-5" />,
    color: "bg-accent-purple",
  },
  {
    id: "custom",
    nameKey: "agents.custom",
    command: "/custom",
    descKey: "agents.customDesc",
    icon: <Bot className="w-5 h-5" />,
    color: "bg-accent-pink",
  },
];

type StandardGenHistoryItem = {
  id: string;
  prompt: string;
  originalPrompt?: string;
  optimizedPrompt?: string;
  images: { url: string; local_path: string }[];
  cost: number | null;
  createdAt: number;
};

const useAgents = () => {
  const { t } = useTranslation();
  return AGENT_DEFS.map((a) => ({
    id: a.id,
    name: t(a.nameKey),
    command: a.command,
    description: t(a.descKey),
    icon: a.icon,
    color: a.color,
  }));
};

interface IntelligenceHubProps {
  className?: string;
  onImagesGenerated?: (images: { url: string; local_path: string }[]) => void;
  onVideoGenerated?: (videoUrl: string) => void;
  selectedCanvasImage?: {
    src: string;
    name: string;
    type?: "image" | "video";
  } | null;
  selectedCanvasImages?: CanvasImage[];
  canvasImages?: CanvasImage[];
}

const IntelligenceHub: React.FC<IntelligenceHubProps> = ({
  className,
  onImagesGenerated,
  onVideoGenerated,
  selectedCanvasImage,
  selectedCanvasImages = [],
  canvasImages = [],
}) => {
  const { t } = useTranslation();
  const AGENTS = useAgents();
  const [activeTab, setActiveTab] = useState<HubMediaTab>("IMAGE");
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [agentStatus, setAgentStatus] = useState<StatusType>("offline");
  const [showPresets, setShowPresets] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [modelsConfig, setModelsConfig] = useState<ModelsConfigMap | null>(
    null
  );

  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  const [model, setModel] = useState(DEFAULT_DRAWING_MODEL);
  const [gptImageQuality, setGptImageQuality] = useState<"low" | "medium" | "high">(
    "low"
  );
  const [standardSessionId, setStandardSessionId] = useState<string | null>(
    null
  );
  const [isStandardGenerating, setIsStandardGenerating] = useState(false);
  const [optimizeStandardPrompt, setOptimizeStandardPrompt] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const batchAbortRef = useRef(false);
  const generateAbortRef = useRef(false);
  const [standardGenHistory, setStandardGenHistory] = useState<
    StandardGenHistoryItem[]
  >([]);
  const [pendingStandardPrompt, setPendingStandardPrompt] = useState<{
    original: string;
    used: string;
    optimized?: string;
  } | null>(null);
  const [pastedImage, setPastedImage] = useState<{
    preview: string;
    path: string;
  } | null>(null);
  const [isUploadingPaste, setIsUploadingPaste] = useState(false);
  const polling = useGenerationPolling();

  const handlePasteImage = useCallback(
    async (file: File) => {
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
    },
    [t]
  );

  useEffect(() => {
    drawingApi
      .getModelsConfig()
      .then(setModelsConfig)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (polling.status === "completed" && polling.images.length > 0) {
      const promptText = pendingStandardPrompt?.used?.trim() || "";
      setStandardGenHistory((prev) => [
        ...prev,
        {
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          prompt: promptText,
          originalPrompt: pendingStandardPrompt?.original,
          optimizedPrompt: pendingStandardPrompt?.optimized,
          images: polling.images,
          cost: polling.actualCost ?? null,
          createdAt: Date.now(),
        },
      ]);
      setPendingStandardPrompt(null);
      setIsStandardGenerating(false);
      onImagesGenerated?.(polling.images);
      polling.reset();
      toast.success(t("intelligenceHub.imageGenerated"));
    } else if (polling.status === "failed") {
      setIsStandardGenerating(false);
      setPendingStandardPrompt(null);
      toast.error(polling.error || t("intelligenceHub.generateFailed"));
      polling.reset();
    }
  }, [
    polling.status,
    polling.images,
    polling.error,
    polling.actualCost,
    pendingStandardPrompt,
    onImagesGenerated,
    t,
  ]);

  const modelOptions: DropdownOption[] = useMemo(() => {
    if (!modelsConfig) return DEFAULT_MODELS;
    return Object.entries(modelsConfig).map(([id, cfg]) => ({
      value: id,
      label: cfg.name.replace(/\s*\(Tengda\)/i, "").trim() || cfg.name,
      icon: drawingModelOptionIcon(id, cfg.name, cfg.provider),
    }));
  }, [modelsConfig]);

  const currentModelConfig = modelsConfig?.[model];
  const isGptImage2 = model === "gpt-image-2";
  const gptImageQualityOptions: DropdownOption[] = useMemo(
    () => [
      { value: "low", label: `${t("agentChat.gptImageQualityLow")} (Fast)` },
      {
        value: "medium",
        label: `${t("agentChat.gptImageQualityMedium")} (Balanced)`,
      },
      {
        value: "high",
        label: `${t("agentChat.gptImageQualityHigh")} (Detail)`,
      },
    ],
    [t]
  );

  useEffect(() => {
    if (!modelsConfig) return;

    const modelIds = Object.keys(modelsConfig);
    if (!modelIds.length) return;

    if (!modelsConfig[model]) {
      const fallbackId = modelsConfig[DEFAULT_DRAWING_MODEL]
        ? DEFAULT_DRAWING_MODEL
        : modelIds[0];
      const fallbackModel = modelsConfig[fallbackId];
      setModel(fallbackId);
      setResolution(fallbackModel.supported_resolutions[0]?.value ?? "1K");
      setAspectRatio(
        fallbackModel.supported_aspect_ratios[0]?.value ?? "1:1"
      );
    }
  }, [modelsConfig, model]);

  useEffect(() => {
    if (!isGptImage2) setGptImageQuality("low");
  }, [isGptImage2]);

  useEffect(() => {
    if (!currentModelConfig) return;

    const hasResolution = currentModelConfig.supported_resolutions.some(
      (r) => r.value === resolution
    );
    if (!hasResolution) {
      setResolution(currentModelConfig.supported_resolutions[0]?.value ?? "1K");
    }

    const hasAspectRatio = currentModelConfig.supported_aspect_ratios.some(
      (ar) => ar.value === aspectRatio
    );
    if (!hasAspectRatio) {
      setAspectRatio(
        currentModelConfig.supported_aspect_ratios[0]?.value ?? "1:1"
      );
    }
  }, [currentModelConfig, resolution, aspectRatio]);

  const resolutionOptions: DropdownOption[] = useMemo(() => {
    if (!currentModelConfig) return DEFAULT_RESOLUTIONS;
    return currentModelConfig.supported_resolutions.map((r) => ({
      value: r.value,
      label:
        r.label && r.label !== r.value ? `${r.value} (${r.label})` : r.value,
    }));
  }, [currentModelConfig]);

  const aspectRatioOptions: DropdownOption[] = useMemo(() => {
    if (!currentModelConfig) return DEFAULT_ASPECT_RATIOS;
    return currentModelConfig.supported_aspect_ratios.map((ar) => ({
      value: ar.value,
      label:
        ar.label && ar.label !== ar.value
          ? `${ar.value} (${ar.label})`
          : ar.value,
    }));
  }, [currentModelConfig]);

  async function pollMessageUntilTerminal(
    messageId: string,
    intervalMs = 2000,
    shouldAbort?: () => boolean
  ): Promise<MessageStatusResponse | null> {
    for (;;) {
      if (shouldAbort?.()) return null;
      const res: MessageStatusResponse = await drawingApi.getMessageStatus(
        messageId
      );
      if (shouldAbort?.()) return null;
      if (
        res.status === "completed" ||
        res.status === "failed" ||
        res.status === "cancelled"
      ) {
        return res;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  const handleCancelGeneration = () => {
    generateAbortRef.current = true;
    batchAbortRef.current = true;
    polling.stopPolling();
    polling.reset();
    setIsStandardGenerating(false);
    setPendingStandardPrompt(null);
    setBatchProgress(null);
    toast.info(t("intelligenceHub.generationCancelled"));
  };

  const handleModeToggle = (mode: boolean) => {
    setIsAgentMode(mode);
    setAgentStatus(mode ? "ecommerce" : "offline");
    if (mode) setActiveTab("IMAGE");
  };

  const hubModeToggle = (
    <GenerationModeIconToggle
      id="onboarding-hub-mode"
      isAgentMode={isAgentMode}
      onModeToggle={handleModeToggle}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
  };

  const handleSend = async (override?: {
    prompt: string;
    skipOptimize?: boolean;
    originalPrompt?: string;
    optimizedPrompt?: string;
  }) => {
    const originalPrompt = (override?.prompt ?? inputValue).trim();
    if (!originalPrompt || isStandardGenerating) return;
    generateAbortRef.current = false;
    batchAbortRef.current = false;
    if (!override) setInputValue("");
    setIsStandardGenerating(true);

    try {
      let finalPrompt = originalPrompt;
      if (override?.skipOptimize) {
        finalPrompt = override.prompt;
        setPendingStandardPrompt({
          original: override.originalPrompt ?? originalPrompt,
          used: finalPrompt,
          optimized: override.optimizedPrompt,
        });
      } else {
        setPendingStandardPrompt({
          original: originalPrompt,
          used: originalPrompt,
        });
        if (optimizeStandardPrompt) {
          toast.info(t("intelligenceHub.optimizingPrompt"));
          const optimized = await optimizePrompt({
            prompt: originalPrompt,
          });
          finalPrompt = optimized.optimized_prompt?.trim() || originalPrompt;
          if (generateAbortRef.current) {
            setIsStandardGenerating(false);
            setPendingStandardPrompt(null);
            return;
          }
          setPendingStandardPrompt({
            original: originalPrompt,
            used: finalPrompt,
            optimized: optimized.optimized_prompt?.trim() || "",
          });
        } else {
          setPendingStandardPrompt({
            original: originalPrompt,
            used: finalPrompt,
          });
        }
      }

      if (generateAbortRef.current) {
        setIsStandardGenerating(false);
        setPendingStandardPrompt(null);
        return;
      }

      const canvasImagesOnly = canvasImages.filter(
        (img) => img.type !== "video"
      );
      const promptUsesCanvasSlots = promptHasCanvasSlotMention(originalPrompt);
      if (promptUsesCanvasSlots) {
        const check = validatePromptCanvasSlots(
          originalPrompt,
          canvasImagesOnly.length
        );
        if (!check.ok) {
          toast.error(
            t("intelligenceHub.invalidCanvasSlot", {
              label: canvasImageSlotLabel(
                check.invalidSlot,
                t("intelligenceHub.canvasImageSlotPrefix")
              ),
              rangeStart: canvasImageSlotLabel(
                1,
                t("intelligenceHub.canvasImageSlotPrefix")
              ),
              rangeEnd: canvasImageSlotLabel(
                canvasImagesOnly.length,
                t("intelligenceHub.canvasImageSlotPrefix")
              ),
              max: canvasImagesOnly.length,
            })
          );
          setIsStandardGenerating(false);
          setPendingStandardPrompt(null);
          return;
        }
      }

      const slotRefImages = promptUsesCanvasSlots
        ? resolveImagesFromPromptSlots(canvasImages, originalPrompt)
        : [];
      const selectedRefImages = promptUsesCanvasSlots
        ? slotRefImages
        : selectedCanvasImages.filter((img) => img.type !== "video");
      const hasSelectedRefs = selectedRefImages.length > 0;

      // ===== 批处理分支 =====
      if (batchMode && !promptUsesCanvasSlots) {
        const batchImages = selectedCanvasImages.filter(
          (img) => img.type !== "video"
        );
        if (batchImages.length > 1) {
          batchAbortRef.current = false;
          setBatchProgress({ current: 0, total: batchImages.length });

          let sid = standardSessionId;
          if (!sid) {
            const session = await drawingApi.createSession({
              title: originalPrompt.slice(0, 20),
            });
            sid = session.session_id;
            setStandardSessionId(sid);
          }

          const refPaths = batchImages
            .map((img) => toServerPath(img.src))
            .filter(Boolean);

          const params: GenerateMultiRefParams = {
            prompt: finalPrompt,
            model,
            resolution,
            aspect_ratio: aspectRatio,
            ref_image_paths: refPaths,
            provider:
              currentModelConfig?.provider ??
              (model.startsWith("gemini") ? "gemini" : "tengda"),
          };
          if (isGptImage2) {
            params.quality = gptImageQuality;
          }

          try {
            const batchRes = await drawingApi.generateMultiRef(sid, params);
            toast.info(
              t("intelligenceHub.batchStarted", {
                count: batchRes.ref_count,
                cost: batchRes.total_estimated_cost,
              })
            );

            // 并行轮询所有消息
            const pollOne = async (
              messageId: string,
              index: number
            ): Promise<void> => {
              const result = await pollMessageUntilTerminal(
                messageId,
                2000,
                () => batchAbortRef.current || generateAbortRef.current
              );

              if (!result || batchAbortRef.current) return;

              if (
                result.status === "completed" &&
                result.images &&
                result.images.length > 0
              ) {
                setStandardGenHistory((prev) => [
                  ...prev,
                  {
                    id: `batch-${Date.now()}-${index}`,
                    prompt: finalPrompt,
                    originalPrompt: originalPrompt,
                    optimizedPrompt: optimizeStandardPrompt
                      ? finalPrompt
                      : undefined,
                    images: result.images,
                    cost: result.actual_cost ?? null,
                    createdAt: Date.now(),
                  },
                ]);
                onImagesGenerated?.(result.images);
              } else if (result.status === "failed") {
                toast.error(
                  t("intelligenceHub.batchFailed", {
                    index: index + 1,
                    msg: result.error_msg || "",
                  })
                );
              }

              setBatchProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      current: Math.min(prev.current + 1, prev.total),
                    }
                  : null
              );
            };

            await Promise.all(
              batchRes.messages.map((item, idx) =>
                pollOne(item.message_id, idx)
              )
            );
          } catch (err: any) {
            const msg = getErrorMessage(
              err,
              t("intelligenceHub.generateFailed")
            );
            toast.error(msg);
          }

          setBatchProgress(null);
          setIsStandardGenerating(false);
          setPendingStandardPrompt(null);
          return;
        }
      }

      if (
        hasSelectedRefs &&
        selectedRefImages.length > 1 &&
        model === "gemini-2.5-flash-image"
      ) {
        toast.error(t("intelligenceHub.multiRefModelUnsupported"));
        setIsStandardGenerating(false);
        setPendingStandardPrompt(null);
        return;
      }

      let sid = standardSessionId;
      if (!sid) {
        const session = await drawingApi.createSession({
          title: originalPrompt.slice(0, 20),
        });
        sid = session.session_id;
        setStandardSessionId(sid);
      }

      const params: import("@/types/drawing").GenerateImageParams = {
        prompt: finalPrompt,
        model,
        resolution,
        aspect_ratio: aspectRatio,
        num_images: 1,
        provider:
          currentModelConfig?.provider ??
          (model.startsWith("gemini") ? "gemini" : "tengda"),
        optimize_prompt: true,
      };
      if (isGptImage2) {
        params.quality = gptImageQuality;
      }
      if (
        hasSelectedRefs &&
        currentModelConfig?.supports_image_to_image !== false
      ) {
        const refPaths = selectedRefImages
          .slice(0, 14)
          .map((img) => toServerPath(img.src))
          .filter(Boolean);
        if (refPaths.length > 1) {
          params.ref_image_paths = refPaths;
        } else if (refPaths.length === 1) {
          params.ref_image_path = refPaths[0];
        }
      } else if (
        pastedImage?.path &&
        currentModelConfig?.supports_image_to_image !== false
      ) {
        params.ref_image_path = pastedImage.path;
      }
      setPastedImage(null);

      if (generateAbortRef.current) {
        setIsStandardGenerating(false);
        setPendingStandardPrompt(null);
        return;
      }

      const res = await drawingApi.generateImage(sid, params);

      if (generateAbortRef.current) {
        setIsStandardGenerating(false);
        setPendingStandardPrompt(null);
        return;
      }

      toast.info(
        t("intelligenceHub.generatingCost", { cost: res.estimated_cost })
      );
      polling.startPolling(res.message_id);
    } catch (err: any) {
      const msg = getErrorMessage(err, t("intelligenceHub.generateFailed"));
      toast.error(msg);
      setIsStandardGenerating(false);
      setPendingStandardPrompt(null);
    }
  };

  const handleRegenerateFromHistory = (entry: StandardGenHistoryItem) => {
    const usedPrompt = entry.prompt.trim();
    if (!usedPrompt) return;
    void handleSend({
      prompt: usedPrompt,
      skipOptimize: true,
      originalPrompt: entry.originalPrompt ?? usedPrompt,
      optimizedPrompt: entry.optimizedPrompt,
    });
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-card",
        className
      )}
    >
      {/* Keep both panels mounted so tab switches don't reset generation state or stop polling */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div
          className={cn(
            "flex flex-col flex-1 min-h-0 overflow-hidden",
            activeTab !== "VIDEO" && "hidden"
          )}
        >
          <VideoGenerationPanel
            onVideoGenerated={onVideoGenerated}
            selectedCanvasImage={selectedCanvasImage ?? null}
            selectedCanvasImages={selectedCanvasImages}
            canvasImages={canvasImages}
            modeToggle={hubModeToggle}
          />
        </div>
        <div
          className={cn(
            "flex flex-col flex-1 min-h-0 overflow-hidden",
            activeTab !== "IMAGE" && "hidden"
          )}
        >
          <ChatView
            isAgentMode={isAgentMode}
            agentStatus={agentStatus}
            inputValue={inputValue}
            showPresets={showPresets}
            aspectRatio={aspectRatio}
            resolution={resolution}
            model={model}
            isGptImage2={model === "gpt-image-2"}
            gptImageQuality={gptImageQuality}
            onGptImageQualityChange={setGptImageQuality}
            aspectRatioOptions={aspectRatioOptions}
            resolutionOptions={resolutionOptions}
            modelOptions={modelOptions}
            isGenerating={isStandardGenerating}
            standardGenHistory={standardGenHistory}
            pendingStandardPrompt={pendingStandardPrompt}
            onAspectRatioChange={setAspectRatio}
            onResolutionChange={setResolution}
            onModelChange={setModel}
            optimizeStandardPrompt={optimizeStandardPrompt}
            onOptimizeStandardPromptChange={setOptimizeStandardPrompt}
            batchMode={batchMode}
            onBatchModeChange={setBatchMode}
            batchProgress={batchProgress}
            onSend={handleSend}
            onCancelGeneration={handleCancelGeneration}
            onTogglePresets={() => setShowPresets(!showPresets)}
            onSelectPreset={(prompt) => {
              setInputValue(prompt);
              setShowPresets(false);
            }}
            onReuseHistoryPrompt={setInputValue}
            onRegenerateFromHistory={handleRegenerateFromHistory}
            onImagesGenerated={onImagesGenerated}
            pastedImage={pastedImage}
            onPasteImage={setPastedImage}
            isUploadingPaste={isUploadingPaste}
            selectedCanvasImage={selectedCanvasImage ?? null}
            selectedCanvasImages={selectedCanvasImages}
            canvasImages={canvasImages}
            modeToggle={hubModeToggle}
          />
        </div>
        <div
          className={cn(
            "flex flex-col flex-1 min-h-0 overflow-hidden",
            activeTab !== "AGENT" && "hidden"
          )}
        >
          <AgentHubChatArea
            onImagesGenerated={onImagesGenerated}
            onVideoGenerated={onVideoGenerated}
            selectedCanvasImage={selectedCanvasImage ?? null}
            selectedCanvasImages={selectedCanvasImages}
            canvasImages={canvasImages}
            modeToggle={hubModeToggle}
          />
        </div>
      </div>
    </div>
  );
};

interface ChatViewProps {
  modeToggle: React.ReactNode;
  isAgentMode: boolean;
  agentStatus: StatusType;
  inputValue: string;
  showPresets: boolean;
  aspectRatio: string;
  resolution: string;
  model: string;
  isGptImage2: boolean;
  gptImageQuality: "low" | "medium" | "high";
  onGptImageQualityChange: (value: "low" | "medium" | "high") => void;
  aspectRatioOptions: DropdownOption[];
  resolutionOptions: DropdownOption[];
  modelOptions: DropdownOption[];
  isGenerating: boolean;
  standardGenHistory: StandardGenHistoryItem[];
  pendingStandardPrompt: {
    original: string;
    used: string;
    optimized?: string;
  } | null;
  onAspectRatioChange: (value: string) => void;
  onResolutionChange: (value: string) => void;
  onModelChange: (value: string) => void;
  optimizeStandardPrompt: boolean;
  onOptimizeStandardPromptChange: (value: boolean) => void;
  batchMode: boolean;
  onBatchModeChange: (value: boolean) => void;
  batchProgress: { current: number; total: number } | null;
  onSend: () => void;
  onCancelGeneration: () => void;
  onTogglePresets: () => void;
  onSelectPreset: (prompt: string) => void;
  onReuseHistoryPrompt: (prompt: string) => void;
  onRegenerateFromHistory: (entry: StandardGenHistoryItem) => void;
  onImagesGenerated?: (images: { url: string; local_path: string }[]) => void;
  pastedImage: { preview: string; path: string } | null;
  onPasteImage: (image: { preview: string; path: string } | null) => void;
  isUploadingPaste: boolean;
  selectedCanvasImage: {
    src: string;
    name: string;
    type?: "image" | "video";
  } | null;
  selectedCanvasImages: CanvasImage[];
  canvasImages: CanvasImage[];
}

const ChatView: React.FC<ChatViewProps> = ({
  modeToggle,
  isAgentMode,
  agentStatus,
  inputValue,
  showPresets,
  aspectRatio,
  resolution,
  model,
  isGptImage2,
  gptImageQuality,
  onGptImageQualityChange,
  aspectRatioOptions,
  resolutionOptions,
  modelOptions,
  isGenerating,
  standardGenHistory,
  pendingStandardPrompt,
  onAspectRatioChange,
  onResolutionChange,
  onModelChange,
  optimizeStandardPrompt,
  onOptimizeStandardPromptChange,
  batchMode,
  onBatchModeChange,
  batchProgress,
  onSend,
  onCancelGeneration,
  onTogglePresets,
  onSelectPreset,
  onReuseHistoryPrompt,
  onRegenerateFromHistory,
  onImagesGenerated,
  pastedImage,
  onPasteImage,
  isUploadingPaste,
  selectedCanvasImage,
  selectedCanvasImages,
  canvasImages,
}) => {
  const { t } = useTranslation();
  const AGENTS = useAgents();
  const currentAgent = AGENTS.find((a) => a.id === agentStatus) || AGENTS[0];
  const historyBottomRef = useRef<HTMLDivElement>(null);
  const [historyPromptView, setHistoryPromptView] = useState<
    Record<string, "used" | "original">
  >({});

  const fillPromptFromHistory = useCallback(
    (prompt: string) => {
      const text = prompt.trim();
      if (!text) return;
      onReuseHistoryPrompt(text);
    },
    [onReuseHistoryPrompt]
  );

  const resolveEntryPrompt = useCallback(
    (entry: StandardGenHistoryItem) => {
      const hasOptimized =
        !!entry.optimizedPrompt && entry.optimizedPrompt.trim().length > 0;
      const view = historyPromptView[entry.id];
      if (!hasOptimized) return entry.prompt;
      if (view === "original") return entry.originalPrompt || entry.prompt;
      // default to used (optimized)
      return entry.optimizedPrompt || entry.prompt;
    },
    [historyPromptView]
  );

  useEffect(() => {
    historyBottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [standardGenHistory.length, isGenerating, pendingStandardPrompt]);

  if (isAgentMode) {
    return (
      <AgentChatArea
        className="flex-1 min-h-0"
        agentStatus={agentStatus}
        agents={AGENTS}
        onImagesGenerated={onImagesGenerated}
        selectedCanvasImage={selectedCanvasImage}
        selectedCanvasImages={selectedCanvasImages}
        modeToggle={modeToggle}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div
        className={cn(
          "flex-1 min-h-0 overflow-y-auto px-8 relative flex flex-col",
          standardGenHistory.length === 0 && !isGenerating
            ? "justify-center py-6"
            : "pt-6"
        )}
      >
        {(standardGenHistory.length > 0 || isGenerating) && (
          <div className="flex items-center justify-between gap-2 mb-4 text-xs font-bold uppercase text-muted-foreground border-b border-foreground/10 pb-2">
            <span className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-accent-cyan" />
              {t("intelligenceHub.sessionHistory")}
            </span>
            <span className="text-[10px] font-mono font-normal normal-case text-muted-foreground/80">
              {t("intelligenceHub.sessionHistoryHint")}
            </span>
          </div>
        )}

        <div className="space-y-6">
          {standardGenHistory.map((entry) => (
            <div key={entry.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("intelligenceHub.standardPrompt")}
                </div>
                {!!entry.optimizedPrompt?.trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      setHistoryPromptView((prev) => ({
                        ...prev,
                        [entry.id]:
                          prev[entry.id] === "original" ? "used" : "original",
                      }))
                    }
                    className="px-2 py-1 text-[10px] font-bold uppercase border border-foreground/20 bg-background hover:bg-secondary transition-none"
                    title={t("intelligenceHub.toggleOptimizedPrompt")}
                  >
                    {historyPromptView[entry.id] === "original"
                      ? t("intelligenceHub.viewOptimizedPrompt")
                      : t("intelligenceHub.viewOriginalPrompt")}
                  </button>
                )}
              </div>

              {resolveEntryPrompt(entry).trim() ? (
                <button
                  type="button"
                  onClick={() =>
                    fillPromptFromHistory(resolveEntryPrompt(entry))
                  }
                  title={t("intelligenceHub.reuseHistoryPrompt")}
                  className="w-full text-left p-3 border-brutal border-foreground bg-secondary/20 font-mono text-sm whitespace-pre-wrap break-words leading-relaxed transition-none hover:bg-secondary/40 hover:border-accent-cyan/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan cursor-pointer"
                >
                  {resolveEntryPrompt(entry)}
                </button>
              ) : (
                <div className="p-3 border-brutal border-foreground/40 bg-secondary/10 font-mono text-sm text-muted-foreground">
                  —
                </div>
              )}
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                <Image className="w-4 h-4 text-accent-green" />
                {t("intelligenceHub.generationResult")}
                {entry.cost != null && entry.cost > 0 && (
                  <span className="text-accent-green">-{entry.cost} pts</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {entry.images.map((img, idx) => {
                  const imgUrl = img.url.startsWith("http")
                    ? img.url
                    : `${STATIC_BASE_URL}${img.url}`;
                  return (
                    <a
                      key={`${entry.id}-${idx}`}
                      href={imgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border-brutal border-foreground overflow-hidden hover:brightness-110"
                    >
                      <img
                        src={imgUrl}
                        alt=""
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                    </a>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRegenerateFromHistory(entry)}
                  disabled={isGenerating}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground bg-accent-cyan text-foreground brutal-press",
                    isGenerating
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:brightness-110"
                  )}
                >
                  <RefreshCw className="w-3 h-3" />
                  {t("agentResponse.regenerate")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    fillPromptFromHistory(
                      entry.originalPrompt || entry.prompt
                    )
                  }
                  disabled={isGenerating}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground bg-accent-yellow text-foreground brutal-press",
                    isGenerating
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:brightness-110"
                  )}
                >
                  <Pencil className="w-3 h-3" />
                  {t("agentResponse.modify")}
                </button>
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="space-y-3 pb-2">
              {pendingStandardPrompt && (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("intelligenceHub.standardPrompt")}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      fillPromptFromHistory(pendingStandardPrompt.used)
                    }
                    title={t("intelligenceHub.reuseHistoryPrompt")}
                    className="w-full text-left p-3 border-brutal border-dashed border-accent-cyan/50 bg-accent-cyan/5 font-mono text-sm whitespace-pre-wrap break-words transition-none hover:bg-accent-cyan/15 hover:border-accent-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan cursor-pointer"
                  >
                    {pendingStandardPrompt.used}
                  </button>
                </>
              )}
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-brutal border-foreground/20 flex items-center justify-center bg-accent-cyan/5">
                    <Sparkles className="w-8 h-8 text-accent-cyan" />
                  </div>
                  <div
                    className="absolute -inset-2 border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin"
                    style={{ animationDuration: "1.5s" }}
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest">
                    {t("intelligenceHub.generating")}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {t("intelligenceHub.generatingHint")}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce"
                      style={{
                        animationDelay: `${i * 120}ms`,
                        animationDuration: "0.8s",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {standardGenHistory.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center px-4 py-4 text-center shrink-0">
            <div className="mb-3 flex h-10 w-10 items-center justify-center border-brutal border-foreground bg-accent-cyan/10 brutal-shadow-cyan">
              <Sparkles className="h-5 w-5 text-accent-cyan" />
            </div>
            <h2 className="mb-1.5 text-sm font-bold uppercase tracking-[0.2em] text-foreground">
              {t("intelligenceHub.startCreating")}
            </h2>
            <p className="max-w-[248px] text-xs leading-relaxed text-muted-foreground">
              {t("intelligenceHub.startCreatingDesc")}
            </p>
          </div>
        )}

        <div
          ref={historyBottomRef}
          className="h-px w-full shrink-0"
          aria-hidden
        />
      </div>

      <PresetLibrary
        isOpen={showPresets}
        onClose={onTogglePresets}
        onSelectPreset={onSelectPreset}
      />

      <div
        id="onboarding-hub-compose"
        className="shrink-0 flex flex-col p-4 border-t-brutal border-foreground bg-card"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("intelligenceHub.composeLabel")}
          </span>
          <button
            type="button"
            id="onboarding-hub-presets"
            onClick={onTogglePresets}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 border px-2 text-[10px] font-bold uppercase tracking-wide transition-none brutal-press",
              showPresets
                ? "border-accent-pink/50 bg-accent-pink/15 text-foreground"
                : "border-foreground/25 bg-card text-muted-foreground hover:border-foreground/40 hover:bg-accent-pink/10 hover:text-foreground"
            )}
            title={t("intelligenceHub.promptArsenal")}
            aria-expanded={showPresets}
          >
            <Library className="h-3.5 w-3.5" />
            {t("intelligenceHub.promptArsenalShort")}
          </button>
        </div>

        {/* Pasted image preview */}
        {(pastedImage || isUploadingPaste) && (
          <div className="mb-2 flex items-center gap-2">
            {isUploadingPaste ? (
              <div className="w-16 h-16 border-brutal border-foreground/30 flex items-center justify-center bg-secondary">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : pastedImage ? (
              <div className="relative group">
                <img
                  src={pastedImage.preview}
                  alt="ref"
                  className="w-16 h-16 object-cover border-brutal border-foreground/30"
                />
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

        <div className="relative shrink-0">
          <InlineCanvasMentionEditor
            value={inputValue}
            onChange={onReuseHistoryPrompt}
            canvasImages={canvasImages}
            placeholder={t("intelligenceHub.inputPlaceholder")}
            onSubmit={isGenerating ? onCancelGeneration : onSend}
            enableSubmitOnEnter={!isGenerating}
            footerLeft={
              <ImageGenerationParams
                aspectRatio={aspectRatio}
                resolution={resolution}
                model={model}
                isGptImage2={isGptImage2}
                gptImageQuality={gptImageQuality}
                onGptImageQualityChange={onGptImageQualityChange}
                aspectRatioOptions={aspectRatioOptions}
                resolutionOptions={resolutionOptions}
                modelOptions={modelOptions}
                onAspectRatioChange={onAspectRatioChange}
                onResolutionChange={onResolutionChange}
                onModelChange={onModelChange}
                leadingSlot={modeToggle}
                optimizeStandardPrompt={optimizeStandardPrompt}
                onOptimizeStandardPromptChange={onOptimizeStandardPromptChange}
                batchMode={batchMode}
                onBatchModeChange={onBatchModeChange}
                batchSelectedCount={
                  selectedCanvasImages.filter((img) => img.type !== "video")
                    .length
                }
                settingsTriggerId="onboarding-hub-settings"
              />
            }
            submitAction={
              <button
                type="button"
                onClick={isGenerating ? onCancelGeneration : onSend}
                disabled={!isGenerating && !inputValue.trim()}
                className={cn(
                  "inline-flex h-7 items-center justify-center gap-1 rounded-md px-2.5 text-[10px] font-bold uppercase transition-colors",
                  isGenerating
                    ? "bg-accent-red text-foreground hover:brightness-110 brutal-press"
                    : !inputValue.trim()
                      ? "bg-foreground/10 text-muted-foreground cursor-not-allowed"
                      : "bg-accent-cyan text-foreground hover:brightness-110 brutal-press"
                )}
                title={
                  isGenerating ? t("common.cancel") : t("canvas.generate")
                }
              >
                {isGenerating ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>{t("common.cancel")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{t("canvas.generate")}</span>
                  </>
                )}
              </button>
            }
            onPasteImageFile={(file) => {
              // Trigger upload via parent
              const upload = async () => {
                const { default: sApi } = await import("@/api/storage");
                const preview = URL.createObjectURL(file);
                onPasteImage({ preview, path: "" }); // show preview immediately
                try {
                  const res = await sApi.uploadFile(file, "image");
                  onPasteImage({
                    preview,
                    path: res.path || res.url || "",
                  });
                } catch {
                  onPasteImage(null);
                  toast.error(t("intelligenceHub.imageUploadFailed"));
                }
              };
              upload();
            }}
          />
        </div>

        {batchProgress ? (
          <div className="mt-2 border-brutal border-foreground bg-accent-pink/5 px-2.5 py-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-accent-pink font-bold">
                {t("intelligenceHub.batchProcessing", {
                  current: batchProgress.current,
                  total: batchProgress.total,
                })}
              </span>
              <span className="text-muted-foreground">
                {Math.round(
                  (batchProgress.current / batchProgress.total) * 100
                )}
                %
              </span>
            </div>
            <div className="mt-1 w-full h-1 bg-foreground/10">
              <div
                className="h-full bg-accent-pink transition-all"
                style={{
                  width: `${
                    (batchProgress.current / batchProgress.total) * 100
                  }%`,
                }}
              />
            </div>
          </div>
        ) : null}
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
      icons: [
        <Zap key="zap" className="w-4 h-4" />,
        <Image key="img" className="w-4 h-4" />,
      ],
      colors: ["bg-accent-yellow", "bg-accent-cyan"],
    },
    {
      id: "reference",
      name: t("workflows.referenceGen"),
      description: t("workflows.referenceGenDesc"),
      icons: [
        <GitBranch key="branch" className="w-4 h-4" />,
        <Sparkles key="spark" className="w-4 h-4" />,
      ],
      colors: ["bg-accent-purple", "bg-accent-green"],
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
              <div className="font-bold text-sm uppercase tracking-wide">
                {workflow.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                {workflow.description}
              </div>
              <div className="flex gap-1.5 mt-2.5">
                {workflow.icons.map((icon, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-6 h-6 flex items-center justify-center border border-foreground",
                      workflow.colors[i]
                    )}
                  >
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
        <p className="text-sm text-muted-foreground mb-4">
          {t("intelligenceHub.dragNodesHint")}
        </p>

        <div className="flex gap-1.5 mb-4">
          {NODE_CATEGORY_DEFS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveNodeCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold uppercase border-brutal border-foreground transition-none",
                activeNodeCategory === cat.id
                  ? cn(cat.color, "brutal-shadow")
                  : "bg-card hover:bg-secondary"
              )}
            >
              {t(cat.nameKey)}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          {activeNodeCategory === "agents" && (
            <>
              <NodeItem
                name={t("intelligenceHub.node_optimizer")}
                icon={<Sparkles className="w-4 h-4" />}
                color="bg-accent-green"
              />
              <NodeItem
                name={t("intelligenceHub.node_photographer")}
                icon={<Camera className="w-4 h-4" />}
                color="bg-accent-cyan"
              />
              <NodeItem
                name={t("intelligenceHub.node_customAgent")}
                icon={<Bot className="w-4 h-4" />}
                color="bg-accent-yellow"
              />
            </>
          )}
          {activeNodeCategory === "tools" && (
            <>
              <NodeItem
                name={t("intelligenceHub.node_urlScraper")}
                icon={<GitBranch className="w-4 h-4" />}
                color="bg-accent-purple"
              />
              <NodeItem
                name={t("intelligenceHub.node_formatConvert")}
                icon={<Image className="w-4 h-4" />}
                color="bg-accent-cyan"
              />
            </>
          )}
          {activeNodeCategory === "data" && (
            <>
              <NodeItem
                name={t("intelligenceHub.node_assetGroup")}
                icon={<Image className="w-4 h-4" />}
                color="bg-muted"
              />
              <NodeItem
                name={t("intelligenceHub.node_dataInput")}
                icon={<Plus className="w-4 h-4" />}
                color="bg-accent-green"
              />
            </>
          )}
        </div>
      </div>

      <div className="p-3 border-t-brutal border-foreground bg-card">
        <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-muted-foreground">
          <span>
            <span className="text-accent-pink">●</span>{" "}
            {t("intelligenceHub.dragNodes")}
          </span>
          <span>
            <span className="text-accent-cyan">●</span>{" "}
            {t("intelligenceHub.clickConnect")}
          </span>
          <span>
            <span className="text-accent-green">●</span>{" "}
            {t("intelligenceHub.doubleClickConfigure")}
          </span>
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
    <div
      className={cn(
        "w-8 h-8 flex items-center justify-center border-brutal border-foreground",
        color
      )}
    >
      {icon}
    </div>
    <span className="font-bold text-sm uppercase">{name}</span>
  </div>
);

export { IntelligenceHub };
