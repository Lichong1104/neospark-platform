import React, { useEffect, useRef, useState } from "react";
import { Video, Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import drawingApi from "@/api/drawing";
import { STATIC_BASE_URL } from "@/api/request";
import { useVideoTaskPolling } from "@/hooks/useVideoTaskPolling";
import { getErrorMessage } from "@/lib/errorMessage";
import type { VideoTaskSummary, VideoTaskStatus } from "@/types/video";
import type { GenerateVideoFromMessageParams } from "@/types/drawing";

const VIDEO_DEFAULTS: GenerateVideoFromMessageParams = {
  model: "seedance-2.0",
  duration: 5,
  ratio: "16:9",
  resolution: "720p",
  generate_audio: false,
  watermark: false,
};

const getVideoFullUrl = (url: string) => {
  if (!url) return url;
  return url.startsWith("http") ? url : `${STATIC_BASE_URL}${url}`;
};

const isTerminalStatus = (status?: VideoTaskStatus | "idle") =>
  status === "completed" || status === "failed" || status === "cancelled";

interface GenerateVideoButtonProps {
  messageId: string;
  role: "user" | "agent";
  status?: string;
  images?: { url: string; local_path: string }[];
  onCreated: (task: VideoTaskSummary) => void;
  className?: string;
}

const GenerateVideoButton: React.FC<GenerateVideoButtonProps> = ({
  messageId,
  role,
  status,
  images,
  onCreated,
  className,
}) => {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);

  const canGenerate =
    role === "agent" &&
    status === "completed" &&
    Array.isArray(images) &&
    images.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate || isCreating) return;
    setIsCreating(true);
    try {
      const res = await drawingApi.generateVideoFromMessage(
        messageId,
        VIDEO_DEFAULTS
      );
      const optimistic: VideoTaskSummary = {
        task_id: res.task_id,
        external_task_id: res.external_task_id,
        status: res.status ?? "pending",
        progress: res.progress ?? 0,
        model: res.model,
        duration: res.duration,
        ratio: res.ratio,
        resolution: res.resolution,
        generate_audio: VIDEO_DEFAULTS.generate_audio,
        watermark: VIDEO_DEFAULTS.watermark,
        estimated_cost: res.pricing?.estimated_cost,
        created_at: res.created_at,
        source_message_id: res.source_message_id ?? messageId,
      };
      onCreated(optimistic);
      toast.info(
        t("video.taskCreated", {
          cost: res.pricing?.estimated_cost ?? "?",
          defaultValue: `视频任务已创建 · ≈ ${
            res.pricing?.estimated_cost ?? "?"
          } pts`,
        })
      );
    } catch (err: unknown) {
      const statusCode = (err as { response?: { status?: number } })?.response
        ?.status;
      if (statusCode === 402) {
        toast.error(
          t("video.insufficientPoints", {
            defaultValue: "积分不足，无法生成视频",
          })
        );
      } else if (statusCode === 403) {
        toast.error(
          t("video.forbidden", {
            defaultValue: "无权限执行该操作",
          })
        );
      } else {
        toast.error(
          getErrorMessage(
            err,
            t("video.createFailed", { defaultValue: "创建视频任务失败" })
          )
        );
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (!canGenerate) return null;

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isCreating}
      className={cn(
        "inline-flex items-center gap-1.5 border-brutal border-foreground font-bold uppercase brutal-press transition-none",
        isCreating
          ? "bg-muted text-muted-foreground cursor-not-allowed"
          : "bg-accent-purple text-foreground hover:brightness-110",
        className
      )}
    >
      {isCreating ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Video className="h-3 w-3" />
      )}
      {t("video.generate", { defaultValue: "生成视频" })}
    </button>
  );
};

interface MessageVideoTaskListProps {
  messageId: string;
  role: "user" | "agent";
  status?: string;
  images?: { url: string; local_path: string }[];
  videoTasks?: VideoTaskSummary[];
  onChange?: (tasks: VideoTaskSummary[]) => void;
  hideGenerateButton?: boolean;
  className?: string;
}

