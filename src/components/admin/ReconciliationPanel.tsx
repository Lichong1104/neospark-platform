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
import { BrutalInput } from "@/components/ui/brutal-input";
import adminApi from "@/api/admin";
import type {
  AdminReconciliation,
  AdminReconciliationAccountRow,
  AdminReconciliationViolationRow,
} from "@/types/admin";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="border-brutal border-foreground bg-card px-4 py-3 brutal-shadow">
    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    <div className="mt-1 font-mono text-2xl font-black tabular-nums">{value}</div>
  </div>
);

const ViolationTable: React.FC<{
  title: string;
  rows: AdminReconciliationViolationRow[];
  idLabel: string;
  emptyLabel: string;
}> = ({ title, rows, idLabel, emptyLabel }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {title}
      <span
        className={`border border-foreground/30 px-1.5 py-0.5 ${
          rows.length > 0
            ? "bg-accent-red/15 text-accent-red"
            : "bg-accent-green/20 text-foreground"
        }`}
      >
        {rows.length}
      </span>
    </div>
    {rows.length === 0 ? (
      <div className="text-[11px] text-muted-foreground">{emptyLabel}</div>
    ) : (
      <div className="overflow-x-auto border border-foreground/20">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{idLabel}</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Actual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.invocation_id}>
                <TableCell className="font-mono text-xs">
                  #{row.invocation_id}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {row.expected}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-accent-red">
                  {row.actual}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )}
  </div>
);

const AccountViolationTable: React.FC<{
  title: string;
  rows: AdminReconciliationAccountRow[];
  emptyLabel: string;
}> = ({ title, rows, emptyLabel }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {title}
      <span
        className={`border border-foreground/30 px-1.5 py-0.5 ${
          rows.length > 0
            ? "bg-accent-red/15 text-accent-red"
            : "bg-accent-green/20 text-foreground"
        }`}
      >
        {rows.length}
      </span>
    </div>
    {rows.length === 0 ? (
      <div className="text-[11px] text-muted-foreground">{emptyLabel}</div>
    ) : (
      <div className="overflow-x-auto border border-foreground/20">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>user_id</TableHead>
              <TableHead className="text-right">ledger_sum</TableHead>
              <TableHead className="text-right">account_sum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.user_id}>
                <TableCell className="font-mono text-xs">{row.user_id}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {row.ledger_sum}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-accent-red">
                  {row.account_sum}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )}
  </div>
);

const ReconciliationPanel: React.FC = () => {
  const { t } = useTranslation();

  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [data, setData] = useState<AdminReconciliation | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (range?: { since?: string; until?: string }) => {
      setLoading(true);
      try {
        setData(
          await adminApi.getMarketplaceReconciliation({
            since: range?.since || undefined,
            until: range?.until || undefined,
          })
        );
      } catch {
        toast.error(t("admin.marketplace.toast.reconcileFailed"));
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void load();
    // 仅首次挂载加载；日期范围由按钮触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const violationCount = data
    ? Object.values(data.violations).reduce((sum, rows) => sum + rows.length, 0)
    : 0;

  return (
    <section className="space-y-4">
      <BrutalCard shadow="default">
        <BrutalCardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <BrutalCardTitle className="text-sm">
                {t("admin.marketplace.reconciliation.title")}
              </BrutalCardTitle>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("admin.marketplace.reconciliation.hint")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("admin.marketplace.filters.since")}
                <BrutalInput
                  type="datetime-local"
                  value={since}
                  onChange={(e) => setSince(e.target.value)}
                  className="h-9 w-52 font-mono text-xs"
                />
              </label>
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("admin.marketplace.filters.until")}
                <BrutalInput
                  type="datetime-local"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className="h-9 w-52 font-mono text-xs"
                />
              </label>
              <BrutalButton
                size="sm"
                variant="primary"
                disabled={loading}
                onClick={() => void load({ since, until })}
              >
                {t("admin.marketplace.reconciliation.run")}
              </BrutalButton>
              <BrutalButton
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => {
                  setSince("");
                  setUntil("");
                  void load();
                }}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </BrutalButton>
            </div>
          </div>
        </BrutalCardHeader>
        <BrutalCardContent className="space-y-4">
          {loading && !data ? (
            <div className="py-8 text-center text-sm text-muted-foreground">...</div>
          ) : data ? (
            <>
              <div
                className={`flex items-center gap-2 border-brutal border-foreground px-3 py-2 text-xs font-bold uppercase tracking-wider ${
                  data.ok
                    ? "bg-accent-green/20 text-foreground"
                    : "bg-accent-red/15 text-accent-red"
                }`}
              >
                {data.ok ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {data.ok
                  ? t("admin.marketplace.reconciliation.ok")
                  : t("admin.marketplace.reconciliation.violations", {
                      count: violationCount,
                    })}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <Stat
                  label={t("admin.marketplace.reconciliation.totals.invocations")}
                  value={data.totals.invocations}
                />
                <Stat
                  label={t("admin.marketplace.reconciliation.totals.total")}
                  value={data.totals.total_credits}
                />
                <Stat
                  label={t("admin.marketplace.reconciliation.totals.refunded")}
                  value={data.totals.refunded_credits}
                />
                <Stat
                  label={t("admin.marketplace.reconciliation.totals.net")}
                  value={data.totals.net_credits}
                />
                <Stat
                  label={t("admin.marketplace.reconciliation.totals.creator")}
                  value={data.totals.creator_credits}
                />
                <Stat
                  label={t("admin.marketplace.reconciliation.totals.platform")}
                  value={data.totals.platform_credits}
                />
                <Stat
                  label={t("admin.marketplace.reconciliation.totals.retention")}
                  value={data.totals.platform_retention_credits}
                />
                <Stat
                  label={t("admin.marketplace.reconciliation.totals.token")}
                  value={data.totals.token_credits}
                />
                <Stat
                  label={t("admin.marketplace.reconciliation.totals.asset")}
                  value={data.totals.asset_credits}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ViolationTable
                  title={t(
                    "admin.marketplace.reconciliation.violationTypes.skillFee"
                  )}
                  rows={data.violations.skill_fee_mismatch}
                  idLabel="invocation"
                  emptyLabel={t("admin.marketplace.reconciliation.empty")}
                />
                <ViolationTable
                  title={t(
                    "admin.marketplace.reconciliation.violationTypes.creator"
                  )}
                  rows={data.violations.creator_credits_mismatch}
                  idLabel="invocation"
                  emptyLabel={t("admin.marketplace.reconciliation.empty")}
                />
                <ViolationTable
                  title={t(
                    "admin.marketplace.reconciliation.violationTypes.asset"
                  )}
                  rows={data.violations.asset_credits_mismatch}
                  idLabel="invocation"
                  emptyLabel={t("admin.marketplace.reconciliation.empty")}
                />
                <AccountViolationTable
                  title={t(
                    "admin.marketplace.reconciliation.violationTypes.account"
                  )}
                  rows={data.violations.creator_account_mismatch}
                  emptyLabel={t("admin.marketplace.reconciliation.empty")}
                />
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("admin.marketplace.reconciliation.empty")}
            </div>
          )}
        </BrutalCardContent>
      </BrutalCard>
    </section>
  );
};

export default ReconciliationPanel;
