import React, { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";
import { BrutalCard, BrutalCardContent } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import { Check, Crown, Zap, Star, Rocket, Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import wechatPayApi from "@/api/wechatPay";
import type {
  WeChatPayOrder,
  WeChatPayPlan,
  WeChatPayPlanKey,
} from "@/api/wechatPay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BillingCycle = "monthly" | "yearly";

interface PlanTier {
  key: string;
  icon: React.ReactNode;
  title?: string;
  description?: string;
  badge?: { text: string; color: string };
  price: { monthly: number; yearly: number };
  yearlySave?: string;
  credits: { monthly: string; yearly: string };
  images: string;
  videos: string;
  features: string[];
  buttonVariant:
    | "default"
    | "yellow"
    | "purple"
    | "cyan"
    | "green"
    | "primary"
    | "orange"
    | "red"
    | "ghost"
    | "outline";
  buttonText: string;
  highlighted?: boolean;
  accentColor: string;
}

function formatCnyFen(amountFen: number): string {
  if (!Number.isFinite(amountFen)) return "¥--";
  return `¥${(amountFen / 100).toFixed(2)}`;
}

const Pricing = () => {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  // Temporarily hide subscription tier cards; keep WeChat Pay only.
  const showSubscriptionPlans = false;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { toast } = useToast();

  const [wechatPlans, setWechatPlans] = useState<WeChatPayPlan[] | null>(null);
  const [wechatPlansLoading, setWechatPlansLoading] = useState(false);
  const [wechatPlansError, setWechatPlansError] = useState<string | null>(null);

  const [wxDialogOpen, setWxDialogOpen] = useState(false);
  const [wxOrder, setWxOrder] = useState<WeChatPayOrder | null>(null);
  const [wxSubmitting, setWxSubmitting] = useState(false);
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setWechatPlansLoading(true);
    setWechatPlansError(null);
    wechatPayApi
      .getPlans()
      .then((list) => setWechatPlans(list))
      .catch((e) => {
        const msg =
          e?.response?.data?.detail ||
          e?.message ||
          "Failed to load WeChat plans";
        setWechatPlansError(String(msg));
      })
      .finally(() => setWechatPlansLoading(false));
  }, []);

  const activeWechatPlans = useMemo(() => {
    const list = wechatPlans ?? [];
    return list.filter((p) => p.isActive);
  }, [wechatPlans]);

  async function startWechatPay(planKey: WeChatPayPlanKey) {
    if (wxSubmitting) return;
    try {
      setWxSubmitting(true);
      const order = await wechatPayApi.createNativeOrder(planKey);
      setWxOrder(order);
      setWxDialogOpen(true);
    } catch (e: any) {
      const status = e?.response?.status;
      const detail =
        e?.response?.data?.detail ||
        e?.message ||
        "Failed to create WeChat order";
      if (status === 401) {
        toast({
          title: t("pricing.loginRequired", { defaultValue: "Login required" }),
          description: t("pricing.loginRequiredDesc", {
            defaultValue: "Please login first, then try again.",
          }),
          variant: "destructive",
        });
        navigate("/login");
        return;
      }
      toast({
        title: t("pricing.wechatPayCreateFailed", {
          defaultValue: "WeChat Pay unavailable",
        }),
        description: String(detail),
        variant: "destructive",
      });
    } finally {
      setWxSubmitting(false);
    }
  }

  async function safeCloseWechatOrder(orderId: string) {
    try {
      await wechatPayApi.closeOrder(orderId);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!wxDialogOpen || !wxOrder || wxOrder.status !== "pending") return;

    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    pollTimerRef.current = window.setInterval(async () => {
      try {
        const latest = await wechatPayApi.getOrder(wxOrder.orderId);
        setWxOrder(latest);

        if (latest.status === "paid") {
          window.clearInterval(pollTimerRef.current!);
          pollTimerRef.current = null;
          toast({
            title: t("pricing.paymentSuccess", {
              defaultValue: "Payment successful",
            }),
            description: t("pricing.creditsAdded", {
              defaultValue: "Credits have been added to your account.",
            }),
          });
          await refreshUser();
          setWxDialogOpen(false);
        } else if (latest.status === "failed" || latest.status === "closed") {
          window.clearInterval(pollTimerRef.current!);
          pollTimerRef.current = null;
          toast({
            title: t("pricing.paymentNotCompleted", {
              defaultValue: "Payment not completed",
            }),
            description: t("pricing.tryAgain", {
              defaultValue:
                "Please try again if you still want to purchase credits.",
            }),
            variant: "destructive",
          });
        }
      } catch {
        // polling errors should not spam the user; keep trying
      }
    }, 2000);

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [wxDialogOpen, wxOrder, refreshUser, t, toast]);

  const plans: PlanTier[] = [
    {
      key: "free",
      icon: <Gift className="w-5 h-5" />,
      price: { monthly: 0, yearly: 0 },
      credits: {
        monthly: "100 credits / 7 days",
        yearly: "100 credits / 7 days",
      },
      images: "~14 Nano banana 2",
      videos: "~3 clips",
      features: [
        t("pricing.feat_credits", {
          amount: "200",
          defaultValue: "{{amount}} credits/month",
        }),
        t("pricing.feat_basicModels", { defaultValue: "Basic AI models" }),
        t("pricing.feat_watermark", { defaultValue: "Watermarked exports" }),
        t("pricing.feat_personalOnly", { defaultValue: "Personal use only" }),
        t("pricing.feat_standardQueue", { defaultValue: "Standard queue" }),
      ],
      buttonVariant: "default",
      buttonText: t("pricing.startFreeTrial", {
        defaultValue: "Start Free Trial",
      }),
      accentColor: "bg-muted",
    },
    {
      key: "starter",
      icon: <Star className="w-5 h-5" />,
      badge: {
        text: t("pricing.beginnerChoice", { defaultValue: "Beginner's Choice" }),
        color: "bg-accent-yellow",
      },
      price: { monthly: 18, yearly: 14 },
      yearlySave: t("pricing.yearlySave_starter", { defaultValue: "Save $48" }),
      credits: { monthly: "2,000", yearly: "2,000" },
      images: "~285 Nano banana 2",
      videos: "~10 clips",
      features: [
        t("pricing.feat_credits", {
          amount: "2,500",
          defaultValue: "{{amount}} credits/month",
        }),
        t("pricing.feat_allModels", { defaultValue: "All AI models unlocked" }),
        t("pricing.feat_noWatermark", { defaultValue: "No watermark" }),
        t("pricing.feat_batchDiscount75", {
          defaultValue: "Batch API 75% discount",
        }),
        t("pricing.feat_personalOnly", { defaultValue: "Personal use only" }),
      ],
      buttonVariant: "green",
      buttonText: t("pricing.getStarted", { defaultValue: "Get Started" }),
      accentColor: "bg-accent-green",
    },
    {
      key: "growth",
      icon: <Rocket className="w-5 h-5" />,
      badge: {
        text: t("pricing.userChoice", { defaultValue: "🔥 93% user choice" }),
        color: "bg-accent-purple",
      },
      price: { monthly: 31, yearly: 25 },
      yearlySave: t("pricing.yearlySave_growth", { defaultValue: "Save $72" }),
      credits: { monthly: "3,500", yearly: "3,500" },
      images: "~500 Nano banana 2",
      videos: "~17 clips",
      features: [
        t("pricing.feat_credits", {
          amount: "6,000",
          defaultValue: "{{amount}} credits/month",
        }),
        t("pricing.feat_commercial", {
          defaultValue: "Commercial license included",
        }),
        t("pricing.feat_priorityQueue", {
          defaultValue: "Priority queue (2x faster)",
        }),
        t("pricing.feat_batchDiscount50", {
          defaultValue: "Batch API 50% discount",
        }),
        t("pricing.feat_rollover3", {
          defaultValue: "Credits rollover 3 months",
        }),
      ],
      buttonVariant: "purple",
      buttonText: t("pricing.chooseMostPopular", {
        defaultValue: "Choose Most Popular Plan",
      }),
      highlighted: true,
      accentColor: "bg-accent-purple",
    },
    {
      key: "pro",
      icon: <Crown className="w-5 h-5" />,
      badge: {
        text: t("pricing.powerUser", { defaultValue: "⚡ Power User" }),
        color: "bg-accent-yellow",
      },
      price: { monthly: 68, yearly: 44 },
      yearlySave: t("pricing.yearlySave_pro", { defaultValue: "Save $288" }),
      credits: { monthly: "11,000", yearly: "11,000" },
      images: "~1,571 Nano banana 2",
      videos: "~55 clips",
      features: [
        t("pricing.feat_credits", {
          amount: "15,000",
          defaultValue: "{{amount}} credits/month",
        }),
        t("pricing.feat_batchApiFree", { defaultValue: "Batch API FREE" }),
        t("pricing.feat_apiAccess", { defaultValue: "API access included" }),
        t("pricing.feat_videoUnlimited", {
          defaultValue: "Video unlimited mode",
        }),
        t("pricing.feat_rollover6", {
          defaultValue: "Credits rollover 6 months",
        }),
      ],
      buttonVariant: "green",
      buttonText: t("pricing.goPro", { defaultValue: "Go Pro" }),
      accentColor: "bg-accent-green",
    },
    {
      key: "ultimate",
      icon: <Zap className="w-5 h-5" />,
      badge: {
        text: t("pricing.enterprise", { defaultValue: "🏢 Enterprise" }),
        color: "bg-accent-purple",
      },
      price: { monthly: 148, yearly: 98 },
      yearlySave: t("pricing.yearlySave_ultimate", { defaultValue: "Save $600" }),
      credits: { monthly: "27,000", yearly: "27,000" },
      images: "~3,857 Nano banana 2",
      videos: "~135 clips",
      features: [
        t("pricing.feat_credits", {
          amount: "40,000",
          defaultValue: "{{amount}} credits/month",
        }),
        t("pricing.feat_batchApiFree", { defaultValue: "Batch API FREE" }),
        t("pricing.feat_videoUnlimited365", {
          defaultValue: "Video unlimited 365 days",
        }),
        t("pricing.feat_rollover12", {
          defaultValue: "Credits rollover 12 months",
        }),
        t("pricing.feat_dedicatedSupport", {
          defaultValue: "Dedicated support",
        }),
      ],
      buttonVariant: "purple",
      buttonText: t("pricing.contactSales", { defaultValue: "Contact Sales" }),
      accentColor: "bg-accent-purple",
    },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />

      <main className="flex-1 bg-background bg-grid overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Hero */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold uppercase tracking-widest mb-3">
              {t("pricing.title", { defaultValue: "Pricing" })}
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto mb-2">
              {t("pricing.subtitle", {
                defaultValue:
                  "From free exploration to professional creation. Upgrade or downgrade anytime.",
              })}
            </p>
            <p className="text-sm text-accent-orange font-bold flex items-center justify-center gap-2">
              🎁{" "}
              {t("pricing.promoText", {
                defaultValue:
                  "Start free with 200 credits/month. Upgrade anytime to unlock more models and commercial license.",
              })}
            </p>
          </div>

          {showSubscriptionPlans && (
            <>
              {/* Billing Toggle */}
              <div className="flex items-center justify-center mb-10">
                <div className="inline-flex border-brutal border-foreground brutal-shadow">
                  <button
                    onClick={() => setBilling("monthly")}
                    className={`px-6 py-2.5 font-bold uppercase text-sm transition-none ${
                      billing === "monthly"
                        ? "bg-foreground text-card"
                        : "bg-card text-foreground hover:bg-secondary"
                    }`}
                  >
                    {t("pricing.monthly", { defaultValue: "Monthly" })}
                  </button>
                  <button
                    onClick={() => setBilling("yearly")}
                    className={`px-6 py-2.5 font-bold uppercase text-sm transition-none border-l-brutal border-foreground ${
                      billing === "yearly"
                        ? "bg-foreground text-card"
                        : "bg-card text-foreground hover:bg-secondary"
                    }`}
                  >
                    {t("pricing.yearly", { defaultValue: "Yearly" })}
                  </button>
                </div>
                <span className="ml-3 px-2.5 py-1 bg-accent-green text-foreground text-[10px] font-bold border-brutal border-foreground">
                  {t("pricing.saveUp", { defaultValue: "Save up to 35%" })}
                </span>
              </div>

              {billing === "yearly" && (
                <div className="mb-8">
                  <div className="max-w-3xl mx-auto text-center px-4 py-3 bg-accent-green border-brutal border-foreground font-bold">
                    {t("pricing.yearlyBillingNotice", {
                      defaultValue:
                        "🔥 Yearly billing saves up to 35% — Growth plan saves $72/year!",
                    })}
                  </div>
                </div>
              )}

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {plans.map((plan) => (
                  <BrutalCard
                    key={plan.key}
                    shadow={plan.highlighted ? "heavy" : "default"}
                    className={`overflow-hidden flex flex-col relative ${
                      plan.highlighted
                        ? "border-[3px] border-accent-purple ring-2 ring-accent-purple/30 scale-[1.02] z-10"
                        : ""
                    }`}
                  >
                    {/* Accent Bar */}
                    <div className={`h-2 ${plan.accentColor}`} />

                    <BrutalCardContent className="flex-1 flex flex-col p-5">
                      {/* Badge */}
                      {plan.badge && (
                        <div className="flex justify-center mb-3 -mt-1">
                          <span
                            className={`px-3 py-1 ${plan.badge.color} text-[10px] font-bold uppercase border-brutal border-foreground`}
                          >
                            {plan.badge.text}
                          </span>
                        </div>
                      )}
                      {!plan.badge && <div className="h-6" />}

                      {/* Plan Name */}
                      <h3 className="text-lg font-bold uppercase text-center tracking-wider">
                        {plan.title ??
                          t(`pricing.plan_${plan.key}`, {
                            defaultValue:
                              plan.key.charAt(0).toUpperCase() + plan.key.slice(1),
                          })}
                      </h3>
                      <p className="text-xs text-muted-foreground text-center mt-1 mb-4">
                        {plan.description ??
                          t(`pricing.plan_${plan.key}_desc`, { defaultValue: "" })}
                      </p>

                      {/* Divider */}
                      <div className="h-[2px] bg-foreground/10 mb-4" />

                      {/* Price */}
                      <div className="text-center mb-4">
                        <span className="text-4xl font-bold font-mono">
                          ${plan.price[billing]}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /{t("pricing.month", { defaultValue: "month" })}
                        </span>
                        {billing === "yearly" && plan.yearlySave && (
                          <div className="text-xs font-bold text-accent-green mt-1">
                            {plan.yearlySave}
                          </div>
                        )}
                      </div>

                      {/* Credits */}
                      <div className="text-center mb-3">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                          {t("pricing.credits", { defaultValue: "Credits" })}
                        </div>
                        <div className="text-xl font-bold font-mono">
                          {plan.credits[billing]}
                          {plan.key === "free"
                            ? ""
                            : `/${t("pricing.month", { defaultValue: "month" })}`}
                        </div>
                      </div>

                      {/* Usage Estimates */}
                      <div className="space-y-1.5 mb-5">
                        <div className="flex justify-between text-xs px-2 py-1.5 bg-secondary border-brutal border-foreground">
                          <span className="flex items-center gap-1">
                            🖼️ {t("pricing.images", { defaultValue: "Images" })}
                          </span>
                          <span className="font-bold font-mono">{plan.images}</span>
                        </div>
                        <div className="flex justify-between text-xs px-2 py-1.5 bg-secondary border-brutal border-foreground">
                          <span className="flex items-center gap-1">
                            🎬 {t("pricing.videos", { defaultValue: "Videos" })}
                          </span>
                          <span className="font-bold font-mono">{plan.videos}</span>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="flex-1 space-y-2 mb-5">
                        {plan.features.map((feat, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <Check className="w-3.5 h-3.5 text-accent-green mt-0.5 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA */}
                      <BrutalButton
                        variant={plan.buttonVariant}
                        className="w-full"
                        size="default"
                      >
                        {plan.buttonText}
                      </BrutalButton>
                    </BrutalCardContent>
                  </BrutalCard>
                ))}
              </div>
            </>
          )}

          {/* WeChat Pay Credits */}
          <div className="mt-12">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-widest">
                  {t("pricing.wechatPayTitle", {
                    defaultValue: "WeChat Pay · Credits Packs",
                  })}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("pricing.wechatPaySubtitle", {
                    defaultValue:
                      "Scan with WeChat to buy one-time credits packs (Native QR Code).",
                  })}
                </p>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {wechatPlansLoading
                  ? t("pricing.loading", { defaultValue: "Loading..." })
                  : wechatPlansError
                  ? t("pricing.loadFailed", { defaultValue: "Load failed" })
                  : ""}
              </div>
            </div>

            {wechatPlansError && (
              <div className="mb-4 p-3 bg-accent-red text-card border-brutal border-foreground font-bold text-sm">
                {wechatPlansError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeWechatPlans.map((p) => (
                <BrutalCard
                  key={p.planKey}
                  className={`overflow-hidden ${p.planKey === "black" ? "shadow-none" : ""}`}
                >
                  <div
                    className={`h-2 ${p.planKey === "black" ? "bg-foreground" : "bg-accent-green"}`}
                  />
                  <BrutalCardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold uppercase tracking-wider">
                          {p.name}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            p.planKey === "black" ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {p.description}
                          <div
                            className={`mt-1 text-[11px] font-bold ${
                              p.planKey === "black" ? "text-accent-yellow" : ""
                            }`}
                          >
                            {p.discountLabel} · {p.validDays} 天有效
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div
                          className={`px-2 py-1 border-brutal text-xs font-bold font-mono ${
                            p.planKey === "black"
                              ? "bg-foreground text-accent-yellow border-accent-yellow"
                              : "bg-secondary border-foreground text-foreground"
                          }`}
                        >
                          {formatCnyFen(p.amountFen)}
                        </div>
                        {p.originalAmountFen > p.amountFen && (
                          <div
                            className={`mt-1 text-[10px] line-through font-mono ${
                              p.planKey === "black" ? "text-accent-yellow/80" : "text-muted-foreground"
                            }`}
                          >
                            {formatCnyFen(p.originalAmountFen)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          {t("pricing.credits", { defaultValue: "Credits" })}:
                        </span>{" "}
                        <span
                          className={`font-bold font-mono ${p.planKey === "black" ? "text-accent-yellow" : ""}`}
                        >
                          {p.points.toLocaleString()}
                        </span>
                      </div>
                      <BrutalButton
                        variant={p.planKey === "black" ? "yellow" : "green"}
                        size="default"
                        disabled={wxSubmitting}
                        onClick={() => startWechatPay(p.planKey)}
                      >
                        {t("pricing.wechatPayBuy", {
                          defaultValue: "Buy via WeChat",
                        })}
                      </BrutalButton>
                    </div>
                  </BrutalCardContent>
                </BrutalCard>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Dialog
        open={wxDialogOpen}
        onOpenChange={(open) => {
          if (!open && wxOrder?.orderId && wxOrder.status === "pending") {
            void safeCloseWechatOrder(wxOrder.orderId);
          }
          if (!open) {
            setWxDialogOpen(false);
            setWxOrder(null);
          } else {
            setWxDialogOpen(true);
          }
        }}
      >
        <DialogContent className="border-brutal border-foreground brutal-shadow bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-wider">
              {t("pricing.scanToPay", {
                defaultValue: "Scan to pay with WeChat",
              })}
            </DialogTitle>
            <DialogDescription>
              {wxOrder
                ? t("pricing.scanToPayDesc", {
                    defaultValue:
                      "Open WeChat and scan the QR code. We’ll confirm automatically once paid.",
                  })
                : t("pricing.preparingOrder", {
                    defaultValue: "Preparing order...",
                  })}
            </DialogDescription>
          </DialogHeader>

          {wxOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  {t("pricing.orderId", { defaultValue: "Order" })}:
                </div>
                <div className="font-mono font-bold">{wxOrder.orderId}</div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  {t("pricing.amount", { defaultValue: "Amount" })}:
                </div>
                <div className="font-mono font-bold">
                  {formatCnyFen(wxOrder.amountFen)}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  {t("pricing.credits", { defaultValue: "Credits" })}:
                </div>
                <div className="font-mono font-bold">
                  {wxOrder.points.toLocaleString()}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="p-3 bg-background border-brutal border-foreground brutal-shadow">
                  <img
                    src={wxOrder.qrCodeDataUrl}
                    alt="WeChat Pay QR"
                    className="w-56 h-56"
                  />
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                {t("pricing.orderStatus", { defaultValue: "Status" })}:{" "}
                <span className="font-bold uppercase">{wxOrder.status}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            {wxOrder?.status === "pending" && (
              <div className="w-full flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {t("pricing.waitingPayment", {
                    defaultValue: "Waiting for payment confirmation...",
                  })}
                </div>
                <BrutalButton
                  variant="outline"
                  size="default"
                  onClick={async () => {
                    if (wxOrder?.orderId) {
                      await safeCloseWechatOrder(wxOrder.orderId);
                    }
                    setWxDialogOpen(false);
                    setWxOrder(null);
                  }}
                >
                  {t("pricing.cancel", { defaultValue: "Cancel" })}
                </BrutalButton>
              </div>
            )}
            {wxOrder && wxOrder.status !== "pending" && (
              <BrutalButton
                variant="green"
                className="w-full"
                onClick={() => {
                  setWxDialogOpen(false);
                  setWxOrder(null);
                }}
              >
                {t("pricing.done", { defaultValue: "Done" })}
              </BrutalButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pricing;
