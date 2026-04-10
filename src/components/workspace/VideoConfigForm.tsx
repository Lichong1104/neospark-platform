import React from "react";
import { useTranslation } from "react-i18next";
import { Image, Volume2, VolumeX, Clock, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoModelConfig, VideoResolution } from "@/types/video";

interface VideoConfigFormProps {
  model: string;
  setModel: (v: string) => void;
  ratio: string;
  setRatio: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  resolution: VideoResolution;
  setResolution: (v: VideoResolution) => void;
  generateAudio: boolean;
  setGenerateAudio: (v: boolean) => void;
  firstFrameUrl: string;
  setFirstFrameUrl: (v: string) => void;
  lastFrameUrl: string;
  setLastFrameUrl: (v: string) => void;
  referenceImageUrls: string;
  setReferenceImageUrls: (v: string) => void;
  referenceVideoUrls: string;
  setReferenceVideoUrls: (v: string) => void;
  referenceAudioUrl: string;
  setReferenceAudioUrl: (v: string) => void;
  assetGroupName: string;
  setAssetGroupName: (v: string) => void;
  selectedCanvasImage?: {
    src: string;
    name: string;
    type?: "image" | "video";
  } | null;
  modelOptions: VideoModelConfig[];
  ratioOptions: string[];
  durationOptions: string[];
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

const VideoConfigForm: React.FC<VideoConfigFormProps> = ({
  model,
  setModel,
  ratio,
  setRatio,
  duration,
  setDuration,
  resolution,
  setResolution,
  generateAudio,
  setGenerateAudio,
  firstFrameUrl,
  setFirstFrameUrl,
  lastFrameUrl,
  setLastFrameUrl,
  referenceImageUrls,
  setReferenceImageUrls,
  referenceVideoUrls,
  setReferenceVideoUrls,
  referenceAudioUrl,
  setReferenceAudioUrl,
  assetGroupName: _assetGroupName,
  setAssetGroupName: _setAssetGroupName,
  selectedCanvasImage,
  modelOptions,
  ratioOptions,
  durationOptions,
}) => {
  const { t } = useTranslation();
  const chipRatios = ratioOptions.map((item) => ({ value: item, label: item }));
  const chipDurations = durationOptions.map((item) => ({
    value: item,
    label: `${item}s`,
  }));
  const resolutionOptions: { value: VideoResolution; label: string }[] = [
    { value: "720p", label: "720p" },
    { value: "480p", label: "480p" },
  ];

  return (
    <div className="space-y-3.5 px-4 pt-4 pb-2">
      <section className="border-brutal border-foreground bg-card brutal-shadow animate-scale-in">
        <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/15">
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
                {item.name} ({item.price_per_5s} pts / 5s)
              </option>
            ))}
          </select>
        </div>

        {selectedCanvasImage &&
          selectedCanvasImage.type !== "video" &&
          !firstFrameUrl && (
            <div className="px-2.5 pb-2.5">
              <div className="flex items-center gap-2 p-3 border border-accent-cyan/30 bg-accent-cyan/5 text-center">
                <Image className="w-4 h-4 text-accent-cyan shrink-0" />
                <span className="text-[11px] text-muted-foreground">
                  {t("video.canvasImageDetected")}
                </span>
              </div>
            </div>
          )}
      </section>

      <section className="border-brutal border-foreground bg-card brutal-shadow animate-fade-in">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-foreground/15">
          <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase text-muted-foreground">
            {t("video.ratio")} · {t("video.duration")} · {t("video.resolution")}
          </span>
        </div>

        <div className="p-2.5 space-y-3 bg-grid-lines">
          <div className="flex items-start gap-3">
            <span className="text-[10px] font-bold uppercase text-muted-foreground w-16 shrink-0 pt-1">
              {t("video.ratio")}
            </span>
            <ChipSelect
              options={chipRatios}
              value={ratio}
              onChange={setRatio}
            />
          </div>

          <div className="flex items-start gap-3">
            <span className="text-[10px] font-bold uppercase text-muted-foreground w-16 shrink-0 pt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t("video.duration")}
            </span>
            <ChipSelect
              options={chipDurations}
              value={duration}
              onChange={setDuration}
            />
          </div>

          <div className="flex items-start gap-3">
            <span className="text-[10px] font-bold uppercase text-muted-foreground w-16 shrink-0 pt-1">
              {t("video.resolution")}
            </span>
            <ChipSelect
              options={resolutionOptions}
              value={resolution}
              onChange={(v) => setResolution(v as VideoResolution)}
            />
          </div>
        </div>
      </section>

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
            {generateAudio ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            {generateAudio ? t("video.audioOn") : t("video.audioOff")}
          </button>
        </div>

        <div className="px-2.5 pb-2.5 pt-1 border-t border-foreground/15 space-y-2.5">
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">
              {t("video.firstFrameUrl")}
            </label>
            <input
              value={firstFrameUrl}
              onChange={(e) => setFirstFrameUrl(e.target.value)}
              placeholder={t("video.firstFrameUrlPlaceholder")}
              className="w-full px-2.5 py-2 text-[11px] font-mono border border-foreground/20 bg-background focus:outline-none focus:border-accent-purple"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">
              {t("video.lastFrameUrl")}
            </label>
            <input
              value={lastFrameUrl}
              onChange={(e) => setLastFrameUrl(e.target.value)}
              placeholder={t("video.lastFrameUrlPlaceholder")}
              className="w-full px-2.5 py-2 text-[11px] font-mono border border-foreground/20 bg-background focus:outline-none focus:border-accent-purple"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">
              {t("video.referenceImageUrls")}
            </label>
            <textarea
              value={referenceImageUrls}
              onChange={(e) => setReferenceImageUrls(e.target.value)}
              placeholder={t("video.multiUrlHint")}
              className="w-full min-h-[64px] px-2.5 py-2 text-[11px] font-mono border border-foreground/20 bg-background focus:outline-none focus:border-accent-purple resize-y"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">
              {t("video.referenceVideoUrls")}
            </label>
            <textarea
              value={referenceVideoUrls}
              onChange={(e) => setReferenceVideoUrls(e.target.value)}
              placeholder={t("video.multiUrlHint")}
              className="w-full min-h-[64px] px-2.5 py-2 text-[11px] font-mono border border-foreground/20 bg-background focus:outline-none focus:border-accent-purple resize-y"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">
              {t("video.referenceAudioUrl")}
            </label>
            <input
              value={referenceAudioUrl}
              onChange={(e) => setReferenceAudioUrl(e.target.value)}
              className="w-full px-2.5 py-2 text-[11px] font-mono border border-foreground/20 bg-background focus:outline-none focus:border-accent-purple"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export { VideoConfigForm };
