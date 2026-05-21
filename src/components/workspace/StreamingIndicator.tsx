import React from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const StreamingIndicator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 px-4">
      <div className="w-7 h-7 flex items-center justify-center border-brutal border-foreground bg-accent-pink/10">
        <Sparkles className="w-3.5 h-3.5 text-accent-pink animate-pulse" />
      </div>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-accent-pink rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">
          {t("skill.thinking")}
        </span>
      </div>
    </div>
  );
};

export default StreamingIndicator;
