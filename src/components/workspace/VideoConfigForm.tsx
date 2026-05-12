import React from "react";
import { useTranslation } from "react-i18next";
import { Image, Volume2, VolumeX, Clock, Maximize2, Upload, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATIC_BASE_URL } from "@/api/request";
import { canvasImageSlotLabel } from "@/lib/canvasImageSlots";
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
  watermark: boolean;
  setWatermark: (v: boolean) => void;
  firstFrameUrl: string;
  setFirstFrameUrl: (v: string) => void;
  lastFrameUrl: string;
  setLastFrameUrl: (v: string) => void;
  referenceImageUrls: string;
  setReferenceImageUrls: (v: string) => void;
  referenceVideoUrls: string;
  setReferenceVideoUrls: (v: string) => void;
  referenceAudioUrls: string;
  setReferenceAudioUrls: (v: string) => void;
  selectedCanvasImage?: {
    src: string;
    name: string;
    type?: "image" | "video";
  } | null;
  selectedCanvasImages?: {
    src: string;
    name: string;
    type?: "image" | "video";
  }[];
  canvasImages?: {
    src: string;
    name: string;
    type?: "image" | "video";
  }[];
  modelOptions: VideoModelConfig[];
  ratioOptions: string[];
  durationOptions: string[];
  resolutionOptions: string[];
  onUploadReference: (kind: "image" | "video" | "audio", file: File) => void;
  onUseSelectedCanvasRefs: () => void;
  onUseCanvasAsFirstFrame: () => void;
  onUseCanvasAsLastFrame: () => void;
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
  watermark,
  setWatermark,
  firstFrameUrl,
  setFirstFrameUrl,
  lastFrameUrl,
  setLastFrameUrl,
  referenceImageUrls,
  setReferenceImageUrls,
  referenceVideoUrls,
  setReferenceVideoUrls,
  referenceAudioUrls,
  setReferenceAudioUrls,
  selectedCanvasImage,
  selectedCanvasImages = [],
  canvasImages = [],
  modelOptions,
  ratioOptions,
  durationOptions,
  resolutionOptions,
  onUploadReference,
  onUseSelectedCanvasRefs,
  onUseCanvasAsFirstFrame,
  onUseCanvasAsLastFrame,
}) => {
  const { t } = useTranslation();
  const imageUploadRef = React.useRef<HTMLInputElement>(null);
  const videoUploadRef = React.useRef<HTMLInputElement>(null);
  const audioUploadRef = React.useRef<HTMLInputElement>(null);
  const selectedCanvasCount = selectedCanvasImages.length;

  type MentionField =
    | "firstFrameUrl"
    | "lastFrameUrl"
    | "referenceImageUrls"
    | "referenceVideoUrls";
  const [mention, setMention] = React.useState<{
    field: MentionField;
    query: string;
  } | null>(null);

  const normalizeCanvasPath = React.useCallback((src: string) => {
    if (!src) return "";
    if (src.startsWith(STATIC_BASE_URL)) return src.slice(STATIC_BASE_URL.length);
    if (src.startsWith("http")) {
      try {
        return new URL(src).pathname;
      } catch {
        return src;
      }
    }
    return src;
  }, []);

  const getMentionQuery = React.useCallback((value: string) => {
    const idx = value.lastIndexOf("@");
    if (idx < 0) return null;
    const tail = value.slice(idx + 1);
    if (/\s/.test(tail)) return null;
    return tail;
  }, []);

  const replaceLastAtToken = React.useCallback((value: string, replacement: string) => {
    const idx = value.lastIndexOf("@");
    if (idx < 0) return value;
    const tail = value.slice(idx + 1);
    if (/\s/.test(tail)) return value;
    return `${value.slice(0, idx)}${replacement}`;
  }, []);

  const updateMentionState = React.useCallback(
    (field: MentionField, value: string) => {
      const q = getMentionQuery(value);
      if (q === null) {
        if (mention?.field === field) setMention(null);
        return;
      }
      setMention({ field, query: q });
    },
    [getMentionQuery, mention?.field]
  );

  const canvasEntriesWithSlots = React.useMemo(() => {
    let imgSlot = 0;
    let vidSlot = 0;
    return canvasImages.map((item) => {
      const typ = item.type ?? "image";
      if (typ === "video") {
        vidSlot += 1;
        return { item, slot: vidSlot, role: "video" as const };
      }
      imgSlot += 1;
      return { item, slot: imgSlot, role: "image" as const };
    });
  }, [canvasImages]);

  const visibleCanvasItems = React.useMemo(() => {
    if (!mention) return [];
    const expectedRole =
      mention.field === "referenceVideoUrls" ? ("video" as const) : ("image" as const);
    const normalizedQuery = mention.query.trim().toLowerCase();
    return canvasEntriesWithSlots
      .filter((row) => row.role === expectedRole)
      .filter((row) => {
        if (!normalizedQuery) return true;
        const label =
          row.role === "image"
            ? canvasImageSlotLabel(row.slot).toLowerCase()
            : `视频${row.slot}`.toLowerCase();
        if (
          (expectedRole === "image" && /^图\d*$/.test(normalizedQuery)) ||
          (expectedRole === "video" && /^视频\d*$/.test(normalizedQuery))
        ) {
          return label.startsWith(normalizedQuery);
        }
        const m =
          expectedRole === "image"
            ? /^图(\d+)$/.exec(normalizedQuery)
            : /^视频(\d+)$/.exec(normalizedQuery);
        if (m) return Number(m[1]) === row.slot;
        return (
          row.item.name.toLowerCase().includes(normalizedQuery) ||
          normalizeCanvasPath(row.item.src).toLowerCase().includes(normalizedQuery)
        );
      })
      .slice(0, 20);
  }, [mention, canvasEntriesWithSlots, normalizeCanvasPath]);

  const applyMentionPick = React.useCallback(
    (field: MentionField, src: string) => {
      const path = normalizeCanvasPath(src);
      if (!path) return;
      if (field === "firstFrameUrl") {
        setFirstFrameUrl(replaceLastAtToken(firstFrameUrl, path));
      } else if (field === "lastFrameUrl") {
        setLastFrameUrl(replaceLastAtToken(lastFrameUrl, path));
      } else if (field === "referenceImageUrls") {
        setReferenceImageUrls(replaceLastAtToken(referenceImageUrls, path));
      } else if (field === "referenceVideoUrls") {
        setReferenceVideoUrls(replaceLastAtToken(referenceVideoUrls, path));
      }
      setMention(null);
    },
    [
      normalizeCanvasPath,
      replaceLastAtToken,
      firstFrameUrl,
      lastFrameUrl,
      referenceImageUrls,
      referenceVideoUrls,
      setFirstFrameUrl,
      setLastFrameUrl,
      setReferenceImageUrls,
      setReferenceVideoUrls,
    ]
  );

  const renderMentionPanel = (field: MentionField) => {
    if (!mention || mention.field !== field) return null;
    return (
      <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-44 overflow-y-auto border border-foreground/20 bg-card brutal-shadow">
        {visibleCanvasItems.length === 0 ? (
          <div className="px-2.5 py-2 text-[10px] text-muted-foreground">
            {t("video.noCanvasResourceMatch")}
          </div>
        ) : (
          visibleCanvasItems.map((row, idx) => (
            <button
              key={`${row.item.name}-${row.slot}-${idx}`}
              type="button"
              onClick={() => applyMentionPick(field, row.item.src)}
              className="w-full px-2.5 py-2 text-left border-b border-foreground/10 last:border-b-0 hover:bg-secondary transition-none flex items-center gap-2"
            >
              {(row.item.type ?? "image") === "image" ? (
                <img
                  src={
                    row.item.src.startsWith("http")
                      ? row.item.src
                      : `${STATIC_BASE_URL}${row.item.src}`
                  }
                  alt={row.item.name}
                  className="w-7 h-7 object-cover border border-foreground/20"
                />
              ) : (
                <div className="w-7 h-7 flex items-center justify-center border border-foreground/20 text-[10px] font-bold">
                  V
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">
                  <span className="text-accent-cyan mr-1">
                    {row.role === "image"
                      ? canvasImageSlotLabel(row.slot)
                      : `视频${row.slot}`}
                  </span>
                  {row.item.name}
                </div>
                <div className="text-[9px] text-muted-foreground truncate">
                  {normalizeCanvasPath(row.item.src)}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    );
  };

  const triggerUseCanvasRefs = () => onUseSelectedCanvasRefs();
  const chipRatios = ratioOptions.map((item) => ({ value: item, label: item }));
  const chipDurations = durationOptions.map((item) => ({
    value: item,
    label: `${item}s`,
  }));
  const chipResolutions = resolutionOptions.map((item) => ({
    value: item,
    label: item,
  }));

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
                {item.name}{" "}
                ({t("video.modelPricePerDuration", {
                  cost: item.price_per_second * 5,
                  duration: 5,
                })})
              </option>
            ))}
          </select>
        </div>
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
            <ChipSelect options={chipRatios} value={ratio} onChange={setRatio} />
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
              options={chipResolutions}
              value={resolution}
              onChange={(v) => setResolution(v as VideoResolution)}
            />
          </div>
        </div>
      </section>

      <section className="border-brutal border-foreground bg-card brutal-shadow animate-fade-in">
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

        <div className="px-2.5 pb-2.5 pt-1 border-t border-foreground/15 space-y-2.5">
          {selectedCanvasImage &&
            selectedCanvasImage.type !== "video" &&
            !firstFrameUrl && (
              <div className="flex items-center gap-2 p-2 border border-accent-cyan/30 bg-accent-cyan/5">
                <Image className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                <span className="text-[10px] text-muted-foreground">
                  {t("video.canvasImageDetected")}
                </span>
              </div>
            )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                {t("video.firstFrameUrl")}
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onUseCanvasAsFirstFrame}
                  title={t("video.useCanvasRefs", { count: selectedCanvasCount })}
                  className="p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none"
                >
                  <Link2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => imageUploadRef.current?.click()}
                  title={t("video.uploadRefImage")}
                  className="p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none"
                >
                  <Upload className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="relative group">
              <input
                value={firstFrameUrl}
                onChange={(e) => {
                  const v = e.target.value;
                  setFirstFrameUrl(v);
                  updateMentionState("firstFrameUrl", v);
                }}
                onFocus={(e) =>
                  updateMentionState("firstFrameUrl", e.target.value)
                }
                placeholder={t("video.firstFrameUrlPlaceholder")}
                className="w-full px-2.5 py-2 pr-8 text-[11px] font-mono border border-foreground/20 bg-background focus:outline-none focus:border-accent-purple"
              />
              {firstFrameUrl.trim() && (
                <button
                  type="button"
                  onClick={() => setFirstFrameUrl("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none opacity-0 group-hover:opacity-100"
                  title={t("video.clearInput")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {renderMentionPanel("firstFrameUrl")}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                {t("video.lastFrameUrl")}
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onUseCanvasAsLastFrame}
                  title={t("video.useCanvasRefs", { count: selectedCanvasCount })}
                  className="p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none"
                >
                  <Link2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => imageUploadRef.current?.click()}
                  title={t("video.uploadRefImage")}
                  className="p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none"
                >
                  <Upload className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="relative group">
              <input
                value={lastFrameUrl}
                onChange={(e) => {
                  const v = e.target.value;
                  setLastFrameUrl(v);
                  updateMentionState("lastFrameUrl", v);
                }}
                onFocus={(e) =>
                  updateMentionState("lastFrameUrl", e.target.value)
                }
                placeholder={t("video.lastFrameUrlPlaceholder")}
                className="w-full px-2.5 py-2 pr-8 text-[11px] font-mono border border-foreground/20 bg-background focus:outline-none focus:border-accent-purple"
              />
              {lastFrameUrl.trim() && (
                <button
                  type="button"
                  onClick={() => setLastFrameUrl("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none opacity-0 group-hover:opacity-100"
                  title={t("video.clearInput")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {renderMentionPanel("lastFrameUrl")}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                {t("video.referenceImageUrls")}
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={triggerUseCanvasRefs}
                  title={t("video.useCanvasRefs", { count: selectedCanvasCount })}
                  className="p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none"
                >
                  <Image className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => imageUploadRef.current?.click()}
                  title={t("video.uploadRefImage")}
                  className="p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none"
                >
                  <Upload className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="relative group">
              <textarea
                value={referenceImageUrls}
                onChange={(e) => {
                  const v = e.target.value;
                  setReferenceImageUrls(v);
                  updateMentionState("referenceImageUrls", v);
                }}
                onFocus={(e) =>
                  updateMentionState("referenceImageUrls", e.target.value)
                }
                placeholder={t("video.multiUrlHint")}
                className="w-full min-h-[64px] px-2.5 py-2 pr-8 text-[11px] font-mono border border-foreground/20 bg-background focus:outline-none focus:border-accent-purple resize-y"
              />
              {referenceImageUrls.trim() && (
                <button
                  type="button"
                  onClick={() => setReferenceImageUrls("")}
                  className="absolute right-1 top-1 p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none opacity-0 group-hover:opacity-100"
                  title={t("video.clearInput")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {renderMentionPanel("referenceImageUrls")}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                {t("video.referenceVideoUrls")}
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={triggerUseCanvasRefs}
                  title={t("video.useCanvasRefs", { count: selectedCanvasCount })}
                  className="p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none"
                >
                  <Image className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => videoUploadRef.current?.click()}
                  title={t("video.uploadRefVideo")}
                  className="p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none"
                >
                  <Upload className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="relative group">
              <textarea
                value={referenceVideoUrls}
                onChange={(e) => {
                  const v = e.target.value;
                  setReferenceVideoUrls(v);
                  updateMentionState("referenceVideoUrls", v);
                }}
                onFocus={(e) =>
                  updateMentionState("referenceVideoUrls", e.target.value)
                }
                placeholder={t("video.multiUrlHint")}
                className="w-full min-h-[64px] px-2.5 py-2 pr-8 text-[11px] font-mono border border-foreground/20 bg-background focus:outline-none focus:border-accent-purple resize-y"
              />
              {referenceVideoUrls.trim() && (
                <button
                  type="button"
                  onClick={() => setReferenceVideoUrls("")}
                  className="absolute right-1 top-1 p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none opacity-0 group-hover:opacity-100"
                  title={t("video.clearInput")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {renderMentionPanel("referenceVideoUrls")}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                {t("video.referenceAudioUrls")}
              </label>
              <button
                type="button"
                onClick={() => audioUploadRef.current?.click()}
                title={t("video.uploadRefAudio")}
                className="p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none"
              >
                <Upload className="w-3 h-3" />
              </button>
            </div>
            <div className="relative group">
              <textarea
                value={referenceAudioUrls}
                onChange={(e) => setReferenceAudioUrls(e.target.value)}
                placeholder={t("video.multiUrlHint")}
                className="w-full min-h-[48px] px-2.5 py-2 pr-8 text-[11px] font-mono border border-foreground/20 bg-background focus:outline-none focus:border-accent-purple resize-y"
              />
              {referenceAudioUrls.trim() && (
                <button
                  type="button"
                  onClick={() => setReferenceAudioUrls("")}
                  className="absolute right-1 top-1 p-1 border border-foreground/20 bg-background hover:bg-secondary transition-none opacity-0 group-hover:opacity-100"
                  title={t("video.clearInput")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <input
            ref={imageUploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadReference("image", file);
              e.currentTarget.value = "";
            }}
          />
          <input
            ref={videoUploadRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadReference("video", file);
              e.currentTarget.value = "";
            }}
          />
          <input
            ref={audioUploadRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadReference("audio", file);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </section>
    </div>
  );
};

export { VideoConfigForm };
