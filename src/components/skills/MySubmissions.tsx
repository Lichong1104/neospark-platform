import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  BrutalCard,
  BrutalCardContent,
  BrutalCardHeader,
  BrutalCardTitle,
} from "@/components/ui/brutal-card";
import skillsApi from "@/api/skills";
import type { SkillSubmissionItem, SkillSubmissionStatus } from "@/types/skills";
import { History } from "lucide-react";

const STATUS_STYLES: Record<SkillSubmissionStatus, string> = {
  pending: "bg-accent-yellow/15 text-foreground border-accent-yellow/60",
  approved: "bg-green-500/10 text-green-600 border-green-500/50",
  rejected: "bg-accent-red/10 text-accent-red border-accent-red/50",
};

const formatTime = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const MySubmissions: React.FC = () => {
  const { t } = useTranslation();

  const { data: items } = useQuery({
    queryKey: ["mySkillSubmissions"],
    queryFn: () => skillsApi.listMySubmissions(),
  });

  if (!items || items.length === 0) return null;

  const colHead =
    "text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-2";

  return (
    <BrutalCard shadow="default">
      <BrutalCardHeader>
        <BrutalCardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" />
          {t("skill.mySubmissions")}
          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-foreground text-background">
            {items.length}
          </span>
        </BrutalCardTitle>
      </BrutalCardHeader>
      <BrutalCardContent className="p-0">
        <div className="hidden sm:grid grid-cols-[3rem_1fr_5rem_5rem_6rem_8rem] border-b-brutal border-foreground">
          <span className={colHead}>{t("skill.colId")}</span>
          <span className={colHead}>{t("skill.colSkill")}</span>
          <span className={colHead}>{t("skill.colVersion")}</span>
          <span className={colHead}>{t("skill.colMode")}</span>
          <span className={colHead}>{t("skill.colStatus")}</span>
          <span className={colHead}>{t("skill.colTime")}</span>
        </div>
        <div className="divide-y divide-foreground/10">
          {items.map((item: SkillSubmissionItem) => (
            <div key={item.id} className="text-xs">
              <div className="grid grid-cols-[3rem_1fr_5rem_5rem_6rem_8rem] items-center gap-y-1 py-2.5 px-0 sm:px-0">
                <span className="font-mono text-muted-foreground pl-3">#{item.id}</span>
                <div className="min-w-0 pr-3">
                  <div className="font-mono font-bold truncate">{item.skill_id}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{item.name}</div>
                </div>
                <span className="font-mono text-muted-foreground">v{item.version}</span>
                <span>
                  <span
                    className={`inline-block px-1 py-0.5 text-[9px] font-mono font-bold uppercase border ${
                      item.execution_mode === "subprocess"
                        ? "border-accent-cyan/60 text-accent-cyan"
                        : "border-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {item.execution_mode === "subprocess"
                      ? t("skill.mode.subprocess")
                      : t("skill.mode.inline")}
                  </span>
                </span>
                <span
                  className={`inline-block w-fit px-1.5 py-0.5 text-[10px] font-bold uppercase border ${STATUS_STYLES[item.status]}`}
                >
                  {t(`skill.submissionStatus.${item.status}`, item.status)}
                </span>
                <span className="text-muted-foreground text-[10px] pr-3">
                  {formatTime(item.created_at)}
                </span>
              </div>
              {item.status === "rejected" && item.reject_reason ? (
                <div className="px-3 pb-2.5 text-[11px] text-accent-red leading-relaxed">
                  {item.reject_reason}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </BrutalCardContent>
    </BrutalCard>
  );
};

export default MySubmissions;
