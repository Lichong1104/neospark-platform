import React, { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Video,
  Film,
  Download,
  RotateCcw,
  Sparkles,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  createVideoTask,
  getVideoModels,
  getVideoTask,
  uploadVideoAsset,
} from "@/api/video";
import storageApi from "@/api/storage";
import { STATIC_BASE_URL } from "@/api/request";
import { getErrorMessage } from "@/lib/errorMessage";
import type {
  CreateVideoParams,
  VideoModelConfig,
  VideoModelsData,
  VideoResolution,
  VideoTaskStatus,
} from "@/types/video";
import { VideoConfigForm } from "./VideoConfigForm";
import {
  canvasImageSlotLabel,
  resolveImagesFromPromptSlots,
  validatePromptCanvasSlots,
} from "@/lib/canvasImageSlots";
import { InlineCanvasMentionEditor } from "./InlineCanvasMentionEditor";

interface VideoGenerationPanelProps {
  onVideoGenerated?: (videoUrl: string) => void;
  selectedCanvasImage?: {
    src: string;
    name: string;
    type?: "image" | "video";
  } | null;
  selectedCanvasImages?: {
    src: string;
    name: string;
    type?: "image" | "video";
  }[];
  canvasImages?: {
    src: string;
    name: string;
    type?: "image" | "video";
  }[];
}

