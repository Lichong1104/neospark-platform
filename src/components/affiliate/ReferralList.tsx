import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BrutalCard,
  BrutalCardContent,
  BrutalCardHeader,
  BrutalCardTitle,
} from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Users, Loader2 } from "lucide-react";
import affiliateApi from "@/api/affiliate";
import type { ReferralItem, ReferralsListResponse } from "@/types/affiliate";
import { formatMaybeDate } from "@/lib/date";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const StatusBadge: React.FC<{ item: ReferralItem }> = ({ item }) => {
  const { t } = useTranslation();

  if (item.has_paid) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-accent-green text-foreground text-[11px] font-bold uppercase border border-foreground/30">
        <span className="inline-block w-1.5 h-1.5 bg-foreground/70" />
        {t("affiliate.referrals.statusPaid", { defaultValue: "Paid" })}
      </span>
    );
  }

  if (item.has_consumed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-accent-yellow text-foreground text-[11px] font-bold uppercase border border-foreground/30">
        <span className="inline-block w-1.5 h-1.5 bg-foreground/70" />
        {t("affiliate.referrals.statusConsumed", { defaultValue: "Consumed" })}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-secondary text-foreground text-[11px] font-bold uppercase border border-foreground/30">
      <span className="inline-block w-1.5 h-1.5 bg-foreground/40" />
      {t("affiliate.referrals.statusRegistered", { defaultValue: "Registered" })}
    </span>
  );
};

const ReferralRow: React.FC<{ item: ReferralItem }> = ({ item }) => {
  const { t } = useTranslation();
  const displayName = item.referee_email ?? item.referee_name ?? `ID: ${item.referee_id}`;
  const subText =
    item.referee_email && item.referee_name
      ? `${item.referee_name} · ID: ${item.referee_id}`
      : item.referee_email
        ? `ID: ${item.referee_id}`
        : null;

  return (
    <TableRow className="border-b border-foreground/10">
      <TableCell className="text-xs">
        <div className="font-medium">{displayName}</div>
        {subText && (
          <div className="text-[11px] text-muted-foreground mt-0.5">{subText}</div>
        )}
      </TableCell>
      <TableCell className="text-xs tabular-nums">{formatMaybeDate(item.created_at)}</TableCell>
      <TableCell className="text-xs tabular-nums">
        {formatMaybeDate(item.first_paid_at)}
      </TableCell>
      <TableCell className="text-xs text-right font-mono tabular-nums">
        {item.paid_order_count}
      </TableCell>
      <TableCell className="text-xs text-right font-mono tabular-nums">
        {item.total_consumed_points.toLocaleString()}
      </TableCell>
      <TableCell className="text-xs">
        <StatusBadge item={item} />
      </TableCell>
    </TableRow>
  );
};

const ReferralList: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<ReferralsListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const totalPages = useMemo(() => {
    if (!data) return 0;
    return Math.max(1, Math.ceil(data.total / data.page_size));
  }, [data]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await affiliateApi.getReferrals(page, pageSize);
      setData(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(
        t("affiliate.referrals.loadFailed", {
          defaultValue: "Failed to load referrals",
        }),
        { description: message }
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  return (
    <BrutalCard shadow="green">
      <BrutalCardHeader className="pb-2">
        <BrutalCardTitle className="flex items-center gap-2 text-sm">
          <div className="p-1.5 bg-accent-green/80 border border-foreground/30">
            <Users className="w-3.5 h-3.5 text-card" />
          </div>
          {t("affiliate.referrals.title", { defaultValue: "Referral List" })}
        </BrutalCardTitle>
      </BrutalCardHeader>

      <BrutalCardContent className="p-0">
        <div className="relative">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-foreground/15">
                <TableHead className="text-[11px] uppercase tracking-wider">
                  {t("affiliate.referrals.referee", { defaultValue: "Referee" })}
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">
                  {t("affiliate.referrals.registeredAt", { defaultValue: "Registered" })}
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">
                  {t("affiliate.referrals.firstPaidAt", { defaultValue: "First Paid" })}
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-right">
                  {t("affiliate.referrals.paidOrders", { defaultValue: "Paid Orders" })}
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-right">
                  {t("affiliate.referrals.consumedPoints", { defaultValue: "Consumed Points" })}
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">
                  {t("affiliate.referrals.status", { defaultValue: "Status" })}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && data?.items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    {t("affiliate.referrals.empty", { defaultValue: "No referrals yet" })}
                  </TableCell>
                </TableRow>
              )}
              {data?.items.map((item) => (
                <ReferralRow key={item.referee_id} item={item} />
              ))}
            </TableBody>
          </Table>

          {loading && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("common.loading", { defaultValue: "Loading..." })}
            </div>
          )}
        </div>

        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[11px] text-muted-foreground border-t border-foreground/15">
            <div>
              {t("affiliate.referrals.page", { defaultValue: "Page" })}{" "}
              <span className="text-sm font-bold text-foreground">{data.page}</span> /{" "}
              {totalPages} ·{" "}
              <span className="text-sm font-bold text-foreground">{data.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{t("affiliate.referrals.pageSize", { defaultValue: "Page Size" })}</span>
              <select
                className="h-8 border-brutal border-foreground bg-background px-2 text-foreground font-mono text-xs"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                disabled={loading}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <BrutalButton
                size="sm"
                variant="outline"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("affiliate.referrals.prev", { defaultValue: "Prev" })}
              </BrutalButton>
              <BrutalButton
                size="sm"
                variant="outline"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("affiliate.referrals.next", { defaultValue: "Next" })}
              </BrutalButton>
            </div>
          </div>
        )}
      </BrutalCardContent>
    </BrutalCard>
  );
};

export default ReferralList;
