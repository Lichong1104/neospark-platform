import { CircleSlash2, RefreshCw, Home, LifeBuoy } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserMenuDock } from "@/components/layout/UserMenuDock";
import { BrutalCard, BrutalCardContent } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";

const Cancel = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background bg-grid">
      <UserMenuDock />
      <main className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-5">
          <BrutalCard shadow="heavy" className="overflow-hidden">
            <div className="h-2 bg-accent-yellow" />
            <BrutalCardContent className="p-8 text-center sm:p-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border-brutal border-foreground bg-accent-yellow brutal-shadow-yellow">
                <CircleSlash2 className="h-9 w-9 text-foreground" />
              </div>
              <h1 className="mb-2 text-3xl font-bold uppercase tracking-widest">
                {t("billing.cancelTitle", { defaultValue: "Payment Cancelled" })}
              </h1>
              <p className="mx-auto max-w-xl text-sm text-muted-foreground">
                {t("billing.cancelDesc", {
                  defaultValue: "No charge was made. You can return to pricing and try again anytime.",
                })}
              </p>
            </BrutalCardContent>
          </BrutalCard>

          <div className="grid gap-4 md:grid-cols-2">
            <BrutalCard shadow="default">
              <BrutalCardContent className="space-y-3 p-5">
                <div className="inline-flex items-center gap-2 border-brutal border-foreground bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("billing.whatToDoNow", { defaultValue: "What to do now" })}
                </div>
                <ul className="space-y-2 text-sm">
                  <li>1. {t("billing.cancelStepA", { defaultValue: "Return to pricing and select your plan again." })}</li>
                  <li>2. {t("billing.cancelStepB", { defaultValue: "Check your card, region, or payment method in Stripe." })}</li>
                  <li>3. {t("billing.cancelStepC", { defaultValue: "If issue persists, contact support with your attempt time." })}</li>
                </ul>
              </BrutalCardContent>
            </BrutalCard>

            <BrutalCard shadow="yellow">
              <BrutalCardContent className="space-y-3 p-5">
                <div className="inline-flex items-center gap-2 border-brutal border-foreground bg-accent-yellow px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
                  <LifeBuoy className="h-3.5 w-3.5" />
                  {t("billing.needHelp", { defaultValue: "Need Help?" })}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("billing.needHelpDesc", {
                    defaultValue: "You can retry immediately. If payment keeps failing, please contact support.",
                  })}
                </p>
              </BrutalCardContent>
            </BrutalCard>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link to="/pricing" className="w-full">
              <BrutalButton variant="yellow" size="default" className="w-full">
                <RefreshCw className="h-4 w-4" />
                {t("billing.tryAgain", { defaultValue: "Try Again" })}
              </BrutalButton>
            </Link>
            <Link to="/" className="w-full">
              <BrutalButton variant="outline" size="default" className="w-full">
                <Home className="h-4 w-4" />
                {t("billing.goWorkspace", { defaultValue: "Go to Workspace" })}
              </BrutalButton>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Cancel;
