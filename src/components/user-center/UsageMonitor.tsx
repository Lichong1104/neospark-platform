import React from "react";
import { BrutalCard, BrutalCardHeader, BrutalCardTitle, BrutalCardContent } from "@/components/ui/brutal-card";
import { BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
}

interface UsageMonitorProps {
  logs: UsageLog[];
  total?: number;
  fetchedCount?: number;
  offset?: number;
}

export const UsageMonitor: React.FC<UsageMonitorProps> = ({
  logs,
  fetchedCount = 0,
  offset = 0,
}) => {
  const { t } = useTranslation();
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

  return (
    <BrutalCard shadow="default" className="h-full overflow-hidden">
      <BrutalCardHeader className="bg-card pb-3 pt-4 px-4">
        <BrutalCardTitle className="flex items-center gap-2 text-sm">
          <div className="p-1.5 bg-accent-cyan/80 border border-foreground/30">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          {t("uc.usageMonitor")}
        </BrutalCardTitle>
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
  );
};
