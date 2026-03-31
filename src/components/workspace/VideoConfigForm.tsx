import React from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  Sparkles,
  Volume2,
  VolumeX,
  Clock,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoConfigFormProps {
  mode: "text_to_video" | "image_to_video";
  setMode: (m: "text_to_video" | "image_to_video") => void;
  resolution: string;
  setResolution: (v: string) => void;
  ratio: string;
  setRatio: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  generateAudio: boolean;
  setGenerateAudio: (v: boolean) => void;
  seed: string;
  setSeed: (v: string) => void;
  negativePrompt: string;
  setNegativePrompt: (v: string) => void;
  refImagePath: string;
  setRefImagePath: (v: string) => void;
  selectedCanvasImage?: { src: string; name: string; type?: "image" | "video" } | null;
}

const ChipSelect: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}> = ({ options, value, onChange, className }) => (
  <div className={cn("flex flex-wrap gap-1.5", className)}>
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

const RESOLUTION_OPTIONS = [
  { value: "480p", label: "480p" },
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
];

const RATIO_OPTIONS = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
];

const DURATION_OPTIONS = [
  { value: "2", label: "2s" },
  { value: "3", label: "3s" },
  { value: "5", label: "5s" },
  { value: "8", label: "8s" },
  { value: "10", label: "10s" },
  { value: "12", label: "12s" },
];

const VideoConfigForm: React.FC<VideoConfigFormProps> = ({
  mode,
  setMode,
  resolution,
  setResolution,
  ratio,
  setRatio,
  duration,
  setDuration,
  generateAudio,
  setGenerateAudio,
  seed,
  setSeed,
  negativePrompt,
  setNegativePrompt,
  refImagePath,
  setRefImagePath,
  selectedCanvasImage,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3.5 px-4 pt-4 pb-2">
      {/* Mode card */}
      <section className="border-brutal border-foreground bg-card brutal-shadow animate-scale-in">
        <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/15">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">{t("video.mode")}</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {mode === "text_to_video" ? t("video.textToVideo") : t("video.imageToVideo")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 p-2.5">
          <button
            type="button"
            onClick={() => setMode("text_to_video")}
            className={cn(
              "py-2 text-[11px] font-bold uppercase flex items-center justify-center gap-1.5 border border-foreground/20 transition-none",
              mode === "text_to_video"
                ? "bg-foreground text-card border-foreground"
                : "bg-background text-foreground/65 hover:bg-secondary hover:text-foreground"
            )}
          >
            <Sparkles className="w-3 h-3" />
            {t("video.textToVideo")}
          </button>
          <button
            type="button"
            onClick={() => setMode("image_to_video")}
            className={cn(
              "py-2 text-[11px] font-bold uppercase flex items-center justify-center gap-1.5 border border-foreground/20 transition-none",
              mode === "image_to_video"
                ? "bg-foreground text-card border-foreground"
                : "bg-background text-foreground/65 hover:bg-secondary hover:text-foreground"
            )}
          >
            <Image className="w-3 h-3" />
            {t("video.imageToVideo")}
          </button>
        </div>

        {mode === "image_to_video" && (
          <div className="px-2.5 pb-2.5 animate-slide-in-left">
            <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">
              {t("video.refImage")}
            </label>

            {selectedCanvasImage && selectedCanvasImage.type !== "video" ? (
              /* Visual card showing selected canvas image */
              <div className="flex items-center gap-2.5 p-2 border border-accent-cyan/40 bg-accent-cyan/5">
                <div className="w-12 h-12 shrink-0 border border-foreground/20 bg-foreground/5 overflow-hidden">
                  <img
                    src={selectedCanvasImage.src}
                    alt={selectedCanvasImage.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-foreground truncate">{selectedCanvasImage.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground truncate">{refImagePath || "—"}</p>
                </div>
                <span className="text-[9px] font-bold uppercase text-accent-cyan shrink-0 px-1.5 py-0.5 border border-accent-cyan/30 bg-accent-cyan/10">
                  ✓ {t("video.refImage")}
                </span>
              </div>
            ) : (
              /* No image selected hint */
              <div className="flex items-center gap-2 p-3 border border-accent-orange/30 bg-accent-orange/5 text-center">
                <Image className="w-4 h-4 text-accent-orange shrink-0" />
                <span className="text-[11px] text-muted-foreground">
                  请在画布中选中一张图片作为参考图
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Params matrix card */}
      <section className="border-brutal border-foreground bg-card brutal-shadow animate-fade-in">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-foreground/15">
          <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase text-muted-foreground">
            {t("video.resolution")} · {t("video.ratio")} · {t("video.duration")}
          </span>
        </div>

        <div className="p-2.5 space-y-3 bg-grid-lines">
          <div className="flex items-start gap-3">
            <span className="text-[10px] font-bold uppercase text-muted-foreground w-16 shrink-0 pt-1 flex items-center gap-1">
              <Maximize2 className="w-3 h-3" />
              {t("video.resolution")}
            </span>
            <ChipSelect options={RESOLUTION_OPTIONS} value={resolution} onChange={setResolution} />
          </div>

          <div className="flex items-start gap-3">
            <span className="text-[10px] font-bold uppercase text-muted-foreground w-16 shrink-0 pt-1">
              {t("video.ratio")}
            </span>
            <ChipSelect options={RATIO_OPTIONS} value={ratio} onChange={setRatio} />
          </div>

          <div className="flex items-start gap-3">
            <span className="text-[10px] font-bold uppercase text-muted-foreground w-16 shrink-0 pt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t("video.duration")}
            </span>
            <ChipSelect options={DURATION_OPTIONS} value={duration} onChange={setDuration} />
          </div>
        </div>
      </section>

      {/* Audio + advanced card */}
      <section className="border-brutal border-foreground bg-card brutal-shadow animate-fade-in">
        <div className="p-2.5 flex items-center gap-2">
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
            {generateAudio ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {generateAudio ? t("video.audioOn") : t("video.audioOff")}
          </button>
        </div>

        <div className="px-2.5 pb-2.5 pt-1 border-t border-foreground/15 space-y-2.5">
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">
              {t("video.negativePrompt")}
            </label>
            <input
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder={t("video.negativePromptPlaceholder")}
              className="w-full px-2.5 py-2 text-[11px] font-mono border border-foreground/20 bg-background focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-muted-foreground shrink-0">Seed</span>
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="-1"
              className="w-24 px-2.5 py-2 text-[11px] font-mono border border-foreground/20 bg-background focus:outline-none focus:border-accent-purple"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export { VideoConfigForm };
