import React from "react";
import { MessageCircleQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmCardProps {
  question: string;
  options: string[];
  disabled?: boolean;
  onSelect: (option: string) => void;
}

/**
 * AI 编排过程中需要用户确认/选择时的交互卡片：
 * 展示问题文本 + 一组可点击的选项按钮，点击即把选项作为用户回复继续执行。
 */
const ConfirmCard: React.FC<ConfirmCardProps> = ({
  question,
  options,
  disabled = false,
  onSelect,
}) => {
  if (!options.length) return null;

  return (
    <div className="border-brutal border-foreground/40 bg-accent-pink/5 shadow-brutal">
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center border-brutal border-foreground bg-accent-pink">
          <MessageCircleQuestion className="h-3.5 w-3.5 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          {question && (
            <p className="text-xs font-bold leading-snug text-foreground">
              {question}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(option)}
                className={cn(
                  "inline-flex items-center border-brutal border-foreground bg-background px-2.5 py-1 text-[11px] font-bold text-foreground",
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : "brutal-press hover:bg-accent-pink hover:text-foreground"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmCard;
