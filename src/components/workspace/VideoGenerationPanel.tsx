import React, { useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Video, Film, Download, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { createVideoTask, getVideoModels, getVideoTask } from "@/api/video";
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

const VideoGenerationPanel: React.FC<VideoGenerationPanelProps> = ({
  onVideoGenerated,
  selectedCanvasImage,
  selectedCanvasImages = [],
  canvasImages = [],
}) => {
  const VIDEO_TUTORIAL_URL =
    "https://quantrisk.oss-cn-shenzhen.aliyuncs.com/neospark_video.mp4";
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("seedance-2.0");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState("5");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [generateAudio, setGenerateAudio] = useState(false);
  const [watermark, setWatermark] = useState(false);
  const [firstFrameUrl, setFirstFrameUrl] = useState("");
  const [lastFrameUrl, setLastFrameUrl] = useState("");
  const [referenceImageUrls, setReferenceImageUrls] = useState("");
  const [referenceVideoUrls, setReferenceVideoUrls] = useState("");
  const [referenceAudioUrls, setReferenceAudioUrls] = useState("");
  const [modelOptions, setModelOptions] = useState<VideoModelConfig[]>([]);
  const [ratioOptions, setRatioOptions] = useState<string[]>([
    "16:9",
    "1:1",
    "9:16",
  ]);
  const [durationOptions, setDurationOptions] = useState<string[]>([
    "4",
    "5",
    "6",
    "8",
    "10",
    "12",
    "15",
  ]);
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
    (resolutions: VideoModelsData["resolutions"], currentModel: string): string[] => {
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

  React.useEffect(() => {
    getVideoModels()
      .then((res) => {
        setModelsData(res);
        setModelOptions(res.models ?? []);
        const firstModel = res.models?.[0]?.id || "";
        const initialModel = model || firstModel;
        if (res.models?.length) setModel(initialModel);
        if (res.ratios?.length) {
          setRatioOptions(res.ratios);
          setRatio(res.ratios[0]);
        }
        const modelResolutions = resolveResolutions(res.resolutions, initialModel);
        if (modelResolutions.length) {
          setResolutionOptions(modelResolutions);
          setResolution(modelResolutions[0] as VideoResolution);
        }
        const min = res.durations?.min ?? 4;
        const max = res.durations?.max ?? 15;
        const defaultDuration = String(res.durations?.default ?? 5);
        const values = Array.from({ length: max - min + 1 }, (_, i) =>
          String(min + i)
        );
        setDurationOptions(values);
        setDuration(defaultDuration);
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
    !isGenerating && status !== "failed" && !(status === "completed" && !!videoUrl);

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
    async (kind: "image" | "video" | "audio", file: File) => {
      const fileType = kind === "image" ? "image" : kind === "video" ? "video" : "other";
      const uploaded = await storageApi.uploadFile(file, fileType);
      const uploadedPath = uploaded.url || uploaded.path || "";
      const normalizedPath = uploadedPath.startsWith("/")
        ? uploadedPath
        : `/${uploadedPath}`;
      if (!normalizedPath) return;

      if (kind === "image") {
        setReferenceImageUrls((prev) => appendMultiLineValue(prev, normalizedPath));
      } else if (kind === "video") {
        setReferenceVideoUrls((prev) => appendMultiLineValue(prev, normalizedPath));
      } else {
        setReferenceAudioUrls((prev) => appendMultiLineValue(prev, normalizedPath));
      }
      toast.success(t("video.refUploaded"));
    },
    [t]
  );

  const handleUseSelectedCanvasRefs = useCallback(() => {
    const selectedImages = selectedCanvasImages.filter((item) => item.type !== "video");
    const selectedVideos = selectedCanvasImages.filter((item) => item.type === "video");

    if (!selectedImages.length && !selectedVideos.length) {
      toast.error(t("video.noCanvasRefSelected"));
      return;
    }

    if (selectedImages.length > 0) {
      setReferenceImageUrls((prev) => {
        let next = prev;
        selectedImages.forEach((item) => {
          next = appendMultiLineValue(next, toServerPath(item.src));
        });
        return next;
      });
    }

    if (selectedVideos.length > 0) {
      setReferenceVideoUrls((prev) => {
        let next = prev;
        selectedVideos.forEach((item) => {
          next = appendMultiLineValue(next, toServerPath(item.src));
        });
        return next;
      });
    }

    toast.success(t("video.canvasRefsApplied"));
  }, [selectedCanvasImages, t]);

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
          slot: slotCheck.invalidSlot,
          max: canvasImageCount,
        })
      );
      return;
    }

    const parsedRefImages = parseMultiLineUrls(referenceImageUrls);
    const slotRefPaths = resolveImagesFromPromptSlots(canvasImages, prompt.trim())
      .map((img) => toServerPath(img.src))
      .filter(Boolean);
    const mergedRefImages = [...parsedRefImages];
    for (const p of slotRefPaths) {
      if (p && !mergedRefImages.includes(p)) mergedRefImages.push(p);
    }
    const parsedRefVideos = parseMultiLineUrls(referenceVideoUrls);
    const parsedRefAudios = parseMultiLineUrls(referenceAudioUrls);
    const hasVisualRef =
      mergedRefImages.length > 0 || parsedRefVideos.length > 0;
    const hasRefAudio = parsedRefAudios.length > 0;
    if (hasRefAudio && !hasVisualRef) {
      toast.error(t("video.referenceAudioRequiresRef"));
      return;
    }

    const params: CreateVideoParams = {
      prompt: prompt.trim(),
      model,
      duration: Number(duration),
      ratio,
      resolution,
      generate_audio: generateAudio,
      watermark,
      camera_fixed: false,
      return_last_frame: false,
      draft: false,
      service_tier: "default",
      first_frame_url: firstFrameUrl.trim() || undefined,
      last_frame_url: lastFrameUrl.trim() || undefined,
      reference_image_urls:
        mergedRefImages.length > 0 ? mergedRefImages : undefined,
      reference_video_urls: parsedRefVideos.length > 0 ? parsedRefVideos : undefined,
      reference_audio_urls: parsedRefAudios.length > 0 ? parsedRefAudios : undefined,
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
    firstFrameUrl,
    lastFrameUrl,
    referenceImageUrls,
    referenceVideoUrls,
    referenceAudioUrls,
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
    setReferenceAudioUrls("");
    setResolution("720p");
    setWatermark(false);
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
            setDuration={setDuration}
            resolution={resolution}
            setResolution={setResolution}
            generateAudio={generateAudio}
            setGenerateAudio={setGenerateAudio}
            watermark={watermark}
            setWatermark={setWatermark}
            firstFrameUrl={firstFrameUrl}
            setFirstFrameUrl={setFirstFrameUrl}
            lastFrameUrl={lastFrameUrl}
            setLastFrameUrl={setLastFrameUrl}
            referenceImageUrls={referenceImageUrls}
            setReferenceImageUrls={setReferenceImageUrls}
            referenceVideoUrls={referenceVideoUrls}
            setReferenceVideoUrls={setReferenceVideoUrls}
            referenceAudioUrls={referenceAudioUrls}
            setReferenceAudioUrls={setReferenceAudioUrls}
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
                <span className="text-[10px] font-bold text-accent-orange">
                  {t("video.estimatedCost")}:{" "}
                  {t("video.pointsApprox", { points: estimatedCost ?? 50 })}
                </span>
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
    </div>
  );
};

export { VideoGenerationPanel };
