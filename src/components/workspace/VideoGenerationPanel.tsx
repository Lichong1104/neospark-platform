import React, { useState, useCallback, useRef } from "react";
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
  VideoResolution,
  VideoTaskStatus,
} from "@/types/video";
import { VideoConfigForm } from "./VideoConfigForm";

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
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("AiVideoMax");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState("5");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [generateAudio, setGenerateAudio] = useState(false);
  const [firstFrameUrl, setFirstFrameUrl] = useState("");
  const [lastFrameUrl, setLastFrameUrl] = useState("");
  const [referenceImageUrls, setReferenceImageUrls] = useState("");
  const [referenceVideoUrls, setReferenceVideoUrls] = useState("");
  const [referenceAudioUrl, setReferenceAudioUrl] = useState("");
  const [assetGroupName, setAssetGroupName] = useState("");
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
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [taskId, setTaskId] = useState("");
  const [status, setStatus] = useState<"idle" | VideoTaskStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const activePollingTaskIdRef = useRef<string | null>(null);
  const deliveredTaskIdsRef = useRef<Set<string>>(new Set());
  const completedNoUrlTriesRef = useRef(0);

  React.useEffect(() => {
    getVideoModels()
      .then((res) => {
        setModelOptions(res.models ?? []);
        if (res.models?.length) setModel((prev) => prev || res.models[0].id);
        if (res.ratios?.length) {
          setRatioOptions(res.ratios);
          setRatio(res.ratios[0]);
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
  }, []);

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
        setReferenceAudioUrl(normalizedPath);
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

    const parsedRefImages = parseMultiLineUrls(referenceImageUrls);
    const parsedRefVideos = parseMultiLineUrls(referenceVideoUrls);
    const hasVisualRef =
      !!firstFrameUrl.trim() ||
      !!lastFrameUrl.trim() ||
      parsedRefImages.length > 0 ||
      parsedRefVideos.length > 0;
    const hasRefAudio = !!referenceAudioUrl.trim();
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
      first_frame_url: firstFrameUrl.trim() || undefined,
      last_frame_url: lastFrameUrl.trim() || undefined,
      reference_image_urls: parsedRefImages,
      reference_video_urls: parsedRefVideos,
      reference_audio_url: referenceAudioUrl.trim() || undefined,
      asset_group_name: assetGroupName.trim() || undefined,
    };

    if (!params.reference_image_urls?.length)
      delete params.reference_image_urls;
    if (!params.reference_video_urls?.length)
      delete params.reference_video_urls;

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
    firstFrameUrl,
    lastFrameUrl,
    referenceImageUrls,
    referenceVideoUrls,
    referenceAudioUrl,
    assetGroupName,
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
    setReferenceAudioUrl("");
    setAssetGroupName("");
    setResolution("720p");
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
                    ~{estimatedCost} pts
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
            firstFrameUrl={firstFrameUrl}
            setFirstFrameUrl={setFirstFrameUrl}
            lastFrameUrl={lastFrameUrl}
            setLastFrameUrl={setLastFrameUrl}
            referenceImageUrls={referenceImageUrls}
            setReferenceImageUrls={setReferenceImageUrls}
            referenceVideoUrls={referenceVideoUrls}
            setReferenceVideoUrls={setReferenceVideoUrls}
            referenceAudioUrl={referenceAudioUrl}
            setReferenceAudioUrl={setReferenceAudioUrl}
            assetGroupName={assetGroupName}
            setAssetGroupName={setAssetGroupName}
            selectedCanvasImage={selectedCanvasImage ?? null}
            selectedCanvasImages={selectedCanvasImages}
            canvasImages={canvasImages}
            modelOptions={modelOptions}
            ratioOptions={ratioOptions}
            durationOptions={durationOptions}
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
              <span className="text-[10px] font-bold text-accent-orange">
                {t("video.estimatedCost")}: ~{estimatedCost ?? 50} pts
              </span>
            </div>

            <div className="p-3 space-y-2.5">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  (e.preventDefault(), handleGenerate())
                }
                placeholder={t("video.promptPlaceholder")}
                className={cn(
                  "w-full min-h-[104px] p-3 border border-foreground/20 bg-background font-mono text-[12px] resize-none leading-relaxed",
                  "focus:outline-none focus:border-accent-purple",
                  "placeholder:text-muted-foreground/50"
                )}
              />

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {prompt.length} chars
                  </span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">
                    Shift + Enter 换行
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
