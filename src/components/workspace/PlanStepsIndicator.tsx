import React from "react";
import { Check, Clock, ListOrdered, Loader2, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface PlanStep {
  skill_id: string;
  skill_name: string;
  task?: string;
}

interface PlanStepsIndicatorProps {
  steps: PlanStep[];
  /** 流是否仍在执行（true 时展示执行中状态） */
  running: boolean;
  /** 是否为续跑模式（从历史任务清单恢复） */
  continuation?: boolean;
  /** 已完成步骤数（来自后端 step_done 事件），默认 0 */
  completed?: number;
}

const PlanStepsIndicator: React.FC<PlanStepsIndicatorProps> = ({
  steps,
  running,
  continuation = false,
  completed = 0,
}) => {
  const { t } = useTranslation();
  if (!steps.length) return null;

  const allDone = completed >= steps.length;

  return (
    <div className="border-brutal border-foreground/20 bg-background">
      <div className="flex items-center gap-1.5 border-b border-foreground/10 bg-secondary/30 px-3 py-1.5">
        {running ? (
          <Loader2 className="h-3 w-3 animate-spin text-accent-pink" />
        ) : (
          <ListOrdered className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {continuation
            ? t("agentHub.planContinuationTitle")
            : t("agentHub.planTitle", { count: steps.length })}
        </span>
        <span
          className={cn(
            "ml-auto text-[10px] font-bold uppercase",
            running
              ? "text-accent-pink"
              : allDone
                ? "text-green-600"
                : "text-muted-foreground"
          )}
        >
          {running
            ? t("agentHub.planRunning")
            : allDone
              ? t("agentHub.planDone")
              : t("agentHub.planPartial")}
        </span>
      </div>
      <ol className="px-3 py-1.5">
        {steps.map((step, idx) => {
          const isDone = idx < completed;
          const isCurrent = idx === completed;
          return (
            <li
              key={`${step.skill_id}-${idx}`}
              className="flex items-center gap-2 py-1"
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center border font-mono text-[9px]",
                  isDone
                    ? "border-green-600/50 text-green-600"
                    : "border-foreground/30 text-muted-foreground"
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : idx + 1}
              </span>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center border px-1 py-px text-[10px] font-bold",
                  isCurrent && running
                    ? "border-accent-pink bg-accent-pink/15 text-foreground"
                    : isDone
                      ? "border-green-600/50 bg-green-600/10 text-foreground/80"
                      : "border-accent-pink/50 bg-accent-pink/5 text-foreground/80"
                )}
              >
                @{step.skill_name}
              </span>
              {step.task && (
                <span className="min-w-0 truncate text-[10px] text-muted-foreground">
                  {step.task}
                </span>
              )}
              {isDone && (
                <Check className="ml-auto h-3 w-3 shrink-0 text-green-600" />
              )}
              {isCurrent && running && (
                <Play className="ml-auto h-3 w-3 shrink-0 text-accent-pink" />
              )}
              {isCurrent && !running && !allDone && (
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[9px] font-bold uppercase text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {t("agentHub.planAwaiting")}
                </span>
              )}
              {idx > completed && (
                <span className="ml-auto shrink-0 text-[9px] font-bold uppercase text-muted-foreground/70">
                  {t("agentHub.planPending")}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default PlanStepsIndicator;
