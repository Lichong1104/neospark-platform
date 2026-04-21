import React, { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import billingApi, { type BillingInvoice, type BillingSubscriptionSummary } from "@/api/billing";
import { useTranslation } from "react-i18next";
import { Calendar, CreditCard, ExternalLink, FileText, Loader2, ReceiptText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const formatUsd = (amountCents: number) => `$${(amountCents / 100).toFixed(2)}`;

const Account = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [subscription, setSubscription] = useState<BillingSubscriptionSummary | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [state, invoiceList] = await Promise.all([
        billingApi.getState(),
        billingApi.getInvoices(),
      ]);
      setSubscription(state.subscription);
      setInvoices(invoiceList);
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail ||
        e?.message ||
        t("billing.invoiceLoadFailed", { defaultValue: "Failed to load invoices" });
      toast.error(String(detail));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const onFocus = () => {
      void refreshUser();
      void loadData();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadData, refreshUser]);

  const goStripePortal = async () => {
    if (portalLoading) return;
    try {
      setPortalLoading(true);
      const { url } = await billingApi.createPortalSession();
      window.location.href = url;
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail ||
        e?.message ||
        t("pricing.checkoutCreateFailed", { defaultValue: "Unable to start checkout" });
      toast.error(String(detail));
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 bg-background bg-grid overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-5">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">STRIPE ACCOUNT</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("billing.invoiceRecordsDesc", {
                defaultValue: "View your Stripe billing history and open invoice PDFs.",
              })}
            </p>
          </div>

          <BrutalCard>
            <BrutalCardHeader className="pb-2">
              <BrutalCardTitle className="flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-accent-cyan/80 border border-foreground/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-card" />
                </div>
                {t("billing.manageSubscription", { defaultValue: "Manage Subscription" })}
              </BrutalCardTitle>
            </BrutalCardHeader>
            <BrutalCardContent className="space-y-4">
              {loading ? (
                <div className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("common.loading", { defaultValue: "Loading..." })}
                </div>
              ) : subscription ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 border border-foreground/20 bg-secondary/40">
                    <div className="text-muted-foreground uppercase mb-1">{t("uc.currentPlan", { defaultValue: "Current Plan" })}</div>
                    <div className="font-bold uppercase">{subscription.planKey}</div>
                  </div>
                  <div className="p-3 border border-foreground/20 bg-secondary/40">
                    <div className="text-muted-foreground uppercase mb-1">{t("billing.status", { defaultValue: "Status" })}</div>
                    <div className="font-bold uppercase">{subscription.status}</div>
                  </div>
                  <div className="p-3 border border-foreground/20 bg-secondary/40">
                    <div className="text-muted-foreground uppercase mb-1">{t("pricing.monthly", { defaultValue: "Monthly" })}/{t("pricing.yearly", { defaultValue: "Yearly" })}</div>
                    <div className="font-bold uppercase">{subscription.billingInterval}</div>
                  </div>
                  <div className="p-3 border border-foreground/20 bg-secondary/40">
                    <div className="text-muted-foreground uppercase mb-1">{t("billing.currentPeriodEnd", { defaultValue: "Current Period End" })}</div>
                    <div className="font-bold flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {t("uc.planDesc", {
                    defaultValue: "You're on the Free plan. Upgrade to unlock priority queue, faster generation, and commercial license.",
                  })}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <BrutalButton
                  size="sm"
                  className="gap-1.5"
                  onClick={goStripePortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CreditCard className="w-3.5 h-3.5" />
                  )}
                  {t("billing.manageSubscription", { defaultValue: "Manage Subscription" })}
                </BrutalButton>
                <BrutalButton size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/pricing")}>
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t("header.pricing", { defaultValue: "Pricing" })}
                </BrutalButton>
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard className="overflow-hidden">
            <BrutalCardHeader className="pb-2">
              <BrutalCardTitle className="flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-accent-purple/80 border border-foreground/30">
                  <ReceiptText className="w-3.5 h-3.5 text-card" />
                </div>
                {t("billing.invoiceRecords", { defaultValue: "Invoice Records" })}
              </BrutalCardTitle>
            </BrutalCardHeader>
            <BrutalCardContent className="p-0">
              {loading ? (
                <div className="py-14 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("common.loading", { defaultValue: "Loading..." })}
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-14 text-center text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  {t("billing.noInvoices", { defaultValue: "No invoices yet." })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/60">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-bold uppercase text-xs">{t("billing.invoiceId", { defaultValue: "Invoice ID" })}</th>
                        <th className="px-4 py-3 font-bold uppercase text-xs">{t("billing.status", { defaultValue: "Status" })}</th>
                        <th className="px-4 py-3 font-bold uppercase text-xs">{t("billing.amountPaid", { defaultValue: "Amount Paid" })}</th>
                        <th className="px-4 py-3 font-bold uppercase text-xs">{t("billing.createdAt", { defaultValue: "Created At" })}</th>
                        <th className="px-4 py-3 font-bold uppercase text-xs">{t("billing.actions", { defaultValue: "Actions" })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="border-t border-foreground/15">
                          <td className="px-4 py-3 font-mono text-xs">{inv.id}</td>
                          <td className="px-4 py-3 uppercase text-xs font-bold">{inv.status}</td>
                          <td className="px-4 py-3 font-mono">{formatUsd(inv.amount_paid)}</td>
                          <td className="px-4 py-3">{new Date(inv.created_at).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            {inv.pdf_url ? (
                              <BrutalButton
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(inv.pdf_url!, "_blank", "noopener,noreferrer")}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                {t("billing.openInvoice", { defaultValue: "Open" })}
                              </BrutalButton>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </BrutalCardContent>
          </BrutalCard>
        </div>
      </main>
    </div>
  );
};

export default Account;
