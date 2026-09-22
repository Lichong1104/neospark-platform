import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Send, FileUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createVideoTask, getVideoModels, getVideoTask } from "@/api/video";
import storageApi from "@/api/storage";
import { STATIC_BASE_URL } from "@/api/request";
import { getErrorMessage } from "@/lib/errorMessage";
import type {
  CreateVideoParams,
  VideoModelsData,
  VideoResolution,
} from "@/types/video";
import {
  supportsDocumentInput,
  supportsReferenceAudio,
} from "@/lib/videoModelUtils";
import {
  canvasImageSlotLabel,
  canvasVideoSlotLabel,
  resolveImagesFromPromptSlots,
  resolveVideosFromPromptSlots,
  validatePromptCanvasImageSlots,
  validatePromptCanvasVideoSlots,
} from "@/lib/canvasImageSlots";
import type { CanvasImage } from "./CanvasArea";
import { InlineCanvasMentionEditor } from "./InlineCanvasMentionEditor";
import { GenerationErrorBanner } from "./GenerationErrorBanner";
import { VideoGenerationParams } from "./VideoGenerationParams";
import {
  defaultDurationOptionsForModel,
  mergeDurationOptionsFromApi,
  normalizeVideoRatio,
  pickDurationInOptions,
  resolveResolutionList,
} from "@/lib/videoModelUtils";

const getVideoFullUrl = (url: string) =>
  url.startsWith("http") ? url : `${STATIC_BASE_URL}${url}`;

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

