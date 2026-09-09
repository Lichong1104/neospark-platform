import React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationErrorBannerProps {
  message: string;
  /** 提供时展示「重新生成」按钮，以最近一次失败的参数重试 */
  onRetry?: () => void;
  /** 提供时展示关闭按钮；不关闭则报错常驻，直到下一次生成成功/开始 */
  onDismiss?: () => void;
  className?: string;
}

/**
 * 生成失败后的常驻内联报错条（Brutalist 风格）。
 * 替代 toast 弹出：错误固定在右侧面板内，提示用户失败后手动重新生成。
 */
export const GenerationErrorBanner: React.FC<GenerationErrorBannerProps> = ({
  message,
  onRetry,
  onDismiss,
  className,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "border-brutal border-accent-red bg-accent-red/10 px-3 py-2.5",
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-accent-red shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-accent-red">
            {t("intelligenceHub.generateFailed")}
          </p>
          {message ? (
            <p className="text-[11px] font-mono text-foreground/80 break-words leading-snug">
              {message}
            </p>
          ) : null}
          <p className="text-[10px] text-muted-foreground">
            {t("intelligenceHub.genErrorHint")}
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase border-brutal border-foreground bg-accent-red text-card brutal-press hover:brightness-110"
            >
              <RefreshCw className="w-3 h-3" />
              {t("agentResponse.regenerate")}
            </button>
          ) : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
            title={t("common.close", { defaultValue: "Close" })}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
};
