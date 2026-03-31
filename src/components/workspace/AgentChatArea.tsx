import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  Send, 
  Sparkles, 
  ChevronDown,
  Grid3X3,
  User,
  Image as ImageIcon,
  Loader2,
  X,
  ImagePlus,
  RefreshCw,
  Check,
  Pencil,
  Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrutalDropdown, type DropdownOption } from "@/components/ui/brutal-dropdown";
import { AgentResponseCard, type PromptConfig } from "./AgentResponseCard";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import drawingApi from "@/api/drawing";
import storageApi from "@/api/storage";
import { BASE_URL } from "@/api/request";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import type { GenerateImageParams, MessageStatusResponse, ModelsConfigMap } from "@/types/drawing";

type StatusType = "ecommerce" | "optimizer" | "photographer" | "custom" | "offline";

/** 电商详情页后端固定模型（文档） */
const ECOMMERCE_MODEL = "gemini-3.1-flash-image-preview";

async function pollMessageUntilTerminal(
  messageId: string,
  intervalMs = 2000
): Promise<MessageStatusResponse> {
  for (;;) {
    const res = await drawingApi.getMessageStatus(messageId);
    if (res.status === "completed" || res.status === "failed" || res.status === "cancelled") {
      return res;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  config?: PromptConfig;
  images?: { url: string; local_path: string }[];
  userImages?: string[]; // user uploaded image previews
  messageId?: string;
  status?: string;
  cost?: number;
  timestamp: string;
  isWelcome?: boolean;
  /** 电商详情页大师：阶段1九宫格预览 */
  isEcommercePreview?: boolean;
  /** 电商详情页大师：阶段1/2正在生成 */
  ecommercePhase?: "phase1" | "phase2";
  /** 电商详情页大师：阶段1 generate 返回的 assistant_message_id */
  phase1MessageId?: string;
  ecommerceRefUploadId?: string;
  ecommercePrompt?: string;
  /** 阶段2最终结果已添加到画布 */
  isEcommerceFinalAdded?: boolean;
  isEcommerceResult?: boolean;
  isFinalResult?: boolean;
}

interface Agent {
  id: string;
  name: string;
  command: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface AgentChatAreaProps {
  agentStatus: StatusType;
  agents: Agent[];
  onSelectAgent: (agent: StatusType) => void;
  onToggleAgentMenu: () => void;
  showAgentMenu: boolean;
  onImagesGenerated?: (images: { url: string; local_path: string }[]) => void;
  /** 画布当前选中的图片，用于「使用画布图片」作为产品参考图 */
  selectedCanvasImage?: { src: string; name: string; type?: "image" | "video" } | null;
}

// ===== Ecommerce Welcome Message Component =====
const EcommerceWelcome: React.FC<{ agentColor: string; agentIcon: React.ReactNode }> = ({ agentColor, agentIcon }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className={cn("w-10 h-10 border-brutal border-foreground flex items-center justify-center flex-shrink-0", agentColor)}>
        {agentIcon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-sm">{t("agents.ecommerce").toUpperCase()}_AGENT</span>
        </div>
        <div className="text-sm bg-secondary/30 border border-foreground/10 p-4 space-y-3 whitespace-pre-wrap">
          <p className="font-bold">{t("ecommerceAgent.greeting")}</p>
          <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
            <li><strong>{t("ecommerceAgent.field1Label")}</strong>：{t("ecommerceAgent.field1Example")}</li>
            <li><strong>{t("ecommerceAgent.field2Label")}</strong>：{t("ecommerceAgent.field2Example")}</li>
            <li><strong>{t("ecommerceAgent.field3Label")}</strong>：{t("ecommerceAgent.field3Example")}</li>
            <li><strong>{t("ecommerceAgent.field4Label")}</strong>：{t("ecommerceAgent.field4Example")}</li>
            <li><strong>{t("ecommerceAgent.field5Label")}</strong>：{t("ecommerceAgent.field5Example")}</li>
            <li><strong>{t("ecommerceAgent.field6Label")}</strong>：{t("ecommerceAgent.field6Example")}</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

// ===== Ecommerce 9-Grid Result Component =====
const EcommerceResultGrid: React.FC<{
  images: { url: string; local_path: string }[];
  cost?: number;
  onRegenerate: () => void;
  onConfirm: () => void;
  onModify: () => void;
  confirmDisabled?: boolean;
  agentColor: string;
  agentIcon: React.ReactNode;
}> = ({
  images,
  cost,
  onRegenerate,
  onConfirm,
  onModify,
  confirmDisabled,
  agentColor,
  agentIcon,
}) => {
  const { t } = useTranslation();
  const getImageUrl = (url: string) => url.startsWith("http") ? url : `${BASE_URL}${url}`;

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className={cn("w-10 h-10 border-brutal border-foreground flex items-center justify-center flex-shrink-0", agentColor)}>
        {agentIcon}
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-sm">{t("agents.ecommerce").toUpperCase()}_AGENT</span>
        </div>
        <p className="text-sm text-muted-foreground">{t("ecommerceAgent.resultReady")}</p>
        
        {/* 10 panels: 5×2 */}
        <div className="grid grid-cols-5 gap-1.5 border-brutal border-foreground p-1.5 bg-secondary/10">
          {images.slice(0, 10).map((img, idx) => (
            <a
              key={idx}
              href={getImageUrl(img.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square overflow-hidden border border-foreground/20 hover:brightness-110 transition-none"
            >
              <img
                src={getImageUrl(img.url)}
                alt={`Product ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </a>
          ))}
        </div>

        {cost && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span>✅ {t("agentChat.generationComplete")}</span>
            <span className="text-accent-green font-bold">-{cost} pts</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground bg-card hover:bg-secondary brutal-press"
          >
            <RefreshCw className="w-3 h-3" />
            {t("agentResponse.regenerate")}
          </button>
          <button
            onClick={onModify}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground bg-card hover:bg-secondary brutal-press"
          >
            <Pencil className="w-3 h-3" />
            {t("agentResponse.modify")}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground bg-accent-cyan hover:brightness-110 brutal-press",
              confirmDisabled ? "opacity-50 cursor-not-allowed hover:brightness-100" : ""
            )}
          >
            <Check className="w-3 h-3" />
            {t("agentResponse.confirmBtn")}
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== Ecommerce 9-Grid Preview Component =====
const EcommercePreviewGrid: React.FC<{
  previewImage: { url: string; local_path: string } | null;
  cost?: number;
  onRegenerate: () => void;
  onConfirm: () => void;
  onModify: () => void;
  agentColor: string;
  agentIcon: React.ReactNode;
}> = ({ previewImage, cost, onRegenerate, onConfirm, onModify, agentColor, agentIcon }) => {
  const { t } = useTranslation();
  const getImageUrl = (url: string) => (url.startsWith("http") ? url : `${BASE_URL}${url}`);

  if (!previewImage) return null;

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className={cn("w-10 h-10 border-brutal border-foreground flex items-center justify-center flex-shrink-0", agentColor)}>
        {agentIcon}
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-sm">{t("agents.ecommerce").toUpperCase()}_AGENT</span>
        </div>
        <p className="text-sm text-muted-foreground">{t("ecommerceAgent.resultReady")}</p>

        <div className="border-brutal border-foreground p-1.5 bg-secondary/10 inline-block">
          <a href={getImageUrl(previewImage.url)} target="_blank" rel="noopener noreferrer">
            <img
              src={getImageUrl(previewImage.url)}
              alt="Ecommerce 9-grid preview"
              className="max-w-xs max-h-96 object-contain hover:brightness-110 transition-none"
            />
          </a>
        </div>

        {typeof cost === "number" && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span>✅ {t("agentChat.generationComplete")}</span>
            <span className="text-accent-green font-bold">-{cost} pts</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground bg-card hover:bg-secondary brutal-press"
          >
            <RefreshCw className="w-3 h-3" />
            {t("agentResponse.regenerate")}
          </button>
          <button
            onClick={onModify}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground bg-card hover:bg-secondary brutal-press"
          >
            <Pencil className="w-3 h-3" />
            {t("agentResponse.modify")}
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground bg-accent-cyan hover:brightness-110 brutal-press"
          >
            <Check className="w-3 h-3" />
            {t("agentResponse.confirmBtn")}
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== Pasted Images Preview =====
const PastedImagesPreview: React.FC<{
  images: string[];
  onRemove: (idx: number) => void;
  isUploading: boolean;
}> = ({ images, onRemove, isUploading }) => {
  if (images.length === 0 && !isUploading) return null;
  return (
    <div className="flex items-center gap-2 mb-2 flex-wrap">
      {images.map((src, idx) => (
        <div key={idx} className="relative w-14 h-14 border border-foreground/20 overflow-hidden group">
          <img src={src} alt="" className="w-full h-full object-cover" />
          <button
            onClick={() => onRemove(idx)}
            className="absolute top-0 right-0 w-4 h-4 bg-accent-red text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {isUploading && (
        <div className="w-14 h-14 border border-foreground/20 flex items-center justify-center bg-secondary/30">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

const AgentChatArea: React.FC<AgentChatAreaProps> = ({
  agentStatus,
  agents,
  onSelectAgent,
  onToggleAgentMenu,
  showAgentMenu,
  onImagesGenerated,
  selectedCanvasImage,
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  const [model, setModel] = useState("gemini-2.5-flash-image");
  const [modelsConfig, setModelsConfig] = useState<ModelsConfigMap | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pastedPreviews, setPastedPreviews] = useState<string[]>([]);
  const [pastedPaths, setPastedPaths] = useState<string[]>([]);
  /** 电商模式：产品参考图（粘贴/上传/画布），最多选 2 张；后端接口只需要其一的 ref_upload_id */
  const [productRefs, setProductRefs] = useState<{ preview: string; uploadId: string }[]>([]);
  const [isUploadingPaste, setIsUploadingPaste] = useState(false);
  const [ecommerceBatchProgress, setEcommerceBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [lastUserContent, setLastUserContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEcommerceCtxRef = useRef<{ refUploadId: string; prompt: string; phase1MessageId?: string } | null>(null);
  const polling = useGenerationPolling();

  const isEcommerce = agentStatus === "ecommerce";
  const currentAgent = agents.find(a => a.id === agentStatus) || agents[0];
  const currentModelConfig = useMemo(() => modelsConfig?.[model], [modelsConfig, model]);

  useEffect(() => {
    drawingApi.getModelsConfig().then(setModelsConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (!modelsConfig) return;

    const modelIds = Object.keys(modelsConfig);
    if (!modelIds.length) return;

    if (!modelsConfig[model]) {
      const firstModelId =
        isEcommerce ? modelIds.find((id) => modelsConfig[id]?.provider === "gemini") ?? modelIds[0] : modelIds[0];
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

  // Reset and show welcome when agent changes
  useEffect(() => {
    setPastedPreviews([]);
    setPastedPaths([]);
    setProductRefs([]);
    setEcommerceBatchProgress(null);
    setLastUserContent("");
    if (agentStatus === "ecommerce") {
      const welcomeMsg: Message = {
        id: "welcome-ecommerce",
        role: "agent",
        content: "",
        isWelcome: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([welcomeMsg]);
    } else {
      setMessages([]);
    }
  }, [agentStatus]);

  // Poll results（电商走独立轮询，不经过此 hook）
  useEffect(() => {
    if (polling.status === "completed" && polling.images.length > 0) {
      if (isEcommerce) {
        polling.reset();
        return;
      }
      setMessages(prev => {
        const updated = [...prev];
        let lastAgentIdx = -1;
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].role === "agent" && updated[i].status === "generating") {
            lastAgentIdx = i;
            break;
          }
        }
        if (lastAgentIdx !== -1) {
          if (isEcommerce) {
            updated[lastAgentIdx] = {
              ...updated[lastAgentIdx],
              status: "completed",
              images: polling.images,
              cost: polling.actualCost,
              isEcommerceResult: true,
            };
          } else {
            updated[lastAgentIdx] = {
              ...updated[lastAgentIdx],
              status: "completed",
              images: polling.images,
              cost: polling.actualCost,
            };
          }
        }
        return updated;
      });
      setIsGenerating(false);
      onImagesGenerated?.(polling.images);
      polling.reset();
    } else if (polling.status === "failed") {
      if (isEcommerce) {
        polling.reset();
        return;
      }
      setMessages(prev => {
        const updated = [...prev];
        let lastAgentIdx = -1;
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].role === "agent" && updated[i].status === "generating") {
            lastAgentIdx = i;
            break;
          }
        }
        if (lastAgentIdx !== -1) {
          updated[lastAgentIdx] = {
            ...updated[lastAgentIdx],
            status: "failed",
            content: polling.error || t("agentChat.generationFailed"),
          };
        }
        return updated;
      });
      setIsGenerating(false);
      toast.error(polling.error || t("agentChat.generationFailed"));
      polling.reset();
    }
  }, [polling.status, polling.images, polling.error, isEcommerce, t, onImagesGenerated]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (value === "/") {
      onToggleAgentMenu();
    }
  };

  const uploadProductFile = useCallback(async (file: File) => {
    setIsUploadingPaste(true);
    try {
      const preview = URL.createObjectURL(file);
      const res = await storageApi.uploadFile(file, "image");
      setProductRefs((prev) => {
        if (prev.length >= 2) return prev;
        return [...prev, { preview, uploadId: res.upload_id }];
      });
      toast.success(t("intelligenceHub.imagePasted") || "图片已粘贴");
    } catch {
      toast.error(t("intelligenceHub.imageUploadFailed") || "图片上传失败");
    } finally {
      setIsUploadingPaste(false);
    }
  }, [t]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          e.preventDefault();
          if (isEcommerce) {
            void uploadProductFile(file);
          } else {
            const preview = URL.createObjectURL(file);
            setPastedPreviews((prev) => [...prev, preview]);
            setPastedPaths((prev) => [...prev, preview]);
            toast.success(t("intelligenceHub.imagePasted") || "图片已粘贴");
          }
        }
      }
    },
    [t, isEcommerce, uploadProductFile]
  );

  const handleProductFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files).slice(0, 2) : [];
    for (const file of files) {
      if (file.type.startsWith("image/")) void uploadProductFile(file);
    }
    e.target.value = "";
  };

  const handleUseCanvasImage = useCallback(async () => {
    if (!selectedCanvasImage || selectedCanvasImage.type === "video") {
      toast.error(t("ecommerceAgent.useCanvasNoImage"));
      return;
    }
    try {
      const r = await fetch(selectedCanvasImage.src);
      const blob = await r.blob();
      const base = selectedCanvasImage.name?.trim() || "canvas";
      const safeName = base.replace(/[/\\?%*:|"<>]/g, "_");
      const file = new File([blob], safeName.includes(".") ? safeName : `${safeName}.png`, {
        type: blob.type || "image/png",
      });
      await uploadProductFile(file);
    } catch {
      toast.error(t("ecommerceAgent.useCanvasFailed"));
    }
  }, [selectedCanvasImage, t, uploadProductFile]);

  const removePastedImage = (idx: number) => {
    setPastedPreviews((prev) => prev.filter((_, i) => i !== idx));
    setPastedPaths((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeProductRef = (idx: number) => {
    setProductRefs((prev) => prev.filter((_, i) => i !== idx));
  };

  const ensureSession = async (): Promise<string> => {
    if (sessionId) return sessionId;
    const res = await drawingApi.createSession({ title: "Agent Chat" });
    setSessionId(res.session_id);
    return res.session_id;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isGenerating) return;

    if (isEcommerce && productRefs.length === 0) {
      toast.error(t("ecommerceAgent.imageRequired"));
      return;
    }

    const userContent = inputValue.trim();
    const ecommerceRefUploadId = isEcommerce ? productRefs[0]!.uploadId : null;
    setLastUserContent(userContent);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userContent,
      userImages: isEcommerce ? productRefs.map((p) => p.preview) : [...pastedPreviews],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const savedPaths = [...pastedPaths];

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsGenerating(true);

    if (isEcommerce) {
      setProductRefs([]);
    } else {
      setPastedPreviews([]);
      setPastedPaths([]);
    }

    if (isEcommerce) {
      const agentMessageId = (Date.now() + 1).toString();
      const agentMessage: Message = {
        id: agentMessageId,
        role: "agent",
        content: t("ecommerceAgent.generatingDetail"),
        status: "generating",
        ecommercePhase: "phase1",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, agentMessage]);

      const refUploadId = ecommerceRefUploadId!;
      lastEcommerceCtxRef.current = { refUploadId, prompt: userContent };
      setEcommerceBatchProgress(null);

      void (async () => {
        try {
          const sid = await ensureSession();

          // Phase 1: grid preview (type=1)
          const phase1Res = await drawingApi.generateImage(sid, {
            prompt: userContent,
            model: ECOMMERCE_MODEL,
            resolution: "1K",
            aspect_ratio: "1:1",
            negative_prompt: "",
            num_images: 1,
            provider: "gemini",
            optimize_prompt: true,
            ref_upload_id: refUploadId,
            strength: 0.7,
            type: 1,
          });

          toast.info(`${t("ecommerceAgent.phase1")} · ≈ ${phase1Res.estimated_cost} pts`);

          const phase1 = await pollMessageUntilTerminal(phase1Res.message_id);
          if (phase1.status !== "completed" || !phase1.images?.length) {
            throw new Error(phase1.error_msg || t("ecommerceAgent.phase1Failed"));
          }

          const previewImg = phase1.images[0];
          lastEcommerceCtxRef.current = {
            refUploadId,
            prompt: userContent,
            phase1MessageId: phase1Res.message_id,
          };

          // Wait for user confirmation before phase2.
          setMessages((prev) =>
            prev.map((m) =>
              m.id === agentMessageId
                ? {
                    ...m,
                    status: "completed",
                    images: previewImg ? [previewImg] : [],
                    cost: phase1.actual_cost,
                    isEcommercePreview: true,
                    ecommercePhase: undefined,
                    phase1MessageId: phase1Res.message_id,
                    ecommerceRefUploadId: refUploadId,
                    ecommercePrompt: userContent,
                    isEcommerceResult: false,
                    isEcommerceFinalAdded: false,
                    content: t("ecommerceAgent.resultReady"),
                  }
                : m
            )
          );
          setIsGenerating(false);
        } catch (err: unknown) {
          setEcommerceBatchProgress(null);
          const msg =
            (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
            (err as Error).message ||
            t("agentChat.generationFailed");

          setMessages((prev) => prev.map((m) => (m.id === agentMessageId ? { ...m, status: "failed", content: msg } : m)));
          setIsGenerating(false);
          toast.error(msg);
        }
      })();

      return;
    }

    const uploadedPaths = [...savedPaths];

    try {
      const sid = await ensureSession();

      const params: GenerateImageParams = {
        prompt: userContent,
        model,
        resolution,
        aspect_ratio: aspectRatio,
        num_images: 1,
        provider: currentModelConfig?.provider ?? (model.startsWith("gemini") ? "gemini" : "ark"),
        optimize_prompt: true,
      };

      if (uploadedPaths.length > 0 && currentModelConfig?.supports_image_to_image !== false) {
        params.ref_image_path = uploadedPaths[0];
      }

      const res = await drawingApi.generateImage(sid, params);

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: t("agentChat.generating"),
        messageId: res.message_id,
        status: "generating",
        cost: res.estimated_cost,
        config: {
          sceneName: userContent.slice(0, 30) + (userContent.length > 30 ? "..." : ""),
          style: model,
          lighting: resolution,
          composition: aspectRatio,
          quality: `${res.estimated_cost} pts`,
        },
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, agentMessage]);
      polling.startPolling(res.message_id);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "生成失败";
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: errorMsg,
        status: "failed",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsGenerating(false);
      toast.error(errorMsg);
    }
  };

  const handleEcommerceRegeneratePreview = () => {
    const ctx = lastEcommerceCtxRef.current;
    if (!ctx || !ctx.prompt.trim() || isGenerating) return;

    const agentMessageId = Date.now().toString();
    const agentMessage: Message = {
      id: agentMessageId,
      role: "agent",
      content: t("ecommerceAgent.generatingDetail"),
      status: "generating",
      ecommercePhase: "phase1",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setIsGenerating(true);
    setMessages((prev) => [...prev, agentMessage]);
    setEcommerceBatchProgress(null);

    void (async () => {
      try {
        const sid = await ensureSession();

        const phase1Res = await drawingApi.generateImage(sid, {
          prompt: ctx.prompt,
          model: ECOMMERCE_MODEL,
          resolution: "1K",
          aspect_ratio: "1:1",
          negative_prompt: "",
          num_images: 1,
          provider: "gemini",
          optimize_prompt: true,
          ref_upload_id: ctx.refUploadId,
          strength: 0.7,
          type: 1,
        });

        toast.info(`${t("ecommerceAgent.phase1")} · ≈ ${phase1Res.estimated_cost} pts`);

        const phase1 = await pollMessageUntilTerminal(phase1Res.message_id);
        if (phase1.status !== "completed" || !phase1.images?.length) {
          throw new Error(phase1.error_msg || t("ecommerceAgent.phase1Failed"));
        }

        lastEcommerceCtxRef.current = {
          refUploadId: ctx.refUploadId,
          prompt: ctx.prompt,
          phase1MessageId: phase1Res.message_id,
        };

        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMessageId
              ? {
                  ...m,
                  status: "completed",
                  images: phase1.images.slice(0, 1),
                  cost: phase1.actual_cost,
                  isEcommercePreview: true,
                  ecommercePhase: undefined,
                  phase1MessageId: phase1Res.message_id,
                  ecommerceRefUploadId: ctx.refUploadId,
                  ecommercePrompt: ctx.prompt,
                  isEcommerceResult: false,
                  isEcommerceFinalAdded: false,
                  content: t("ecommerceAgent.resultReady"),
                }
              : m
          )
        );
        setIsGenerating(false);
      } catch (err: unknown) {
        setEcommerceBatchProgress(null);
        const msg =
          (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
          (err as Error).message ||
          t("agentChat.generationFailed");
        setMessages((prev) => prev.map((m) => (m.id === agentMessageId ? { ...m, status: "failed", content: msg } : m)));
        setIsGenerating(false);
        toast.error(msg);
      }
    })();
  };

  const handleEcommerceModify = () => {
    if (lastUserContent) {
      setInputValue(lastUserContent);
      textareaRef.current?.focus();
      // Add a hint message from agent
      const hintMessage: Message = {
        id: Date.now().toString(),
        role: "agent",
        content: t("ecommerceAgent.modifyHint"),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, hintMessage]);
    }
  };

  const handleEcommerceConfirm = (images: { url: string; local_path: string }[]) => {
    onImagesGenerated?.(images);
    toast.success(t("ecommerceAgent.confirmed"));
  };

  const handleEcommerceConfirmPreview = async (targetMessage: Message) => {
    const refUploadId = targetMessage.ecommerceRefUploadId || lastEcommerceCtxRef.current?.refUploadId;
    const phase1MessageId = targetMessage.phase1MessageId || lastEcommerceCtxRef.current?.phase1MessageId;
    if (!refUploadId || !phase1MessageId || isGenerating) return;

    setIsGenerating(true);
    setEcommerceBatchProgress({ current: 0, total: 10 });

    const agentMessageId = targetMessage.id;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === agentMessageId
          ? {
              ...m,
              status: "generating",
              ecommercePhase: "phase2",
              content: t("ecommerceAgent.composingFinal"),
              isEcommercePreview: false,
              isEcommerceResult: false,
              isEcommerceFinalAdded: false,
              images: undefined,
            }
          : m
      )
    );

    try {
      const sid = await ensureSession();

      const batchData = await drawingApi.generateBatch(sid, {
        assistant_message_id: phase1MessageId,
        ref_upload_id: refUploadId,
        model: ECOMMERCE_MODEL,
        resolution: "1K",
        aspect_ratio: "1:1",
        negative_prompt: "",
        strength: 0.7,
        provider: "gemini",
      });

      toast.info(`${t("ecommerceAgent.phase2")} · ≈ ${batchData.total_estimated_cost ?? "?"} pts`);

      const ids = batchData.messages.map((m) => m.message_id);
      let totalCost = targetMessage.cost ?? 0;

      for (let i = 0; i < ids.length; i++) {
        setEcommerceBatchProgress({ current: i + 1, total: ids.length });
        const r = await pollMessageUntilTerminal(ids[i]);
        if (r.status !== "completed") {
          throw new Error(r.error_msg || `${t("ecommerceAgent.panelFailed")} ${i + 1}`);
        }
        totalCost += r.actual_cost ?? 0;
        const img = r.images?.[0];
        if (img) {
          // 阶段2要求：每张完成后立即添加到画布
          onImagesGenerated?.([img]);
        }
      }

      setEcommerceBatchProgress(null);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMessageId
            ? {
                ...m,
                status: "completed",
                cost: totalCost,
                isEcommerceResult: false,
                isEcommercePreview: false,
                isEcommerceFinalAdded: true,
                ecommercePhase: undefined,
                content: t("ecommerceAgent.finalReady"),
              }
            : m
        )
      );
      toast.success(t("ecommerceAgent.finalReady"));
    } catch (err: unknown) {
      setEcommerceBatchProgress(null);
      const msg =
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        (err as Error).message ||
        t("agentChat.generationFailed");
      setMessages((prev) => prev.map((m) => (m.id === agentMessageId ? { ...m, status: "failed", content: msg } : m)));
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== "user") {
      userMessageIndex--;
    }
    if (userMessageIndex < 0) return;
    setInputValue(messages[userMessageIndex].content);
  };

  const handleModify = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.config) {
      setInputValue(message.config.sceneName);
    }
  };

  const handleConfirm = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.config) {
      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: "agent",
        content: t("agentChat.configConfirmed", { name: message.config.sceneName }),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, confirmMessage]);
    }
  };

  const handleViewDetails = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.config) {
      const detailsMessage: Message = {
        id: Date.now().toString(),
        role: "agent",
        content: `📋 ${t("agentResponse.sceneName")}: ${message.config.sceneName}\n🎨 ${t("agentResponse.style")}: ${message.config.style}\n💡 ${t("agentResponse.lighting")}: ${message.config.lighting}\n📐 ${message.config.composition}\n⚡ ${message.config.quality}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, detailsMessage]);
    }
  };

  const getImageUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    return `${BASE_URL}${url}`;
  };

  const DEFAULT_ASPECT_RATIOS: DropdownOption[] = useMemo(
    () => [
      { value: "1:1", label: "1:1", icon: <Grid3X3 className="w-3.5 h-3.5" /> },
      { value: "16:9", label: "16:9" },
      { value: "9:16", label: "9:16" },
      { value: "4:3", label: "4:3" },
      { value: "3:4", label: "3:4" },
    ],
    []
  );
  const DEFAULT_RESOLUTIONS: DropdownOption[] = useMemo(
    () => [
      { value: "1K", label: "1K" },
      { value: "2K", label: "2K" },
      { value: "4K", label: "4K" },
    ],
    []
  );

  const aspectRatioOptions: DropdownOption[] = useMemo(() => {
    if (!currentModelConfig) return DEFAULT_ASPECT_RATIOS;
    return currentModelConfig.supported_aspect_ratios.map((ar) => ({ value: ar.value, label: ar.value }));
  }, [currentModelConfig, DEFAULT_ASPECT_RATIOS]);

  const resolutionOptions: DropdownOption[] = useMemo(() => {
    if (!currentModelConfig) return DEFAULT_RESOLUTIONS;
    return currentModelConfig.supported_resolutions.map((r) => ({ value: r.value, label: r.value }));
  }, [currentModelConfig, DEFAULT_RESOLUTIONS]);

  const modelOptions: DropdownOption[] = useMemo(() => {
    if (!modelsConfig) return [{ value: model, label: model }];
    const entries = Object.entries(modelsConfig);
    const ecommerceEntries = isEcommerce ? entries.filter(([, cfg]) => cfg.provider === "gemini") : entries;
    return (ecommerceEntries.length ? ecommerceEntries : entries).map(([id, cfg]) => ({
      value: id,
      label: cfg.name,
      icon: <Sparkles className="w-3 h-3" />,
    }));
  }, [isEcommerce, modelsConfig, model]);

  const canSend = isEcommerce
    ? Boolean(inputValue.trim() && productRefs.length > 0 && !isGenerating && !isUploadingPaste)
    : Boolean(inputValue.trim() && !isGenerating);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <button
        onClick={onToggleAgentMenu}
        className="mx-4 mt-4 px-4 py-2 bg-accent-pink text-foreground font-mono text-xs font-bold uppercase tracking-wider border-brutal border-foreground flex items-center justify-between"
      >
        <span>{t("agents.agentLabel")}: {currentAgent.name} ({t("agentChat.typeToSwitch")})</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {showAgentMenu && (
        <div className="mx-4 mt-1 bg-card border-brutal border-foreground z-20 brutal-shadow">
          <div className="px-3 py-2 text-xs font-bold uppercase text-accent-red border-b border-foreground/20">
            {t("intelligenceHub.selectAgent")}
          </div>
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent.id as StatusType)}
              className={cn(
                "w-full text-left px-3 py-3 hover:bg-accent-cyan/20 transition-none flex items-center gap-3 border-b border-foreground/10 last:border-0",
                agentStatus === agent.id && "bg-accent-cyan/10"
              )}
            >
              <div className={cn("w-8 h-8 flex items-center justify-center border-brutal border-foreground", agent.color)}>
                {agent.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{agent.name}</span>
                  <span className="text-xs text-muted-foreground">{agent.command}</span>
                </div>
                <div className="text-xs text-muted-foreground">{agent.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col justify-start pt-12 px-8">
            <div className="flex items-start gap-4">
              <div className={cn("w-16 h-16 border-brutal border-foreground/30 flex items-center justify-center flex-shrink-0", currentAgent.color)}>
                {currentAgent.icon}
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="font-bold text-lg uppercase tracking-wider mb-2">
                  {t("agentChat.agentReady", { name: currentAgent.name })}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  {t("agentChat.agentReadyDesc")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className="animate-fade-in">
                {/* Welcome message for ecommerce */}
                {message.isWelcome && isEcommerce ? (
                  <EcommerceWelcome agentColor={currentAgent.color} agentIcon={currentAgent.icon} />
                ) : message.role === "user" ? (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-accent-yellow border-brutal border-foreground flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{t("agentChat.you")}</span>
                        <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                      </div>
                      {/* Show user uploaded images */}
                      {message.userImages && message.userImages.length > 0 && (
                        <div className="flex gap-1.5 mb-2">
                          {message.userImages.map((src, idx) => (
                            <div key={idx} className="w-16 h-16 border border-foreground/20 overflow-hidden">
                              <img src={src} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-sm bg-secondary/30 border border-foreground/10 p-3 whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ) : message.isFinalResult && message.status === "generating" ? (
                  <div className="flex items-start gap-3 animate-fade-in">
                    <div className={cn("w-10 h-10 border-brutal border-foreground flex items-center justify-center flex-shrink-0", currentAgent.color)}>
                      {currentAgent.icon}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{t("agents.ecommerce").toUpperCase()}_AGENT</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{message.content}</span>
                      </div>
                      <div className="w-full max-w-xs h-64 bg-secondary/20 border border-foreground/10 animate-pulse rounded" />
                    </div>
                  </div>
                ) : message.isFinalResult && message.status === "completed" && message.images ? (
                  <div className="flex items-start gap-3 animate-fade-in">
                    <div className={cn("w-10 h-10 border-brutal border-foreground flex items-center justify-center flex-shrink-0", currentAgent.color)}>
                      {currentAgent.icon}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{t("agents.ecommerce").toUpperCase()}_AGENT</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{message.content}</p>
                      <div className="border-brutal border-foreground p-1.5 bg-secondary/10 inline-block">
                        <a href={message.images[0].url.startsWith("http") ? message.images[0].url : `${BASE_URL}${message.images[0].url}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={message.images[0].url.startsWith("http") ? message.images[0].url : `${BASE_URL}${message.images[0].url}`}
                            alt="Final detail page"
                            className="max-w-xs max-h-96 object-contain hover:brightness-110 transition-none"
                          />
                        </a>
                      </div>
                      {message.cost && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>✅ {t("agentChat.generationComplete")}</span>
                          <span className="text-accent-green font-bold">-{message.cost} pts</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : message.isEcommercePreview && message.status === "completed" && message.images ? (
                  <EcommercePreviewGrid
                    previewImage={message.images[0] ?? null}
                    cost={message.cost}
                    onRegenerate={handleEcommerceRegeneratePreview}
                    onConfirm={() => handleEcommerceConfirmPreview(message)}
                    onModify={handleEcommerceModify}
                    agentColor={currentAgent.color}
                    agentIcon={currentAgent.icon}
                  />
                ) : (
                  <div>
                    {message.config && message.status !== "failed" ? (
                      <>
                        <AgentResponseCard
                          config={message.config}
                          timestamp={message.timestamp}
                          onRegenerate={() => handleRegenerate(message.id)}
                          onModify={() => handleModify(message.id)}
                          onConfirm={() => handleConfirm(message.id)}
                          onViewDetails={() => handleViewDetails(message.id)}
                        />
                        {message.status === "generating" && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground px-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>{t("agentChat.generating")}</span>
                            {message.cost && <span className="text-accent-cyan">≈ {message.cost} pts</span>}
                          </div>
                        )}
                        {message.status === "completed" && message.images && message.images.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {message.images.map((img, idx) => (
                              <a
                                key={idx}
                                href={getImageUrl(img.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block border-brutal border-foreground overflow-hidden hover:brightness-110 transition-none"
                              >
                                <img
                                  src={getImageUrl(img.url)}
                                  alt={`Generated ${idx + 1}`}
                                  className="w-full h-auto object-cover"
                                  loading="lazy"
                                />
                              </a>
                            ))}
                            {message.cost && (
                              <div className="col-span-2 text-xs text-muted-foreground flex items-center gap-1">
                                <span>✅ {t("agentChat.generationComplete")}</span>
                                <span className="text-accent-green font-bold">-{message.cost} pts</span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className={cn("w-10 h-10 border-brutal border-foreground flex items-center justify-center flex-shrink-0", message.status === "failed" ? "bg-accent-red" : currentAgent.color)}>
                          {currentAgent.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm">{currentAgent.name.toUpperCase()}_AGENT</span>
                            <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                          </div>
                          {/* Ecommerce generating state */}
                          {isEcommerce && message.status === "generating" ? (
                            <div className="bg-secondary/30 border border-foreground/10 p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-accent-orange" />
                                <span className="text-sm font-bold">{t("ecommerceAgent.generatingDetail")}</span>
                              </div>
                              {ecommerceBatchProgress && (
                                <p className="text-xs font-mono text-muted-foreground">
                                  {t("ecommerceAgent.batchProgress", {
                                    current: ecommerceBatchProgress.current,
                                    total: ecommerceBatchProgress.total,
                                  })}
                                </p>
                              )}
                              {(() => {
                                const phase = message.ecommercePhase;
                                const skeletonCount = phase === "phase1" ? 1 : 10;
                                return (
                                  <div className={cn(phase === "phase1" ? "grid grid-cols-1 gap-1.5" : "grid grid-cols-5 gap-1.5")}>
                                    {Array.from({ length: skeletonCount }).map((_, i) => (
                                      <div key={i} className="aspect-square bg-foreground/5 border border-foreground/10 animate-pulse" />
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <p className="text-sm bg-secondary/30 border border-foreground/10 p-3 whitespace-pre-wrap">
                              {message.content}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isGenerating && !messages.some(m => m.status === "generating") && (
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 border-brutal border-foreground flex items-center justify-center animate-pulse", currentAgent.color)}>
                  {currentAgent.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">{currentAgent.name.toUpperCase()}_AGENT</span>
                  </div>
                  <div className="flex gap-1 p-3">
                    <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t-brutal border-foreground bg-card">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleProductFilePick}
        />
        {/* 电商：产品参考图（上传 / 粘贴自动上传 / 画布） */}
        {isEcommerce ? (
          <>
            <PastedImagesPreview
              images={productRefs.map((p) => p.preview)}
              onRemove={removeProductRef}
              isUploading={isUploadingPaste}
            />
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPaste || isGenerating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase border-brutal border-foreground bg-card hover:bg-secondary brutal-press disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {t("ecommerceAgent.uploadProduct")}
              </button>
              <button
                type="button"
                onClick={() => void handleUseCanvasImage()}
                disabled={isUploadingPaste || isGenerating || !selectedCanvasImage || selectedCanvasImage.type === "video"}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase border-brutal border-foreground bg-accent-orange/15 hover:bg-accent-orange/25 brutal-press disabled:opacity-50"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                {t("ecommerceAgent.useCanvasImage")}
              </button>
            </div>
            {productRefs.length === 0 && !isUploadingPaste && (
              <div className="flex items-center gap-1.5 mb-2 text-xs text-accent-orange">
                <ImagePlus className="w-3.5 h-3.5" />
                <span>{t("ecommerceAgent.pasteImageHint")}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <PastedImagesPreview
              images={pastedPreviews}
              onRemove={removePastedImage}
              isUploading={isUploadingPaste}
            />
          </>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder={isEcommerce ? t("ecommerceAgent.inputPlaceholder") : t("agentChat.inputPlaceholder")}
            className="w-full h-24 p-3 border-brutal border-foreground bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-cyan"
          />
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
            <BrutalDropdown
              options={aspectRatioOptions}
              value={aspectRatio}
              onChange={setAspectRatio}
              icon={<Grid3X3 className="w-3.5 h-3.5" />}
            />
            <BrutalDropdown options={resolutionOptions} value={resolution} onChange={setResolution} />
            <BrutalDropdown
              options={modelOptions}
              value={model}
              onChange={setModel}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            />
          </div>

          {isEcommerce && productRefs.length > 0 && (
            <span className="px-2 py-1 border border-accent-orange/30 bg-accent-orange/10 text-[10px] font-bold text-accent-orange mr-1">
              📷 {productRefs.length}
            </span>
          )}

          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              "w-8 h-8 flex items-center justify-center border-brutal border-foreground brutal-press",
              !canSend ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-accent-cyan text-foreground hover:brightness-110"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export { AgentChatArea, type StatusType };
