import { useState, useCallback, useRef } from "react";
import drawingApi from "@/api/drawing";
import type { MessageStatusResponse, GeneratedImage } from "@/types/drawing";

interface PollingState {
  status: "idle" | "pending" | "generating" | "completed" | "failed" | "cancelled";
  images: GeneratedImage[];
  actualCost?: number;
  generationTime?: number;
  error?: string;
}

/**
 * 轮询图片生成状态的 Hook
 * @param intervalMs 轮询间隔，默认 2000ms
 */
export function useGenerationPolling(intervalMs = 2000) {
  const [state, setState] = useState<PollingState>({
    status: "idle",
    images: [],
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (messageId: string) => {
      stopPolling();
      setState({ status: "pending", images: [] });

      const poll = async () => {
        try {
          const res: MessageStatusResponse = await drawingApi.getMessageStatus(messageId);
          setState({
            status: res.status,
            images: res.images || [],
            actualCost: res.actual_cost,
            generationTime: res.generation_time,
          });

          if (res.status === "completed" || res.status === "failed" || res.status === "cancelled") {
            stopPolling();
          }
        } catch (err: any) {
          setState((prev) => ({
            ...prev,
            status: "failed",
            error: err?.message || "Polling failed",
          }));
          stopPolling();
        }
      };

      // 立即执行一次
      poll();
      timerRef.current = setInterval(poll, intervalMs);
    },
    [intervalMs, stopPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({ status: "idle", images: [] });
  }, [stopPolling]);

  return { ...state, startPolling, stopPolling, reset };
}
