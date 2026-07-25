import React, { useEffect, useRef, useState } from "react";
import { Video, Loader2, AlertCircle, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import drawingApi from "@/api/drawing";
import videoApi from "@/api/video";
import { STATIC_BASE_URL } from "@/api/request";
import { useVideoTaskPolling } from "@/hooks/useVideoTaskPolling";
import { getErrorMessage } from "@/lib/errorMessage";
import type {
  VideoTaskSummary,
  VideoTaskStatus,
  VideoResolution,
  VideoModelConfig,
} from "@/types/video";
import type { GenerateVideoFromMessageParams } from "@/types/drawing";

const VIDEO_DEFAULTS: GenerateVideoFromMessageParams = {
  model: "seedance-2.0",
  duration: 5,
  ratio: "16:9",
  resolution: "720p",
  generate_audio: false,
  watermark: false,
};

const VIDEO_RATIO_ORDER = ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"] as const;
const VIDEO_DURATION_OPTIONS = ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"];
const VIDEO_RESOLUTION_OPTIONS: VideoResolution[] = ["480p", "720p", "1080p", "2k"];

const ChipSelect: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={cn(
          "px-3 py-1.5 text-[11px] font-mono border transition-none",
          value === option.value
            ? "bg-accent-yellow text-foreground border-foreground brutal-shadow-yellow"
            : "bg-background text-muted-foreground border-foreground/20 hover:bg-secondary hover:text-foreground"
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);

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
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [modelOptions, setModelOptions] = useState<VideoModelConfig[]>([
    { id: "seedance-2.0", name: "Seedance 2.0", price_per_second: 0 },
  ]);

  const [model, setModel] = useState(VIDEO_DEFAULTS.model ?? "seedance-2.0");
  const [ratio, setRatio] = useState(VIDEO_DEFAULTS.ratio ?? "16:9");
  const [duration, setDuration] = useState(String(VIDEO_DEFAULTS.duration ?? 5));
  const [resolution, setResolution] = useState<VideoResolution>(
    (VIDEO_DEFAULTS.resolution as VideoResolution) ?? "720p"
  );
  const [generateAudio, setGenerateAudio] = useState(
    VIDEO_DEFAULTS.generate_audio ?? false
  );
  const [watermark, setWatermark] = useState(VIDEO_DEFAULTS.watermark ?? false);

  useEffect(() => {
    let cancelled = false;
    videoApi
      .getVideoModels()
      .then((data) => {
        if (cancelled) return;
        if (data.models?.length) {
          setModelOptions(data.models);
          setModel((prev) =>
            data.models.some((m) => m.id === prev) ? prev : data.models[0].id
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const canGenerate =
    role === "agent" &&
    status === "completed" &&
    Array.isArray(images) &&
    images.length > 0;

  const handleOpen = () => {
    if (!canGenerate) return;
    setIsOpen(true);
  };

  const handleConfirm = async () => {
    if (!canGenerate || isCreating) return;
    setIsCreating(true);
    try {
      const params: GenerateVideoFromMessageParams = {
        model,
        duration: Number(duration),
        ratio,
        resolution,
        generate_audio: generateAudio,
        watermark,
      };
      const res = await drawingApi.generateVideoFromMessage(messageId, params);
      const optimistic: VideoTaskSummary = {
        task_id: res.task_id,
        external_task_id: res.external_task_id,
        status: res.status ?? "pending",
        progress: res.progress ?? 0,
        model: res.model,
        duration: res.duration,
        ratio: res.ratio,
        resolution: res.resolution,
        generate_audio: params.generate_audio,
        watermark: params.watermark,
        estimated_cost: res.pricing?.estimated_cost,
        created_at: res.created_at,
        source_message_id: res.source_message_id ?? messageId,
      };
      onCreated(optimistic);
      setIsOpen(false);
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
    <>
      <button
        type="button"
        onClick={handleOpen}
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md border-brutal border-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold uppercase tracking-wider">
              {t("video.generate", { defaultValue: "生成视频" })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <section className="border-brutal border-foreground bg-card brutal-shadow">
              <div className="px-3 py-2 border-b border-foreground/15">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  {t("video.model")}
                </span>
              </div>
              <div className="p-2.5">
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-2.5 py-2 text-[11px] font-mono border border-foreground/20 bg-background focus:outline-none focus:border-accent-purple"
                >
                  {modelOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="border-brutal border-foreground bg-card brutal-shadow">
              <div className="px-3 py-2 border-b border-foreground/15">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  {t("video.ratio")} · {t("video.duration")} · {t("video.resolution")}
                </span>
              </div>
              <div className="p-2.5 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground w-16 shrink-0 pt-1">
                    {t("video.ratio")}
                  </span>
                  <ChipSelect
                    options={VIDEO_RATIO_ORDER.map((r) => ({ value: r, label: r }))}
                    value={ratio}
                    onChange={setRatio}
                  />
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground w-16 shrink-0 pt-1">
                    {t("video.duration")}
                  </span>
                  <ChipSelect
                    options={VIDEO_DURATION_OPTIONS.map((d) => ({ value: d, label: `${d}s` }))}
                    value={duration}
                    onChange={setDuration}
                  />
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground w-16 shrink-0 pt-1">
                    {t("video.resolution")}
                  </span>
                  <ChipSelect
                    options={VIDEO_RESOLUTION_OPTIONS.map((r) => ({ value: r, label: r }))}
                    value={resolution}
                    onChange={(v) => setResolution(v as VideoResolution)}
                  />
                </div>
              </div>
            </section>

            <section className="border-brutal border-foreground bg-card brutal-shadow">
              <div className="p-2.5 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setGenerateAudio(!generateAudio)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase border border-foreground/20 transition-none",
                    generateAudio
                      ? "bg-accent-cyan/15 text-foreground border-accent-cyan/40"
                      : "bg-background text-muted-foreground"
                  )}
                >
                  {generateAudio ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                  {generateAudio ? t("video.audioOn") : t("video.audioOff")}
                </button>

                <button
                  type="button"
                  onClick={() => setWatermark(!watermark)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase border border-foreground/20 transition-none",
                    watermark
                      ? "bg-accent-orange/15 text-foreground border-accent-orange/40"
                      : "bg-background text-muted-foreground"
                  )}
                >
                  {watermark ? t("video.watermarkOn") : t("video.watermarkOff")}
                </button>
              </div>
            </section>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isCreating}
                className="px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground bg-card hover:bg-secondary transition-none disabled:opacity-50"
              >
                {t("common.cancel", { defaultValue: "取消" })}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isCreating}
                className={cn(
                  "px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground brutal-press transition-none flex items-center gap-1.5",
                  isCreating
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-accent-purple text-foreground hover:brightness-110"
                )}
              >
                {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t("video.generate", { defaultValue: "生成视频" })}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