const getVideoFullUrl = (url: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${STATIC_BASE_URL}${url}`;
};

/** Strip BASE_URL prefix to get server-relative path for API */
const toServerPath = (fullUrl: string) => {
  if (!fullUrl) return "";
  if (fullUrl.startsWith(STATIC_BASE_URL))
    return fullUrl.slice(STATIC_BASE_URL.length);
  if (fullUrl.startsWith("http")) {
    try {
      return new URL(fullUrl).pathname;
    } catch {
      return fullUrl;
    }
  }
  return fullUrl;
};

/** Supported output aspect ratios (API may still return deprecated values — normalize away). */
const VIDEO_RATIO_ORDER = [
  "16:9",
  "4:3",
  "1:1",
  "3:4",
  "9:16",
  "21:9",
] as const;

const normalizeVideoRatio = (r: string | undefined): string => {
  if (!r) return "16:9";
  const key = r.trim().toLowerCase();
  if (key === "adaptive") return "16:9";
  const hit = VIDEO_RATIO_ORDER.find((x) => x.toLowerCase() === key);
  return hit ?? r.trim();
};

const filterAllowedRatiosFromApi = (
  apiRatios: string[] | undefined
): string[] => {
  if (!apiRatios?.length) return [...VIDEO_RATIO_ORDER];
  const apiNorm = new Set(apiRatios.map((x) => x.trim().toLowerCase()));
  const ordered = VIDEO_RATIO_ORDER.filter((r) => apiNorm.has(r.toLowerCase()));
  return ordered.length ? ordered : [...VIDEO_RATIO_ORDER];
};

const VIDEO_DURATION_MIN = 4;
const VIDEO_DURATION_MAX = 30;

const defaultDurationOptions = (): string[] =>
  Array.from({ length: VIDEO_DURATION_MAX - VIDEO_DURATION_MIN + 1 }, (_, i) =>
    String(VIDEO_DURATION_MIN + i)
  );

const mergeDurationOptionsFromApi = (
  d: VideoModelsData["durations"] | undefined
): string[] => {
  if (!d) return defaultDurationOptions();
  const min = Number.isFinite(d.min) ? d.min : VIDEO_DURATION_MIN;
  const max = Number.isFinite(d.max) ? d.max : VIDEO_DURATION_MAX;
  const lo = Math.max(VIDEO_DURATION_MIN, Math.ceil(min));
  const hi = Math.min(VIDEO_DURATION_MAX, Math.floor(max));
  if (lo > hi) return defaultDurationOptions();
  return Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i));
};

/** Pick a duration string that exists in `options` (seconds in [VIDEO_DURATION_MIN, VIDEO_DURATION_MAX]). */
const pickDurationInOptions = (
  value: number | string | undefined,
  options: string[]
): string => {
  if (!options.length) return String(VIDEO_DURATION_MIN);
  const n =
    typeof value === "string" ? Number(value) : value ?? Number(options[0]);
  const rounded = Number.isFinite(n) ? Math.round(n) : Number(options[0]);
  const clamped = Math.min(
    VIDEO_DURATION_MAX,
    Math.max(VIDEO_DURATION_MIN, rounded)
  );
  const s = String(clamped);
  if (options.includes(s)) return s;
  const sorted = [...options]
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!sorted.length) return options[0];
  let best = sorted[0];
  for (const x of sorted) {
    if (Math.abs(x - clamped) < Math.abs(best - clamped)) best = x;
  }
  return String(best);
};

/** Omni 模型常量 */
const OMNI_MODELS = new Set(["omni-fast", "omni-fast-v2v"]);
const isOmniModel = (model: string) => OMNI_MODELS.has(model);

/** 获取当前模型允许的最大参考图数量 */
const getMaxRefImages = (model: string) => (isOmniModel(model) ? 5 : 9);
const getMaxRefVideos = (_model: string) => 3;

const VideoGenerationPanel: React.FC<VideoGenerationPanelProps> = ({
  onVideoGenerated,
  selectedCanvasImage,
  selectedCanvasImages = [],
  canvasImages = [],
}) => {
  const VIDEO_TUTORIAL_URL =
    "https://quantrisk.oss-cn-shenzhen.aliyuncs.com/neospark_video.mp4";
  const { t } = useTranslation();
  const imageSlotPrefix = t("intelligenceHub.canvasImageSlotPrefix");
  const [isCreating, setIsCreating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("dreamina-seedance-2-0-260128");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState("5");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [generateAudio, setGenerateAudio] = useState(false);
  const [watermark, setWatermark] = useState(false);
  const [realPersonMode, setRealPersonMode] = useState(false);
  const [firstFrameUrl, setFirstFrameUrl] = useState("");
  const [lastFrameUrl, setLastFrameUrl] = useState("");
  const [referenceImageUrls, setReferenceImageUrls] = useState("");
  const [referenceVideoUrls, setReferenceVideoUrls] = useState("");
  const [modelOptions, setModelOptions] = useState<VideoModelConfig[]>([]);
  const [ratioOptions, setRatioOptions] = useState<string[]>([
    ...VIDEO_RATIO_ORDER,
  ]);
  const [durationOptions, setDurationOptions] = useState<string[]>(
    defaultDurationOptions
  );
  const [resolutionOptions, setResolutionOptions] = useState<string[]>([
    "720p",
    "480p",
    "1080p",
  ]);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [taskId, setTaskId] = useState("");
  const [status, setStatus] = useState<"idle" | VideoTaskStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  // 解析分辨率：后端可能返回数组或按模型分组的对象
  const resolveResolutions = React.useCallback(
    (
      resolutions: VideoModelsData["resolutions"],
      currentModel: string
    ): string[] => {
      if (Array.isArray(resolutions)) return resolutions;
      if (typeof resolutions === "object" && resolutions !== null) {
        // 优先使用当前模型对应的分辨率，否则取第一个模型的
        return (
          (resolutions as Record<string, string[]>)[currentModel] ||
          Object.values(resolutions as Record<string, string[]>)[0] ||
          []
        );
      }
      return [];
    },
    []
  );

  // prompt editor now handles inline tokens; we keep prompt as serialized text (@图N)
  const [modelsData, setModelsData] = useState<VideoModelsData | null>(null);
  const activePollingTaskIdRef = useRef<string | null>(null);
  const deliveredTaskIdsRef = useRef<Set<string>>(new Set());
  const completedNoUrlTriesRef = useRef(0);
  const assetUploadRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    getVideoModels()
      .then((res) => {
        setModelsData(res);
        setModelOptions(res.models ?? []);
        const firstModel = res.models?.[0]?.id || "";
        const initialModel = model || firstModel;
        if (res.models?.length) setModel(initialModel);
        const ratioList = filterAllowedRatiosFromApi(res.ratios);
        setRatioOptions(ratioList);
        setRatio((prev) => {
          const normalizedPrev = normalizeVideoRatio(prev);
          if (ratioList.includes(normalizedPrev)) return normalizedPrev;
          const normalizedFirst = normalizeVideoRatio(res.ratios?.[0]);
          return ratioList.includes(normalizedFirst) ? normalizedFirst : "16:9";
        });
        const modelResolutions = resolveResolutions(
          res.resolutions,
          initialModel
        );
        if (modelResolutions.length) {
          setResolutionOptions(modelResolutions);
          setResolution(modelResolutions[0] as VideoResolution);
        }
        const durOpts = mergeDurationOptionsFromApi(res.durations);
        setDurationOptions(durOpts);
        setDuration(pickDurationInOptions(res.durations?.default, durOpts));
      })
      .catch(() => {});
  }, [resolveResolutions]);

  // 切换模型时更新分辨率选项
  React.useEffect(() => {
    if (!modelsData || !model) return;
    const modelResolutions = resolveResolutions(modelsData.resolutions, model);
    if (modelResolutions.length) {
      setResolutionOptions(modelResolutions);
    }
  }, [model, modelsData, resolveResolutions]);

  React.useEffect(() => {
    setRatio((prev) => {
      const n = normalizeVideoRatio(prev);
      return ratioOptions.includes(n) ? n : ratioOptions[0] ?? "16:9";
    });
  }, [ratioOptions]);

  React.useEffect(() => {
    setDuration((prev) =>
      durationOptions.includes(prev)
        ? prev
        : pickDurationInOptions(prev, durationOptions)
    );
  }, [durationOptions]);

  const setDurationClamped = useCallback(
    (v: string) => {
      setDuration(pickDurationInOptions(v, durationOptions));
    },
    [durationOptions]
  );

  React.useEffect(() => {
    if (!taskId) return;
    activePollingTaskIdRef.current = taskId;
    completedNoUrlTriesRef.current = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pollOnce = async () => {
      if (cancelled || activePollingTaskIdRef.current !== taskId) return;
      try {
        const detail = await getVideoTask(taskId);
        if (cancelled || activePollingTaskIdRef.current !== taskId) return;

        setStatus(detail.status);
        setProgress(detail.progress ?? 0);
        if (detail.video_url) setVideoUrl(detail.video_url);

        if (detail.status === "completed") {
          // Some backends may mark completed before video_url is ready.
          // Keep polling briefly to avoid losing the result + hiding the prompt box.
          if (!detail.video_url) {
            completedNoUrlTriesRef.current += 1;
            // If it's taking too long, surface an error instead of getting stuck.
            if (completedNoUrlTriesRef.current > 30) {
              setError(detail.error_msg || t("video.fetchFailed"));
              setStatus("failed");
              return;
            }
            // Keep UI in generating state while we wait for the final URL.
            setStatus("processing");
            setProgress((p) => Math.max(p, 99));
            timer = window.setTimeout(() => {
              void pollOnce();
            }, 1500);
            return;
          }

          const responseTaskId = detail.task_id || taskId;
          if (!deliveredTaskIdsRef.current.has(responseTaskId)) {
            deliveredTaskIdsRef.current.add(responseTaskId);
            const fullUrl = getVideoFullUrl(detail.video_url || "");
            toast.success(t("video.completed"));
            onVideoGenerated?.(fullUrl);
          }
          return;
        }

        if (detail.status === "failed" || detail.status === "cancelled") {
          if (detail.status === "failed") {
            setError(detail.error_msg || t("video.failed"));
          }
          return;
        }

        timer = window.setTimeout(() => {
          void pollOnce();
        }, 3000);
      } catch {
        if (cancelled || activePollingTaskIdRef.current !== taskId) return;
        setError(t("video.fetchFailed"));
        setStatus("failed");
      }
    };

    void pollOnce();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [taskId, t, onVideoGenerated]);

  const isGenerating =
    isCreating || status === "pending" || status === "processing";
  const showForm =
    !isGenerating &&
    status !== "failed" &&
    !(status === "completed" && !!videoUrl);

  const parseMultiLineUrls = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const appendMultiLineValue = (prev: string, value: string) => {
    const line = value.trim();
    if (!line) return prev;
    if (!prev.trim()) return line;
    const existing = parseMultiLineUrls(prev);
    if (existing.includes(line)) return prev;
    return `${prev.trim()}\n${line}`;
  };

  const handleUploadReference = useCallback(
    async (kind: "image" | "video", file: File) => {
      const fileType = kind === "image" ? "image" : "video";
      const uploaded = await storageApi.uploadFile(file, fileType);
      const uploadedPath = uploaded.url || uploaded.path || "";
      const normalizedPath = uploadedPath.startsWith("/")
        ? uploadedPath
        : `/${uploadedPath}`;
      if (!normalizedPath) return;

      if (kind === "image") {
        setReferenceImageUrls((prev) =>
          appendMultiLineValue(prev, normalizedPath)
        );
      } else {
        setReferenceVideoUrls((prev) =>
          appendMultiLineValue(prev, normalizedPath)
        );
      }
      toast.success(t("video.refUploaded"));
    },
    [t]
  );

  const handleAssetReview = useCallback(
    async (file: File) => {
      try {
        const result = await uploadVideoAsset(file, "image");
        toast.success(
          t("video.assetReviewSuccess", { assetId: result.asset_id })
        );
      } catch (err: any) {
        const msg = getErrorMessage(err, t("video.assetReviewFailed"));
        toast.error(msg);
      }
    },
    [t]
  );

  const handleUseSelectedCanvasRefs = useCallback(() => {
    const selectedImages = selectedCanvasImages.filter(
      (item) => item.type !== "video"
    );
    const selectedVideos = selectedCanvasImages.filter(
      (item) => item.type === "video"
    );

    if (!selectedImages.length && !selectedVideos.length) {
      toast.error(t("video.noCanvasRefSelected"));
      return;
    }

    const hasFrame = Boolean(firstFrameUrl.trim() || lastFrameUrl.trim());
    const blockRefImages = !realPersonMode && hasFrame;

    let applied = false;

    if (selectedImages.length > 0) {
      if (blockRefImages) {
        toast.error(t("video.refsLockedByFramesHint"));
      } else {
        setReferenceImageUrls((prev) => {
          let next = prev;
          selectedImages.forEach((item) => {
            next = appendMultiLineValue(next, toServerPath(item.src));
          });
          return next;
        });
        applied = true;
      }
    }

    if (selectedVideos.length > 0) {
      setReferenceVideoUrls((prev) => {
        let next = prev;
        selectedVideos.forEach((item) => {
          next = appendMultiLineValue(next, toServerPath(item.src));
        });
        return next;
      });
      applied = true;
    }

    if (applied) {
      toast.success(t("video.canvasRefsApplied"));
    }
  }, [selectedCanvasImages, t, realPersonMode, firstFrameUrl, lastFrameUrl]);

  const handleUseCanvasAsFirstFrame = useCallback(() => {
    const source = selectedCanvasImage?.src;
    if (!source) {
      toast.error(t("video.noCanvasRefSelected"));
      return;
    }
    setFirstFrameUrl(toServerPath(source));
  }, [selectedCanvasImage, t]);

  const handleUseCanvasAsLastFrame = useCallback(() => {
    const source = selectedCanvasImage?.src;
    if (!source) {
      toast.error(t("video.noCanvasRefSelected"));
      return;
    }
    setLastFrameUrl(toServerPath(source));
  }, [selectedCanvasImage, t]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    const canvasImageCount = canvasImages.filter(
      (i) => (i.type ?? "image") !== "video"
    ).length;
    const slotCheck = validatePromptCanvasSlots(
      prompt.trim(),
      canvasImageCount
    );
    if (!slotCheck.ok) {
      toast.error(
        t("intelligenceHub.invalidCanvasSlot", {
          label: canvasImageSlotLabel(slotCheck.invalidSlot, imageSlotPrefix),
          rangeStart: canvasImageSlotLabel(1, imageSlotPrefix),
          rangeEnd: canvasImageSlotLabel(canvasImageCount, imageSlotPrefix),
          max: canvasImageCount,
        })
      );
      return;
    }

    const parsedRefImages = parseMultiLineUrls(referenceImageUrls);
    const slotRefPaths = resolveImagesFromPromptSlots(
      canvasImages,
      prompt.trim()
    )
      .map((img) => toServerPath(img.src))
      .filter(Boolean);
    const mergedRefImages = [...parsedRefImages];
    for (const p of slotRefPaths) {
      if (p && !mergedRefImages.includes(p)) mergedRefImages.push(p);
    }
    const parsedRefVideos = parseMultiLineUrls(referenceVideoUrls);
    const safeDuration = Number(
      pickDurationInOptions(duration, durationOptions)
    );

    const hasFrame = Boolean(firstFrameUrl.trim() || lastFrameUrl.trim());
    // Omni 模型支持 first_frame + reference_image 同时使用（多参考图模式）
    if (!isOmniModel(model) && !realPersonMode && hasFrame && mergedRefImages.length > 0) {
      toast.error(t("video.realPersonConflictFramesRefs"));
      return;
    }

    const totalImages =
      (firstFrameUrl.trim() ? 1 : 0) +
      (lastFrameUrl.trim() ? 1 : 0) +
      mergedRefImages.length;
    const maxRefImages = getMaxRefImages(model);
    if (totalImages > maxRefImages) {
      toast.error(
        t("video.tooManyRefImages", { max: maxRefImages })
      );
      return;
    }
    if (parsedRefVideos.length > 3) {
      toast.error(t("video.tooManyRefVideos"));
      return;
    }

    const baseParams: CreateVideoParams = {
      prompt: prompt.trim(),
      model,
      duration: safeDuration,
      ratio: normalizeVideoRatio(ratio),
      resolution,
      first_frame_url: firstFrameUrl.trim() || undefined,
      last_frame_url: lastFrameUrl.trim() || undefined,
      reference_image_urls:
        mergedRefImages.length > 0 ? mergedRefImages : undefined,
      reference_video_urls:
        parsedRefVideos.length > 0 ? parsedRefVideos : undefined,
    };

    // Omni 模型只发送基本参数，不发送 Seedance 特有参数
    const params: CreateVideoParams = isOmniModel(model)
      ? baseParams
      : {
          ...baseParams,
          generate_audio: generateAudio,
          watermark,
          real_person_mode: realPersonMode,
        };

    try {
      // Enter loading immediately when calling /video/generations
      setIsCreating(true);
      setStatus("pending");
      setProgress(0);
      setError("");
      setVideoUrl("");

      const res = await createVideoTask(params);
      const cost = res.pricing?.estimated_cost ?? null;
      setEstimatedCost(cost);
      setTaskId(res.task_id);
      setStatus(res.status);
      setProgress(res.progress ?? 0);
      setError("");
      setVideoUrl("");
      toast.info(t("video.taskCreated", { cost: cost ?? "-" }));
    } catch (err: any) {
      setStatus("idle");
      const msg = getErrorMessage(err, t("video.createFailed"));
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  }, [
    prompt,
    isGenerating,
    model,
    duration,
    ratio,
    resolution,
    generateAudio,
    watermark,
    realPersonMode,
    firstFrameUrl,
    lastFrameUrl,
    referenceImageUrls,
    referenceVideoUrls,
    durationOptions,
    canvasImages,
    t,
  ]);

  const handleNewTask = () => {
    activePollingTaskIdRef.current = null;
    setIsCreating(false);
    setTaskId("");
    setStatus("idle");
    setProgress(0);
    setVideoUrl("");
    setError("");
    setPrompt("");
    setFirstFrameUrl("");
    setLastFrameUrl("");
    setReferenceImageUrls("");
    setReferenceVideoUrls("");
    setResolution("720p");
    setWatermark(false);
    setRealPersonMode(false);
    setEstimatedCost(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center pt-12 gap-5 px-4">
            <div className="relative">
              <div className="w-20 h-20 border-brutal border-foreground/20 flex items-center justify-center bg-accent-purple/5">
                <Film className="w-10 h-10 text-accent-purple" />
              </div>
              <div className="absolute -inset-2 border-2 border-accent-purple/30 border-t-accent-purple animate-spin rounded-none" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold uppercase tracking-widest">
                {t("video.generating")}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {t("video.generatingHint")}
              </p>
            </div>
            <div className="w-full max-w-[260px] space-y-2">
              <Progress
                value={progress}
                className="h-2 border border-foreground/20"
              />
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>{progress}%</span>
                {estimatedCost && (
                  <span className="text-accent-orange">
                    {t("video.pointsApprox", { points: estimatedCost })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce"
                  style={{
                    animationDelay: `${i * 120}ms`,
                    animationDuration: "0.8s",
                  }}
                />
              ))}
            </div>
          </div>
        ) : status === "completed" && videoUrl ? (
          <div className="space-y-4 px-4 pt-4 animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-accent-green">
              <Video className="w-4 h-4" />
              {t("video.result")}
              <span className="ml-auto text-[10px] text-muted-foreground font-normal">
                ✓ {t("video.completed")}
              </span>
            </div>
            <div className="border-brutal border-foreground overflow-hidden bg-foreground/5 brutal-shadow">
              <video
                src={getVideoFullUrl(videoUrl)}
                controls
                className="w-full"
                autoPlay
                muted
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = getVideoFullUrl(videoUrl);
                  a.download = `video_${Date.now()}.mp4`;
                  a.click();
                }}
                className="flex-1 py-2.5 text-xs font-bold uppercase border-brutal border-foreground bg-accent-green text-foreground brutal-press hover:brightness-110 flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {t("video.download")}
              </button>
              <button
                onClick={handleNewTask}
                className="flex-1 py-2.5 text-xs font-bold uppercase border-brutal border-foreground bg-card text-foreground brutal-press hover:bg-secondary flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t("video.newTask")}
              </button>
            </div>
          </div>
        ) : status === "failed" ? (
          <div className="flex flex-col items-center justify-center pt-12 gap-4 px-4 animate-fade-in">
            <div className="w-20 h-20 border-brutal border-accent-red/30 flex items-center justify-center bg-accent-red/10">
              <Film className="w-10 h-10 text-accent-red" />
            </div>
            <p className="text-sm font-bold uppercase tracking-wider text-accent-red">
              {t("video.failed")}
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-[260px]">
              {error}
            </p>
            <button
              onClick={handleNewTask}
              className="px-6 py-2.5 text-xs font-bold uppercase border-brutal border-foreground bg-card brutal-press hover:bg-secondary flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("video.retry")}
            </button>
          </div>
        ) : (
          <VideoConfigForm
            model={model}
            setModel={setModel}
            ratio={ratio}
            setRatio={setRatio}
            duration={duration}
            setDuration={setDurationClamped}
            resolution={resolution}
            setResolution={setResolution}
            generateAudio={generateAudio}
            setGenerateAudio={setGenerateAudio}
            watermark={watermark}
            setWatermark={setWatermark}
            realPersonMode={realPersonMode}
            setRealPersonMode={setRealPersonMode}
            firstFrameUrl={firstFrameUrl}
            setFirstFrameUrl={setFirstFrameUrl}
            lastFrameUrl={lastFrameUrl}
            setLastFrameUrl={setLastFrameUrl}
            referenceImageUrls={referenceImageUrls}
            setReferenceImageUrls={setReferenceImageUrls}
            referenceVideoUrls={referenceVideoUrls}
            setReferenceVideoUrls={setReferenceVideoUrls}
            selectedCanvasImage={selectedCanvasImage ?? null}
            selectedCanvasImages={selectedCanvasImages}
            canvasImages={canvasImages}
            modelOptions={modelOptions}
            ratioOptions={ratioOptions}
            durationOptions={durationOptions}
            resolutionOptions={resolutionOptions}
            onUploadReference={handleUploadReference}
            onUseSelectedCanvasRefs={handleUseSelectedCanvasRefs}
            onUseCanvasAsFirstFrame={handleUseCanvasAsFirstFrame}
            onUseCanvasAsLastFrame={handleUseCanvasAsLastFrame}
          />
        )}
      </div>

      {showForm && (
        <div className="border-t border-foreground/10 bg-background px-3 py-3">
          <div className="border-brutal border-foreground bg-card brutal-shadow animate-scale-in">
            <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/15">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                {t("video.prompt")}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={VIDEO_TUTORIAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold uppercase border border-foreground/30 px-2 py-1 hover:bg-secondary"
                >
                  {t("video.tutorial")}
                </a>
                <button
                  type="button"
                  onClick={() => assetUploadRef.current?.click()}
                  className="text-[10px] font-bold uppercase border border-foreground/30 px-2 py-1 hover:bg-secondary flex items-center gap-1"
                >
                  <Shield className="w-3 h-3" />
                  {t("video.assetReview")}
                </button>
              </div>
            </div>

            <div className="p-3 space-y-2.5">
              <InlineCanvasMentionEditor
                value={prompt}
                onChange={setPrompt}
                canvasImages={canvasImages}
                placeholder={t("video.promptPlaceholder")}
                onSubmit={handleGenerate}
                enableSubmitOnEnter
                className={cn(
                  "border border-foreground/20 bg-background",
                  "focus-within:border-accent-purple"
                )}
              />

              {realPersonMode && (
                <p className="text-[10px] text-muted-foreground leading-snug border-l-2 border-accent-purple/40 pl-2">
                  {t("video.realPersonModePromptHint")}
                </p>
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {t("video.charCount", { count: prompt.length })}
                  </span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">
                    {t("video.shiftEnterHint")}
                  </span>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase border-brutal border-foreground brutal-press transition-none",
                    prompt.trim()
                      ? "bg-accent-purple text-card hover:brightness-110"
                      : "bg-secondary text-muted-foreground opacity-50 cursor-not-allowed"
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  {t("video.generate")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <input
        ref={assetUploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleAssetReview(file);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
};

export { VideoGenerationPanel };
