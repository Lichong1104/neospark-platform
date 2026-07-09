import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AxiosRequestConfig } from "axios";
import { getVideoTask } from "@/api/video";
import {
  classifyPollingError,
  shouldRetryPollingError,
} from "@/lib/pollingError";
import type { VideoTaskDetail, VideoTaskStatus } from "@/types/video";

const POLL_INTERVAL_MS = 3000;
const COMPENSATION_INTERVAL_MS = 1500;
const MAX_NETWORK_RETRIES = 5;
const MAX_COMPLETED_NO_URL_TRIES = 30;
const GET_TIMEOUT_MS = 15000;

interface UseVideoTaskPollingOptions {
  onCompleted?: (videoUrl: string) => void;
}

interface UseVideoTaskPollingResult {
  status: VideoTaskStatus | "idle";
  progress: number;
  videoUrl: string;
  error: string;
  startPolling: (taskId: string) => void;
  reset: () => void;
}

export function useVideoTaskPolling(
  options: UseVideoTaskPollingOptions = {}
): UseVideoTaskPollingResult {
  const { t } = useTranslation();
  const [status, setStatus] = useState<VideoTaskStatus | "idle">("idle");
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  const sessionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedNoUrlTriesRef = useRef(0);
  const deliveredRef = useRef(false);
  const onCompletedRef = useRef(options.onCompleted);

  useEffect(() => {
    onCompletedRef.current = options.onCompleted;
  }, [options.onCompleted]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    sessionRef.current += 1;
    completedNoUrlTriesRef.current = 0;
    deliveredRef.current = false;
  }, []);

  const reset = useCallback(() => {
    stop();
    setStatus("idle");
    setProgress(0);
    setVideoUrl("");
    setError("");
  }, [stop]);

  const terminal = useCallback(
    (message: string, kind?: "auth") => {
      stop();
      setError(message);
      setStatus("failed");
      if (kind === "auth") {
        toast.error(message);
      }
    },
    [stop]
  );

  const startPolling = useCallback(
    (taskId: string) => {
      stop();
      const sessionId = sessionRef.current;

      setStatus("pending");
      setProgress(0);
      setVideoUrl("");
      setError("");
      let retryCount = 0;

      const schedule = (delay: number, fn: () => void) => {
        if (sessionId !== sessionRef.current) return;
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          fn();
        }, delay);
      };

      const poll = async () => {
        if (sessionId !== sessionRef.current) return;

        try {
          const detail = await getVideoTask(taskId, {
            timeout: GET_TIMEOUT_MS,
          } as AxiosRequestConfig);

          if (sessionId !== sessionRef.current) return;
          retryCount = 0;

          setStatus(detail.status);
          setProgress(detail.progress ?? 0);
          if (detail.video_url) {
            setVideoUrl(detail.video_url);
          }

          if (detail.status === "completed") {
            if (!detail.video_url) {
              completedNoUrlTriesRef.current += 1;
              if (
                completedNoUrlTriesRef.current > MAX_COMPLETED_NO_URL_TRIES
              ) {
                terminal(t("video.completedNoUrl"));
                return;
              }
              setStatus("processing");
              setProgress((p) => Math.max(p, 99));
              schedule(COMPENSATION_INTERVAL_MS, poll);
              return;
            }

            if (!deliveredRef.current) {
              deliveredRef.current = true;
              onCompletedRef.current?.(detail.video_url);
            }
            return;
          }

          if (detail.status === "failed") {
            terminal(detail.error_msg || t("video.failed"));
            return;
          }

          if (detail.status === "cancelled") {
            terminal(t("video.cancelled"));
            return;
          }

          schedule(POLL_INTERVAL_MS, poll);
        } catch (err) {
          if (sessionId !== sessionRef.current) return;

          const classified = classifyPollingError(err);

          if (classified.kind === "auth") {
            terminal(t("video.sessionExpired"), "auth");
            return;
          }
          if (classified.kind === "notFound") {
            terminal(t("video.taskNotFound"));
            return;
          }

          if (!shouldRetryPollingError(classified.kind)) {
            terminal(t("video.fetchFailedAfterRetries"));
            return;
          }

          retryCount += 1;
          if (retryCount > MAX_NETWORK_RETRIES) {
            terminal(t("video.fetchFailedAfterRetries"));
            return;
          }

          const delay = Math.min(
            POLL_INTERVAL_MS * 1.5 ** (retryCount - 1),
            12000
          );
          schedule(delay, poll);
        }
      };

      void poll();
    },
    [stop, terminal, t]
  );

  useEffect(() => reset, [reset]);

  return { status, progress, videoUrl, error, startPolling, reset };
}
