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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import adminApi from "@/api/admin";
import type { AdminInvocation, AdminInvocationDetail } from "@/types/admin";
import { RefreshCw } from "lucide-react";

const STATUSES = ["reserved", "settled", "refunded", "failed"] as const;
const PAGE_SIZE = 20;

const formatTime = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatFen = (fen: number | null | undefined): string => {
  if (fen == null || !Number.isFinite(fen)) return "-";
  return `¥${(fen / 100).toFixed(4)}`;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const color =
    status === "settled"
      ? "bg-accent-green/20 text-foreground"
      : status === "refunded"
        ? "bg-accent-orange/20 text-foreground"
        : status === "failed"
          ? "bg-accent-red/15 text-accent-red"
          : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-block border border-foreground/30 px-1.5 py-0.5 text-[10px] font-bold uppercase ${color}`}
    >
      {status}
    </span>
  );
};

const SummaryItem: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="border border-foreground/20 bg-background px-3 py-2">
    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    <div className="mt-1 font-mono text-sm font-bold">{value}</div>
  </div>
);

const InvocationLedgerPanel: React.FC = () => {
  const { t } = useTranslation();

  const [userInput, setUserInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<AdminInvocation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminInvocationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(
    async (filters: {
      userId?: number;
      skillId?: string;
      status: string;
      page: number;
    }) => {
      if (filters.userId !== undefined && !Number.isFinite(filters.userId)) {
        toast.error(t("admin.marketplace.toast.invalidUser"));
        return;
      }
      setLoading(true);
      try {
        const data = await adminApi.getSkillInvocations({
          user_id: filters.userId,
          skill_id: filters.skillId || undefined,
          status: filters.status === "all" ? undefined : filters.status,
          offset: (filters.page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        });
        setItems(data.invocations);
        setTotal(data.total);
      } catch {
        toast.error(t("admin.marketplace.toast.loadFailed"));
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  const currentFilters = useCallback(
    (targetPage: number) => ({
      userId: userInput.trim() ? Number(userInput.trim()) : undefined,
      skillId: skillInput.trim() || undefined,
      status: statusFilter,
      page: targetPage,
    }),
    [skillInput, statusFilter, userInput]
  );

  useEffect(() => {
    void load({ status: "all", page: 1 });
    // 仅首次挂载加载；筛选由按钮触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (invocationId: number) => {
    setDetailId(invocationId);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await adminApi.getSkillInvocation(invocationId));
    } catch {
      toast.error(t("admin.marketplace.toast.loadDetailFailed"));
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="space-y-4">
      <BrutalCard shadow="default">
        <BrutalCardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <BrutalCardTitle className="text-sm">
                {t("admin.marketplace.invocations.title")}
              </BrutalCardTitle>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("admin.marketplace.invocations.hint")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <BrutalInput
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={t("admin.marketplace.filters.userId")}
                className="h-9 w-28 font-mono text-xs"
              />
              <BrutalInput
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder={t("admin.marketplace.filters.skillId")}
                className="h-9 w-44 font-mono text-xs"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 border-brutal border-foreground bg-background px-2 font-mono text-xs"
              >
                <option value="all">
                  {t("admin.marketplace.filters.allStatus")}
                </option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <BrutalButton
                size="sm"
                variant="primary"
                disabled={loading}
                onClick={() => {
                  setPage(1);
                  void load(currentFilters(1));
                }}
              >
                {t("admin.marketplace.filters.search")}
              </BrutalButton>
              <BrutalButton
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => {
                  setUserInput("");
                  setSkillInput("");
                  setStatusFilter("all");
                  setPage(1);
                  void load({ status: "all", page: 1 });
                }}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </BrutalButton>
            </div>
          </div>
        </BrutalCardHeader>
        <BrutalCardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[11px] text-muted-foreground">
            <div>
              {t("admin.marketplace.invocations.page")}{" "}
              <span className="font-mono font-bold text-foreground">{page}</span> /{" "}
              {totalPages} · {total}
            </div>
            <div className="flex items-center gap-2">
              <BrutalButton
                size="sm"
                variant="outline"
                disabled={loading || page <= 1}
                onClick={() => {
                  const next = Math.max(1, page - 1);
                  setPage(next);
                  void load(currentFilters(next));
                }}
              >
                {t("admin.actions.prev")}
              </BrutalButton>
              <BrutalButton
                size="sm"
                variant="outline"
                disabled={loading || page >= totalPages}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  void load(currentFilters(next));
                }}
              >
                {t("admin.actions.next")}
              </BrutalButton>
            </div>
          </div>
          <div className="overflow-x-auto border-t-brutal border-foreground">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>{t("admin.marketplace.invocations.columns.user")}</TableHead>
                  <TableHead>{t("admin.marketplace.invocations.columns.skill")}</TableHead>
                  <TableHead>{t("admin.marketplace.invocations.columns.status")}</TableHead>
                  <TableHead className="text-right">
                    {t("admin.marketplace.invocations.columns.skillFee")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("admin.marketplace.invocations.columns.token")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("admin.marketplace.invocations.columns.asset")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("admin.marketplace.invocations.columns.total")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("admin.marketplace.invocations.columns.refunded")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("admin.marketplace.invocations.columns.creator")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("admin.marketplace.invocations.columns.platform")}
                  </TableHead>
                  <TableHead>{t("admin.marketplace.invocations.columns.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.invocation_id}>
                    <TableCell className="font-mono text-xs">
                      #{item.invocation_id}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.user_id}</TableCell>
                    <TableCell className="max-w-[160px] truncate font-mono text-xs">
                      {item.skill_id ?? "-"}
                      {item.skill_count > 1 ? (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          +{item.skill_count - 1}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                      {item.partial_success ? (
                        <span className="ml-1 text-[10px] text-accent-orange">
                          {t("admin.marketplace.invocations.partial")}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {item.skill_fee_credits}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {item.token_credits}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {item.asset_credits}
                      {item.asset_item_count > 0 ? (
                        <span className="text-[10px] text-muted-foreground">
                          ({item.asset_item_count})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">
                      {item.total_credits}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {item.refunded_credits}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {item.creator_credits}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {item.platform_credits}
                    </TableCell>
                    <TableCell>
                      <BrutalButton
                        size="sm"
                        variant="outline"
                        onClick={() => void openDetail(item.invocation_id)}
                      >
                        {t("admin.marketplace.invocations.view")}
                      </BrutalButton>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {loading ? "..." : t("admin.marketplace.invocations.empty")}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </BrutalCardContent>
      </BrutalCard>

      <Dialog
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailId(null);
            setDetail(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto border-brutal border-foreground bg-card brutal-shadow sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold uppercase tracking-wider">
              {t("admin.marketplace.invocations.detailTitle", {
                id: detailId ?? "",
              })}
              {detail ? <StatusBadge status={detail.status} /> : null}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {detail
                ? `user ${detail.user_id} · ${detail.skill_id ?? "-"} · ${detail.channel} · ${formatTime(detail.created_at)}`
                : detailLoading
                  ? "..."
                  : "-"}
            </DialogDescription>
          </DialogHeader>

          {detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <SummaryItem
                  label={t("admin.marketplace.invocations.columns.total")}
                  value={detail.total_credits}
                />
                <SummaryItem
                  label={t("admin.marketplace.invocations.columns.refunded")}
                  value={detail.refunded_credits}
                />
                <SummaryItem label={t("admin.marketplace.invocations.net")} value={detail.total_credits - detail.refunded_credits} />
                <SummaryItem
                  label={t("admin.marketplace.invocations.charged")}
                  value={detail.charged_credits ?? "-"}
                />
                <SummaryItem
                  label={t("admin.marketplace.invocations.columns.creator")}
                  value={detail.creator_credits}
                />
                <SummaryItem
                  label={t("admin.marketplace.invocations.columns.platform")}
                  value={detail.platform_credits}
                />
                <SummaryItem
                  label={t("admin.marketplace.invocations.tokens")}
                  value={`${detail.input_tokens} / ${detail.output_tokens}`}
                />
                <SummaryItem
                  label={t("admin.marketplace.invocations.freeQuota")}
                  value={detail.free_quota_applied ? "yes" : "no"}
                />
              </div>

              {detail.error_code ? (
                <div className="border border-accent-red/50 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
                  {t("admin.marketplace.invocations.errorCode")}: {detail.error_code}
                </div>
              ) : null}

              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("admin.marketplace.invocations.skillsSplit")}
                </div>
                <div className="overflow-x-auto border border-foreground/20">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Skill</TableHead>
                        <TableHead className="text-right">
                          {t("admin.marketplace.invocations.columns.skillFee")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("admin.marketplace.invocations.columns.creator")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("admin.marketplace.invocations.columns.platform")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("admin.marketplace.invocations.columns.refunded")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("admin.marketplace.invocations.freeQuota")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.skills.map((row) => (
                        <TableRow key={row.skill_id}>
                          <TableCell className="font-mono text-xs">
                            {row.skill_id}
                            {row.owner_id != null ? (
                              <span className="ml-1 text-[10px] text-muted-foreground">
                                owner {row.owner_id}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {row.skill_fee_credits}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {row.creator_credits}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {row.platform_credits}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {row.refunded_credits}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {row.free_quota_applied ? "yes" : "no"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {detail.skills.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="py-4 text-center text-xs text-muted-foreground"
                          >
                            {t("admin.marketplace.invocations.empty")}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("admin.marketplace.invocations.assetsTitle", {
                    count: detail.assets.length,
                  })}
                </div>
                <ScrollArea className="max-h-[260px] border border-foreground/20">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("admin.marketplace.invocations.assetColumns.type")}</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead className="text-right">
                            {t("admin.marketplace.invocations.assetColumns.quantity")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("admin.marketplace.invocations.assetColumns.unit")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("admin.marketplace.invocations.assetColumns.credits")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("admin.marketplace.invocations.assetColumns.upstream")}
                          </TableHead>
                          <TableHead>{t("admin.marketplace.invocations.assetColumns.status")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.assets.map((asset) => (
                          <TableRow key={asset.id}>
                            <TableCell className="font-mono text-xs">
                              {asset.asset_type}
                            </TableCell>
                            <TableCell className="max-w-[180px] truncate font-mono text-xs">
                              {asset.model ?? "-"}
                              {asset.provider ? (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  {asset.provider}
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {asset.quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {asset.unit_credits}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold">
                              {asset.credits}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {formatFen(asset.upstream_cost_fen)}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span
                                className={
                                  asset.status === "failed"
                                    ? "text-accent-red"
                                    : "text-muted-foreground"
                                }
                              >
                                {asset.status}
                              </span>
                              {asset.error_code ? (
                                <span className="block text-[10px] text-accent-red">
                                  {asset.error_code}
                                </span>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                        {detail.assets.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="py-4 text-center text-xs text-muted-foreground"
                            >
                              {t("admin.marketplace.invocations.empty")}
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>

              <details className="border border-foreground/20 bg-background">
                <summary className="cursor-pointer px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("admin.marketplace.invocations.snapshot")}
                </summary>
                <pre className="max-h-[220px] overflow-auto border-t border-foreground/20 p-3 text-[11px] font-mono">
                  {JSON.stringify(detail.pricing_snapshot ?? {}, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {detailLoading ? "..." : "-"}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default InvocationLedgerPanel;
