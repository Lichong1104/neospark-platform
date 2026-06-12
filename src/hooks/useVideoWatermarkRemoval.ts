import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import videoApi from "@/api/video";
import { STATIC_BASE_URL } from "@/api/request";
import type { VideoWatermarkRemovalTaskDetail } from "@/types/video";

interface WatermarkRemovalState {
  isProcessing: boolean;
  taskId: string | null;
  progress: number;
}

export function useVideoWatermarkRemoval(onResult?: (videoUrl: string) => void) {
  const { t } = useTranslation();
  const [state, setState] = useState<WatermarkRemovalState>({
    isProcessing: false,
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

  const fullUrl = (path: string): string => {
    if (path.startsWith("http")) return path;
    return `${STATIC_BASE_URL}${path}`;
  };

  const getVideoPath = (src: string): string => {
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

  const startWatermarkRemoval = useCallback(
    async (videoSrc: string, videoName: string) => {
      const videoPath = getVideoPath(videoSrc);
      setState({ isProcessing: true, taskId: null, progress: 0 });

      try {
        const res = await videoApi.createVideoWatermarkRemovalTask({
          video_path: videoPath,
        });
        const taskId = res.task_id;
        stopPolling();
        activeTaskIdRef.current = taskId;
        setState((s) => ({ ...s, taskId }));
        toast.info(t("videoProcessing.watermarkRemovalCreated"));

        const poll = async () => {
          if (activeTaskIdRef.current !== taskId) return;
          try {
            const detail: VideoWatermarkRemovalTaskDetail =
              await videoApi.getVideoWatermarkRemovalTask(taskId);
            if (activeTaskIdRef.current !== taskId) return;
            setState((s) => ({ ...s, progress: detail.progress }));

            if (
              detail.status === "completed" &&
              detail.result_video_url
            ) {
              stopPolling();
              if (!deliveredTaskIdsRef.current.has(taskId)) {
                deliveredTaskIdsRef.current.add(taskId);
                setState({
                  isProcessing: false,
                  taskId: null,
                  progress: 0,
                });
                onResult?.(fullUrl(detail.result_video_url));
                toast.success(t("videoProcessing.watermarkRemovalCompleted"));
              }
            } else if (detail.status === "failed") {
              stopPolling();
              setState({
                isProcessing: false,
                taskId: null,
                progress: 0,
              });
              toast.error(t("videoProcessing.watermarkRemovalFailed"));
            } else {
              pollingRef.current = setTimeout(() => {
                void poll();
              }, 5000);
            }
          } catch {
            stopPolling();
            setState({
              isProcessing: false,
              taskId: null,
              progress: 0,
            });
            toast.error(
              t("videoProcessing.watermarkRemovalStatusFailed", {
                defaultValue: "Failed to fetch watermark removal status",
              })
            );
          }
        };
        void poll();
      } catch (err: unknown) {
        setState({ isProcessing: false, taskId: null, progress: 0 });
        const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 402) {
          toast.error(t("videoProcessing.insufficientCredits"));
        } else {
          toast.error(
            axiosError.response?.data?.message ||
              t("videoProcessing.watermarkRemovalCreateFailed")
          );
        }
      }
    },
    [onResult, stopPolling, t]
  );

  return {
    state,
    startWatermarkRemoval,
  };
}
