import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  Contact,
  CreditCard,
  Facebook,
  Film,
  Image as ImageIcon,
  Images,
  Instagram,
  LayoutGrid,
  Linkedin,
  Loader2,
  Mail,
  Megaphone,
  Newspaper,
  Palette,
  Paperclip,
  Presentation,
  RectangleHorizontal,
  RectangleVertical,
  Send,
  Smartphone,
  Smile,
  Sparkles,
  Square,
  Wrench,
  X,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import drawingApi from "@/api/drawing";
import { getVideoModels } from "@/api/video";
import agentsApi from "@/api/agents";
import storageApi from "@/api/storage";
import { STATIC_BASE_URL } from "@/api/request";
import { listAiDesignTools, type AiDesignTool } from "@/api/prompts";
import { DEFAULT_DRAWING_MODEL, type ModelsConfigMap } from "@/types/drawing";
import type { VideoModelConfig, VideoResolution } from "@/types/video";
import type { AgentSkill } from "@/types/agents";
import {
  defaultDurationOptions,
  mergeDurationOptionsFromApi,
  normalizeVideoRatio,
  pickDurationInOptions,
  resolveResolutionList,
} from "@/lib/videoModelUtils";
import type {
  LandingMode,
  PendingRequest,
  UploadedRef,
} from "@/lib/landingRequest";
import type { GptImageQuality } from "./ImageGenerationParams";
import { UserMenuDock } from "@/components/layout/UserMenuDock";
import { drawingModelOptionIcon } from "@/components/icons/DrawingModelIcon";
import { type DropdownOption } from "@/components/ui/brutal-dropdown";

const DEFAULT_ASPECT_RATIOS: DropdownOption[] = [
  { value: "1:1", label: "1:1", icon: <Square className="w-3 h-3" /> },
  {
    value: "16:9",
    label: "16:9",
    icon: <RectangleHorizontal className="w-3 h-3" />,
  },
  {
    value: "9:16",
    label: "9:16",
    icon: <RectangleVertical className="w-3 h-3" />,
  },
];

const DEFAULT_RESOLUTIONS: DropdownOption[] = [
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" },
];

