import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Send,
  Sparkles,
  Grid3X3,
  User,
  Image as ImageIcon,
  Loader2,
  X,
  ImagePlus,
  RefreshCw,
  Check,
  Pencil,
  Upload,
  Download,
  CirclePlay,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type DropdownOption } from "@/components/ui/brutal-dropdown";
import { drawingModelOptionIcon } from "@/components/icons/DrawingModelIcon";
import { ImageGenerationParams, type GptImageQuality } from "./ImageGenerationParams";
import { AgentResponseCard, type PromptConfig } from "./AgentResponseCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import drawingApi, { downloadZip } from "@/api/drawing";
import storageApi from "@/api/storage";
import { STATIC_BASE_URL } from "@/api/request";
import { fetchAssetBlob } from "@/lib/assetFetchUrl";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { getErrorMessage } from "@/lib/errorMessage";
import {
  DEFAULT_DRAWING_MODEL,
  type GenerateImageParams,
  type MessageStatusResponse,
  type ModelsConfigMap,
} from "@/types/drawing";
import type { CanvasImage } from "./CanvasArea";

type StatusType =
  | "ecommerce"
  | "optimizer"
  | "photographer"
  | "custom"
  | "offline";

const ECOMMERCE_GUIDE_VIDEO_URL =
  "https://fquantplus.oss-cn-qingdao.aliyuncs.com/neospark/%E7%94%B5%E5%95%86%E8%AF%A6%E6%83%85%E9%A1%B5%E6%95%99%E7%A8%8B%E8%84%9A%E6%9C%AC.mp4";
const ECOMMERCE_GUIDE_VIDEO_URL_EN =
  "https://ustrader-73014.oss-us-east-1.aliyuncs.com/ecommerce_listing_en.mp4";

async function pollMessageUntilTerminal(
  messageId: string,
  intervalMs = 2000
): Promise<MessageStatusResponse> {
  for (;;) {
    const res = await drawingApi.getMessageStatus(messageId);
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
  className?: string;
  agentStatus: StatusType;
  agents: Agent[];
  onImagesGenerated?: (images: { url: string; local_path: string }[]) => void;
  /** 画布当前选中的图片，用于「使用画布图片」作为产品参考图 */
  selectedCanvasImage?: {
    src: string;
    name: string;
    type?: "image" | "video";
  } | null;
  selectedCanvasImages?: CanvasImage[];
  /** 参数行左侧：标准/智能体切换 */
  modeToggle?: React.ReactNode;
}

const ECOMMERCE_WELCOME_FIELDS = [
  "field1",
  "field2",
  "field3",
  "field4",
  "field5",
  "field6",
] as const;

const CHAT_MESSAGE_CARD =
  "w-full border-brutal border-foreground/15 bg-secondary/30 p-3 text-sm leading-relaxed";

/** 头像 + 名称一行，内容全宽（与欢迎消息一致） */
const ChatMessageBlock: React.FC<{
  avatar: React.ReactNode;
  avatarClassName?: string;
  title: string;
  timestamp?: string;
  headerTrailing?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({
  avatar,
  avatarClassName,
  title,
  timestamp,
  headerTrailing,
  className,
  children,
}) => (
  <div className={cn("w-full min-w-0 space-y-2 animate-fade-in", className)}>
    <div className="flex items-center gap-2 min-w-0">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center border-brutal border-foreground",
          avatarClassName
        )}
      >
        {avatar}
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-bold tracking-wide">
        {title}
      </span>
      {timestamp ? (
        <span className="shrink-0 text-xs text-muted-foreground">{timestamp}</span>
      ) : null}
      {headerTrailing}
    </div>
    <div className="w-full min-w-0">{children}</div>
  </div>
);

