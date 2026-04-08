import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import imageLayerApi from "@/api/imageLayer";
import { BASE_URL, STATIC_BASE_URL } from "@/api/request";
import type { BgRemovalTaskDetail, LayerTaskDetail, UpscaleTaskDetail } from "@/types/imageLayer";

type ProcessingType = "bg-remover" | "layer-split" | "upscale" | null;

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
      toast.info("背景移除任务已创建，正在处理...");

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
              toast.success("背景移除完成！");
            }
          } else if (detail.status === "failed") {
            stopPolling();
            setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
            toast.error("背景移除失败");
          } else {
            pollingRef.current = setTimeout(() => {
              void poll();
            }, 3000);
          }
        } catch {
          stopPolling();
          setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
          toast.error("查询背景移除状态失败");
        }
      };
      void poll();
    } catch (err: any) {
      setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
      if (err?.response?.status === 402) {
        toast.error("余额不足，无法执行背景移除");
      } else {
        toast.error("创建背景移除任务失败");
      }
    }
  }, [onResult, stopPolling]);

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
      toast.info(`分层任务已创建 (${numLayers}层)，预计消耗 ${res.pricing.estimated_cost} 积分`);

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
                toast.success(`分层完成！共 ${images.length} 层`);
              } else {
                toast.warning("分层完成，但未返回分层结果");
              }
            }
          } else if (detail.status === "failed") {
            stopPolling();
            setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
            toast.error("图片分层失败");
          } else {
            pollingRef.current = setTimeout(() => {
              void poll();
            }, 3000);
          }
        } catch {
          stopPolling();
          setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
          toast.error("查询分层状态失败");
        }
      };
      void poll();
    } catch (err: any) {
      setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
      if (err?.response?.status === 402) {
        toast.error("余额不足，无法执行图片分层");
      } else {
        toast.error("创建分层任务失败");
      }
    }
  }, [onResult, stopPolling]);

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
      toast.info(`画质增强任务已创建 (${targetResolution})，预计消耗 ${res.estimated_cost} 积分`);

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
              toast.success(`画质增强完成！${detail.result.width}×${detail.result.height}`);
            }
          } else if (detail.status === "failed") {
            stopPolling();
            setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
            toast.error("画质增强失败");
          } else {
            pollingRef.current = setTimeout(() => {
              void poll();
            }, 3000);
          }
        } catch {
          stopPolling();
          setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
          toast.error("查询画质增强状态失败");
        }
      };
      void poll();
    } catch (err: any) {
      setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
      if (err?.response?.status === 402) {
        toast.error("余额不足，无法执行画质增强");
      } else {
        toast.error("创建画质增强任务失败");
      }
    }
  }, [onResult, stopPolling]);

  const cancel = useCallback(() => {
    stopPolling();
    setState({ isProcessing: false, type: null, taskId: null, progress: 0 });
  }, [stopPolling]);

  return {
    state,
    startBgRemoval,
    startLayerSplit,
    startUpscale,
    cancel,
  };
}