const MessageVideoTaskList: React.FC<MessageVideoTaskListProps> = ({
  messageId,
  role,
  status,
  images,
  videoTasks = [],
  onChange,
  hideGenerateButton = false,
  className,
}) => {
  const handleTaskUpdate = (updated: VideoTaskSummary) => {
    onChange?.(videoTasks.map((t) => (t.task_id === updated.task_id ? updated : t)));
  };

  const handleTaskTerminal = async () => {
    try {
      const detail = await drawingApi.getMessageStatus(messageId);
      onChange?.(detail.video_tasks ?? []);
    } catch {
      // 刷新失败时保持当前乐观状态
    }
  };

  return (
    <div className={cn("mt-3 space-y-2", className)}>
      {!hideGenerateButton && (
        <GenerateVideoButton
          messageId={messageId}
          role={role}
          status={status}
          images={images}
          onCreated={(task) => onChange?.([...videoTasks, task])}
          className="px-2.5 py-1.5 text-[10px]"
        />
      )}
      {videoTasks.map((task) => (
        <VideoTaskItem
          key={task.task_id}
          task={task}
          onUpdate={handleTaskUpdate}
          onTerminal={handleTaskTerminal}
        />
      ))}
    </div>
  );
};

interface VideoTaskItemProps {
  task: VideoTaskSummary;
  onUpdate: (task: VideoTaskSummary) => void;
  onTerminal: () => void;
}

const VideoTaskItem: React.FC<VideoTaskItemProps> = ({
  task,
  onUpdate,
  onTerminal,
}) => {
  const { t } = useTranslation();
  const { status, progress, videoUrl, error, startPolling, reset } =
    useVideoTaskPolling();
  const startedRef = useRef(false);

  const shouldStart =
    !isTerminalStatus(task.status) ||
    (task.status === "completed" && !task.video_url && !videoUrl);

  useEffect(() => {
    if (startedRef.current && !shouldStart) {
      reset();
      startedRef.current = false;
      return;
    }
    if (startedRef.current || !shouldStart) return;
    startedRef.current = true;
    startPolling(task.task_id);
    return () => {
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStart, task.task_id]);

  useEffect(() => {
    if (status === "idle") return;
    const next: VideoTaskSummary = {
      ...task,
      status,
      progress,
      video_url: videoUrl || task.video_url,
      error_msg: error || task.error_msg,
    };
    onUpdate(next);
    if (isTerminalStatus(status)) {
      onTerminal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, progress, videoUrl, error]);

  const displayStatus =
    status !== "idle" ? status : task.status || "pending";
  const displayProgress =
    status !== "idle" ? progress : task.progress ?? 0;
  const displayVideoUrl = videoUrl || task.video_url;
  const displayError = error || task.error_msg;

  const statusLabel = t(`video.status.${displayStatus}`, {
    defaultValue: String(displayStatus).toUpperCase(),
  });

  const statusColor = cn(
    "font-bold uppercase",
    displayStatus === "completed" && "text-accent-green",
    displayStatus === "processing" && "text-accent-cyan",
    displayStatus === "pending" && "text-muted-foreground",
    displayStatus === "failed" && "text-accent-red",
    displayStatus === "cancelled" && "text-accent-yellow"
  );

  return (
    <div className="border-brutal border-foreground bg-card p-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {displayStatus === "failed" && (
            <AlertCircle className="h-3 w-3 text-accent-red" />
          )}
          <span className={cn("text-[10px] font-mono", statusColor)}>
            {statusLabel}
          </span>
        </div>
        {task.estimated_cost != null && (
          <span className="text-[10px] font-mono text-muted-foreground">
            ≈ {task.estimated_cost} pts
          </span>
        )}
      </div>

      {(displayStatus === "processing" || displayStatus === "pending") && (
        <Progress value={displayProgress} className="h-1" />
      )}

      {displayStatus === "completed" && displayVideoUrl && (
        <video
          className="w-full border border-foreground/20"
          src={getVideoFullUrl(displayVideoUrl)}
          controls
          preload="metadata"
          playsInline
        />
      )}

      {displayError && (
        <p className="text-[10px] text-accent-red leading-snug">
          {displayError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground font-mono">
        {task.model && <span>{task.model}</span>}
        {task.duration != null && <span>{task.duration}s</span>}
        {task.ratio && <span>{task.ratio}</span>}
        {task.resolution && <span>{task.resolution}</span>}
        {task.actual_cost != null && (
          <span className="text-accent-green font-bold">
            -{task.actual_cost} pts
          </span>
        )}
      </div>
    </div>
  );
};

export { GenerateVideoButton };
export default MessageVideoTaskList;
