import React, { useState } from "react";
import {
  BrutalCard,
  BrutalCardHeader,
  BrutalCardTitle,
  BrutalCardContent,
} from "@/components/ui/brutal-card";
import { BarChart3, Maximize2, ChevronDown, ChevronUp, Play, FileQuestion } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STATIC_BASE_URL } from "@/api/request";

export interface UsageLogDetails {
  prompt?: string | null;
  negative_prompt?: string | null;
  model?: string | null;
  provider?: string | null;
  resolution?: string | null;
  aspect_ratio?: string | null;
  ratio?: string | null;
  width?: number | null;
  height?: number | null;
  num_images?: number | null;
  duration?: number | null;
  task_type?: string | null;
  generate_audio?: boolean | null;
  camera_fixed?: boolean | null;
  return_last_frame?: boolean | null;
  seed?: number | null;
  quality?: string | null;
  strength?: number | null;
  source_image_path?: string | null;
  source_video_url?: string | null;
  source_video_path?: string | null;
  target_resolution?: string | null;
  output_format?: string | null;
  num_layers?: number | null;
  ref_image_urls?: string[];
  result_image_urls?: string[];
  result_url?: string | null;
  layer_urls?: string[];
  video_url?: string | null;
  result_video_url?: string | null;
  status?: string | null;
  error_msg?: string | null;
}

export interface UsageLog {
  id: number;
  type: string;
  typeName: string;
  points: number;
  date: string;
  description: string;
  bizType: string;
  bizId: string;
  totalPointsAfter: number;
  frozenPointsAfter: number;
  idempotencyKey: string;
  details?: UsageLogDetails | null;
}

interface UsageMonitorProps {
  logs: UsageLog[];
  total?: number;
  fetchedCount?: number;
  offset?: number;
}

const getResultUrls = (details: UsageLogDetails | null | undefined): string[] => {
  if (!details) return [];
  return [
    ...(details.result_image_urls || []),
    ...(details.result_url ? [details.result_url] : []),
    ...(details.video_url ? [details.video_url] : []),
    ...(details.result_video_url ? [details.result_video_url] : []),
    ...(details.layer_urls || []),
  ].filter(Boolean) as string[];
};

const resolveMediaUrl = (url: string): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) {
    return STATIC_BASE_URL ? `${STATIC_BASE_URL}${url}` : url;
  }
  return url;
};

const isVideoUrl = (url: string): boolean => {
  const videoExtensions = new Set([".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v"]);
  const lower = url.split("?")[0].toLowerCase();
  return videoExtensions.has(lower.slice(lower.lastIndexOf(".")));
};

const isImageUrl = (url: string): boolean => {
  const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"]);
  const lower = url.split("?")[0].toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : "";
  return imageExtensions.has(ext);
};

const getMediaType = (url: string): "image" | "video" | "unknown" => {
  if (isImageUrl(url)) return "image";
  if (isVideoUrl(url)) return "video";
  return "unknown";
};

