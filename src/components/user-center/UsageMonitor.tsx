import React, { useState } from "react";
import {
  BrutalCard,
  BrutalCardHeader,
  BrutalCardTitle,
  BrutalCardContent,
} from "@/components/ui/brutal-card";
import { BarChart3, Maximize2, X, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

const UsageLogDetailPanel: React.FC<{ log: UsageLog }> = ({ log }) => {
  const { details } = log;
  if (!hasDetails(log)) {
    return (
      <div className="text-xs text-card/55 py-2">
        No additional details available for this transaction.
      </div>
    );
  }

  const urls: string[] = [
    ...(details?.result_image_urls || []),
    ...(details?.result_url ? [details.result_url] : []),
    ...(details?.video_url ? [details.video_url] : []),
    ...(details?.result_video_url ? [details.result_video_url] : []),
    ...(details?.layer_urls || []),
  ].filter(Boolean) as string[];

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
        <div className="grid grid-cols-[120px_1fr] gap-2 py-1 border-b border-card/10 last:border-0">
          <span className="text-card/55 text-[11px] uppercase">Results</span>
          <div className="flex flex-wrap gap-2">
            {urls.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-accent-cyan text-xs hover:underline break-all"
              >
                {url.length > 60 ? `${url.slice(0, 60)}...` : url}
              </a>
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
              {displayLogs.map((log) => (
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
                    {log.description || "-"}
                    <span className="block text-[11px] text-card/55 mt-0.5 uppercase">
                      {log.bizType || "unknown"}
                    </span>
                  </span>
                </div>
              ))}
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
                      <UsageLogDetailPanel log={log} />
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
    </>
  );
};
