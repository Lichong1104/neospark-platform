import { CheckCircle2, Home, CreditCard, Sparkles, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { BrutalCard, BrutalCardContent } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";

const Success = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Header />
      <main className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-5">
          <BrutalCard shadow="heavy" className="overflow-hidden">
            <div className="h-2 bg-accent-green" />
            <BrutalCardContent className="p-8 text-center sm:p-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border-brutal border-foreground bg-accent-green brutal-shadow-green">
                <CheckCircle2 className="h-9 w-9 text-foreground" />
              </div>
              <h1 className="mb-2 text-3xl font-bold uppercase tracking-widest">
                {t("billing.successTitle", { defaultValue: "Payment Successful" })}
              </h1>
              <p className="mx-auto max-w-xl text-sm text-muted-foreground">
                {t("billing.successDesc", {
                  defaultValue:
                    "Your subscription payment is completed. It may take a short moment to reflect in your account.",
                })}
              </p>
            </BrutalCardContent>
          </BrutalCard>

          <div className="grid gap-4 md:grid-cols-2">
            <BrutalCard shadow="default">
              <BrutalCardContent className="space-y-3 p-5">
                <div className="inline-flex items-center gap-2 border-brutal border-foreground bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("billing.nextSteps", { defaultValue: "Next Steps" })}
                </div>
                <ul className="space-y-2 text-sm">
                  <li>1. {t("billing.nextStepA", { defaultValue: "Return to workspace and continue creating." })}</li>
                  <li>2. {t("billing.nextStepB", { defaultValue: "Check pricing page if you want to switch plans." })}</li>
                  <li>3. {t("billing.nextStepC", { defaultValue: "Invoices and payment method are managed in Stripe portal." })}</li>
                </ul>
              </BrutalCardContent>
            </BrutalCard>

            <BrutalCard shadow="green">
              <BrutalCardContent className="space-y-3 p-5">
                <div className="inline-flex items-center gap-2 border-brutal border-foreground bg-accent-green px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("billing.safeNotice", { defaultValue: "Secure Billing" })}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("billing.safeNoticeDesc", {
                    defaultValue:
                      "Your card details are handled by Stripe. NeoSpark does not store full payment card data.",
                  })}
                </p>
              </BrutalCardContent>
            </BrutalCard>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link to="/" className="w-full">
              <BrutalButton variant="cyan" size="default" className="w-full">
                <Home className="h-4 w-4" />
                {t("billing.backWorkspace", { defaultValue: "Back to Workspace" })}
              </BrutalButton>
            </Link>
            <Link to="/pricing" className="w-full">
              <BrutalButton variant="outline" size="default" className="w-full">
                <CreditCard className="h-4 w-4" />
                {t("billing.backPricing", { defaultValue: "Back to Pricing" })}
              </BrutalButton>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Success;