interface MediaLightboxProps {
  urls: string[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MediaLightbox: React.FC<MediaLightboxProps> = ({
  urls,
  initialIndex,
  open,
  onOpenChange,
}) => {
  const [index, setIndex] = useState(initialIndex);
  const currentUrl = urls[index];
  const type = currentUrl ? getMediaType(currentUrl) : "unknown";

  if (!open || !currentUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 border-foreground/30 bg-card overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-foreground/10">
          <DialogTitle className="text-sm flex items-center justify-between">
            <span>
              Preview {index + 1} / {urls.length}
            </span>
            {urls.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  className="px-2 py-1 text-xs border border-foreground/30 disabled:opacity-40 hover:border-accent-cyan"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={index === urls.length - 1}
                  onClick={() => setIndex((i) => Math.min(urls.length - 1, i + 1))}
                  className="px-2 py-1 text-xs border border-foreground/30 disabled:opacity-40 hover:border-accent-cyan"
                >
                  Next
                </button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center bg-black min-h-[300px] max-h-[75vh] p-2">
          {type === "image" ? (
            <img
              src={currentUrl}
              alt="Preview"
              className="max-w-full max-h-[70vh] object-contain"
            />
          ) : type === "video" ? (
            <video
              src={currentUrl}
              controls
              autoPlay
              className="max-w-full max-h-[70vh]"
            />
          ) : (
            <div className="text-card-foreground text-sm">
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent-cyan hover:underline"
              >
                Open file
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface MediaThumbnailProps {
  url: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const MediaThumbnail: React.FC<MediaThumbnailProps> = ({
  url,
  size = "md",
  onClick,
}) => {
  const type = getMediaType(url);
  const dimension = size === "sm" ? "w-8 h-8" : size === "md" ? "w-12 h-12" : "w-20 h-20";
  const iconSize = size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-6 h-6";

  const content =
    type === "image" ? (
      <img
        src={url}
        alt=""
        className={`${dimension} object-cover border border-card/30 bg-foreground`}
        loading="lazy"
      />
    ) : (
      <div
        className={`${dimension} flex items-center justify-center border border-card/30 bg-foreground relative`}
      >
        {type === "video" ? (
          <Play className={`${iconSize} text-accent-cyan`} />
        ) : (
          <FileQuestion className={`${iconSize} text-card/60`} />
        )}
      </div>
    );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 hover:opacity-80 transition-opacity"
      >
        {content}
      </button>
    );
  }

  return <a href={url} target="_blank" rel="noreferrer" className="shrink-0">{content}</a>;
};

const hasDetails = (log: UsageLog): boolean => {
  if (!log.details) return false;
  return Object.values(log.details).some((v) => {
    if (v === null || v === undefined || v === "" || v === false) return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    return `${value.length} item(s)`;
  }
  return String(value);
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === false ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return null;
  }
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1 border-b border-card/10 last:border-0">
      <span className="text-card/55 text-[11px] uppercase">{label}</span>
      <span className="text-card text-xs break-all">{value}</span>
    </div>
  );
};

const UsageLogDetailPanel: React.FC<{ log: UsageLog; onPreview: (urls: string[], index: number) => void }> = ({
  log,
  onPreview,
}) => {
  const { details } = log;
  const urls = getResultUrls(details).map(resolveMediaUrl);

  if (!hasDetails(log)) {
    return (
      <div className="text-xs text-card/55 py-2">
        No additional details available for this transaction.
      </div>
    );
  }

  return (
    <div className="bg-foreground/50 border border-card/10 p-3 mt-2 space-y-1">
      <DetailRow label="Prompt" value={details?.prompt} />
      <DetailRow label="Negative Prompt" value={details?.negative_prompt} />
      <DetailRow label="Model" value={details?.model} />
      <DetailRow label="Provider" value={details?.provider} />
      <DetailRow label="Resolution" value={details?.resolution || details?.target_resolution} />
      <DetailRow label="Aspect Ratio" value={details?.aspect_ratio || details?.ratio} />
      <DetailRow label="Size" value={details?.width && details?.height ? `${details.width}×${details.height}` : null} />
      <DetailRow label="Num Images" value={details?.num_images} />
      <DetailRow label="Duration" value={details?.duration} />
      <DetailRow label="Task Type" value={details?.task_type} />
      <DetailRow label="Generate Audio" value={details?.generate_audio} />
      <DetailRow label="Camera Fixed" value={details?.camera_fixed} />
      <DetailRow label="Return Last Frame" value={details?.return_last_frame} />
      <DetailRow label="Seed" value={details?.seed} />
      <DetailRow label="Quality" value={details?.quality} />
      <DetailRow label="Strength" value={details?.strength} />
      <DetailRow label="Output Format" value={details?.output_format} />
      <DetailRow label="Num Layers" value={details?.num_layers} />
      <DetailRow label="Source" value={details?.source_image_path || details?.source_video_url || details?.source_video_path} />
      <DetailRow label="Status" value={details?.status} />
      <DetailRow label="Error" value={details?.error_msg} />
      {urls.length > 0 && (
        <div className="py-1 border-b border-card/10 last:border-0">
          <div className="text-card/55 text-[11px] uppercase mb-1.5">Results</div>
          <div className="flex flex-wrap gap-2">
            {urls.map((url, idx) => (
              <MediaThumbnail
                key={idx}
                url={url}
                size="md"
                onClick={() => onPreview(urls, idx)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const UsageMonitor: React.FC<UsageMonitorProps> = ({
  logs,
  fetchedCount = 0,
  offset = 0,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  const displayLogs = React.useMemo(() => {
    return [...logs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [logs]);

  const getTypeBadgeClass = (type: UsageLog["type"]) => {
    const normalized = type.toLowerCase();
    if (normalized === "refund") return "text-accent-green border-accent-green/60";
    if (normalized === "recharge") return "text-accent-cyan border-accent-cyan/60";
    return "text-accent-red border-accent-red/60";
  };

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString([], {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const toggleExpanded = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const openPreview = (urls: string[], index: number) => {
    setLightbox({ urls, index });
  };

  return (
    <>
      <BrutalCard shadow="default" className="h-full overflow-hidden">
        <BrutalCardHeader className="bg-card pb-3 pt-4 px-4 !flex-row items-center justify-between gap-3">
          <BrutalCardTitle className="flex items-center gap-2 text-sm">
            <div className="p-1.5 bg-accent-cyan/80 border border-foreground/30">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            {t("uc.usageMonitor")}
          </BrutalCardTitle>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="shrink-0 p-1 bg-card border border-foreground/30 hover:border-accent-cyan hover:text-accent-cyan transition-colors"
            aria-label={t("uc.expandUsageMonitor", "Expand usage monitor")}
            title={t("uc.expandUsageMonitor", "Expand usage monitor")}
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </BrutalCardHeader>
        <BrutalCardContent className="space-y-3 px-4 pb-3">
          <div className="bg-foreground text-card p-2.5 font-mono text-sm">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-accent-green text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-accent-green" />
                {t("uc.transactionLog")}
              </div>
              <div className="text-xs text-card/60">
                Showing {displayLogs.length} / {fetchedCount} (offset {offset})
              </div>
            </div>

            <div className="grid grid-cols-[1.35fr_0.8fr_0.95fr_1.05fr_3.85fr] gap-2 px-2 py-1.5 text-[11px] uppercase text-card/60 border-y border-card/15 sticky top-0 bg-foreground z-10">
              <span className="tracking-wide">Time</span>
              <span className="tracking-wide">Type</span>
              <span className="text-right tracking-wide">Change</span>
              <span className="text-right tracking-wide">Total</span>
              <span className="tracking-wide border-l border-card/15 pl-3">Description</span>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {displayLogs.map((log) => {
                const urls = getResultUrls(log.details).map(resolveMediaUrl);
                return (
                  <div
                    key={log.id}
                    className="grid grid-cols-[1.35fr_0.8fr_0.95fr_1.05fr_3.85fr] gap-2 px-2 py-1.5 border-b border-card/10 last:border-0 text-xs leading-5"
                  >
                    <span className="text-accent-cyan whitespace-nowrap">{formatDateTime(log.date)}</span>
                    <span className={`w-fit h-fit px-1 py-[1px] border text-[10px] leading-4 ${getTypeBadgeClass(log.type)}`}>
                      {log.typeName}
                    </span>
                    <span
                      className={`text-right font-bold ${
                        log.type.toLowerCase() === "consume" ? "text-accent-red" : "text-accent-green"
                      }`}
                    >
                      {log.type.toLowerCase() === "consume" ? "-" : "+"}
                      {log.points}pts
                    </span>
                    <span className="text-right text-card/80 whitespace-nowrap pr-2">
                      {log.totalPointsAfter}pts
                    </span>
                    <span className="text-card/80 break-words border-l border-card/10 pl-3" title={log.description}>
                      <span className="flex items-start gap-2">
                        {urls.length > 0 && (
                          <MediaThumbnail url={urls[0]} size="sm" onClick={() => openPreview(urls, 0)} />
                        )}
                        <span className="flex-1">
                          {log.description || "-"}
                          <span className="block text-[11px] text-card/55 mt-0.5 uppercase">
                            {log.bizType || "unknown"}
                          </span>
                        </span>
                      </span>
                    </span>
                  </div>
                );
              })}
              {displayLogs.length === 0 ? (
                <div className="text-center text-card/60 py-6 text-xs">No transaction records</div>
              ) : null}
            </div>
          </div>
        </BrutalCardContent>
      </BrutalCard>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden p-0 border-foreground/30 bg-card">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-foreground/10">
            <DialogTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-accent-cyan" />
              {t("uc.usageMonitor")}
              <span className="text-xs font-normal text-muted-foreground ml-2">
                Showing {displayLogs.length} / {fetchedCount} (offset {offset})
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="bg-foreground text-card p-4 font-mono text-sm overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="grid grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr_2fr_0.5fr] gap-2 px-2 py-2 text-[11px] uppercase text-card/60 border-y border-card/15 sticky top-0 bg-foreground z-10">
              <span className="tracking-wide">Time</span>
              <span className="tracking-wide">Type</span>
              <span className="text-right tracking-wide">Change</span>
              <span className="text-right tracking-wide">Total</span>
              <span className="tracking-wide border-l border-card/15 pl-3">Description / Prompt</span>
              <span className="text-center tracking-wide">Detail</span>
            </div>

            {displayLogs.map((log) => {
              const isExpanded = expandedId === log.id;
              const detailPreview = log.details?.prompt || log.details?.model || log.details?.task_type;
              const urls = getResultUrls(log.details).map(resolveMediaUrl);
              return (
                <React.Fragment key={log.id}>
                  <div
                    className={`grid grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr_2fr_0.5fr] gap-2 px-2 py-2 border-b border-card/10 text-xs leading-5 ${
                      isExpanded ? "bg-card/10" : ""
                    }`}
                  >
                    <span className="text-accent-cyan whitespace-nowrap">{formatDateTime(log.date)}</span>
                    <span className={`w-fit h-fit px-1 py-[1px] border text-[10px] leading-4 ${getTypeBadgeClass(log.type)}`}>
                      {log.typeName}
                    </span>
                    <span
                      className={`text-right font-bold ${
                        log.type.toLowerCase() === "consume" ? "text-accent-red" : "text-accent-green"
                      }`}
                    >
                      {log.type.toLowerCase() === "consume" ? "-" : "+"}
                      {log.points}pts
                    </span>
                    <span className="text-right text-card/80 whitespace-nowrap pr-2">
                      {log.totalPointsAfter}pts
                    </span>
                    <div className="text-card/80 border-l border-card/10 pl-3 min-w-0">
                      <div className="flex items-start gap-3">
                        {urls.length > 0 && (
                          <MediaThumbnail url={urls[0]} size="lg" onClick={() => openPreview(urls, 0)} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="break-words" title={log.description}>
                            {log.description || "-"}
                          </div>
                          <div className="text-[11px] text-card/55 uppercase mt-0.5">
                            {log.bizType || "unknown"}
                            {detailPreview ? ` · ${formatValue(detailPreview)}` : ""}
                          </div>
                          {log.details?.prompt && (
                            <div className="text-[11px] text-accent-cyan mt-1 line-clamp-2" title={log.details.prompt}>
                              {log.details.prompt}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(log.id)}
                        className="p-1 border border-card/30 hover:bg-accent-cyan/20 transition-colors"
                        aria-label={isExpanded ? "Collapse details" : "Expand details"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="col-span-full px-2 pb-2 border-b border-card/10">
                      <UsageLogDetailPanel log={log} onPreview={openPreview} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {displayLogs.length === 0 ? (
              <div className="text-center text-card/60 py-8 text-xs">No transaction records</div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <MediaLightbox
        urls={lightbox?.urls || []}
        initialIndex={lightbox?.index || 0}
        open={!!lightbox}
        onOpenChange={(open) => !open && setLightbox(null)}
      />
    </>
  );
};
