import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Video,
  Film,
  Download,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { createVideoTask } from "@/api/video";
import { useVideoWebSocket } from "@/hooks/useVideoWebSocket";
import { BASE_URL } from "@/api/request";
import type { CreateVideoParams } from "@/types/video";
import { VideoConfigForm } from "./VideoConfigForm";

interface VideoGenerationPanelProps {
  onVideoGenerated?: (videoUrl: string) => void;
  selectedCanvasImage?: { src: string; name: string; type?: "image" | "video" } | null;
}

const getVideoFullUrl = (url: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
};

/** Strip BASE_URL prefix to get server-relative path for API */
const toServerPath = (fullUrl: string) => {
  if (!fullUrl) return "";
  if (fullUrl.startsWith(BASE_URL)) return fullUrl.slice(BASE_URL.length);
  if (fullUrl.startsWith("http")) {
    try { return new URL(fullUrl).pathname; } catch { return fullUrl; }
  }
  return fullUrl;
};

const VideoGenerationPanel: React.FC<VideoGenerationPanelProps> = ({ onVideoGenerated, selectedCanvasImage }) => {
  const { t } = useTranslation();
  const ws = useVideoWebSocket();

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [mode, setMode] = useState<"text_to_video" | "image_to_video">("text_to_video");
  const [resolution, setResolution] = useState("720p");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState("5");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [seed, setSeed] = useState("-1");
  const [refImagePath, setRefImagePath] = useState("");
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  // Auto-sync refImagePath from selected canvas image
  React.useEffect(() => {
    if (mode === "image_to_video" && selectedCanvasImage && selectedCanvasImage.type !== "video") {
      setRefImagePath(toServerPath(selectedCanvasImage.src));
    }
  }, [mode, selectedCanvasImage]);

  const isGenerating = ws.status === "pending" || ws.status === "processing" || ws.status === "connected";
  const showForm = !isGenerating && ws.status !== "completed" && ws.status !== "failed";

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    const params: CreateVideoParams = {
      prompt: prompt.trim(),
      negative_prompt: negativePrompt.trim() || undefined,
      mode,
      model: "doubao-seedance-1-5-pro-251215",
      duration: Number(duration),
      resolution: resolution as CreateVideoParams["resolution"],
      ratio,
      generate_audio: generateAudio,
      seed: Number(seed),
    };

    if (mode === "image_to_video") {
      if (!refImagePath.trim()) {
        toast.error(t("video.refImageRequired"));
        return;
      }
      params.ref_image_path = refImagePath.trim();
    }

    try {
      const res = await createVideoTask(params);
      setEstimatedCost(res.estimated_cost);
      toast.info(t("video.taskCreated", { cost: res.estimated_cost }));
      ws.connect(res.task_id);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || t("video.createFailed");
      toast.error(msg);
    }
  }, [prompt, negativePrompt, mode, resolution, ratio, duration, generateAudio, seed, refImagePath, isGenerating, ws, t]);

  React.useEffect(() => {
    if (ws.status === "completed" && ws.videoUrl) {
      const fullUrl = getVideoFullUrl(ws.videoUrl);
      toast.success(t("video.completed"));
      onVideoGenerated?.(fullUrl);
    } else if (ws.status === "failed") {
      toast.error(ws.error || t("video.failed"));
    }
  }, [ws.status, ws.videoUrl, ws.error]);

  const handleNewTask = () => {
    ws.reset();
    setPrompt("");
    setNegativePrompt("");
    setRefImagePath("");
    setEstimatedCost(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center pt-12 gap-5 px-4">
            <div className="relative">
              <div className="w-20 h-20 border-brutal border-foreground/20 flex items-center justify-center bg-accent-purple/5">
                <Film className="w-10 h-10 text-accent-purple" />
              </div>
              <div className="absolute -inset-2 border-2 border-accent-purple/30 border-t-accent-purple animate-spin rounded-none" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold uppercase tracking-widest">{t("video.generating")}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{t("video.generatingHint")}</p>
            </div>
            <div className="w-full max-w-[260px] space-y-2">
              <Progress value={ws.progress} className="h-2 border border-foreground/20" />
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>{ws.progress}%</span>
                {estimatedCost && <span className="text-accent-orange">~{estimatedCost} pts</span>}
              </div>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 120}ms`, animationDuration: "0.8s" }}
                />
              ))}
            </div>
          </div>
        ) : ws.status === "completed" && ws.videoUrl ? (
          <div className="space-y-4 px-4 pt-4 animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-accent-green">
              <Video className="w-4 h-4" />
              {t("video.result")}
              <span className="ml-auto text-[10px] text-muted-foreground font-normal">✓ {t("video.completed")}</span>
            </div>
            <div className="border-brutal border-foreground overflow-hidden bg-foreground/5 brutal-shadow">
              <video src={getVideoFullUrl(ws.videoUrl)} controls className="w-full" autoPlay muted />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = getVideoFullUrl(ws.videoUrl!);
                  a.download = `video_${Date.now()}.mp4`;
                  a.click();
                }}
                className="flex-1 py-2.5 text-xs font-bold uppercase border-brutal border-foreground bg-accent-green text-foreground brutal-press hover:brightness-110 flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {t("video.download")}
              </button>
              <button
                onClick={handleNewTask}
                className="flex-1 py-2.5 text-xs font-bold uppercase border-brutal border-foreground bg-card text-foreground brutal-press hover:bg-secondary flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t("video.newTask")}
              </button>
            </div>
          </div>
        ) : ws.status === "failed" ? (
          <div className="flex flex-col items-center justify-center pt-12 gap-4 px-4 animate-fade-in">
            <div className="w-20 h-20 border-brutal border-accent-red/30 flex items-center justify-center bg-accent-red/10">
              <Film className="w-10 h-10 text-accent-red" />
            </div>
            <p className="text-sm font-bold uppercase tracking-wider text-accent-red">{t("video.failed")}</p>
            <p className="text-xs text-muted-foreground text-center max-w-[260px]">{ws.error}</p>
            <button
              onClick={handleNewTask}
              className="px-6 py-2.5 text-xs font-bold uppercase border-brutal border-foreground bg-card brutal-press hover:bg-secondary flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("video.retry")}
            </button>
          </div>
        ) : (
          <VideoConfigForm
            mode={mode}
            setMode={setMode}
            resolution={resolution}
            setResolution={setResolution}
            ratio={ratio}
            setRatio={setRatio}
            duration={duration}
            setDuration={setDuration}
            generateAudio={generateAudio}
            setGenerateAudio={setGenerateAudio}
            seed={seed}
            setSeed={setSeed}
            negativePrompt={negativePrompt}
            setNegativePrompt={setNegativePrompt}
            refImagePath={refImagePath}
            setRefImagePath={setRefImagePath}
            selectedCanvasImage={selectedCanvasImage ?? null}
          />
        )}
      </div>

      {showForm && (
        <div className="border-t border-foreground/10 bg-background px-3 py-3">
          <div className="border-brutal border-foreground bg-card brutal-shadow animate-scale-in">
            <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/15">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">{t("video.prompt")}</span>
              <span className="text-[10px] font-bold text-accent-orange">
                {t("video.estimatedCost")}: ~{estimatedCost ?? 50} pts
              </span>
            </div>

            <div className="p-3 space-y-2.5">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleGenerate())}
                placeholder={t("video.promptPlaceholder")}
                className={cn(
                  "w-full min-h-[104px] p-3 border border-foreground/20 bg-background font-mono text-[12px] resize-none leading-relaxed",
                  "focus:outline-none focus:border-accent-purple",
                  "placeholder:text-muted-foreground/50"
                )}
              />

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-mono">{prompt.length} chars</span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">Shift + Enter 换行</span>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase border-brutal border-foreground brutal-press transition-none",
                    prompt.trim()
                      ? "bg-accent-purple text-card hover:brightness-110"
                      : "bg-secondary text-muted-foreground opacity-50 cursor-not-allowed"
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  {t("video.generate")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { VideoGenerationPanel };
