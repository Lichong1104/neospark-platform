import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BrutalCard,
  BrutalCardHeader,
  BrutalCardTitle,
  BrutalCardContent,
} from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import {
  Key,
  Receipt,
  Ban,
  ExternalLink,
  LogOut,
  Bolt,
  Loader2,
  AlertTriangle,
  Clock3,
  Zap,
  CheckCircle2,
  Gift,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import billingApi from "@/api/billing";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QuickActionsProps {
  onSubscriptionChanged?: () => Promise<void> | void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onSubscriptionChanged,
}) => {
  const { t } = useTranslation();
  const { logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [cancelSubmitting, setCancelSubmitting] = React.useState(false);
  const [cancelImmediately, setCancelImmediately] = React.useState(false);

  const links = [
    {
      icon: <Key className="w-3.5 h-3.5" />,
      label: t("uc.apiKeys", { defaultValue: "API Keys" }),
      color: "bg-accent-cyan/80",
      onClick: () => navigate("/api-keys"),
    },
    {
      icon: <Receipt className="w-3.5 h-3.5" />,
      label: t("uc.invoiceRecords", { defaultValue: "Invoice Records" }),
      color: "bg-accent-purple/80",
      onClick: () => navigate("/invoices"),
    },
  ];

  return (
    <BrutalCard
      shadow="default"
      className="h-full overflow-hidden flex flex-col"
    >
      <BrutalCardHeader className="bg-card pb-3 pt-4 px-4">
        <BrutalCardTitle className="flex items-center gap-2 text-sm">
          <div className="p-1.5 bg-accent-purple/80 border border-foreground/30">
            <Bolt className="w-3.5 h-3.5 text-card" />
          </div>
          {t("uc.quickActions", { defaultValue: "Quick Actions" })}
        </BrutalCardTitle>
      </BrutalCardHeader>
      <BrutalCardContent className="flex-1 flex flex-col gap-2 px-4 pb-4">
        {links.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className="w-full text-left px-3 py-2.5 bg-card border-brutal border-foreground font-mono text-xs hover:bg-secondary brutal-shadow brutal-press transition-none flex items-center gap-3 group"
          >
            <div
              className={`w-6 h-6 ${item.color} border border-foreground/30 flex items-center justify-center text-card`}
            >
              {item.icon}
            </div>
            <span className="flex-1 font-bold text-xs uppercase tracking-wider">
              {item.label}
            </span>
            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
          </button>
        ))}

        <AlertDialog
          open={cancelDialogOpen}
          onOpenChange={(open) => {
            if (cancelSubmitting) return;
            setCancelDialogOpen(open);
          }}
        >
          <AlertDialogTrigger asChild>
            <button
              disabled={cancelSubmitting}
              className="w-full text-left px-3 py-2.5 bg-card border-brutal border-foreground font-mono text-xs hover:bg-secondary brutal-shadow brutal-press transition-none flex items-center gap-3 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="w-6 h-6 bg-accent-orange/80 border border-foreground/30 flex items-center justify-center text-card">
                {cancelSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Ban className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="flex-1 font-bold text-xs uppercase tracking-wider">
                {cancelSubmitting
                  ? t("common.loading", { defaultValue: "Loading..." })
                  : t("uc.cancelSubscription", {
                      defaultValue: "Cancel Subscription",
                    })}
              </span>
              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-brutal border-foreground brutal-shadow bg-card sm:max-w-[34rem]">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center border border-foreground/30 bg-accent-orange/20">
                  <AlertTriangle className="h-4 w-4 text-accent-orange" />
                </span>
                {t("billing.cancelSubscriptionTitle", {
                  defaultValue: "Cancel Subscription",
                })}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground">
                {t("billing.cancelSubscriptionDesc", {
                  defaultValue:
                    "Your subscription will be canceled at the end of the current billing period.",
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="rounded-md border border-foreground/25 bg-secondary/20 px-3 py-2.5 text-[11px] text-muted-foreground">
              {t("billing.cancelSubscriptionHint", {
                defaultValue:
                  "Choose when cancellation takes effect. You can keep access until period end, or stop access immediately.",
              })}
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={cancelSubmitting}
                onClick={() => setCancelImmediately(false)}
                className={`w-full text-left px-3.5 py-3 border-brutal border-foreground transition-none ${
                  cancelImmediately
                    ? "bg-card hover:bg-secondary"
                    : "bg-accent-cyan/20 shadow-[3px_3px_0_0_rgba(0,0,0,0.85)]"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center border border-foreground/30 bg-accent-cyan/30">
                    <Clock3 className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider">
                      {t("billing.cancelAtPeriodEndOption", {
                        defaultValue: "Cancel at period end",
                      })}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {t("billing.cancelAtPeriodEndOptionDesc", {
                        defaultValue:
                          "Recommended. Keep all features until your current billing cycle finishes.",
                      })}
                    </p>
                  </div>
                  {!cancelImmediately && (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-accent-cyan" />
                  )}
                </div>
              </button>
              <button
                type="button"
                disabled={cancelSubmitting}
                onClick={() => setCancelImmediately(true)}
                className={`w-full text-left px-3.5 py-3 border-brutal border-foreground transition-none ${
                  cancelImmediately
                    ? "bg-accent-red/15 shadow-[3px_3px_0_0_rgba(0,0,0,0.85)]"
                    : "bg-card hover:bg-secondary"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center border border-foreground/30 bg-accent-red/20">
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider">
                      {t("billing.cancelImmediatelyOption", {
                        defaultValue: "Cancel immediately",
                      })}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {t("billing.cancelImmediatelyOptionDesc", {
                        defaultValue:
                          "Stop your subscription now. Access may end right away and prorated refunds may not apply.",
                      })}
                    </p>
                  </div>
                  {cancelImmediately && (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-accent-red" />
                  )}
                </div>
              </button>
            </div>
            <AlertDialogFooter className="mt-1 gap-2">
              <AlertDialogCancel
                className="border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider w-full sm:w-auto"
                disabled={cancelSubmitting}
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async (e) => {
                  e.preventDefault();
                  if (cancelSubmitting) return;
                  try {
                    setCancelSubmitting(true);
                    const result = await billingApi.cancelSubscription(cancelImmediately);
                    toast.success(
                      result.cancelAtPeriodEnd || !cancelImmediately
                        ? t("billing.cancelAtPeriodEndSuccess", {
                            defaultValue:
                              "Subscription will cancel at period end.",
                          })
                        : t("billing.cancelSubscriptionSuccess", {
                            defaultValue: "Subscription canceled.",
                          })
                    );
                    await onSubscriptionChanged?.();
                    await refreshUser();
                    setCancelDialogOpen(false);
                    setCancelImmediately(false);
                  } catch (e: any) {
                    const detail =
                      e?.response?.data?.detail ||
                      e?.message ||
                      t("billing.cancelSubscriptionFailed", {
                        defaultValue: "Failed to cancel subscription",
                      });
                    toast.error(String(detail));
                  } finally {
                    setCancelSubmitting(false);
                  }
                }}
                className={`text-foreground border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider hover:brightness-110 w-full sm:w-auto ${
                  cancelImmediately ? "bg-accent-red" : "bg-accent-orange"
                }`}
                disabled={cancelSubmitting}
              >
                {cancelSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {cancelImmediately
                  ? t("billing.confirmCancelImmediately", {
                      defaultValue: "Confirm Immediate Cancel",
                    })
                  : t("billing.confirmCancelAtPeriodEnd", {
                      defaultValue: "Confirm Cancel at Period End",
                    })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <button
          onClick={() => navigate("/affiliate")}
          className="w-full text-left px-3 py-2.5 bg-card border-brutal border-foreground font-mono text-xs hover:bg-secondary brutal-shadow brutal-press transition-none flex items-center gap-3 group"
        >
          <div className="w-6 h-6 bg-accent-green/80 border border-foreground/30 flex items-center justify-center text-card">
            <Gift className="w-3.5 h-3.5" />
          </div>
          <span className="flex-1 font-bold text-xs uppercase tracking-wider">
            {t("affiliate.title", { defaultValue: "Affiliate Program" })}
          </span>
          <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
        </button>

        <div className="mt-auto pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <BrutalButton variant="red" size="sm" className="w-full gap-1.5">
                <LogOut className="w-3.5 h-3.5" />
                {t("uc.logout", { defaultValue: "Logout" })}
              </BrutalButton>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-brutal border-foreground brutal-shadow bg-card">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-bold uppercase tracking-wider">
                  {t("login.logout")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("login.logoutConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider">
                  {t("login.logoutCancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await logout();
                    navigate("/login");
                  }}
                  className="bg-accent-red text-card border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider hover:brightness-110"
                >
                  {t("login.logoutConfirmBtn")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </BrutalCardContent>
    </BrutalCard>
  );
};
