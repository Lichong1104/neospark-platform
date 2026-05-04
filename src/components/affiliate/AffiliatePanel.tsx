import React, { useState, useEffect, useCallback } from "react";
import {
  BrutalCard,
  BrutalCardContent,
  BrutalCardHeader,
  BrutalCardTitle,
} from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Copy,
  Users,
  Wallet,
  TrendingUp,
  ArrowRightLeft,
  Loader2,
  Gift,
} from "lucide-react";
import affiliateApi from "@/api/affiliate";
import type { AffiliateInfo } from "@/types/affiliate";
import { getErrorMessage } from "@/lib/errorMessage";

const AffiliatePanel = () => {
  const { t } = useTranslation();
  const [info, setInfo] = useState<AffiliateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [convertAmount, setConvertAmount] = useState("");
  const [converting, setConverting] = useState(false);

  const loadInfo = useCallback(async () => {
    setLoading(true);
    try {
      const data = await affiliateApi.getAffiliateInfo();
      setInfo(data);
    } catch (err) {
      const msg = getErrorMessage(
        err,
        t("affiliate.loadFailed", { defaultValue: "Failed to load affiliate info" })
      );
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("affiliate.copied", { defaultValue: "Copied to clipboard" }));
    } catch {
      toast.error(t("affiliate.copyFailed", { defaultValue: "Copy failed" }));
    }
  };

  const handleConvert = async () => {
    const points = parseInt(convertAmount, 10);
    if (!points || points <= 0) {
      toast.error(t("affiliate.invalidAmount", { defaultValue: "Please enter a valid amount" }));
      return;
    }
    if (!info || points > info.balance) {
      toast.error(t("affiliate.insufficientBalance", { defaultValue: "Insufficient affiliate balance" }));
      return;
    }
    setConverting(true);
    try {
      const res = await affiliateApi.convertAffiliatePoints({ points });
      toast.success(
        t("affiliate.convertSuccess", {
          defaultValue: "Converted {{points}} points successfully",
          points: res.converted_points,
        })
      );
      setConvertAmount("");
      void loadInfo();
    } catch (err) {
      const msg = getErrorMessage(
        err,
        t("affiliate.convertFailed", { defaultValue: "Convert failed" })
      );
      toast.error(msg);
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <BrutalCard shadow="green">
        <BrutalCardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("common.loading", { defaultValue: "Loading..." })}
        </BrutalCardContent>
      </BrutalCard>
    );
  }

  if (!info) {
    return (
      <BrutalCard shadow="green">
        <BrutalCardContent className="py-6 text-sm text-muted-foreground text-center">
          {t("affiliate.unavailable", { defaultValue: "Affiliate system unavailable" })}
        </BrutalCardContent>
      </BrutalCard>
    );
  }

  return (
    <BrutalCard shadow="green">
      <BrutalCardHeader className="pb-2">
        <BrutalCardTitle className="flex items-center gap-2 text-sm">
          <div className="p-1.5 bg-accent-green/80 border border-foreground/30">
            <Gift className="w-3.5 h-3.5 text-card" />
          </div>
          {t("affiliate.title", { defaultValue: "Affiliate Program" })}
        </BrutalCardTitle>
      </BrutalCardHeader>

      <BrutalCardContent className="space-y-4">
        {/* 推广链接 */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider">
            {t("affiliate.referralLink", { defaultValue: "Your Referral Link" })}
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={info.referral_link}
              className="flex-1 h-9 px-2 bg-background border-brutal border-foreground text-xs font-mono focus:outline-none"
            />
            <BrutalButton
              size="sm"
              variant="outline"
              onClick={() => handleCopy(info.referral_link)}
            >
              <Copy className="w-3.5 h-3.5" />
            </BrutalButton>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {t("affiliate.codeLabel", { defaultValue: "Code" })}: {" "}
            <span className="font-mono font-bold">{info.referral_code}</span>
          </p>
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 border border-foreground/20 bg-secondary/40">
            <div className="flex items-center gap-1 text-muted-foreground text-[10px] uppercase mb-1">
              <Wallet className="w-3 h-3" />
              {t("affiliate.balance", { defaultValue: "Balance" })}
            </div>
            <div className="font-bold font-mono text-sm">{info.balance}</div>
          </div>
          <div className="p-2.5 border border-foreground/20 bg-secondary/40">
            <div className="flex items-center gap-1 text-muted-foreground text-[10px] uppercase mb-1">
              <Users className="w-3 h-3" />
              {t("affiliate.referrals", { defaultValue: "Referrals" })}
            </div>
            <div className="font-bold font-mono text-sm">{info.referral_count}</div>
          </div>
          <div className="p-2.5 border border-foreground/20 bg-secondary/40">
            <div className="flex items-center gap-1 text-muted-foreground text-[10px] uppercase mb-1">
              <TrendingUp className="w-3 h-3" />
              {t("affiliate.totalEarned", { defaultValue: "Total Earned" })}
            </div>
            <div className="font-bold font-mono text-sm">{info.total_earned}</div>
          </div>
          <div className="p-2.5 border border-foreground/20 bg-secondary/40">
            <div className="flex items-center gap-1 text-muted-foreground text-[10px] uppercase mb-1">
              <ArrowRightLeft className="w-3 h-3" />
              {t("affiliate.totalConverted", { defaultValue: "Converted" })}
            </div>
            <div className="font-bold font-mono text-sm">{info.total_converted}</div>
          </div>
        </div>

        {/* 转换积分 */}
        {info.balance > 0 && (
          <div className="space-y-2 pt-1 border-t border-foreground/15">
            <label className="block text-[10px] font-bold uppercase tracking-wider">
              {t("affiliate.convertTitle", { defaultValue: "Convert to Regular Credits" })}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={info.balance}
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                placeholder={t("affiliate.convertPlaceholder", {
                  defaultValue: "Enter amount...",
                })}
                className="flex-1 h-9 px-2 bg-background border-brutal border-foreground text-sm focus:outline-none placeholder:text-muted-foreground/70"
              />
              <BrutalButton
                size="sm"
                variant="green"
                onClick={handleConvert}
                disabled={converting}
              >
                {converting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                )}
                {t("affiliate.convert", { defaultValue: "Convert" })}
              </BrutalButton>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t("affiliate.convertHint", {
                defaultValue: "1 affiliate credit = 1 regular credit",
              })}
            </p>
          </div>
        )}
      </BrutalCardContent>
    </BrutalCard>
  );
};

export default AffiliatePanel;