// ===== Ecommerce Welcome Message Component =====
const EcommerceWelcome: React.FC<{
  agentColor: string;
  agentIcon: React.ReactNode;
}> = ({ agentColor, agentIcon }) => {
  const { t, i18n } = useTranslation();
  const [showGuideVideo, setShowGuideVideo] = useState(false);
  const isChineseLanguage =
    (i18n.resolvedLanguage || i18n.language || "en")
      .split("-")[0]
      .toLowerCase() === "zh";
  const agentName = t("agents.ecommerce");

  return (
    <>
      <ChatMessageBlock
        avatar={agentIcon}
        avatarClassName={agentColor}
        title={agentName}
        headerTrailing={
          <button
            type="button"
            onClick={() => setShowGuideVideo(true)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center border-brutal border-foreground bg-accent-cyan text-foreground hover:brightness-110 brutal-press"
            title={
              isChineseLanguage
                ? "电商详情页大师指导视频"
                : "E-Commerce Master Guide Video"
            }
            aria-label={
              isChineseLanguage
                ? "打开电商详情页大师指导视频"
                : "Open E-Commerce Master Guide Video"
            }
          >
            <CirclePlay className="h-4 w-4" />
          </button>
        }
      >
        <div className={CHAT_MESSAGE_CARD}>
          <p className="font-bold text-foreground">{t("ecommerceAgent.greeting")}</p>
          <ol className="mt-2.5 divide-y divide-foreground/10">
            {ECOMMERCE_WELCOME_FIELDS.map((field, index) => (
              <li
                key={field}
                className="py-2 text-muted-foreground first:pt-0 last:pb-0"
              >
                <span className="font-bold text-foreground">
                  {index + 1}. {t(`ecommerceAgent.${field}Label`)}
                </span>
                <span className="text-foreground/70">：</span>
                {t(`ecommerceAgent.${field}Example`)}
              </li>
            ))}
          </ol>
        </div>
      </ChatMessageBlock>
      <Dialog open={showGuideVideo} onOpenChange={setShowGuideVideo}>
        <DialogContent className="max-w-4xl p-4">
          <DialogHeader>
            <DialogTitle>
              {isChineseLanguage
                ? "电商详情页大师指导视频"
                : "E-Commerce Master Guide Video"}
            </DialogTitle>
            <DialogDescription>
              {isChineseLanguage
                ? "建议先看 1-2 分钟，快速了解电商详情页大师的填写方式与产出流程。"
                : "Watch for 1-2 minutes to quickly understand how to use the E-Commerce Master and its workflow."}
            </DialogDescription>
          </DialogHeader>
          <div className="w-full overflow-hidden rounded-md border">
            <video
              className="h-auto w-full"
              src={
                isChineseLanguage
                  ? ECOMMERCE_GUIDE_VIDEO_URL
                  : ECOMMERCE_GUIDE_VIDEO_URL_EN
              }
              controls
              autoPlay
              playsInline
              preload="metadata"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
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
  const getImageUrl = (url: string) => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    const base = STATIC_BASE_URL.replace(/\/$/, "");
    return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
  };

  return (
    <ChatMessageBlock
      avatar={agentIcon}
      avatarClassName={agentColor}
      title={t("agents.ecommerce")}
    >
      <div className="w-full space-y-3">
        <p className="text-sm text-muted-foreground">
          {t("ecommerceAgent.resultReady")}
        </p>
        <div className="grid w-full grid-cols-5 gap-1.5 border-brutal border-foreground p-1.5 bg-secondary/10">
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
        {cost ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>✅ {t("agentChat.generationComplete")}</span>
            <span className="font-bold text-accent-green">-{cost} pts</span>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
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
              confirmDisabled
                ? "opacity-50 cursor-not-allowed hover:brightness-100"
                : ""
            )}
          >
            <Check className="w-3 h-3" />
            {t("agentResponse.confirmBtn")}
          </button>
        </div>
      </div>
    </ChatMessageBlock>
  );
};