const GPT_QUALITY_OPTIONS: DropdownOption[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const toOptions = (values: string[]): DropdownOption[] =>
  values.map((v) => ({ value: v, label: v }));

/* ============== 提示词库：分类 + icon（对齐 useneospark.com/ai-design-tools） ============== */

type CategoryId =
  | "all"
  | "social-media"
  | "digital-marketing"
  | "business-print"
  | "stationery"
  | "creative"
  | "other";

interface ToolCategoryMeta {
  id: CategoryId;
  labelKey: string;
  icon: LucideIcon;
  accent: string;
}

/** 官方 5 大分类（顺序与参考页一致） */
const TOOL_CATEGORIES: ToolCategoryMeta[] = [
  { id: "social-media", labelKey: "landing.catSocialMedia", icon: Smartphone, accent: "bg-accent-yellow" },
  { id: "digital-marketing", labelKey: "landing.catDigitalMarketing", icon: Megaphone, accent: "bg-accent-cyan" },
  { id: "business-print", labelKey: "landing.catBusinessPrint", icon: Briefcase, accent: "bg-accent-green" },
  { id: "stationery", labelKey: "landing.catStationery", icon: Newspaper, accent: "bg-accent-purple" },
  { id: "creative", labelKey: "landing.catCreative", icon: Palette, accent: "bg-accent-orange" },
];

const getToolCategory = (title: string): CategoryId => {
  const s = title.toLowerCase();
  if (/character|cartoon|action figure/.test(s)) return "creative";
  if (/facebook|instagram|linkedin|youtube|social/.test(s)) return "social-media";
  if (/resume|booklet|case study|financial|flyer/.test(s)) return "business-print";
  if (/postcard|brochure|calendar|business card|id card|letterhead/.test(s))
    return "stationery";
  if (/poster|ebook|invitation|newsletter|advertis/.test(s))
    return "digital-marketing";
  return "other";
};

const getCategoryMeta = (id: CategoryId): ToolCategoryMeta | undefined =>
  TOOL_CATEGORIES.find((c) => c.id === id);

/** 工具 icon：按关键词给具体 icon（社媒品牌 icon 优先），兜底用所属分类的 icon。 */
const TOOL_ICON_RULES: [RegExp, LucideIcon][] = [
  [/facebook/i, Facebook],
  [/instagram/i, Instagram],
  [/linkedin/i, Linkedin],
  [/newsletter|mail/i, Mail],
  [/character|cartoon|action figure/i, Smile],
  [/business card|id card/i, Contact],
  [/letterhead|booklet|ebook|brochure/i, BookOpen],
  [/case study|financial|report|resume/i, BarChart3],
  [/calendar|event|invitation/i, CalendarDays],
  [/poster|flyer|advertis|postcard/i, Presentation],
];

const getToolIcon = (title: string): LucideIcon => {
  for (const [re, icon] of TOOL_ICON_RULES) {
    if (re.test(title)) return icon;
  }
  return getCategoryMeta(getToolCategory(title))?.icon ?? Sparkles;
};

/** 社媒品牌 icon + 官方品牌色（对齐参考页:Facebook 蓝 / Instagram 粉 / LinkedIn 蓝 / YouTube 红）。 */
const BRAND_ICON_RULES: [RegExp, LucideIcon, string][] = [
  [/facebook/i, Facebook, "#1877F2"],
  [/instagram/i, Instagram, "#E4405F"],
  [/linkedin/i, Linkedin, "#0A66C2"],
  [/youtube/i, Youtube, "#FF0000"],
];

const getBrandIcon = (
  title: string
): { icon: LucideIcon; color: string } | null => {
  for (const [re, icon, color] of BRAND_ICON_RULES) {
    if (re.test(title)) return { icon, color };
  }
  return null;
};

/** 分类强调色（hex,与 index.css 的 accent 一致,用于 icon glyph 着色）。 */
const CATEGORY_COLOR: Record<CategoryId, string> = {
  all: "#000000",
  "social-media": "#EAB308",
  "digital-marketing": "#00CED1",
  "business-print": "#22C55E",
  stationery: "#8B5CF6",
  creative: "#FF6B35",
  other: "#6B7280",
};

/** 工具 icon 的颜色:社媒品牌用品牌色,其余用所属分类的强调色。 */
const getToolIconColor = (title: string): string => {
  const brand = getBrandIcon(title);
  if (brand) return brand.color;
  return CATEGORY_COLOR[getToolCategory(title)];
};

/**
 * 打字机效果 hook:逐字打出 texts[textIndex],停顿后逐字删除,再切到下一条,循环。
 * 与聚焦无关(一直运行);由调用方决定何时隐藏(有输入时不渲染)。
 */
function useTypewriter(
  texts: string[],
  typingSpeed = 55,
  deletingSpeed = 22,
  pauseMs = 1700
): string {
  const [textIndex, setTextIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [deleting, setDeleting] = useState(false);

  // texts 变化(切换模式/语言)时重置
  useEffect(() => {
    setTextIndex(0);
    setLength(0);
    setDeleting(false);
  }, [texts]);

  useEffect(() => {
    if (!texts.length) return;
    const current = texts[textIndex % texts.length] ?? "";
    let timer: number;

    if (!deleting && length < current.length) {
      timer = window.setTimeout(() => setLength((v) => v + 1), typingSpeed);
    } else if (!deleting && length === current.length) {
      timer = window.setTimeout(() => setDeleting(true), pauseMs);
    } else if (deleting && length > 0) {
      timer = window.setTimeout(() => setLength((v) => v - 1), deletingSpeed);
    } else if (deleting && length === 0) {
      setDeleting(false);
      setTextIndex((v) => (v + 1) % texts.length);
    }
    return () => window.clearTimeout(timer);
  }, [texts, textIndex, length, deleting, typingSpeed, deletingSpeed, pauseMs]);

  const current = texts[textIndex % texts.length] ?? "";
  return current.substring(0, length);
}

/** 拉丁字符走 JetBrains Mono（项目 brutalist 风格），中文回落到清晰黑体，避免宋体衬线。 */
const LANDING_FONT_STACK =
  "'JetBrains Mono','PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif";

/** 相对路径补全为可访问的完整 URL。 */
const toStorageUrl = (u: string) =>
  u.startsWith("http") ? u : `${STATIC_BASE_URL}${u}`;

/** 过渡页已上传的素材（缩略展示用）。 */
interface UploadedMedia extends UploadedRef {
  id: string;
  type: "image" | "video";
}

/** 各模式强调色（激活 chip / 生成按钮 / 图标） */
const MODE_META: Record<
  LandingMode,
  { active: string; btn: string; iconColor: string }
> = {
  IMAGE: {
    active: "bg-accent-cyan text-foreground",
    btn: "bg-accent-cyan text-foreground",
    iconColor: "text-accent-cyan",
  },
  VIDEO: {
    active: "bg-accent-purple text-card",
    btn: "bg-accent-purple text-card",
    iconColor: "text-accent-purple",
  },
  AGENT: {
    active: "bg-accent-pink text-foreground",
    btn: "bg-accent-pink text-foreground",
    iconColor: "text-accent-pink",
  },
};

/**
 * 聊天优先过渡页：纯"采集"层（不发起任何生成请求）。
 * 布局：左侧竖排图标导航 + 居中单列（品牌 / 标题 / 白色输入卡 / 卡下模式 chips / 提示词库）。
 * 风格：项目 Neo-Brutalism（奶油点阵底 / 白卡 / 黑边 / 硬阴影 / 等宽字体 / accent 配色）。
 */
export const LandingComposer: React.FC<{
  onSubmit: (req: PendingRequest) => void;
  onSkipToCanvas?: () => void;
}> = ({ onSubmit, onSkipToCanvas }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<LandingMode>("IMAGE");
  const [promptValue, setPromptValue] = useState("");
  const [isPromptFocused, setIsPromptFocused] = useState(false);

  // ---- 上传素材 ----
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 上传文件（可多选,图片/视频）
  const handleUploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setIsUploading(true);
      try {
        for (const file of Array.from(files)) {
          const type: "image" | "video" = file.type.startsWith("video")
            ? "video"
            : "image";
          try {
            const res = await storageApi.uploadFile(file, type);
            const path = res.path || res.url || "";
            const url = toStorageUrl(res.url || res.path || "");
            setUploadedMedia((prev) => [
              ...prev,
              {
                id: Math.random().toString(36).slice(2, 10),
                url,
                path,
                name: res.filename || file.name,
                type,
              },
            ]);
          } catch {
            toast.error(
              t("workspace.uploadFailedWithName", { name: file.name })
            );
          }
        }
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [t]
  );

  const removeUploadedMedia = useCallback((id: string) => {
    setUploadedMedia((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // ---- 图片参数 ----
  const [modelsConfig, setModelsConfig] = useState<ModelsConfigMap | null>(null);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  const [model, setModel] = useState(DEFAULT_DRAWING_MODEL);
  const [gptImageQuality, setGptImageQuality] = useState<GptImageQuality>("low");
  const [imageConfigLoaded, setImageConfigLoaded] = useState(false);

  // ---- 视频参数 ----
  const [videoModel, setVideoModel] = useState("seedance-2.0");
  const [videoRatio, setVideoRatio] = useState("16:9");
  const [videoDuration, setVideoDuration] = useState("5");
  const [videoResolution, setVideoResolution] = useState<VideoResolution>("720p");
  const [videoModelOptions, setVideoModelOptions] = useState<VideoModelConfig[]>([]);
  const [videoRatioOptions, setVideoRatioOptions] = useState<string[]>([
    "16:9",
    "9:16",
    "1:1",
  ]);
  const [videoDurationOptions, setVideoDurationOptions] = useState<string[]>(
    defaultDurationOptions()
  );
  const [videoResolutionOptions, setVideoResolutionOptions] = useState<string[]>([
    "720p",
    "1080p",
  ]);
  const [videoConfigLoaded, setVideoConfigLoaded] = useState(false);

  // ---- Agent 技能 ----
  const [availableSkills, setAvailableSkills] = useState<AgentSkill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [skillsLoaded, setSkillsLoaded] = useState(false);

  // ---- 提示词库 ----
  const [tools, setTools] = useState<AiDesignTool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<CategoryId>("social-media");

  // 图片配置：默认模式，挂载即加载一次
  useEffect(() => {
    if (mode !== "IMAGE" || imageConfigLoaded) return;
    drawingApi
      .getModelsConfig()
      .then((cfg) => {
        setModelsConfig(cfg);
        setImageConfigLoaded(true);
      })
      .catch(() => {});
  }, [mode, imageConfigLoaded]);

  const currentModelConfig = useMemo(
    () => modelsConfig?.[model],
    [modelsConfig, model]
  );
  const isGptImage2 = model === "gpt-image-2";

  // 图片参数自愈（非法值回退到模型支持的首项）
  useEffect(() => {
    if (!modelsConfig) return;
    const modelIds = Object.keys(modelsConfig);
    if (!modelIds.length) return;
    if (!modelsConfig[model]) {
      const fallbackId = modelsConfig[DEFAULT_DRAWING_MODEL]
        ? DEFAULT_DRAWING_MODEL
        : modelIds[0];
      const fallback = modelsConfig[fallbackId];
      setModel(fallbackId);
      setResolution(fallback.supported_resolutions[0]?.value ?? "1K");
      setAspectRatio(fallback.supported_aspect_ratios[0]?.value ?? "1:1");
    }
  }, [modelsConfig, model]);

  useEffect(() => {
    if (!currentModelConfig) return;
    if (
      !currentModelConfig.supported_resolutions.some((r) => r.value === resolution)
    ) {
      setResolution(currentModelConfig.supported_resolutions[0]?.value ?? "1K");
    }
    if (
      !currentModelConfig.supported_aspect_ratios.some(
        (ar) => ar.value === aspectRatio
      )
    ) {
      setAspectRatio(
        currentModelConfig.supported_aspect_ratios[0]?.value ?? "1:1"
      );
    }
  }, [currentModelConfig, resolution, aspectRatio]);

  const aspectRatioOptions: DropdownOption[] = useMemo(() => {
    if (!currentModelConfig) return DEFAULT_ASPECT_RATIOS;
    return currentModelConfig.supported_aspect_ratios.map((ar) => ({
      value: ar.value,
      label: ar.value,
    }));
  }, [currentModelConfig]);

  const resolutionOptions: DropdownOption[] = useMemo(() => {
    if (!currentModelConfig) return DEFAULT_RESOLUTIONS;
    return currentModelConfig.supported_resolutions.map((r) => ({
      value: r.value,
      label: r.value,
    }));
  }, [currentModelConfig]);

  const modelOptions: DropdownOption[] = useMemo(() => {
    if (!modelsConfig) {
      return [{ value: model, label: model, icon: drawingModelOptionIcon(model) }];
    }
    return Object.entries(modelsConfig).map(([id, cfg]) => ({
      value: id,
      label: cfg.name.replace(/\s*\(Tengda\)/i, "").trim() || cfg.name,
      icon: drawingModelOptionIcon(id, cfg.name, cfg.provider),
    }));
  }, [modelsConfig, model]);

  // 视频模型 → 下拉选项
  const videoModelSelectOptions: DropdownOption[] = useMemo(
    () =>
      videoModelOptions.map((m) => ({
        value: m.id,
        label: m.name || m.id,
      })),
    [videoModelOptions]
  );

  // 视频配置：切到 VIDEO 时加载一次
  useEffect(() => {
    if (mode !== "VIDEO" || videoConfigLoaded) return;
    getVideoModels()
      .then((res) => {
        setVideoModelOptions(res.models ?? []);
        if (res.models?.length) {
          setVideoModel((prev) =>
            res.models.some((m) => m.id === prev) ? prev : res.models[0].id
          );
        }
        if (res.ratios?.length) {
          const ratios = res.ratios.map(normalizeVideoRatio);
          setVideoRatioOptions(ratios);
          setVideoRatio((prev) =>
            ratios.includes(normalizeVideoRatio(prev))
              ? normalizeVideoRatio(prev)
              : ratios[0]
          );
        }
        const durOpts = mergeDurationOptionsFromApi(res.durations);
        setVideoDurationOptions(durOpts);
        setVideoDuration((prev) => pickDurationInOptions(prev, durOpts));
        const resList = resolveResolutionList(res.resolutions);
        if (resList.length) {
          setVideoResolutionOptions(resList);
          setVideoResolution((prev) =>
            resList.includes(prev) ? prev : (resList[0] as VideoResolution)
          );
        }
        setVideoConfigLoaded(true);
      })
      .catch(() => {});
  }, [mode, videoConfigLoaded]);

  // Agent 技能：切到 AGENT 时加载一次
  useEffect(() => {
    if (mode !== "AGENT" || skillsLoaded) return;
    setIsLoadingSkills(true);
    agentsApi
      .listSkills()
      .then((skills) => {
        setAvailableSkills(skills);
        setSkillsLoaded(true);
      })
      .catch(() => {})
      .finally(() => setIsLoadingSkills(false));
  }, [mode, skillsLoaded]);

  // 提示词库：挂载加载一次
  useEffect(() => {
    setLoadingTools(true);
    listAiDesignTools()
      .then((res) => setTools(res.items))
      .catch(() => {})
      .finally(() => setLoadingTools(false));
  }, []);

  const toggleSkill = useCallback((id: string) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  // 各分类的工具数量（含 all）
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryId, number> = {
      all: tools.length,
      "social-media": 0,
      "digital-marketing": 0,
      "business-print": 0,
      stationery: 0,
      creative: 0,
      other: 0,
    };
    tools.forEach((tool) => {
      counts[getToolCategory(tool.title)] += 1;
    });
    return counts;
  }, [tools]);

  // 有工具的分类（用于渲染 chip；all 始终显示）
  const presentCategories = useMemo(
    () => TOOL_CATEGORIES.filter((c) => categoryCounts[c.id] > 0),
    [categoryCounts]
  );

  // 当前要展示的分类 section 列表（all = 全部分组，单选 = 仅该组）
  const visibleCategories = useMemo(
    () =>
      activeCategory === "all"
        ? presentCategories
        : presentCategories.filter((c) => c.id === activeCategory),
    [activeCategory, presentCategories]
  );

  // 数据加载完成后,当前分类若无工具则回退到 all
  useEffect(() => {
    if (tools.length === 0) return;
    if (activeCategory !== "all" && categoryCounts[activeCategory] === 0) {
      setActiveCategory("all");
    }
  }, [tools.length, activeCategory, categoryCounts]);

  // 仅采集，不发起任何生成请求
  const handleSubmit = useCallback(() => {
    const prompt = promptValue.trim();
    if (!prompt) {
      toast.error(t("landing.promptRequired"));
      return;
    }
    const nonce = Date.now();
    const imageRefs = uploadedMedia
      .filter((m) => m.type === "image")
      .map((m) => ({ url: m.url, path: m.path, name: m.name }));
    const videoRefs = uploadedMedia
      .filter((m) => m.type === "video")
      .map((m) => ({ url: m.url, path: m.path, name: m.name }));
    if (mode === "IMAGE") {
      onSubmit({
        mode: "IMAGE",
        nonce,
        seed: {
          prompt,
          model,
          aspectRatio,
          resolution,
          gptImageQuality,
          ...(imageRefs.length ? { refImages: imageRefs } : {}),
        },
      });
    } else if (mode === "VIDEO") {
      onSubmit({
        mode: "VIDEO",
        nonce,
        seed: {
          prompt,
          model: videoModel,
          ratio: videoRatio,
          duration: videoDuration,
          resolution: videoResolution,
          ...(imageRefs.length ? { refImages: imageRefs } : {}),
          ...(videoRefs.length ? { refVideos: videoRefs } : {}),
        },
      });
    } else {
      onSubmit({ mode: "AGENT", nonce, seed: { prompt, skills: selectedSkills } });
    }
  }, [
    promptValue,
    mode,
    model,
    aspectRatio,
    resolution,
    gptImageQuality,
    videoModel,
    videoRatio,
    videoDuration,
    videoResolution,
    selectedSkills,
    uploadedMedia,
    onSubmit,
    t,
  ]);

  const placeholder =
    mode === "IMAGE"
      ? t("intelligenceHub.inputPlaceholder")
      : mode === "VIDEO"
      ? t("video.promptPlaceholder")
      : t("agentHub.inputPlaceholder");

  const modeMeta = MODE_META[mode];

  // 打字机 placeholder 的提示词（按模式）,memo 以稳定引用避免每帧重置
  const typePrompts = useMemo(() => {
    const key =
      mode === "IMAGE"
        ? "landing.typeImage"
        : mode === "VIDEO"
        ? "landing.typeVideo"
        : "landing.typeAgent";
    const arr = t(key, { returnObjects: true }) as unknown;
    return Array.isArray(arr) ? (arr as string[]) : [placeholder];
  }, [mode, t, placeholder]);

  // 打字机效果(聚焦不打断;仅输入为空时由下方覆盖层显示)
  const typedPlaceholder = useTypewriter(typePrompts);

  return (
    <div
      className="h-screen overflow-hidden bg-background bg-grid"
      style={{ fontFamily: LANDING_FONT_STACK }}
    >
      {/* ===== 左侧竖排图标导航 ===== */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col items-center border-r-brutal border-foreground bg-card">
        <Link
          to="/"
          title="NEOSPARK"
          className="flex h-16 w-full shrink-0 items-center justify-center border-b-brutal border-foreground"
        >
          <div className="flex h-9 w-9 items-center justify-center border-brutal border-foreground bg-accent-cyan font-black text-base brutal-shadow-cyan">
            N
          </div>
        </Link>

        <nav className="flex flex-1 flex-col items-center gap-2 overflow-y-auto py-4">
          <RailLink to="/canvas" label={t("landing.navWorkspace")} sameTab>
            <Sparkles className="h-5 w-5" />
          </RailLink>
          <RailLink to="/skills" label={t("landing.navSkills")}>
            <Wrench className="h-5 w-5" />
          </RailLink>
          <RailLink to="/assets" label={t("landing.navAssets")}>
            <Images className="h-5 w-5" />
          </RailLink>
          <RailLink to="/pricing" label={t("landing.navPricing")}>
            <CreditCard className="h-5 w-5" />
          </RailLink>
        </nav>

        {/* 用户菜单（管理后台 / 资料 / 主题 / 语言 / 登出） */}
        <div className="w-full shrink-0">
          <UserMenuDock variant="sidebar" />
        </div>
      </aside>

      {/* ===== 主内容区 ===== */}
      <div className="ml-16 flex h-screen flex-col overflow-y-auto">
        {/* 居中单列 Hero（不再撑满整屏，消除中部大空白） */}
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pt-[9vh] pb-14">
          {/* 品牌 */}
          <div className="mb-6 flex items-center gap-2 animate-fade-in">
            <div className="flex h-8 w-8 items-center justify-center border-brutal border-foreground bg-accent-cyan font-black text-sm brutal-shadow-cyan">
              N
            </div>
            <span className="text-base font-black uppercase tracking-widest">
              NEOSPARK
            </span>
          </div>

          {/* 标题 / 副标题（去掉 font-mono,让中文走清晰黑体） */}
          <h1 className="mb-3 text-center text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {t("landing.title")}
          </h1>
          <p className="mb-10 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
            {t("landing.tagline")}
          </p>

          {/* 白色输入卡（清晰占位符 + 带边框参数控件 + 醒目生成按钮） */}
          <div className="w-full animate-fade-in">
            <div className="w-full border-brutal border-foreground bg-card brutal-shadow transition-shadow focus-within:brutal-shadow-heavy">
              {/* 上传素材缩略区（有内容才显示,位于输入框上方） */}
              {uploadedMedia.length > 0 && (
                <div className="flex flex-wrap gap-2 border-b border-foreground/10 px-3 pt-3 pb-1">
                  {uploadedMedia.map((m) => (
                    <div
                      key={m.id}
                      className="group/thumb relative flex h-14 w-14 items-center justify-center overflow-hidden border-brutal border-foreground bg-background"
                      title={m.name}
                    >
                      {m.type === "video" ? (
                        <Film className="h-5 w-5 text-accent-purple" />
                      ) : (
                        <img
                          src={m.url}
                          alt={m.name ?? "upload"}
                          className="h-full w-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeUploadedMedia(m.id)}
                        aria-label={t("common.cancel")}
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-foreground bg-card text-foreground shadow-sm transition-colors hover:bg-accent-red hover:text-card"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <textarea
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  onFocus={() => setIsPromptFocused(true)}
                  onBlur={() => setIsPromptFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  rows={4}
                  className="w-full resize-none bg-transparent px-5 pb-3 pt-5 text-base leading-relaxed text-foreground focus:outline-none"
                />
                {/* 打字机 placeholder:仅输入为空时显示;聚焦时不显示末尾光标 */}
                {!promptValue && (
                  <div className="pointer-events-none absolute left-5 top-5 select-none text-base leading-relaxed text-muted-foreground">
                    {typedPlaceholder}
                    {!isPromptFocused && (
                      <span className="ml-0.5 inline-block animate-pulse">|</span>
                    )}
                  </div>
                )}
              </div>

              {/* 底部分隔（细线）+ 参数/生成 */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5 border-t border-foreground/10 bg-card px-3.5 py-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-2">
                  {/* 上传按钮 */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    title={t("landing.upload", { defaultValue: "上传参考图/视频" })}
                    aria-label={t("landing.upload", { defaultValue: "上传参考图/视频" })}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-foreground/20 bg-transparent text-foreground/70 transition-colors hover:border-foreground/50 hover:text-foreground disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {mode === "IMAGE" ? (
                    <>
                      <ParamSelect
                        ariaLabel={t("intelligenceHub.paramsModel")}
                        value={model}
                        onChange={setModel}
                        options={modelOptions}
                      />
                      {isGptImage2 ? (
                        <ParamSelect
                          ariaLabel={t("intelligenceHub.paramsQuality")}
                          value={gptImageQuality}
                          onChange={(v) => setGptImageQuality(v as GptImageQuality)}
                          options={GPT_QUALITY_OPTIONS}
                        />
                      ) : null}
                      <ParamSelect
                        ariaLabel={t("intelligenceHub.paramsAspectRatio")}
                        value={aspectRatio}
                        onChange={setAspectRatio}
                        options={aspectRatioOptions}
                      />
                      <ParamSelect
                        ariaLabel={t("intelligenceHub.paramsResolution")}
                        value={resolution}
                        onChange={setResolution}
                        options={resolutionOptions}
                      />
                    </>
                  ) : mode === "VIDEO" ? (
                    <>
                      <ParamSelect
                        ariaLabel={t("intelligenceHub.paramsModel")}
                        value={videoModel}
                        onChange={setVideoModel}
                        options={videoModelSelectOptions}
                      />
                      <ParamSelect
                        ariaLabel={t("intelligenceHub.paramsAspectRatio")}
                        value={videoRatio}
                        onChange={setVideoRatio}
                        options={toOptions(videoRatioOptions)}
                      />
                      <ParamSelect
                        ariaLabel={t("video.duration", { defaultValue: "时长" })}
                        value={videoDuration}
                        onChange={setVideoDuration}
                        options={toOptions(videoDurationOptions)}
                      />
                      <ParamSelect
                        ariaLabel={t("intelligenceHub.paramsResolution")}
                        value={videoResolution}
                        onChange={(v) => setVideoResolution(v as VideoResolution)}
                        options={toOptions(videoResolutionOptions)}
                      />
                    </>
                  ) : (
                    <LandingSkillChips
                      skills={availableSkills}
                      selected={selectedSkills}
                      onToggle={toggleSkill}
                      loading={isLoadingSkills}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!promptValue.trim()}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 border-brutal px-3.5 text-[11px] font-black uppercase tracking-wider transition-none",
                    !promptValue.trim()
                      ? "cursor-not-allowed border-foreground/20 bg-transparent text-muted-foreground/50"
                      : cn("border-foreground brutal-press", modeMeta.btn)
                  )}
                  title={t("landing.generate")}
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{t("landing.generate")}</span>
                </button>
              </div>

              {/* 隐藏的文件选择器（上传按钮触发） */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => void handleUploadFiles(e.target.files)}
              />
            </div>

            {/* 模式 chips（输入卡下方，brutalist 方块） */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <ModeChip mode="IMAGE" current={mode} onChange={setMode} icon={<ImageIcon className="h-3.5 w-3.5" />} label={t("landing.modeImage")} />
              <ModeChip mode="VIDEO" current={mode} onChange={setMode} icon={<Film className="h-3.5 w-3.5" />} label={t("landing.modeVideo")} />
              <ModeChip mode="AGENT" current={mode} onChange={setMode} icon={<Sparkles className="h-3.5 w-3.5" />} label={t("landing.modeAgent")} />
            </div>
          </div>

          {/* 直接进入画布 */}
          {onSkipToCanvas ? (
            <button
              type="button"
              onClick={onSkipToCanvas}
              className="group mt-8 inline-flex items-center gap-1.5 border-brutal border-foreground bg-card px-4 py-2 text-[11px] font-bold uppercase tracking-wider brutal-shadow brutal-press hover:bg-secondary"
            >
              {t("landing.skipToCanvas")}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : null}
        </section>

        {/* 提示词库（分类 + icon + 工具卡片） */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-16">
          {/* 标题 */}
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center border-brutal border-foreground bg-accent-cyan brutal-shadow-cyan">
              <BookOpen className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest">
                {t("landing.promptLibrary")}
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t("landing.promptLibraryHint")}
              </p>
            </div>
          </div>

          {loadingTools && tools.length === 0 ? (
            <div className="flex items-center gap-2 border-brutal border-foreground bg-card px-4 py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">{t("landing.promptLibraryLoading")}</span>
            </div>
          ) : tools.length === 0 ? (
            <div className="border-brutal border-dashed border-foreground/40 bg-card/60 px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">
                {t("landing.promptLibraryEmpty")}
              </p>
            </div>
          ) : (
            <>
              {/* 分类 chips（带 icon + 数量） */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <CategoryChip
                  active={activeCategory === "all"}
                  onClick={() => setActiveCategory("all")}
                  icon={LayoutGrid}
                  label={t("landing.catAll")}
                  count={categoryCounts.all}
                />
                {presentCategories.map((cat) => (
                  <CategoryChip
                    key={cat.id}
                    active={activeCategory === cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    icon={cat.icon}
                    label={t(cat.labelKey)}
                    count={categoryCounts[cat.id]}
                  />
                ))}
              </div>

              {/* 分组展示：每个分类一条彩条+icon+名称，下面是该类工具卡片（对齐参考页） */}
              <div className="space-y-8">
                {visibleCategories.map((cat) => {
                  const catTools = tools.filter(
                    (tool) => getToolCategory(tool.title) === cat.id
                  );
                  const CatIcon = cat.icon;
                  return (
                    <div key={cat.id}>
                      <div className="mb-3 flex items-center gap-2.5">
                        <div
                          className={cn(
                            "h-8 w-1.5 border-brutal border-foreground",
                            cat.accent
                          )}
                        />
                        <CatIcon className="h-4 w-4" />
                        <h3 className="text-sm font-black uppercase tracking-widest">
                          {t(cat.labelKey)}
                        </h3>
                        <span className="text-[10px] text-muted-foreground">
                          ({catTools.length})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {catTools.map((tool) => (
                          <ToolCard
                            key={tool.slug}
                            tool={tool}
                            onUse={() => setPromptValue(tool.default_prompt)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

/* ============== 子组件：导航栏图标链接 ============== */
const RailLink: React.FC<{
  to: string;
  label: string;
  active?: boolean;
  /** true=同页跳转;false/省略=新标签页打开 */
  sameTab?: boolean;
  children: React.ReactNode;
}> = ({ to, label, active, sameTab, children }) => (
  <Link
    to={to}
    target={sameTab ? undefined : "_blank"}
    rel={sameTab ? undefined : "noopener noreferrer"}
    title={label}
    aria-label={label}
    className={cn(
      "flex h-11 w-11 items-center justify-center border-brutal transition-none brutal-press",
      active
        ? "border-foreground bg-accent-yellow text-foreground brutal-shadow"
        : "border-transparent text-foreground/50 hover:border-foreground hover:bg-secondary hover:text-foreground"
    )}
  >
    {children}
  </Link>
);

/* ============== 子组件：模式 chip（brutalist 方块） ============== */
const ModeChip: React.FC<{
  mode: LandingMode;
  current: LandingMode;
  onChange: (m: LandingMode) => void;
  icon: React.ReactNode;
  label: string;
}> = ({ mode, current, onChange, icon, label }) => {
  const isActive = mode === current;
  return (
    <button
      type="button"
      onClick={() => onChange(mode)}
      className={cn(
        "inline-flex items-center gap-1.5 border-brutal px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-none brutal-press",
        isActive
          ? cn("border-foreground", MODE_META[mode].active)
          : "border-foreground/30 bg-card text-foreground/60 hover:border-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
};

/* ============== 子组件：参数下拉（细边、无阴影、干净） ============== */
const ParamSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: DropdownOption[];
  ariaLabel: string;
}> = ({ value, onChange, options, ariaLabel }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger
      aria-label={ariaLabel}
      className="h-7 w-auto min-w-[56px] gap-1 border border-foreground/20 bg-transparent px-2 font-mono text-[10px] font-bold text-foreground/80 transition-colors hover:border-foreground/50 hover:text-foreground focus:ring-0 focus:ring-offset-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:shrink-0"
    >
      <SelectValue placeholder={ariaLabel} />
    </SelectTrigger>
    <SelectContent className="border-brutal border-foreground bg-card">
      {options.map((opt) => (
        <SelectItem
          key={opt.value}
          value={opt.value}
          className="font-mono text-[11px]"
        >
          <span className="flex items-center gap-1.5">
            {opt.icon}
            {opt.label}
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

/* ============== 子组件：分类 chip（带 icon + 数量） ============== */
const CategoryChip: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  count: number;
}> = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1.5 border-brutal px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-none brutal-press",
      active
        ? "border-foreground bg-foreground text-card brutal-shadow"
        : "border-foreground/30 bg-card text-foreground/60 hover:border-foreground hover:text-foreground"
    )}
  >
    <Icon className="h-3.5 w-3.5" />
    <span>{label}</span>
    <span
      className={cn(
        "border px-1 text-[9px] leading-4",
        active
          ? "border-card/40 bg-card/20 text-card"
          : "border-foreground/20 bg-background text-muted-foreground"
      )}
    >
      {count}
    </span>
  </button>
);

/* ============== 子组件：工具卡片（彩色 icon glyph + 标题 + 描述 + 提示词 + 使用） ============== */
const ToolCard: React.FC<{
  tool: AiDesignTool;
  onUse: () => void;
}> = ({ tool, onUse }) => {
  const { t } = useTranslation();
  const brand = getBrandIcon(tool.title);
  const ToolIcon = brand?.icon ?? getToolIcon(tool.title);
  const iconColor = getToolIconColor(tool.title);
  const catMeta = getCategoryMeta(getToolCategory(tool.title));
  return (
    <div className="group flex flex-col border-brutal border-foreground bg-card transition-shadow hover:brutal-shadow">
      {/* 头部：彩色 icon glyph + 标题 + 描述 */}
      <div className="p-3.5 pb-2.5">
        <ToolIcon className="h-8 w-8" style={{ color: iconColor }} />
        <div className="mt-2.5 text-[13px] font-black leading-tight">
          {tool.title}
        </div>
        <div className="mt-1 text-[11px] leading-snug text-muted-foreground line-clamp-2">
          {tool.description}
        </div>
      </div>

      {/* 提示词 */}
      <div className="border-t border-foreground/10 px-3.5 py-2.5">
        <p className="text-[11px] leading-relaxed text-foreground/80 line-clamp-3">
          {tool.default_prompt}
        </p>
      </div>

      {/* 底部：分类标签 + 使用按钮 */}
      <div className="mt-auto flex items-center justify-between border-t border-foreground/10 px-3.5 py-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          {t(catMeta?.labelKey ?? "landing.catOther")}
        </span>
        <button
          type="button"
          onClick={onUse}
          className="inline-flex items-center gap-1 border-brutal border-foreground bg-accent-cyan px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground transition-none brutal-press hover:brightness-110"
        >
          <Send className="h-3 w-3" />
          {t("landing.usePrompt")}
        </button>
      </div>
    </div>
  );
};

/* ============== 子组件：Agent 技能 chips ============== */
const LandingSkillChips: React.FC<{
  skills: AgentSkill[];
  selected: string[];
  onToggle: (id: string) => void;
  loading: boolean;
}> = ({ skills, selected, onToggle, loading }) => {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t("agentHub.loadingSkills")}
      </div>
    );
  }
  if (skills.length === 0) {
    return (
      <span className="text-[10px] text-muted-foreground">
        {t("agentHub.noSkillsAvailable")}
      </span>
    );
  }
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
      {skills.map((skill) => {
        const isActive = selected.includes(skill.id);
        const name = t(`skillNames.${skill.id}.name`, {
          defaultValue: skill.name,
        });
        return (
          <button
            key={skill.id}
            type="button"
            onClick={() => onToggle(skill.id)}
            className={cn(
              "inline-flex max-w-[140px] items-center truncate border-brutal px-1.5 py-0.5 text-[10px] font-bold uppercase transition-none",
              isActive
                ? "border-foreground bg-accent-pink text-foreground"
                : "border-foreground/30 bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
            )}
            title={t(`skillNames.${skill.id}.description`, {
              defaultValue: skill.description,
            })}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
};

export default LandingComposer;
