import React from "react";
import { BrutalCard, BrutalCardHeader, BrutalCardTitle, BrutalCardContent } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import { Coins, TrendingDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface CreditVaultProps {
  credits: number;
}

export const CreditVault: React.FC<CreditVaultProps> = ({ credits }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLow = credits < 200;
  const pct = Math.min((credits / 1000) * 100, 100);

  return (
    <BrutalCard shadow="default" className="overflow-hidden h-full flex flex-col">
      <BrutalCardHeader className="bg-card pb-3 pt-4 px-4">
        <BrutalCardTitle className="flex items-center gap-2 text-sm">
          <div className={`p-1.5 border border-foreground/30 ${isLow ? "bg-accent-red/80" : "bg-accent-green/80"}`}>
            <Coins className="w-3.5 h-3.5" />
          </div>
          {t("uc.creditVault")}
        </BrutalCardTitle>
      </BrutalCardHeader>
      <BrutalCardContent className="flex-1 flex flex-col items-center justify-center py-5 px-4">
        <div className="relative">
          <div className={`text-4xl font-bold font-mono tabular-nums ${isLow ? "text-accent-red" : "text-foreground"}`}>
            {credits}
          </div>
          {isLow && (
            <div className="absolute -top-1 -right-3">
              <TrendingDown className="w-3.5 h-3.5 text-accent-red" />
            </div>
          )}
        </div>

        <div className="text-[10px] text-muted-foreground uppercase mt-2 flex items-center gap-1.5 tracking-wider">
          <div className={`w-1.5 h-1.5 ${isLow ? "bg-accent-red" : "bg-accent-green"}`} />
          {t("uc.pointsAvailable")}
        </div>

        <div className="w-full mt-4 h-2 bg-secondary border border-foreground/15">
          <div
            className={`h-full ${isLow ? "bg-accent-red" : "bg-accent-green"} transition-none`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="w-full flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
          <span>0</span>
          <span>1000</span>
        </div>

        <BrutalButton
          variant="green"
          className="mt-4 w-full"
          size="sm"
          onClick={() => navigate("/pricing")}
        >
          {t("uc.recharge")}
        </BrutalButton>
      </BrutalCardContent>
    </BrutalCard>
  );
};
