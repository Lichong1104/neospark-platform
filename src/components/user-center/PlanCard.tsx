import React from "react";
import { BrutalCard, BrutalCardHeader, BrutalCardTitle, BrutalCardContent } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import { Crown, Zap, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { BillingSubscriptionSummary } from "@/api/billing";

interface PlanCardProps {
  subscription: BillingSubscriptionSummary | null;
  loading?: boolean;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  subscription,
  loading = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasSubscription = !!subscription;
  const features = hasSubscription
    ? [
        `${t("billing.status", { defaultValue: "Status" })}: ${subscription.status}`,
        `${t("pricing.yearly", { defaultValue: "Yearly" })}/${t("pricing.monthly", { defaultValue: "Monthly" })}: ${
          subscription.billingInterval
        }`,
        `${t("billing.currentPeriodEnd", { defaultValue: "Current Period End" })}: ${new Date(
          subscription.currentPeriodEnd
        ).toLocaleDateString()}`,
        subscription.cancelAtPeriodEnd
          ? t("billing.cancelAtPeriodEndSuccess", {
              defaultValue: "Subscription will cancel at period end.",
            })
          : t("uc.planDesc"),
      ]
    : [t("uc.feat1"), t("uc.feat2"), t("uc.feat3"), t("uc.feat4")];

  const badgeText = loading
    ? t("common.loading", { defaultValue: "Loading..." })
    : hasSubscription
    ? subscription.planKey.toUpperCase()
    : "FREE";

  return (
    <BrutalCard shadow="default" className="h-full overflow-hidden">
      <BrutalCardHeader className="bg-card pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <BrutalCardTitle className="flex items-center gap-2 text-sm">
            <div className="p-1.5 bg-accent-yellow border border-foreground/30">
              <Crown className="w-3.5 h-3.5" />
            </div>
            {t("uc.currentPlan")}
          </BrutalCardTitle>
          <span className="px-2.5 py-1 bg-secondary text-xs font-bold uppercase border border-foreground/20">
            {badgeText}
          </span>
        </div>
      </BrutalCardHeader>
      <BrutalCardContent className="space-y-4 px-4 pb-4 pt-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {hasSubscription
            ? t("billing.invoiceRecordsDesc", {
                defaultValue: "View your Stripe billing history and open invoice PDFs.",
              })
            : t("uc.planDesc")}
        </p>

        <div className="space-y-2">
          {features.map((feat, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs">
              <div className="w-4 h-4 bg-accent-green/80 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-card" />
              </div>
              {feat}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="flex-1 px-3 py-2.5 bg-secondary border border-foreground/15 text-center">
            <div className="text-sm font-bold">1x</div>
            <div className="text-[10px] text-muted-foreground uppercase">{t("uc.speed")}</div>
          </div>
          <div className="flex-1 px-3 py-2.5 bg-secondary border border-foreground/15 text-center">
            <div className="text-sm font-bold">{t("uc.standardQueue")}</div>
            <div className="text-[10px] text-muted-foreground uppercase">{t("uc.queue")}</div>
          </div>
        </div>

        <BrutalButton
          variant="yellow"
          size="sm"
          className="w-full"
          onClick={() => navigate("/pricing")}
        >
          <Zap className="w-3.5 h-3.5 mr-1.5" />
          {hasSubscription
            ? t("billing.manageSubscription", { defaultValue: "Manage Subscription" })
            : t("uc.upgradePro")}
        </BrutalButton>
      </BrutalCardContent>
    </BrutalCard>
  );
};
