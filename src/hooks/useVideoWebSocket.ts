import { useState, useCallback, useRef } from "react";
import { connectVideoWs } from "@/api/video";
import type { VideoWsMessage } from "@/types/video";

interface VideoWsState {
  status: "idle" | "connected" | "pending" | "processing" | "completed" | "failed";
  progress: number;
  videoUrl?: string;
  error?: string;
}

/**
 * 视频生成 WebSocket 实时状态 Hook
 */
export function useVideoWebSocket() {
  const [state, setState] = useState<VideoWsState>({
    status: "idle",
    progress: 0,
  });
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback((taskId: string) => {
    disconnect();
    setState({ status: "pending", progress: 0 });

    const ws = connectVideoWs(taskId, (data: VideoWsMessage) => {
      if (data.type === "connected") {
        setState({
          status: "connected",
          progress: data.progress || 0,
        });
      } else if (data.type === "status") {
        const newState: VideoWsState = {
          status: data.status as VideoWsState["status"],
          progress: data.progress,
          videoUrl: data.video_url,
          error: data.error,
        };
        setState(newState);

        if (data.status === "completed" || data.status === "failed") {
          wsRef.current?.close();
          wsRef.current = null;
        }
      }
    });

    ws.onerror = () => {
      setState((prev) => ({ ...prev, status: "failed", error: "WebSocket 连接失败" }));
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    disconnect();
    setState({ status: "idle", progress: 0 });
  }, [disconnect]);

  return { ...state, connect, disconnect, reset };
}