// ===== Ecommerce 9-Grid Preview Component =====
const EcommercePreviewGrid: React.FC<{
  previewImage: { url: string; local_path: string } | null;
  cost?: number;
  onRegenerate: () => void;
  onConfirm: () => void;
  onModify: () => void;
  onPreviewLoaded?: () => void;
  agentColor: string;
  agentIcon: React.ReactNode;
}> = ({
  previewImage,
  cost,
  onRegenerate,
  onConfirm,
  onModify,
  onPreviewLoaded,
  agentColor,
  agentIcon,
}) => {
  const { t } = useTranslation();
  const getImageUrl = (url: string) => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    const base = STATIC_BASE_URL.replace(/\/$/, "");
    return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
  };

  if (!previewImage) return null;

  return (
    <ChatMessageBlock
      avatar={agentIcon}
      avatarClassName={agentColor}
      title={t("agents.ecommerce")}
    >
      <div className="w-full space-y-3">
        <p className="text-sm text-muted-foreground">
          {t("ecommerceAgent.resultReady")}
        </p>
        <div className="w-full overflow-hidden border-brutal border-foreground bg-secondary/10 p-1.5">
          <a
            href={getImageUrl(previewImage.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <img
              src={getImageUrl(previewImage.url)}
              alt={t("ecommerceAgent.previewAlt", {
                defaultValue: "Ecommerce 9-grid preview",
              })}
              className="block max-h-[min(28rem,55vh)] w-full object-contain hover:brightness-110 transition-none"
              onLoad={onPreviewLoaded}
            />
          </a>
        </div>
        {typeof cost === "number" ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>✅ {t("agentChat.generationComplete")}</span>
            <span className="font-bold text-accent-green">-{cost} pts</span>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
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
    </ChatMessageBlock>
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
        <div
          key={idx}
          className="relative w-14 h-14 border border-foreground/20 overflow-hidden group"
        >
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
  className,
  agentStatus,
  agents,
  onImagesGenerated,
  selectedCanvasImage,
  selectedCanvasImages: _selectedCanvasImages,
  modeToggle,
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingMessageId, setDownloadingMessageId] = useState<
    string | null
  >(null);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  const [model, setModel] = useState(DEFAULT_DRAWING_MODEL);
  const [gptImageQuality, setGptImageQuality] = useState<GptImageQuality>("low");
  const [modelsConfig, setModelsConfig] = useState<ModelsConfigMap | null>(
    null
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pastedPreviews, setPastedPreviews] = useState<string[]>([]);
  const [pastedPaths, setPastedPaths] = useState<string[]>([]);
  /** 电商模式：产品参考图（粘贴/上传/画布），最多选 2 张；后端接口只需要其一的 ref_upload_id */
  const [productRefs, setProductRefs] = useState<
    { preview: string; uploadId: string }[]
  >([]);
  const [isUploadingPaste, setIsUploadingPaste] = useState(false);
  const [ecommerceBatchProgress, setEcommerceBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [lastUserContent, setLastUserContent] = useState("");
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesListRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEcommerceCtxRef = useRef<{
    refUploadId: string;
    prompt: string;
    phase1MessageId?: string;
  } | null>(null);
  const polling = useGenerationPolling();

  const isEcommerce = agentStatus === "ecommerce";
  const currentAgent = agents.find((a) => a.id === agentStatus) || agents[0];
  const currentModelConfig = useMemo(
    () => modelsConfig?.[model],
    [modelsConfig, model]
  );
  useEffect(() => {
    drawingApi
      .getModelsConfig()
      .then(setModelsConfig)
      .catch(() => {});
  }, []);

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
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
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
      setMessages((prev) => {
        const updated = [...prev];
        let lastAgentIdx = -1;
        for (let i = updated.length - 1; i >= 0; i--) {
          if (
            updated[i].role === "agent" &&
            updated[i].status === "generating"
          ) {
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
      setMessages((prev) => {
        const updated = [...prev];
        let lastAgentIdx = -1;
        for (let i = updated.length - 1; i >= 0; i--) {
          if (
            updated[i].role === "agent" &&
            updated[i].status === "generating"
          ) {
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
  }, [
    polling.status,
    polling.images,
    polling.error,
    isEcommerce,
    t,
    onImagesGenerated,
  ]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = messagesScrollRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom("auto");
    const frame = requestAnimationFrame(() => scrollToBottom("auto"));
    return () => cancelAnimationFrame(frame);
  }, [messages, scrollToBottom]);

  const hasEcommercePreview = useMemo(
    () =>
      messages.some(
        (m) =>
          m.isEcommercePreview &&
          m.status === "completed" &&
          (m.images?.length ?? 0) > 0
      ),
    [messages]
  );

  useEffect(() => {
    if (!hasEcommercePreview) return;
    const delays = [0, 80, 200, 500];
    const timers = delays.map((ms) =>
      window.setTimeout(() => scrollToBottom(ms === 0 ? "auto" : "smooth"), ms)
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [hasEcommercePreview, messages, scrollToBottom]);

  useEffect(() => {
    const listEl = messagesListRef.current;
    if (!listEl || !hasEcommercePreview) return;

    const observer = new ResizeObserver(() => {
      scrollToBottom("auto");
    });
    observer.observe(listEl);
    return () => observer.disconnect();
  }, [hasEcommercePreview, scrollToBottom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
  };

  const uploadProductFile = useCallback(
    async (file: File) => {
      setIsUploadingPaste(true);
      try {
        const preview = URL.createObjectURL(file);
        const res = await storageApi.uploadFile(file, "image");
        setProductRefs((prev) => {
          if (prev.length >= 2) return prev;
          return [...prev, { preview, uploadId: res.upload_id }];
        });
        toast.success(t("intelligenceHub.imagePasted"));
      } catch {
        toast.error(t("intelligenceHub.imageUploadFailed"));
      } finally {
        setIsUploadingPaste(false);
      }
    },
    [t]
  );

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
            toast.success(t("intelligenceHub.imagePasted"));
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
      const base = selectedCanvasImage.name?.trim() || "canvas";
      const safeName = base.replace(/[/\\?%*:|"<>]/g, "_");
      const fileName = safeName.includes(".") ? safeName : `${safeName}.png`;
      const blob = await fetchAssetBlob(selectedCanvasImage.src, fileName);
      const file = new File([blob], fileName, {
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
      userImages: isEcommerce
        ? productRefs.map((p) => p.preview)
        : [...pastedPreviews],
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
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
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, agentMessage]);

      const refUploadId = ecommerceRefUploadId!;
      lastEcommerceCtxRef.current = { refUploadId, prompt: userContent };
      setEcommerceBatchProgress(null);

      void (async () => {
        try {
          const sid = await ensureSession();

          // Phase 1: grid preview (type=1)
          const phase1Params: GenerateImageParams = {
            prompt: userContent,
            model,
            resolution: "1K",
            aspect_ratio: aspectRatio,
            negative_prompt: "",
            num_images: 1,
            provider:
              currentModelConfig?.provider ??
              (model.startsWith("gemini") ? "gemini" : "tengda"),
            optimize_prompt: true,
            ref_upload_id: refUploadId,
            strength: 0.7,
            type: 1,
          };
          if (model === "gpt-image-2") {
            phase1Params.quality = gptImageQuality;
          }
          const phase1Res = await drawingApi.generateImage(sid, phase1Params);

          toast.info(
            `${t("ecommerceAgent.phase1")} · ≈ ${phase1Res.estimated_cost} pts`
          );

          const phase1 = await pollMessageUntilTerminal(phase1Res.message_id);
          if (phase1.status !== "completed" || !phase1.images?.length) {
            throw new Error(
              phase1.error_msg || t("ecommerceAgent.phase1Failed")
            );
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
          const msg = getErrorMessage(err, t("agentChat.generationFailed"));

          setMessages((prev) =>
            prev.map((m) =>
              m.id === agentMessageId
                ? { ...m, status: "failed", content: msg }
                : m
            )
          );
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
        provider:
          currentModelConfig?.provider ??
          (model.startsWith("gemini") ? "gemini" : "tengda"),
        optimize_prompt: true,
      };

      if (model === "gpt-image-2") {
        params.quality = gptImageQuality;
      }

      if (
        uploadedPaths.length > 0 &&
        currentModelConfig?.supports_image_to_image !== false
      ) {
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
          sceneName:
            userContent.slice(0, 30) + (userContent.length > 30 ? "..." : ""),
          style: model,
          lighting: resolution,
          composition: aspectRatio,
          quality: `${res.estimated_cost} pts`,
        },
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, agentMessage]);
      polling.startPolling(res.message_id);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, t("agentChat.generationFailed"));
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: errorMsg,
        status: "failed",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
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
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setIsGenerating(true);
    setMessages((prev) => [...prev, agentMessage]);
    setEcommerceBatchProgress(null);

    void (async () => {
      try {
        const sid = await ensureSession();

        const phase1Params: GenerateImageParams = {
          prompt: ctx.prompt,
          model,
          resolution: "1K",
          aspect_ratio: aspectRatio,
          negative_prompt: "",
          num_images: 1,
          provider:
            currentModelConfig?.provider ??
            (model.startsWith("gemini") ? "gemini" : "tengda"),
          optimize_prompt: true,
          ref_upload_id: ctx.refUploadId,
          strength: 0.7,
          type: 1,
        };
        if (model === "gpt-image-2") {
          phase1Params.quality = gptImageQuality;
        }
        const phase1Res = await drawingApi.generateImage(sid, phase1Params);

        toast.info(
          `${t("ecommerceAgent.phase1")} · ≈ ${phase1Res.estimated_cost} pts`
        );

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
        const msg = getErrorMessage(err, t("agentChat.generationFailed"));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMessageId
              ? { ...m, status: "failed", content: msg }
              : m
          )
        );
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
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, hintMessage]);
    }
  };

  const handleEcommerceConfirm = (
    images: { url: string; local_path: string }[]
  ) => {
    onImagesGenerated?.(images);
    toast.success(t("ecommerceAgent.confirmed"));
  };

  const handleEcommerceConfirmPreview = async (targetMessage: Message) => {
    const refUploadId =
      targetMessage.ecommerceRefUploadId ||
      lastEcommerceCtxRef.current?.refUploadId;
    const phase1MessageId =
      targetMessage.phase1MessageId ||
      lastEcommerceCtxRef.current?.phase1MessageId;
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

      const batchParams: GenerateBatchParams = {
        assistant_message_id: phase1MessageId,
        ref_upload_id: refUploadId,
        model,
        resolution: "1K",
        aspect_ratio: aspectRatio,
        negative_prompt: "",
        strength: 0.7,
        provider:
          currentModelConfig?.provider ??
          (model.startsWith("gemini") ? "gemini" : "tengda"),
      };
      if (model === "gpt-image-2") {
        batchParams.quality = gptImageQuality;
      }
      const batchData = await drawingApi.generateBatch(sid, batchParams);

      toast.info(
        `${t("ecommerceAgent.phase2")} · ≈ ${
          batchData.total_estimated_cost ?? "?"
        } pts`
      );

      const ids = batchData.messages.map((m) => m.message_id);
      let totalCost = targetMessage.cost ?? 0;
      const generatedBatchImages: { url: string; local_path: string }[] = [];

      for (let i = 0; i < ids.length; i++) {
        setEcommerceBatchProgress({ current: i + 1, total: ids.length });
        const r = await pollMessageUntilTerminal(ids[i]);
        if (r.status !== "completed") {
          throw new Error(
            r.error_msg || `${t("ecommerceAgent.panelFailed")} ${i + 1}`
          );
        }
        totalCost += r.actual_cost ?? 0;
        const img = r.images?.[0];
        if (img) {
          generatedBatchImages.push(img);
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
                images: generatedBatchImages,
                ecommercePhase: undefined,
                content: t("ecommerceAgent.finalReady"),
              }
            : m
        )
      );
      toast.success(t("ecommerceAgent.finalReady"));
    } catch (err: unknown) {
      setEcommerceBatchProgress(null);
      const msg = getErrorMessage(err, t("agentChat.generationFailed"));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMessageId ? { ...m, status: "failed", content: msg } : m
        )
      );
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;
    let userMessageIndex = messageIndex - 1;
    while (
      userMessageIndex >= 0 &&
      messages[userMessageIndex].role !== "user"
    ) {
      userMessageIndex--;
    }
    if (userMessageIndex < 0) return;
    setInputValue(messages[userMessageIndex].content);
  };

  const handleModify = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message?.config) {
      setInputValue(message.config.sceneName);
    }
  };

  const handleConfirm = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message?.config) {
      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: "agent",
        content: t("agentChat.configConfirmed", {
          name: message.config.sceneName,
        }),
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, confirmMessage]);
    }
  };

  const handleViewDetails = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message?.config) {
      const detailsMessage: Message = {
        id: Date.now().toString(),
        role: "agent",
        content: `📋 ${t("agentResponse.sceneName")}: ${
          message.config.sceneName
        }\n🎨 ${t("agentResponse.style")}: ${message.config.style}\n💡 ${t(
          "agentResponse.lighting"
        )}: ${message.config.lighting}\n📐 ${message.config.composition}\n⚡ ${
          message.config.quality
        }`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, detailsMessage]);
    }
  };

  const getImageUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    return `${STATIC_BASE_URL}${url}`;
  };

  const handleDownloadEcommerceImages = async (
    images: { url: string; local_path: string }[],
    messageId: string
  ) => {
    if (!images.length || downloadingMessageId) return;
    setDownloadingMessageId(messageId);
    try {
      const urls = images.map((img) => img.local_path || img.url);
      const blob = await downloadZip(urls, "ecommerce_images");
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `ecommerce_images_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success(
        t("ecommerceAgent.downloadAllDone", { count: images.length })
      );
    } catch {
      toast.error(t("assetSidebar.downloadFailed"));
    } finally {
      setDownloadingMessageId(null);
    }
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
    return currentModelConfig.supported_aspect_ratios.map((ar) => ({
      value: ar.value,
      label: ar.value,
    }));
  }, [currentModelConfig, DEFAULT_ASPECT_RATIOS]);

  const resolutionOptions: DropdownOption[] = useMemo(() => {
    if (!currentModelConfig) return DEFAULT_RESOLUTIONS;
    return currentModelConfig.supported_resolutions.map((r) => ({
      value: r.value,
      label: r.value,
    }));
  }, [currentModelConfig, DEFAULT_RESOLUTIONS]);

  const modelOptions: DropdownOption[] = useMemo(() => {
    if (!modelsConfig) return [{ value: model, label: model }];
    return Object.entries(modelsConfig).map(([id, cfg]) => ({
      value: id,
      label: cfg.name.replace(/\s*\(Tengda\)/i, "").trim() || cfg.name,
      icon: drawingModelOptionIcon(id, cfg.name, cfg.provider),
    }));
  }, [modelsConfig, model]);

  const isGptImage2 = model === "gpt-image-2";

  const canSend = isEcommerce
    ? Boolean(
        inputValue.trim() &&
          productRefs.length > 0 &&
          !isGenerating &&
          !isUploadingPaste
      )
    : Boolean(inputValue.trim() && !isGenerating);

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}
    >
      <div
        ref={messagesScrollRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto p-4",
          messages.length === 0 && "flex flex-col justify-center"
        )}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-6 text-center shrink-0">
            <div
              className={cn(
                "mb-3 flex h-10 w-10 items-center justify-center border-brutal border-foreground shrink-0",
                currentAgent.color
              )}
            >
              {currentAgent.icon}
            </div>
            <h3 className="mb-1.5 text-sm font-bold uppercase tracking-[0.15em]">
              {t("agentChat.agentReady", { name: currentAgent.name })}
            </h3>
            <p className="max-w-[248px] text-xs leading-relaxed text-muted-foreground">
              {t("agentChat.agentReadyDesc")}
            </p>
          </div>
        ) : (
          <div ref={messagesListRef} className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className="animate-fade-in">
                {/* Welcome message for ecommerce */}
                {message.isWelcome && isEcommerce ? (
                  <EcommerceWelcome
                    agentColor={currentAgent.color}
                    agentIcon={currentAgent.icon}
                  />
                ) : message.role === "user" ? (
                  <ChatMessageBlock
                    avatar={<User className="h-4 w-4" />}
                    avatarClassName="bg-accent-yellow"
                    title={t("agentChat.you")}
                    timestamp={message.timestamp}
                  >
                    {message.userImages && message.userImages.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {message.userImages.map((src, idx) => (
                          <div
                            key={idx}
                            className="h-16 w-16 overflow-hidden border border-foreground/20"
                          >
                            <img
                              src={src}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <p
                      className={cn(
                        CHAT_MESSAGE_CARD,
                        "whitespace-pre-wrap text-foreground"
                      )}
                    >
                      {message.content}
                    </p>
                  </ChatMessageBlock>
                ) : message.isFinalResult && message.status === "generating" ? (
                  <ChatMessageBlock
                    avatar={currentAgent.icon}
                    avatarClassName={currentAgent.color}
                    title={t("agents.ecommerce")}
                  >
                    <div className="w-full space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{message.content}</span>
                      </div>
                      <div className="h-64 w-full animate-pulse rounded border border-foreground/10 bg-secondary/20" />
                    </div>
                  </ChatMessageBlock>
                ) : message.isFinalResult &&
                  message.status === "completed" &&
                  message.images ? (
                  <ChatMessageBlock
                    avatar={currentAgent.icon}
                    avatarClassName={currentAgent.color}
                    title={t("agents.ecommerce")}
                  >
                    <div className="w-full space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {message.content}
                      </p>
                      <div className="w-full overflow-hidden border-brutal border-foreground bg-secondary/10 p-1.5">
                        <a
                          href={
                            message.images[0].url.startsWith("http")
                              ? message.images[0].url
                              : `${STATIC_BASE_URL}${message.images[0].url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={
                              message.images[0].url.startsWith("http")
                                ? message.images[0].url
                                : `${STATIC_BASE_URL}${message.images[0].url}`
                            }
                            alt={t("ecommerceAgent.finalDetailAlt", {
                              defaultValue: "Final detail page",
                            })}
                            className="block max-h-[28rem] w-full object-contain hover:brightness-110 transition-none"
                          />
                        </a>
                      </div>
                      {message.cost ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>✅ {t("agentChat.generationComplete")}</span>
                          <span className="font-bold text-accent-green">
                            -{message.cost} pts
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </ChatMessageBlock>
                ) : message.isEcommercePreview &&
                  message.status === "completed" &&
                  message.images ? (
                  <EcommercePreviewGrid
                    previewImage={message.images[0] ?? null}
                    cost={message.cost}
                    onRegenerate={handleEcommerceRegeneratePreview}
                    onConfirm={() => handleEcommerceConfirmPreview(message)}
                    onModify={handleEcommerceModify}
                    onPreviewLoaded={() => scrollToBottom("smooth")}
                    agentColor={currentAgent.color}
                    agentIcon={currentAgent.icon}
                  />
                ) : message.isEcommerceFinalAdded &&
                  message.status === "completed" ? (
                  <ChatMessageBlock
                    avatar={currentAgent.icon}
                    avatarClassName={currentAgent.color}
                    title={t("agents.ecommerce")}
                    timestamp={message.timestamp}
                  >
                    <p
                      className={cn(
                        CHAT_MESSAGE_CARD,
                        "mb-3 whitespace-pre-wrap text-foreground"
                      )}
                    >
                      {message.content}
                    </p>
                    <button
                      onClick={() =>
                        handleDownloadEcommerceImages(
                          message.images ?? [],
                          message.message_id
                        )
                      }
                      disabled={
                        !message.images ||
                        message.images.length === 0 ||
                        downloadingMessageId === message.message_id
                      }
                      className="flex items-center gap-1.5 border-brutal border-foreground bg-accent-cyan px-3 py-2 text-xs font-bold hover:brightness-110 brutal-press disabled:opacity-50"
                    >
                      {downloadingMessageId === message.message_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      {downloadingMessageId === message.message_id
                        ? t("ecommerceAgent.downloading", {
                            defaultValue: "Downloading...",
                          })
                        : t("ecommerceAgent.downloadAll")}
                    </button>
                  </ChatMessageBlock>
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
                            {message.cost && (
                              <span className="text-accent-cyan">
                                ≈ {message.cost} pts
                              </span>
                            )}
                          </div>
                        )}
                        {message.status === "completed" &&
                          message.images &&
                          message.images.length > 0 && (
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
                                  <span>
                                    ✅ {t("agentChat.generationComplete")}
                                  </span>
                                  <span className="text-accent-green font-bold">
                                    -{message.cost} pts
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                      </>
                    ) : (
                      <ChatMessageBlock
                        avatar={currentAgent.icon}
                        avatarClassName={
                          message.status === "failed"
                            ? "bg-accent-red"
                            : currentAgent.color
                        }
                        title={
                          isEcommerce
                            ? currentAgent.name
                            : `${currentAgent.name.toUpperCase()}_AGENT`
                        }
                        timestamp={message.timestamp}
                      >
                        {isEcommerce && message.status === "generating" ? (
                          <div className={cn(CHAT_MESSAGE_CARD, "space-y-3")}>
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-accent-orange" />
                              <span className="font-bold">
                                {t("ecommerceAgent.generatingDetail")}
                              </span>
                            </div>
                            {ecommerceBatchProgress ? (
                              <p className="font-mono text-xs text-muted-foreground">
                                {t("ecommerceAgent.batchProgress", {
                                  current: ecommerceBatchProgress.current,
                                  total: ecommerceBatchProgress.total,
                                })}
                              </p>
                            ) : null}
                            {(() => {
                              const phase = message.ecommercePhase;
                              const skeletonCount = phase === "phase1" ? 1 : 10;
                              return (
                                <div
                                  className={cn(
                                    "w-full gap-1.5",
                                    phase === "phase1"
                                      ? "grid grid-cols-1"
                                      : "grid grid-cols-5"
                                  )}
                                >
                                  {Array.from({ length: skeletonCount }).map(
                                    (_, i) => (
                                      <div
                                        key={i}
                                        className="aspect-square animate-pulse border border-foreground/10 bg-foreground/5"
                                      />
                                    )
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <p
                            className={cn(
                              CHAT_MESSAGE_CARD,
                              "whitespace-pre-wrap text-foreground"
                            )}
                          >
                            {message.content}
                          </p>
                        )}
                      </ChatMessageBlock>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isGenerating &&
              !messages.some((m) => m.status === "generating") && (
                <ChatMessageBlock
                  avatar={currentAgent.icon}
                  avatarClassName={cn(currentAgent.color, "animate-pulse")}
                  title={
                    isEcommerce
                      ? currentAgent.name
                      : `${currentAgent.name.toUpperCase()}_AGENT`
                  }
                >
                  <div className={cn(CHAT_MESSAGE_CARD, "flex gap-1")}>
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-foreground/50"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-foreground/50"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-foreground/50"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </ChatMessageBlock>
              )}
            <div ref={messagesEndRef} className="h-2 shrink-0" aria-hidden />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t-brutal border-foreground bg-card p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleProductFilePick}
        />
        {/* 电商：产品参考图（上传 / 粘贴 / 画布） */}
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
                disabled={
                  isUploadingPaste ||
                  isGenerating ||
                  !selectedCanvasImage ||
                  selectedCanvasImage.type === "video"
                }
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

        <div className="mb-2 flex flex-col overflow-hidden border-brutal border-foreground bg-background">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              !e.shiftKey &&
              (e.preventDefault(), handleSend())
            }
            placeholder={
              isEcommerce
                ? t("ecommerceAgent.inputPlaceholder")
                : t("agentChat.inputPlaceholder")
            }
            className="w-full min-h-[112px] h-[112px] resize-none font-mono text-sm px-3 pt-3 pb-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-cyan/60 sm:min-h-[128px] sm:h-[128px] md:min-h-[140px] md:h-[140px]"
          />
          <div className="flex shrink-0 items-center gap-1.5 border-t border-foreground/10 bg-secondary/20 px-2 py-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              {modeToggle}
              <ImageGenerationParams
                aspectRatio={aspectRatio}
                resolution={resolution}
                model={model}
                isGptImage2={isGptImage2}
                gptImageQuality={gptImageQuality}
                onGptImageQualityChange={setGptImageQuality}
                aspectRatioOptions={aspectRatioOptions}
                resolutionOptions={resolutionOptions}
                modelOptions={modelOptions}
                onAspectRatioChange={setAspectRatio}
                onResolutionChange={setResolution}
                onModelChange={setModel}
              />
              {isEcommerce && productRefs.length > 0 && (
                <span
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[10px] font-mono text-accent-orange"
                  title={t("ecommerceAgent.uploadProduct")}
                >
                  <ImageIcon className="h-3 w-3" />
                  {productRefs.length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md px-2.5 text-[10px] font-bold uppercase transition-colors",
                !canSend
                  ? "bg-foreground/10 text-muted-foreground cursor-not-allowed"
                  : "bg-accent-cyan text-foreground hover:brightness-110 brutal-press"
              )}
              title={t("canvas.generate")}
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{t("canvas.generate")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AgentChatArea, type StatusType };
