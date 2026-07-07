import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createVideoTask, getVideoModels, getVideoTask } from "@/api/video";
import { STATIC_BASE_URL } from "@/api/request";
import { getErrorMessage } from "@/lib/errorMessage";
import type {
  CreateVideoParams,
  VideoModelsData,
  VideoResolution,
} from "@/types/video";
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
import { VideoGenerationParams } from "./VideoGenerationParams";

const getVideoFullUrl = (url: string) =>
  url.startsWith("http") ? url : `${STATIC_BASE_URL}${url}`;

const normalizeVideoRatio = (ratio: string) => ratio.replace(/\s+/g, "");

const VIDEO_DURATION_MIN = 4;
const VIDEO_DURATION_MAX = 15;

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

function pickDurationInOptions(value: string, options: string[]): string {
  if (options.includes(value)) return value;
  return options[0] ?? "5";
}

export const CanvasVideoGenCompose: React.FC<{
  canvasImages: CanvasImage[];
  onFulfilled: (result: { src: string; name: string }) => void;
}> = ({ canvasImages, onFulfilled }) => {
  const { t } = useTranslation();
  const imageSlotPrefix = t("intelligenceHub.canvasImageSlotPrefix");
  const videoSlotPrefix = t("intelligenceHub.canvasVideoSlotPrefix");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("seedance-2.0");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState("5");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [modelOptions, setModelOptions] = useState<
    VideoModelsData["models"]
  >([]);
  const [ratioOptions, setRatioOptions] = useState<string[]>(["16:9", "9:16", "1:1"]);
  const [durationOptions, setDurationOptions] = useState<string[]>(defaultDurationOptions());
  const [resolutionOptions, setResolutionOptions] = useState<string[]>([
    "720p",
    "1080p",
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const taskIdRef = useRef<string | null>(null);
  const deliveredRef = useRef(false);

  useEffect(() => {
    getVideoModels()
      .then((res) => {
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
        const durOpts = mergeDurationOptionsFromApi(res.durations);
        setDurationOptions(durOpts);
        setDuration(pickDurationInOptions(String(res.durations?.default ?? "5"), durOpts));
        const resList = Array.isArray(res.resolutions)
          ? res.resolutions
          : Object.values(res.resolutions ?? {})[0];
        if (Array.isArray(resList) && resList.length) {
          setResolutionOptions(resList);
          setResolution(resList[0] as VideoResolution);
        }
      })
      .catch(() => {});
  }, []);

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
            toast.error(detail.error_msg || t("video.failed"));
            setIsGenerating(false);
            taskIdRef.current = null;
            return;
          }

          tries += 1;
          if (tries > 120) {
            toast.error(t("video.fetchFailed"));
            setIsGenerating(false);
            taskIdRef.current = null;
            return;
          }
          window.setTimeout(() => void run(), 2000);
        } catch (err: unknown) {
          toast.error(getErrorMessage(err, t("video.fetchFailed")));
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
      toast.error(
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
      toast.error(
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
    };

    setIsGenerating(true);
    deliveredRef.current = false;
    try {
      const res = await createVideoTask(params);
      taskIdRef.current = res.task_id;
      toast.info(t("video.taskCreated", { cost: res.pricing?.estimated_cost ?? "-" }));
      void pollTask(res.task_id);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, t("video.createFailed")));
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="h-full w-full"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
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
  );
};
