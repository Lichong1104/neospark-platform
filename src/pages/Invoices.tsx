import React, { useEffect, useState } from "react";
import { BrutalCard, BrutalCardContent } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import billingApi, { type BillingInvoice } from "@/api/billing";
import { useTranslation } from "react-i18next";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

const formatUsd = (amountCents: number) => `$${(amountCents / 100).toFixed(2)}`;

const Invoices = () => {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    billingApi
      .getInvoices()
      .then((list) => setInvoices(list))
      .catch((e: any) => {
        const detail =
          e?.response?.data?.detail ||
          e?.message ||
          t("billing.invoiceLoadFailed", { defaultValue: "Failed to load invoices" });
        toast.error(String(detail));
      })
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <div className="h-screen overflow-hidden">
      <main className="h-full bg-background bg-grid overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-5">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">
              {t("billing.invoiceRecords", { defaultValue: "Invoice Records" })}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("billing.invoiceRecordsDesc", {
                defaultValue: "View your Stripe billing history and open invoice PDFs.",
              })}
            </p>
          </div>

          <BrutalCard className="overflow-hidden">
            <BrutalCardContent className="p-0">
              {loading ? (
                <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("common.loading", { defaultValue: "Loading..." })}
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
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
                        <th className="px-4 py-3 font-bold uppercase text-xs">{t("billing.amountDue", { defaultValue: "Amount Due" })}</th>
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
                          <td className="px-4 py-3 font-mono">{formatUsd(inv.amount_due)}</td>
                          <td className="px-4 py-3 font-mono">{formatUsd(inv.amount_paid)}</td>
                          <td className="px-4 py-3">
                            {new Date(inv.created_at).toLocaleString()}
                          </td>
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

export default Invoices;
