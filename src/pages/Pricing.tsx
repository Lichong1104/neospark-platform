import React, { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BrutalCard, BrutalCardContent } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import { Check, Crown, Zap, Star, Rocket, Gift } from "lucide-react";
import { useTranslation } from "react-i18next";

type BillingCycle = "monthly" | "yearly";

interface PlanTier {
  key: string;
  icon: React.ReactNode;
  badge?: { text: string; color: string };
  price: { monthly: number; yearly: number };
  credits: { monthly: string; yearly: string };
  images: string;
  videos: string;
  features: string[];
  buttonVariant: "default" | "yellow" | "purple" | "cyan" | "green" | "primary" | "orange" | "red" | "ghost" | "outline";
  buttonText: string;
  highlighted?: boolean;
  accentColor: string;
}

const Pricing = () => {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const { t } = useTranslation();

  const plans: PlanTier[] = [
    {
      key: "free",
      icon: <Gift className="w-5 h-5" />,
      price: { monthly: 0, yearly: 0 },
      credits: { monthly: "200", yearly: "200" },
      images: "~100",
      videos: "~10 clips",
      features: [
        t("pricing.feat_credits", { amount: "200", defaultValue: "{{amount}} credits/month" }),
        t("pricing.feat_basicModels", { defaultValue: "Basic AI models" }),
        t("pricing.feat_watermark", { defaultValue: "Watermarked exports" }),
        t("pricing.feat_personalOnly", { defaultValue: "Personal use only" }),
        t("pricing.feat_standardQueue", { defaultValue: "Standard queue" }),
      ],
      buttonVariant: "default",
      buttonText: t("pricing.startFreeTrial", { defaultValue: "Start Free Trial" }),
      accentColor: "bg-muted",
    },
    {
      key: "starter",
      icon: <Star className="w-5 h-5" />,
      badge: { text: t("pricing.beginnerChoice", { defaultValue: "Beginner's Choice" }), color: "bg-accent-green" },
      price: { monthly: 19, yearly: 12 },
      credits: { monthly: "2,500", yearly: "2,500" },
      images: "~1,250",
      videos: "~125 clips",
      features: [
        t("pricing.feat_credits", { amount: "2,500", defaultValue: "{{amount}} credits/month" }),
        t("pricing.feat_allModels", { defaultValue: "All AI models unlocked" }),
        t("pricing.feat_noWatermark", { defaultValue: "No watermark" }),
        t("pricing.feat_batchDiscount75", { defaultValue: "Batch API 75% discount" }),
        t("pricing.feat_personalOnly", { defaultValue: "Personal use only" }),
      ],
      buttonVariant: "green",
      buttonText: t("pricing.getStarted", { defaultValue: "Get Started" }),
      accentColor: "bg-accent-green",
    },
    {
      key: "growth",
      icon: <Rocket className="w-5 h-5" />,
      badge: { text: t("pricing.userChoice", { defaultValue: "🔥 93% user choice" }), color: "bg-accent-yellow" },
      price: { monthly: 39, yearly: 25 },
      credits: { monthly: "6,000", yearly: "6,000" },
      images: "~3,000",
      videos: "~300 clips",
      features: [
        t("pricing.feat_credits", { amount: "6,000", defaultValue: "{{amount}} credits/month" }),
        t("pricing.feat_commercial", { defaultValue: "Commercial license included" }),
        t("pricing.feat_priorityQueue", { defaultValue: "Priority queue (2x faster)" }),
        t("pricing.feat_batchDiscount50", { defaultValue: "Batch API 50% discount" }),
        t("pricing.feat_rollover3", { defaultValue: "Credits rollover 3 months" }),
      ],
      buttonVariant: "yellow",
      buttonText: t("pricing.chooseMostPopular", { defaultValue: "Choose Most Popular Plan" }),
      highlighted: true,
      accentColor: "bg-accent-yellow",
    },
    {
      key: "pro",
      icon: <Crown className="w-5 h-5" />,
      badge: { text: t("pricing.powerUser", { defaultValue: "⚡ Power User" }), color: "bg-accent-cyan" },
      price: { monthly: 89, yearly: 57 },
      credits: { monthly: "15,000", yearly: "15,000" },
      images: "~7,500",
      videos: "~750 clips",
      features: [
        t("pricing.feat_credits", { amount: "15,000", defaultValue: "{{amount}} credits/month" }),
        t("pricing.feat_batchApiFree", { defaultValue: "Batch API FREE" }),
        t("pricing.feat_apiAccess", { defaultValue: "API access included" }),
        t("pricing.feat_videoUnlimited", { defaultValue: "Video unlimited mode" }),
        t("pricing.feat_rollover6", { defaultValue: "Credits rollover 6 months" }),
      ],
      buttonVariant: "cyan",
      buttonText: t("pricing.goPro", { defaultValue: "Go Pro" }),
      accentColor: "bg-accent-cyan",
    },
    {
      key: "ultimate",
      icon: <Zap className="w-5 h-5" />,
      badge: { text: t("pricing.enterprise", { defaultValue: "🏢 Enterprise" }), color: "bg-accent-purple" },
      price: { monthly: 199, yearly: 129 },
      credits: { monthly: "40,000", yearly: "40,000" },
      images: "~20,000",
      videos: "~2,000 clips",
      features: [
        t("pricing.feat_credits", { amount: "40,000", defaultValue: "{{amount}} credits/month" }),
        t("pricing.feat_batchApiFree", { defaultValue: "Batch API FREE" }),
        t("pricing.feat_videoUnlimited365", { defaultValue: "Video unlimited 365 days" }),
        t("pricing.feat_rollover12", { defaultValue: "Credits rollover 12 months" }),
        t("pricing.feat_dedicatedSupport", { defaultValue: "Dedicated support" }),
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
              {t("pricing.subtitle", { defaultValue: "From free exploration to professional creation. Upgrade or downgrade anytime." })}
            </p>
            <p className="text-sm text-accent-orange font-bold flex items-center justify-center gap-2">
              🎁 {t("pricing.promoText", { defaultValue: "Start free with 200 credits/month. Upgrade anytime to unlock more models and commercial license." })}
            </p>
          </div>

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
                      <span className={`px-3 py-1 ${plan.badge.color} text-[10px] font-bold uppercase border-brutal border-foreground`}>
                        {plan.badge.text}
                      </span>
                    </div>
                  )}
                  {!plan.badge && <div className="h-6" />}

                  {/* Plan Name */}
                  <h3 className="text-lg font-bold uppercase text-center tracking-wider">
                    {t(`pricing.plan_${plan.key}`, { defaultValue: plan.key.charAt(0).toUpperCase() + plan.key.slice(1) })}
                  </h3>
                  <p className="text-xs text-muted-foreground text-center mt-1 mb-4">
                    {t(`pricing.plan_${plan.key}_desc`, { defaultValue: "" })}
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
                  </div>

                  {/* Credits */}
                  <div className="text-center mb-3">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      {t("pricing.credits", { defaultValue: "Credits" })}
                    </div>
                    <div className="text-xl font-bold font-mono">
                      {plan.credits[billing]}/{t("pricing.month", { defaultValue: "month" })}
                    </div>
                  </div>

                  {/* Usage Estimates */}
                  <div className="space-y-1.5 mb-5">
                    <div className="flex justify-between text-xs px-2 py-1.5 bg-secondary border-brutal border-foreground">
                      <span className="flex items-center gap-1">🖼️ {t("pricing.images", { defaultValue: "Images" })}</span>
                      <span className="font-bold font-mono">{plan.images}</span>
                    </div>
                    <div className="flex justify-between text-xs px-2 py-1.5 bg-secondary border-brutal border-foreground">
                      <span className="flex items-center gap-1">🎬 {t("pricing.videos", { defaultValue: "Videos" })}</span>
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
        </div>
      </main>
    </div>
  );
};

export default Pricing;
