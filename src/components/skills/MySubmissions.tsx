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

  return (
    <div className="mt-10">
      <BrutalCard shadow="default">
        <BrutalCardHeader>
          <BrutalCardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            {t("skill.mySubmissions")}
          </BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent>
          <div className="divide-y divide-foreground/10">
            {items.map((item: SkillSubmissionItem) => (
              <div key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-xs">
                <span className="font-mono text-muted-foreground">#{item.id}</span>
                <span className="font-mono font-bold">{item.skill_id}</span>
                <span className="truncate max-w-[200px]">{item.name}</span>
                <span className="font-mono text-muted-foreground">v{item.version}</span>
                <span
                  className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase border ${STATUS_STYLES[item.status]}`}
                >
                  {t(`skill.submissionStatus.${item.status}`, item.status)}
                </span>
                {item.status === "rejected" && item.reject_reason ? (
                  <span className="text-accent-red" title={item.reject_reason}>
                    {item.reject_reason}
                  </span>
                ) : null}
                <span className="ml-auto text-muted-foreground">{formatTime(item.created_at)}</span>
              </div>
            ))}
          </div>
        </BrutalCardContent>
      </BrutalCard>
    </div>
  );
};

export default MySubmissions;
