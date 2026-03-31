import React from "react";
import { BrutalCard, BrutalCardContent } from "@/components/ui/brutal-card";
import { User, Coins, Calendar, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProfileHeaderProps {
  email: string | null;
  credits: number;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ email, credits }) => {
  const { t } = useTranslation();

  return (
    <BrutalCard shadow="default" className="overflow-hidden">
      <BrutalCardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-5 px-5">
        {/* Avatar */}
        <div className="w-12 h-12 bg-accent-cyan border-brutal border-foreground flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-foreground" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold uppercase tracking-widest truncate">
            {email || "user@neospark.ai"}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="px-2 py-0.5 bg-accent-yellow text-foreground text-[11px] font-bold uppercase border border-foreground/30">
              <Shield className="w-3 h-3 inline mr-1" />
              {t("uc.planFree")}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {t("uc.memberSince")} 2025-01
            </span>
          </div>
        </div>

        {/* Credits Quick View */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary border-brutal border-foreground shrink-0">
          <Coins className="w-4 h-4 text-accent-green" />
          <div>
            <div className="text-lg font-bold font-mono tabular-nums leading-none">{credits}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{t("uc.credits")}</div>
          </div>
        </div>
      </BrutalCardContent>
    </BrutalCard>
  );
};
