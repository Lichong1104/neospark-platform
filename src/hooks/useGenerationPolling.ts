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
 * 使用「上一请求结束后再间隔 intervalMs」的串行轮询，避免 setInterval 在接口慢时叠多个并发请求，
 * 导致完成后连续多次 setState / 业务侧重复渲染或多张图。
 * @param intervalMs 两次请求之间的间隔，默认 2000ms
 */
export function useGenerationPolling(intervalMs = 2000) {
  const [state, setState] = useState<PollingState>({
    status: "idle",
    images: [],
  });
  const nextPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (nextPollTimerRef.current) {
      clearTimeout(nextPollTimerRef.current);
      nextPollTimerRef.current = null;
    }
    sessionRef.current += 1;
  }, []);

  const startPolling = useCallback(
    (messageId: string) => {
      stopPolling();
      const sessionId = sessionRef.current;

      setState({ status: "pending", images: [] });

      const runPoll = async () => {
        if (sessionId !== sessionRef.current) return;
        try {
          const res: MessageStatusResponse = await drawingApi.getMessageStatus(messageId);
          if (sessionId !== sessionRef.current) return;

          setState({
            status: res.status,
            images: res.images || [],
            actualCost: res.actual_cost,
            generationTime: res.generation_time,
          });

          if (res.status === "completed" || res.status === "failed" || res.status === "cancelled") {
            return;
          }

          if (sessionId !== sessionRef.current) return;
          nextPollTimerRef.current = setTimeout(() => {
            void runPoll();
          }, intervalMs);
        } catch (err: unknown) {
          if (sessionId !== sessionRef.current) return;
          const message = err instanceof Error ? err.message : "Polling failed";
          setState((prev) => ({
            ...prev,
            status: "failed",
            error: message,
          }));
        }
      };

      void runPoll();
    },
    [intervalMs, stopPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({ status: "idle", images: [] });
  }, [stopPolling]);

  return { ...state, startPolling, stopPolling, reset };
}
