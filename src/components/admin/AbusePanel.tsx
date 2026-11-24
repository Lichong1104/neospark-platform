import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BrutalCard,
  BrutalCardContent,
  BrutalCardHeader,
  BrutalCardTitle,
} from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import adminApi from "@/api/admin";
import type { AdminMarketplaceAbuse } from "@/types/admin";
import { RefreshCw } from "lucide-react";

const AbusePanel: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<AdminMarketplaceAbuse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.getMarketplaceAbuse({ limit: 50 }));
    } catch {
      toast.error(t("admin.marketplace.toast.abuseFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-4">
      <BrutalCard shadow="default">
        <BrutalCardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <BrutalCardTitle className="text-sm">
                {t("admin.marketplace.risk.title")}
              </BrutalCardTitle>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("admin.marketplace.risk.hint")}
              </p>
            </div>
            <BrutalButton
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("admin.marketplace.risk.load")}
            </BrutalButton>
          </div>
        </BrutalCardHeader>
        <BrutalCardContent className="space-y-6">
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("admin.marketplace.risk.selfDealing")}
            </div>
            <div className="overflow-x-auto border border-foreground/20">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.marketplace.risk.columns.user")}</TableHead>
                    <TableHead>{t("admin.marketplace.risk.columns.skill")}</TableHead>
                    <TableHead className="text-right">
                      {t("admin.marketplace.risk.columns.calls")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("admin.marketplace.risk.columns.fee")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("admin.marketplace.risk.columns.blocked")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.self_dealing ?? []).map((row) => (
                    <TableRow key={`${row.user_id}:${row.skill_id}`}>
                      <TableCell className="font-mono text-xs">{row.user_id}</TableCell>
                      <TableCell className="font-mono text-xs">{row.skill_id}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {row.calls}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {row.skill_fee_credits}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-accent-orange">
                        {row.blocked_creator_credits}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(data?.self_dealing ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-6 text-center text-xs text-muted-foreground"
                      >
                        {loading ? "..." : t("admin.marketplace.risk.empty")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("admin.marketplace.risk.sharedProfiles")}
            </div>
            <div className="overflow-x-auto border border-foreground/20">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.marketplace.risk.columns.users")}</TableHead>
                    <TableHead className="text-right">
                      {t("admin.marketplace.risk.columns.count")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.shared_payout_profiles ?? []).map((row) => (
                    <TableRow key={row.user_ids.join(",")}>
                      <TableCell className="font-mono text-xs">
                        {row.user_ids.join(", ")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">
                        {row.account_count}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(data?.shared_payout_profiles ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="py-6 text-center text-xs text-muted-foreground"
                      >
                        {loading ? "..." : t("admin.marketplace.risk.empty")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>
        </BrutalCardContent>
      </BrutalCard>
    </section>
  );
};

export default AbusePanel;
