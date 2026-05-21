import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import imageLayerApi from "@/api/imageLayer";
import { BASE_URL, STATIC_BASE_URL } from "@/api/request";
import type {
  BgRemovalTaskDetail,
  LayerTaskDetail,
  UpscaleTaskDetail,
  MultipleAnglesTaskDetail,
} from "@/types/imageLayer";

type ProcessingType = "bg-remover" | "layer-split" | "upscale" | "multiple-angles" | null;

interface ProcessingState {
  isProcessing: boolean;
  type: ProcessingType;
  taskId: string | null;
  progress: number;
}

interface ProcessedResult {
  type: ProcessingType;
  images: { src: string; name: string }[];
}

export function useImageProcessing(
  onResult: (result: ProcessedResult) => void
) {
  const { t } = useTranslation();
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    type: null,
    taskId: null,
    progress: 0,
  });
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTaskIdRef = useRef<string | null>(null);
  const deliveredTaskIdsRef = useRef<Set<string>>(new Set());

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    activeTaskIdRef.current = null;
  }, []);

  const getImagePath = (src: string): string => {
    // Extract relative path from full URL for API calls
    if (src.startsWith(STATIC_BASE_URL)) {
      return src.replace(STATIC_BASE_URL, "");
    }
    if (src.startsWith("http")) {
      try {
        return new URL(src).pathname;
      } catch {
        return src;
      }
    }
    return src;
  };

  const fullUrl = (path: string): string => {
    if (path.startsWith("http")) return path;
    return `${STATIC_BASE_URL}${path}`;
  };

  // ========== Background Removal ==========
  const startBgRemoval = useCallback(async (imageSrc: string, imageName: string) => {
    const imagePath = getImagePath(imageSrc);
    setState({ isProcessing: true, type: "bg-remover", taskId: null, progress: 0 });
    
    try {
      const res = await imageLayerApi.createBgRemovalTask({ image_path: imagePath });
      const taskId = res.task_id;
      stopPolling();
      activeTaskIdRef.current = taskId;
      setState(s => ({ ...s, taskId }));
      toast.info(t("imageProcessing.bgRemovalCreated", { defaultValue: "Background removal task created..." }));

      const poll = async () => {
        if (activeTaskIdRef.current !== taskId) return;
        try {
          const detail: BgRemovalTaskDetail = await imageLayerApi.getBgRemovalTask(taskId);
          if (activeTaskIdRef.current !== taskId) return;
          setState(s => ({ ...s, progress: detail.progress }));

          if (detail.status === "completed" && detail.local_path) {
            stopPolling();
            if (!deliveredTaskIdsRef.current.has(taskId)) {
              deliveredTaskIdsRef.current.add(taskId);
              setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
              onResult({
                type: "bg-remover",
                images: [{ src: fullUrl(detail.local_path), name: `${imageName}_nobg` }],
              });
              toast.success(t("imageProcessing.bgRemovalCompleted", { defaultValue: "Background removal completed" }));
            }
          } else if (detail.status === "failed") {
            stopPolling();
            setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
            toast.error(t("imageProcessing.bgRemovalFailed", { defaultValue: "Background removal failed" }));
          } else {
            pollingRef.current = setTimeout(() => {
              void poll();
            }, 3000);
          }
        } catch {
          stopPolling();
          setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
          toast.error(t("imageProcessing.bgRemovalStatusFailed", { defaultValue: "Failed to fetch background removal status" }));
        }
      };
      void poll();
    } catch (err: any) {
      setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
      if (err?.response?.status === 402) {
        toast.error(t("imageProcessing.insufficientCredits", { defaultValue: "Insufficient credits" }));
      } else {
        toast.error(t("imageProcessing.bgRemovalCreateFailed", { defaultValue: "Failed to create background removal task" }));
      }
    }
  }, [onResult, stopPolling, t]);

  // ========== Layer Split ==========
  const startLayerSplit = useCallback(async (imageSrc: string, imageName: string, numLayers = 4) => {
    const imagePath = getImagePath(imageSrc);
    setState({ isProcessing: true, type: "layer-split", taskId: null, progress: 0 });

    try {
      const res = await imageLayerApi.createLayerTask({ image_path: imagePath, num_layers: numLayers });
      const taskId = res.task_id;
      stopPolling();
      activeTaskIdRef.current = taskId;
      setState(s => ({ ...s, taskId }));
      toast.info(t("imageProcessing.layerSplitCreated", {
        layers: numLayers,
        cost: res.pricing.estimated_cost,
        defaultValue: "Layer split task created ({{layers}} layers), estimated cost {{cost}}",
      }));

      const poll = async () => {
        if (activeTaskIdRef.current !== taskId) return;
        try {
          const detail: LayerTaskDetail = await imageLayerApi.getLayerTask(taskId);
          if (activeTaskIdRef.current !== taskId) return;
          setState(s => ({ ...s, progress: detail.progress ?? 0 }));

          if (detail.status === "completed") {
            stopPolling();
            if (!deliveredTaskIdsRef.current.has(taskId)) {
              deliveredTaskIdsRef.current.add(taskId);
              setState({ isProcessing: false, type: null, taskId: null, progress: 0 });

              // Support both formats: new (layer_urls/local_paths) and legacy (layers[])
              let images: { src: string; name: string }[] = [];
              if (detail.local_paths && detail.local_paths.length > 0) {
                images = detail.local_paths.map((p, i) => ({
                  src: fullUrl(p),
                  name: `${imageName}_layer${i + 1}`,
                }));
              } else if (detail.layer_urls && detail.layer_urls.length > 0) {
                images = detail.layer_urls.map((url, i) => ({
                  src: url,
                  name: `${imageName}_layer${i + 1}`,
                }));
              } else if (detail.layers && detail.layers.length > 0) {
                images = detail.layers.map((layer, i) => ({
                  src: fullUrl(layer.local_path || layer.url),
                  name: `${imageName}_layer${i + 1}`,
                }));
              }

              if (images.length > 0) {
                onResult({ type: "layer-split", images });
                toast.success(t("imageProcessing.layerSplitCompleted", {
                  count: images.length,
                  defaultValue: "Layer split completed ({{count}} layers)",
                }));
              } else {
                toast.warning(t("imageProcessing.layerSplitNoResult", { defaultValue: "Layer split completed, but no results returned" }));
              }
            }
          } else if (detail.status === "failed") {
            stopPolling();
            setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
            toast.error(t("imageProcessing.layerSplitFailed", { defaultValue: "Layer split failed" }));
          } else {
            pollingRef.current = setTimeout(() => {
              void poll();
            }, 3000);
          }
        } catch {
          stopPolling();
          setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
          toast.error(t("imageProcessing.layerSplitStatusFailed", { defaultValue: "Failed to fetch layer split status" }));
        }
      };
      void poll();
    } catch (err: any) {
      setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
      if (err?.response?.status === 402) {
        toast.error(t("imageProcessing.insufficientCredits", { defaultValue: "Insufficient credits" }));
      } else {
        toast.error(t("imageProcessing.layerSplitCreateFailed", { defaultValue: "Failed to create layer split task" }));
      }
    }
  }, [onResult, stopPolling, t]);

  // ========== Upscale ==========
  const startUpscale = useCallback(async (
    imageSrc: string,
    imageName: string,
    targetResolution: "2K" | "4K" | "8K" = "4K",
    outputFormat: "jpeg" | "png" | "webp" = "png"
  ) => {
    const imagePath = getImagePath(imageSrc);
    setState({ isProcessing: true, type: "upscale", taskId: null, progress: 0 });

    try {
      const res = await imageLayerApi.createUpscaleTask({
        image_url: imagePath,
        target_resolution: targetResolution,
        output_format: outputFormat,
      });
      const taskId = res.task_id;
      stopPolling();
      activeTaskIdRef.current = taskId;
      setState(s => ({ ...s, taskId }));
      toast.info(t("imageProcessing.upscaleCreated", {
        targetResolution,
        cost: res.estimated_cost,
        defaultValue: "Upscale task created ({{targetResolution}}), estimated cost {{cost}}",
      }));

      const poll = async () => {
        if (activeTaskIdRef.current !== taskId) return;
        try {
          const detail: UpscaleTaskDetail = await imageLayerApi.getUpscaleTask(taskId);
          if (activeTaskIdRef.current !== taskId) return;
          setState(s => ({ ...s, progress: detail.progress }));

          if (detail.status === "completed" && detail.result) {
            stopPolling();
            if (!deliveredTaskIdsRef.current.has(taskId)) {
              deliveredTaskIdsRef.current.add(taskId);
              setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
              onResult({
                type: "upscale",
                images: [{
                  src: fullUrl(detail.result.url),
                  name: `${imageName}_${targetResolution}`,
                }],
              });
              toast.success(t("imageProcessing.upscaleCompleted", {
                width: detail.result.width,
                height: detail.result.height,
                defaultValue: "Upscale completed ({{width}}×{{height}})",
              }));
            }
          } else if (detail.status === "failed") {
            stopPolling();
            setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
            toast.error(t("imageProcessing.upscaleFailed", { defaultValue: "Upscale failed" }));
          } else {
            pollingRef.current = setTimeout(() => {
              void poll();
            }, 3000);
          }
        } catch {
          stopPolling();
          setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
          toast.error(t("imageProcessing.upscaleStatusFailed", { defaultValue: "Failed to fetch upscale status" }));
        }
      };
      void poll();
    } catch (err: any) {
      setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
      if (err?.response?.status === 402) {
        toast.error(t("imageProcessing.insufficientCredits", { defaultValue: "Insufficient credits" }));
      } else {
        toast.error(t("imageProcessing.upscaleCreateFailed", { defaultValue: "Failed to create upscale task" }));
      }
    }
  }, [onResult, stopPolling, t]);

  // ========== Multiple Angles ==========
  const startMultipleAngles = useCallback(async (
    imageSrc: string,
    imageName: string,
    params: {
      horizontalAngle: number;
      verticalAngle: number;
      distance: number;
      prompt?: string;
      negativePrompt?: string;
      seed?: number;
    }
  ) => {
    const imagePath = getImagePath(imageSrc);
    setState({ isProcessing: true, type: "multiple-angles", taskId: null, progress: 0 });

    try {
      const res = await imageLayerApi.createMultipleAnglesTask({
        image_path: imagePath,
        horizontal_angle: params.horizontalAngle,
        vertical_angle: params.verticalAngle,
        distance: params.distance,
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
        seed: params.seed ?? -1,
      });
      const taskId = res.task_id;
      stopPolling();
      activeTaskIdRef.current = taskId;
      setState(s => ({ ...s, taskId }));
      toast.info(t("imageProcessing.multipleAnglesCreated", {
        cost: res.pricing.estimated_cost,
        defaultValue: "Multiple angles task created, estimated cost {{cost}}",
      }));

      const poll = async () => {
        if (activeTaskIdRef.current !== taskId) return;
        try {
          const detail: MultipleAnglesTaskDetail = await imageLayerApi.getMultipleAnglesTask(taskId);
          if (activeTaskIdRef.current !== taskId) return;
          setState(s => ({ ...s, progress: detail.progress }));

          if (detail.status === "completed" && detail.result_url) {
            stopPolling();
            if (!deliveredTaskIdsRef.current.has(taskId)) {
              deliveredTaskIdsRef.current.add(taskId);
              setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
              onResult({
                type: "multiple-angles",
                images: [{ src: fullUrl(detail.result_url), name: `${imageName}_angle` }],
              });
              toast.success(t("imageProcessing.multipleAnglesCompleted", {
                defaultValue: "Multiple angles generation completed",
              }));
            }
          } else if (detail.status === "failed") {
            stopPolling();
            setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
            toast.error(t("imageProcessing.multipleAnglesFailed", { defaultValue: "Multiple angles generation failed" }));
          } else {
            pollingRef.current = setTimeout(() => {
              void poll();
            }, 3000);
          }
        } catch {
          stopPolling();
          setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
          toast.error(t("imageProcessing.multipleAnglesStatusFailed", { defaultValue: "Failed to fetch multiple angles status" }));
        }
      };
      void poll();
    } catch (err: any) {
      setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
      if (err?.response?.status === 402) {
        toast.error(t("imageProcessing.insufficientCredits", { defaultValue: "Insufficient credits" }));
      } else {
        toast.error(t("imageProcessing.multipleAnglesCreateFailed", { defaultValue: "Failed to create multiple angles task" }));
      }
    }
  }, [onResult, stopPolling, t]);

  const cancel = useCallback(() => {
    stopPolling();
    setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
  }, [stopPolling]);

  return {
    state,
    startBgRemoval,
    startLayerSplit,
    startUpscale,
    startMultipleAngles,
    cancel,
  };
}
