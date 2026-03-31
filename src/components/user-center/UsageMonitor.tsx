import React from "react";
import { BrutalCard, BrutalCardHeader, BrutalCardTitle, BrutalCardContent } from "@/components/ui/brutal-card";
import { BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface UsageLog {
  action: string;
  amount: number;
  time: string;
}

interface UsageMonitorProps {
  logs: UsageLog[];
}

const weeklyData = [65, 45, 80, 55, 90, 40, 70];
const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const UsageMonitor: React.FC<UsageMonitorProps> = ({ logs }) => {
  const { t } = useTranslation();
  const maxVal = Math.max(...weeklyData);

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
      <BrutalCardContent className="space-y-4 px-4 pb-4">
        {/* Chart */}
        <div className="flex items-end gap-2 h-24 px-1">
          {weeklyData.map((value, i) => {
            const heightPct = (value / maxVal) * 100;
            const isMax = value === maxVal;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-mono">{value}</span>
                <div
                  className={`w-full transition-none ${isMax ? "bg-accent-cyan" : "bg-foreground/70"}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold px-1">
          {dayLabels.map((day) => (
            <span key={day} className="flex-1 text-center">{day}</span>
          ))}
        </div>

        {/* Transaction Log */}
        <div className="bg-foreground text-card p-3 font-mono text-xs">
          <div className="text-accent-green mb-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 bg-accent-green" />
            {t("uc.transactionLog")}
          </div>
          <div className="max-h-28 overflow-y-auto space-y-0">
            {logs.map((log, i) => (
              <div key={i} className="flex justify-between py-1.5 border-b border-card/10 last:border-0 text-xs">
                <span className="text-accent-cyan">{log.time}</span>
                <span className="text-card/70">{log.action}</span>
                <span className="text-accent-red font-bold">{log.amount}pts</span>
              </div>
            ))}
          </div>
        </div>
      </BrutalCardContent>
    </BrutalCard>
  );
};