export const CanvasVideoGenCompose: React.FC<{
  canvasImages: CanvasImage[];
  onFulfilled: (result: { src: string; name: string }) => void;
}> = ({ canvasImages, onFulfilled }) => {
  const { t } = useTranslation();
  const imageSlotPrefix = t("intelligenceHub.canvasImageSlotPrefix");
  const videoSlotPrefix = t("intelligenceHub.canvasVideoSlotPrefix");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gemini-omni-flash-preview");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState("5");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [modelOptions, setModelOptions] = useState<
    VideoModelsData["models"]
  >([]);
  const [videoModelsData, setVideoModelsData] = useState<VideoModelsData | null>(null);
  const [ratioOptions, setRatioOptions] = useState<string[]>(["16:9", "9:16", "1:1"]);
  const [durationOptions, setDurationOptions] = useState<string[]>(defaultDurationOptionsForModel(model));
  const [resolutionOptions, setResolutionOptions] = useState<string[]>([
    "720p",
    "1080p",
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  // 参考语音 / 参考文件（仅部分模型支持，见 videoModelUtils 能力矩阵）
  const [refAudioPaths, setRefAudioPaths] = useState<string[]>([]);
  const [refFilePath, setRefFilePath] = useState("");
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 生成失败的常驻内联报错（替代 toast 弹出）；prompt 在失败时保留，用户可直接重新生成
  const [genError, setGenError] = useState<string | null>(null);
  const taskIdRef = useRef<string | null>(null);
  const deliveredRef = useRef(false);

  const showRefAudio = supportsReferenceAudio(model);
  const showRefFile = supportsDocumentInput(model);

  const normalizeUploadPath = (p: string) =>
    p ? (p.startsWith("/") ? p : `/${p}`) : "";

  const handleUploadAudio = useCallback(
    async (file: File) => {
      try {
        const uploaded = await storageApi.uploadFile(file, "audio");
        const path = normalizeUploadPath(uploaded.url || uploaded.path || "");
        if (!path) return;
        setRefAudioPaths((prev) =>
          prev.includes(path) ? prev : [...prev, path]
        );
        toast.success(t("video.refUploaded"));
      } catch {
        toast.error(getErrorMessage(null, t("video.uploadFailed")));
      }
    },
    [t]
  );

  const handleUploadFile = useCallback(
    async (file: File) => {
      try {
        const uploaded = await storageApi.uploadFile(file, "other");
        const path = normalizeUploadPath(uploaded.url || uploaded.path || "");
        if (!path) return;
        // 参考文件最多 1 个，直接替换
        setRefFilePath(path);
        toast.success(t("video.refUploaded"));
      } catch {
        toast.error(getErrorMessage(null, t("video.uploadFailed")));
      }
    },
    [t]
  );

  useEffect(() => {
    getVideoModels()
      .then((res) => {
        setVideoModelsData(res);
        setModelOptions(res.models ?? []);
        if (res.models?.length) {
          setModel(res.models[0].id);
        }
        if (res.ratios?.length) {
          const ratios = res.ratios.map(normalizeVideoRatio);
          setRatioOptions(ratios);
          setRatio((prev) =>
            ratios.includes(normalizeVideoRatio(prev))
              ? normalizeVideoRatio(prev)
              : ratios[0]
          );
        }
        const resList = resolveResolutionList(res.resolutions);
        if (resList.length) {
          setResolutionOptions(resList);
          setResolution(resList[0] as VideoResolution);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!model || !videoModelsData) return;
    const durOpts = mergeDurationOptionsFromApi(videoModelsData.durations, model);
    setDurationOptions(durOpts);
    setDuration((prev) => pickDurationInOptions(prev, durOpts));

    const modelResolutions =
      videoModelsData.resolutions &&
      typeof videoModelsData.resolutions === "object" &&
      !Array.isArray(videoModelsData.resolutions)
        ? (videoModelsData.resolutions as Record<string, string[]>)[model]
        : resolveResolutionList(videoModelsData.resolutions);
    if (modelResolutions?.length) {
      setResolutionOptions(modelResolutions);
      setResolution((prev) =>
        modelResolutions.includes(prev) ? prev : (modelResolutions[0] as VideoResolution)
      );
    }
  }, [model, videoModelsData]);

  const pollTask = useCallback(
    async (taskId: string) => {
      let tries = 0;
      const run = async () => {
        if (taskIdRef.current !== taskId) return;
        try {
          const detail = await getVideoTask(taskId);
          if (taskIdRef.current !== taskId) return;

          if (detail.status === "completed" && detail.video_url) {
            if (!deliveredRef.current) {
              deliveredRef.current = true;
              onFulfilled({
                src: getVideoFullUrl(detail.video_url),
                name: `GeneratedVideo_${Date.now()}`,
              });
              toast.success(t("video.completed"));
              setPrompt("");
            }
            setIsGenerating(false);
            taskIdRef.current = null;
            return;
          }

          if (detail.status === "failed" || detail.status === "cancelled") {
            setGenError(detail.error_msg || t("video.failed"));
            setIsGenerating(false);
            taskIdRef.current = null;
            return;
          }

          tries += 1;
          if (tries > 120) {
            setGenError(t("video.fetchFailed"));
            setIsGenerating(false);
            taskIdRef.current = null;
            return;
          }
          window.setTimeout(() => void run(), 2000);
        } catch (err: unknown) {
          setGenError(getErrorMessage(err, t("video.fetchFailed")));
          setIsGenerating(false);
          taskIdRef.current = null;
        }
      };
      void run();
    },
    [onFulfilled, t]
  );

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;

    const canvasImageCount = canvasImages.filter(
      (i) => i.kind !== "gen-placeholder" && (i.type ?? "image") !== "video"
    ).length;
    const canvasVideoCount = canvasImages.filter(
      (i) => i.kind !== "gen-placeholder" && i.type === "video"
    ).length;

    const imageSlotCheck = validatePromptCanvasImageSlots(
      trimmed,
      canvasImageCount
    );
    if (!imageSlotCheck.ok) {
      setGenError(
        t("intelligenceHub.invalidCanvasSlot", {
          label: canvasImageSlotLabel(imageSlotCheck.invalidSlot, imageSlotPrefix),
          rangeStart: canvasImageSlotLabel(1, imageSlotPrefix),
          rangeEnd: canvasImageSlotLabel(canvasImageCount, imageSlotPrefix),
          max: canvasImageCount,
        })
      );
      return;
    }

    const videoSlotCheck = validatePromptCanvasVideoSlots(
      trimmed,
      canvasVideoCount
    );
    if (!videoSlotCheck.ok) {
      setGenError(
        t("intelligenceHub.invalidCanvasSlot", {
          label: canvasVideoSlotLabel(videoSlotCheck.invalidSlot, videoSlotPrefix),
          rangeStart: canvasVideoSlotLabel(1, videoSlotPrefix),
          rangeEnd: canvasVideoSlotLabel(canvasVideoCount, videoSlotPrefix),
          max: canvasVideoCount,
        })
      );
      return;
    }

    const slotRefImages = resolveImagesFromPromptSlots(canvasImages, trimmed);
    const slotRefVideos = resolveVideosFromPromptSlots(canvasImages, trimmed);

    const params: CreateVideoParams = {
      prompt: trimmed,
      model,
      duration: Number(pickDurationInOptions(duration, durationOptions)),
      ratio: normalizeVideoRatio(ratio),
      resolution,
      generate_audio: false,
      watermark: false,
      reference_image_urls:
        slotRefImages.length > 0
          ? slotRefImages
              .map((img) => toServerPath(img.src))
              .filter(Boolean)
          : undefined,
      reference_video_urls:
        slotRefVideos.length > 0
          ? slotRefVideos
              .map((v) => toServerPath(v.src))
              .filter(Boolean)
          : undefined,
      reference_audio_urls:
        showRefAudio && refAudioPaths.length > 0 ? refAudioPaths : undefined,
      reference_file_url: showRefFile && refFilePath ? refFilePath : undefined,
    };

    setIsGenerating(true);
    setGenError(null);
    deliveredRef.current = false;
    try {
      const res = await createVideoTask(params);
      taskIdRef.current = res.task_id;
      toast.info(t("video.taskCreated", { cost: res.pricing?.estimated_cost ?? "-" }));
      void pollTask(res.task_id);
    } catch (err: unknown) {
      setGenError(getErrorMessage(err, t("video.createFailed")));
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="h-full w-full flex flex-col gap-2"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {genError && (
        <GenerationErrorBanner
          message={genError}
          onRetry={handleGenerate}
          onDismiss={() => setGenError(null)}
        />
      )}
      <div className="flex-1 min-h-0">
        <InlineCanvasMentionEditor
          embedded
          value={prompt}
          onChange={setPrompt}
          canvasImages={canvasImages}
          allowedTypes={["image", "video"]}
          placeholder={t("video.promptPlaceholder")}
          onSubmit={handleGenerate}
          enableSubmitOnEnter
          className="h-full"
          footerLeft={
            <div className="flex items-center gap-1.5">
              <VideoGenerationParams
                embedded
                ratio={ratio}
                duration={duration}
                resolution={resolution}
                model={model}
                ratioOptions={ratioOptions}
                durationOptions={durationOptions}
                resolutionOptions={resolutionOptions}
                modelOptions={modelOptions}
                onRatioChange={setRatio}
                onDurationChange={setDuration}
                onResolutionChange={setResolution}
                onModelChange={setModel}
              />
              {showRefAudio && (
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  title={t("video.uploadRefAudio")}
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                    refAudioPaths.length > 0
                      ? "border-accent-cyan/50 bg-accent-cyan/15 text-foreground"
                      : "border-foreground/20 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              )}
              {showRefFile && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title={t("video.uploadRefFile")}
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                    refFilePath
                      ? "border-accent-orange/50 bg-accent-orange/15 text-foreground"
                      : "border-foreground/20 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileUp className="w-3.5 h-3.5" />
                </button>
              )}
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUploadAudio(file);
                  e.currentTarget.value = "";
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.txt,.md,.key,.pages,.numbers"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUploadFile(file);
                  e.currentTarget.value = "";
                }}
              />
            </div>
          }
          submitAction={
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className={cn(
                "inline-flex h-6 items-center justify-center gap-1 rounded-md px-2 text-[9px] font-bold uppercase transition-colors",
                isGenerating || !prompt.trim()
                  ? "bg-foreground/8 text-muted-foreground cursor-not-allowed"
                  : "bg-accent-purple text-card hover:brightness-110"
              )}
              title={t("video.generate")}
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{t("video.generate")}</span>
                </>
              )}
            </button>
          }
        />
      </div>
    </div>
  );
};
