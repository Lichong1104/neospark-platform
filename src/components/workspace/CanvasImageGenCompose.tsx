import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import drawingApi from "@/api/drawing";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { getErrorMessage } from "@/lib/errorMessage";
import { STATIC_BASE_URL } from "@/api/request";
import {
  DEFAULT_DRAWING_MODEL,
  type ModelsConfigMap,
} from "@/types/drawing";
import type { CanvasImage } from "./CanvasArea";
import { InlineCanvasMentionEditor } from "./InlineCanvasMentionEditor";
import {
  ImageGenerationParams,
  type GptImageQuality,
} from "./ImageGenerationParams";
import { type DropdownOption } from "@/components/ui/brutal-dropdown";
import {
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";

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

export const CanvasImageGenCompose: React.FC<{
  canvasImages: CanvasImage[];
  onFulfilled: (result: { src: string; name: string }) => void;
}> = ({ canvasImages, onFulfilled }) => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  const [model, setModel] = useState(DEFAULT_DRAWING_MODEL);
  const [gptImageQuality, setGptImageQuality] = useState<GptImageQuality>("low");
  const [modelsConfig, setModelsConfig] = useState<ModelsConfigMap | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const polling = useGenerationPolling();

  useEffect(() => {
    drawingApi.getModelsConfig().then(setModelsConfig).catch(() => {});
  }, []);

  const currentModelConfig = useMemo(
    () => modelsConfig?.[model],
    [modelsConfig, model]
  );

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

  useEffect(() => {
    if (polling.status !== "completed" || !polling.images.length) return;
    const img = polling.images[0];
    const src = img.url.startsWith("http")
      ? img.url
      : `${STATIC_BASE_URL}${img.url}`;
    onFulfilled({ src, name: `Generated_${Date.now()}` });
    setIsGenerating(false);
    polling.reset();
    setPrompt("");
  }, [polling.status, polling.images, onFulfilled, polling]);

  useEffect(() => {
    if (polling.status === "failed") {
      toast.error(polling.error || t("intelligenceHub.generateFailed"));
      setIsGenerating(false);
      polling.reset();
    }
  }, [polling.status, polling.error, polling, t]);

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
      return [{ value: model, label: model, icon: <Sparkles className="w-3 h-3" /> }];
    }
    return Object.entries(modelsConfig).map(([id, cfg]) => ({
      value: id,
      label: cfg.name.replace(/\s*\(Tengda\)/i, "").trim() || cfg.name,
      icon: <ImageIcon className="w-3 h-3" />,
    }));
  }, [modelsConfig, model]);

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;

    setIsGenerating(true);
    try {
      let sid = sessionId;
      if (!sid) {
        const session = await drawingApi.createSession({
          title: trimmed.slice(0, 20),
        });
        sid = session.session_id;
        setSessionId(sid);
      }

      const params = {
        prompt: trimmed,
        model,
        resolution,
        aspect_ratio: aspectRatio,
        num_images: 1,
        provider:
          currentModelConfig?.provider ??
          (model.startsWith("gemini") ? ("gemini" as const) : ("tengda" as const)),
        optimize_prompt: true,
        ...(model === "gpt-image-2" ? { quality: gptImageQuality } : {}),
      };

      const res = await drawingApi.generateImage(sid, params);
      toast.info(
        t("intelligenceHub.generatingCost", { cost: res.estimated_cost })
      );
      polling.startPolling(res.message_id);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, t("intelligenceHub.generateFailed")));
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
        placeholder={t("intelligenceHub.inputPlaceholder")}
        onSubmit={handleGenerate}
        enableSubmitOnEnter
        className="h-full"
        footerLeft={
          <ImageGenerationParams
            embedded
            aspectRatio={aspectRatio}
            resolution={resolution}
            model={model}
            isGptImage2={model === "gpt-image-2"}
            gptImageQuality={gptImageQuality}
            onGptImageQualityChange={setGptImageQuality}
            aspectRatioOptions={aspectRatioOptions}
            resolutionOptions={resolutionOptions}
            modelOptions={modelOptions}
            onAspectRatioChange={setAspectRatio}
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
                : "bg-accent-cyan text-foreground hover:brightness-110"
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
        }
      />
    </div>
  );
};
