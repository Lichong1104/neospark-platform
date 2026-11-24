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
import ConfirmDialog from "@/components/ui/confirm-dialog";
import creatorApi from "@/api/creator";
import type {
  CreatorAccount,
  CreatorLedgerEntry,
  CreatorPayout,
  CreatorPriceChange,
  CreatorSkillSummary,
  CreatorStatement,
} from "@/api/creator";
import { RefreshCw } from "lucide-react";

const ENTRY_TYPES = ["earning", "reversal", "payout", "adjustment"] as const;

const currentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const formatTime = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatCny = (value: number): string =>
  Number.isFinite(value) ? `¥${value.toFixed(2)}` : "-";

const errorMessage = (err: unknown, fallback: string): string => {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
    ?.detail;
  if (typeof detail === "string") return detail;
  return fallback;
};

const StatCard: React.FC<{ label: string; value: string; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <div className="border-brutal border-foreground bg-card px-3 py-2.5">
    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    <div className="mt-1 font-mono text-lg font-bold">{value}</div>
    {hint ? <div className="text-[10px] text-muted-foreground">{hint}</div> : null}
  </div>
);

const CreatorCenter: React.FC = () => {
  const { t } = useTranslation();

  const [account, setAccount] = useState<CreatorAccount | null>(null);
  const [summary, setSummary] = useState<CreatorSkillSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const [month, setMonth] = useState(currentMonth());
  const [statement, setStatement] = useState<CreatorStatement | null>(null);

  const [entryType, setEntryType] = useState<string>("all");
  const [skillFilter, setSkillFilter] = useState("");
  const [earnings, setEarnings] = useState<CreatorLedgerEntry[]>([]);

  const [payoutCredits, setPayoutCredits] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("alipay");
  const [payoutNote, setPayoutNote] = useState("");
  const [payoutConfirm, setPayoutConfirm] = useState(false);
  const [payouts, setPayouts] = useState<CreatorPayout[]>([]);
  const [payoutSaving, setPayoutSaving] = useState(false);

  const [priceSkillId, setPriceSkillId] = useState("");
  const [priceCredits, setPriceCredits] = useState("");
  const [pricingMode, setPricingMode] = useState("fixed");
  const [priceReason, setPriceReason] = useState("");
  const [priceChanges, setPriceChanges] = useState<CreatorPriceChange[]>([]);
  const [priceSaving, setPriceSaving] = useState(false);

  const loadAccount = useCallback(async () => {
    try {
      const [accountData, summaryData, payoutsData] = await Promise.all([
        creatorApi.getAccount(),
        creatorApi.getSummary(),
        creatorApi.getPayouts({ limit: 20 }),
      ]);
      setAccount(accountData);
      setSummary(summaryData.skills);
      setPayouts(payoutsData.payouts);
    } catch {
      toast.error(t("creator.loadFailed"));
    }
  }, [t]);

  const loadStatement = useCallback(async (period: string) => {
    try {
      setStatement(await creatorApi.getStatement(period || undefined));
    } catch {
      setStatement(null);
    }
  }, []);

  const loadEarnings = useCallback(
    async (type: string, skill: string) => {
      try {
        const data = await creatorApi.getEarnings({
          entry_type: type === "all" ? undefined : type,
          skill_id: skill.trim() || undefined,
          limit: 50,
        });
        setEarnings(data.earnings);
      } catch {
        toast.error(t("creator.loadFailed"));
        setEarnings([]);
      }
    },
    [t]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAccount(),
        loadStatement(month),
        loadEarnings(entryType, skillFilter),
      ]);
    } finally {
      setLoading(false);
    }
  }, [entryType, loadAccount, loadEarnings, loadStatement, month, skillFilter]);

  useEffect(() => {
    void loadAll();
    // 只在首次进入时加载；筛选变化通过显式按钮触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitPayout = () => {
    const credits = Number(payoutCredits);
    if (!Number.isInteger(credits) || credits <= 0) {
      toast.error(t("creator.payout.invalidCredits"));
      return;
    }
    if (!payoutMethod.trim()) {
      toast.error(t("creator.payout.methodRequired"));
      return;
    }
    setPayoutConfirm(true);
  };

  const requestPayout = async () => {
    const credits = Number(payoutCredits);
    setPayoutSaving(true);
    try {
      await creatorApi.requestPayout({
        credits,
        method: payoutMethod.trim(),
        note: payoutNote.trim() || undefined,
      });
      toast.success(t("creator.payout.success"));
      setPayoutConfirm(false);
      setPayoutCredits("");
      setPayoutNote("");
      await loadAccount();
    } catch (err) {
      toast.error(errorMessage(err, t("creator.payout.failed")));
    } finally {
      setPayoutSaving(false);
    }
  };

  const loadPriceChanges = async (skillId: string) => {
    if (!skillId.trim()) {
      setPriceChanges([]);
      return;
    }
    try {
      const data = await creatorApi.getPriceChanges(skillId.trim(), { limit: 20 });
      setPriceChanges(data.requests);
    } catch {
      setPriceChanges([]);
    }
  };

  const submitPriceChange = async () => {
    const skillId = priceSkillId.trim();
    if (!skillId) {
      toast.error(t("creator.priceChange.skillRequired"));
      return;
    }
    const credits = Number(priceCredits);
    if (!Number.isInteger(credits) || credits < 0 || credits > 500) {
      toast.error(t("creator.priceChange.invalidPrice"));
      return;
    }
    setPriceSaving(true);
    try {
      await creatorApi.submitPriceChange(skillId, {
        price_credits: credits,
        pricing_mode: pricingMode,
        reason: priceReason.trim() || undefined,
      });
      toast.success(t("creator.priceChange.success"));
      setPriceReason("");
      await loadPriceChanges(skillId);
    } catch (err) {
      toast.error(errorMessage(err, t("creator.priceChange.failed")));
    } finally {
      setPriceSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-mono text-2xl font-bold uppercase tracking-widest">
              {t("creator.title")}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">{t("creator.subtitle")}</p>
          </div>
          <BrutalButton size="sm" variant="outline" disabled={loading} onClick={() => void loadAll()}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("admin.actions.refresh")}
          </BrutalButton>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label={t("creator.account.available")}
            value={String(account?.available_credits ?? 0)}
          />
          <StatCard
            label={t("creator.account.pending")}
            value={String(account?.pending_credits ?? 0)}
            hint={t("creator.account.pendingHint")}
          />
          <StatCard
            label={t("creator.account.frozen")}
            value={String(account?.frozen_credits ?? 0)}
          />
          <StatCard
            label={t("creator.account.earned")}
            value={String(account?.total_earned_credits ?? 0)}
          />
          <StatCard
            label={t("creator.account.paid")}
            value={String(account?.total_paid_credits ?? 0)}
            hint={
              account?.daily_earn_cap != null || account?.monthly_earn_cap != null
                ? t("creator.account.caps", {
                    daily: account?.daily_earn_cap ?? "-",
                    monthly: account?.monthly_earn_cap ?? "-",
                  })
                : undefined
            }
          />
        </div>

        <BrutalCard shadow="default">
          <BrutalCardHeader>
            <BrutalCardTitle className="text-sm">{t("creator.bySkill.title")}</BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("creator.bySkill.skill")}</TableHead>
                  <TableHead>{t("creator.bySkill.calls")}</TableHead>
                  <TableHead>{t("creator.bySkill.fee")}</TableHead>
                  <TableHead>{t("creator.bySkill.revenue")}</TableHead>
                  <TableHead>{t("creator.bySkill.compute")}</TableHead>
                  <TableHead>{t("creator.bySkill.refunded")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((row) => (
                  <TableRow key={row.skill_id}>
                    <TableCell className="font-mono text-xs">{row.skill_id}</TableCell>
                    <TableCell className="font-mono text-xs">{row.calls}</TableCell>
                    <TableCell className="font-mono text-xs">{row.skill_fee_credits}</TableCell>
                    <TableCell className="font-mono text-xs text-green-600">
                      {row.creator_credits}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-green-600">
                      {row.compute_creator_credits}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.refunded_credits}
                    </TableCell>
                  </TableRow>
                ))}
                {summary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      {t("admin.state.noData")}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </BrutalCardContent>
        </BrutalCard>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BrutalCard shadow="default">
            <BrutalCardHeader>
              <div className="flex items-center justify-between gap-2">
                <BrutalCardTitle className="text-sm">
                  {t("creator.statement.title")}
                </BrutalCardTitle>
                <div className="flex items-center gap-2">
                  <BrutalInput
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    placeholder="YYYY-MM"
                    className="h-8 w-28 font-mono text-xs"
                  />
                  <BrutalButton
                    size="sm"
                    variant="outline"
                    onClick={() => void loadStatement(month)}
                  >
                    {t("admin.actions.load")}
                  </BrutalButton>
                </div>
              </div>
            </BrutalCardHeader>
            <BrutalCardContent>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label={t("creator.statement.confirmedCredits")}
                  value={String(statement?.confirmed_credits ?? 0)}
                  hint={statement ? formatCny(statement.confirmed_cny) : undefined}
                />
                <StatCard
                  label={t("creator.statement.lockedCredits")}
                  value={String(statement?.locked_credits ?? 0)}
                  hint={statement ? formatCny(statement.locked_cny) : undefined}
                />
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {t("creator.statement.hint")}
              </p>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard shadow="default">
            <BrutalCardHeader>
              <BrutalCardTitle className="text-sm">
                {t("creator.payout.title")}
              </BrutalCardTitle>
            </BrutalCardHeader>
            <BrutalCardContent>
              <div className="flex flex-wrap items-center gap-2">
                <BrutalInput
                  value={payoutCredits}
                  onChange={(e) => setPayoutCredits(e.target.value)}
                  placeholder={t("creator.payout.credits")}
                  className="h-9 w-32 font-mono text-xs"
                />
                <BrutalInput
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  placeholder={t("creator.payout.method")}
                  className="h-9 w-32 font-mono text-xs"
                />
                <BrutalInput
                  value={payoutNote}
                  onChange={(e) => setPayoutNote(e.target.value)}
                  placeholder={t("creator.payout.note")}
                  className="h-9 flex-1 font-mono text-xs"
                />
                <BrutalButton
                  size="sm"
                  variant="primary"
                  disabled={payoutSaving}
                  onClick={submitPayout}
                >
                  {t("creator.payout.submit")}
                </BrutalButton>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("creator.payout.hint", {
                  available: account?.available_credits ?? 0,
                })}
              </p>
              <div className="mt-3 space-y-1">
                {payouts.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border border-foreground/20 px-2 py-1.5 text-[11px]"
                  >
                    <span className="font-mono">
                      #{item.id} · {item.credits} {t("creator.payout.creditsUnit")}
                    </span>
                    <span>{formatCny(item.amount_cny)}</span>
                    <span className="font-mono uppercase text-muted-foreground">
                      {t(`creator.payout.status.${item.status}`, item.status)}
                    </span>
                  </div>
                ))}
                {payouts.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    {t("admin.state.noRecords")}
                  </div>
                ) : null}
              </div>
            </BrutalCardContent>
          </BrutalCard>
        </div>

        <BrutalCard shadow="default">
          <BrutalCardHeader>
            <BrutalCardTitle className="text-sm">{t("creator.earnings.title")}</BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value)}
                className="h-9 border-brutal border-foreground bg-background px-2 font-mono text-xs"
              >
                <option value="all">{t("creator.earnings.allTypes")}</option>
                {ENTRY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`creator.earnings.type.${type}`)}
                  </option>
                ))}
              </select>
              <BrutalInput
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                placeholder={t("creator.earnings.skillFilter")}
                className="h-9 w-56 font-mono text-xs"
              />
              <BrutalButton
                size="sm"
                variant="outline"
                onClick={() => void loadEarnings(entryType, skillFilter)}
              >
                {t("admin.actions.search")}
              </BrutalButton>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("creator.earnings.columns.id")}</TableHead>
                  <TableHead>{t("creator.earnings.columns.skill")}</TableHead>
                  <TableHead>{t("creator.earnings.columns.type")}</TableHead>
                  <TableHead>{t("creator.earnings.columns.credits")}</TableHead>
                  <TableHead>{t("creator.earnings.columns.status")}</TableHead>
                  <TableHead>{t("creator.earnings.columns.rate")}</TableHead>
                  <TableHead>{t("creator.earnings.columns.balance")}</TableHead>
                  <TableHead>{t("creator.earnings.columns.time")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">#{row.id}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <div>{row.skill_id ?? "-"}</div>
                      {row.invocation_id ? (
                        <div className="text-[10px] text-muted-foreground">
                          inv {row.invocation_id}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">
                      <div>{row.entry_type}</div>
                      {row.source ? (
                        <div className="text-[10px] text-muted-foreground">
                          {t(`creator.earnings.source.${row.source}`, row.source)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell
                      className={`font-mono text-xs ${row.credits < 0 ? "text-accent-red" : "text-green-600"}`}
                    >
                      {row.credits > 0 ? `+${row.credits}` : row.credits}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">{row.status}</TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {formatCny(row.settlement_rate)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.balance_after}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{formatTime(row.created_at)}</div>
                      {row.status === "pending" && row.available_at ? (
                        <div className="text-[10px]">
                          {t("creator.earnings.unlockAt", {
                            time: formatTime(row.available_at),
                          })}
                        </div>
                      ) : null}
                      {row.note ? <div className="text-[10px]">{row.note}</div> : null}
                    </TableCell>
                  </TableRow>
                ))}
                {earnings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      {t("admin.state.noRecords")}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard shadow="default">
          <BrutalCardHeader>
            <BrutalCardTitle className="text-sm">
              {t("creator.priceChange.title")}
            </BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <div className="flex flex-wrap items-center gap-2">
              <BrutalInput
                value={priceSkillId}
                onChange={(e) => setPriceSkillId(e.target.value)}
                placeholder={t("creator.priceChange.skillId")}
                className="h-9 w-56 font-mono text-xs"
              />
              <BrutalInput
                type="number"
                min={0}
                max={500}
                value={priceCredits}
                onChange={(e) => setPriceCredits(e.target.value)}
                placeholder={t("creator.priceChange.price")}
                className="h-9 w-28 font-mono text-xs"
              />
              <select
                value={pricingMode}
                onChange={(e) => setPricingMode(e.target.value)}
                className="h-9 border-brutal border-foreground bg-background px-2 font-mono text-xs"
              >
                <option value="fixed">{t("creator.priceChange.mode.fixed")}</option>
                <option value="inherit">{t("creator.priceChange.mode.inherit")}</option>
                <option value="free">{t("creator.priceChange.mode.free")}</option>
              </select>
              <BrutalInput
                value={priceReason}
                onChange={(e) => setPriceReason(e.target.value)}
                placeholder={t("creator.priceChange.reason")}
                className="h-9 flex-1 font-mono text-xs"
              />
              <BrutalButton
                size="sm"
                variant="outline"
                disabled={!priceSkillId.trim()}
                onClick={() => void loadPriceChanges(priceSkillId)}
              >
                {t("admin.actions.load")}
              </BrutalButton>
              <BrutalButton
                size="sm"
                variant="primary"
                disabled={priceSaving}
                onClick={() => void submitPriceChange()}
              >
                {t("creator.priceChange.submit")}
              </BrutalButton>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("creator.priceChange.hint")}
            </p>
            <div className="mt-3 space-y-1">
              {priceChanges.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 border border-foreground/20 px-2 py-1.5 text-[11px]"
                >
                  <span className="font-mono">#{item.id}</span>
                  <span className="font-mono">
                    {item.current_price_credits} → {item.requested_price_credits}
                  </span>
                  <span className="font-mono uppercase text-muted-foreground">
                    {item.requested_mode ?? "-"}
                  </span>
                  <span className="font-mono uppercase">
                    {t(`creator.priceChange.status.${item.status}`, item.status)}
                  </span>
                  <span className="text-muted-foreground">{formatTime(item.created_at)}</span>
                  {item.review_note ? (
                    <span className="text-muted-foreground">{item.review_note}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </BrutalCardContent>
        </BrutalCard>
      </div>

      <ConfirmDialog
        open={payoutConfirm}
        onOpenChange={setPayoutConfirm}
        title={t("creator.payout.confirmTitle")}
        description={t("creator.payout.confirmBody", {
          credits: payoutCredits || 0,
          method: payoutMethod,
        })}
        confirmLabel={t("creator.payout.confirm")}
        cancelLabel={t("skill.cancel")}
        loading={payoutSaving}
        onConfirm={() => void requestPayout()}
      />
    </main>
  );
};

export default CreatorCenter;
