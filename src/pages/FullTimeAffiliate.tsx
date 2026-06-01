import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrutalCard,
  BrutalCardContent,
  BrutalCardHeader,
  BrutalCardTitle,
} from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import { BrutalInput } from "@/components/ui/brutal-input";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import affiliateApi from "@/api/affiliate";
import { getErrorMessage } from "@/lib/errorMessage";
import { useAuth } from "@/contexts/AuthContext";

const FullTimeAffiliate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userEmail, userInfo } = useAuth();
  const loggedInEmail = userEmail || userInfo?.email || "";
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedContact = contact.trim();
    const trimmedReason = reason.trim();

    if (!trimmedName) {
      toast.error(t("fullTimeAffiliate.nameRequired", { defaultValue: "Please enter your name" }));
      return;
    }
    if (!trimmedContact) {
      toast.error(t("fullTimeAffiliate.emailRequired", { defaultValue: "Please enter your email" }));
      return;
    }
    if (!trimmedReason) {
      toast.error(t("fullTimeAffiliate.reasonRequired", { defaultValue: "Please describe why you want to join" }));
      return;
    }

    setSubmitting(true);
    try {
      const res = await affiliateApi.applyFullTimeAffiliate({
        name: trimmedName,
        contact: trimmedContact,
        reason: trimmedReason,
      });
      setSuccessMessage(res.message);
      setSubmitted(true);
      toast.success(
        res.message ||
          t("fullTimeAffiliate.applySuccess", {
            defaultValue: "Application submitted successfully. We will review it shortly.",
          })
      );
    } catch (err) {
      const msg = getErrorMessage(
        err,
        t("fullTimeAffiliate.applyFailed", { defaultValue: "Failed to submit application" })
      );
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden">
      <main className="h-full p-6 md:p-8 bg-background overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          <button
            type="button"
            onClick={() => navigate("/affiliate")}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("fullTimeAffiliate.backToAffiliate", { defaultValue: "Back to Affiliate Program" })}
          </button>

          <BrutalCard shadow="green">
            <BrutalCardHeader className="pb-2">
              <BrutalCardTitle className="flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-accent-green/80 border border-foreground/30">
                  <Briefcase className="w-3.5 h-3.5 text-card" />
                </div>
                {t("fullTimeAffiliate.title", { defaultValue: "Full-Time Affiliate Program" })}
              </BrutalCardTitle>
            </BrutalCardHeader>

            <BrutalCardContent className="space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("fullTimeAffiliate.description", {
                  defaultValue:
                    "Join our dedicated affiliate program for higher commission rates, exclusive support, and priority access to new features. Fill out the form below to apply.",
                })}
              </p>

              <div className="space-y-2 p-3 border border-foreground/20 bg-secondary/30">
                <p className="text-[10px] font-bold uppercase tracking-wider">
                  {t("fullTimeAffiliate.benefitsTitle", { defaultValue: "Program Benefits" })}
                </p>
                <ul className="space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
                  <li>{t("fullTimeAffiliate.benefit1", { defaultValue: "Higher commission rates on referred user payments" })}</li>
                  <li>{t("fullTimeAffiliate.benefit2", { defaultValue: "Dedicated account manager and priority support" })}</li>
                  <li>{t("fullTimeAffiliate.benefit3", { defaultValue: "Early access to promotional materials and campaigns" })}</li>
                  <li>{t("fullTimeAffiliate.benefit4", { defaultValue: "Custom referral tools and tracking dashboard" })}</li>
                </ul>
              </div>

              {submitted ? (
                <div className="py-6 flex flex-col items-center gap-3 text-center">
                  <CheckCircle2 className="w-10 h-10 text-accent-green" />
                  <p className="text-sm font-medium">
                    {successMessage ||
                      t("fullTimeAffiliate.applySuccess", {
                        defaultValue: "Application submitted successfully. We will review it shortly.",
                      })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("fullTimeAffiliate.reviewHint", {
                      defaultValue: "Our team will review your application and contact you via the info you provided.",
                    })}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider">
                      {t("fullTimeAffiliate.nameLabel", { defaultValue: "Name" })}
                    </label>
                    <BrutalInput
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("fullTimeAffiliate.namePlaceholder", { defaultValue: "Your full name" })}
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider">
                      {t("fullTimeAffiliate.emailLabel", { defaultValue: "Email" })}
                    </label>
                    <div className="flex gap-2">
                      <BrutalInput
                        type="email"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder={t("fullTimeAffiliate.emailPlaceholder", {
                          defaultValue: "your@email.com",
                        })}
                        disabled={submitting}
                        className="flex-1"
                      />
                      {loggedInEmail ? (
                        <BrutalButton
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setContact(loggedInEmail)}
                          disabled={submitting}
                          title={loggedInEmail}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {t("fullTimeAffiliate.useLoggedInEmail", {
                            defaultValue: "Use logged-in email",
                          })}
                        </BrutalButton>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider">
                      {t("fullTimeAffiliate.reasonLabel", { defaultValue: "Application Reason" })}
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t("fullTimeAffiliate.reasonPlaceholder", {
                        defaultValue: "Tell us about your audience, experience, and why you'd like to join...",
                      })}
                      rows={5}
                      disabled={submitting}
                      className="flex w-full min-h-[120px] border-brutal border-foreground bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                    />
                  </div>

                  <BrutalButton
                    type="submit"
                    variant="green"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {t("fullTimeAffiliate.applyButton", { defaultValue: "Apply for Full-Time Affiliate" })}
                  </BrutalButton>
                </form>
              )}
            </BrutalCardContent>
          </BrutalCard>
        </div>
      </main>
    </div>
  );
};

export default FullTimeAffiliate;
