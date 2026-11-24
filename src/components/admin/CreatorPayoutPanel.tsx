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
import adminApi from "@/api/admin";
import type { AdminCreatorPayout } from "@/types/admin";
import { RefreshCw } from "lucide-react";

type Action = "approve" | "reject" | "mark-paid";

const STATUSES = ["requested", "approved", "paid", "rejected"] as const;

const formatTime = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatCny = (value: number): string =>
  Number.isFinite(value) ? `¥${value.toFixed(2)}` : "-";

const PayoutStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    requested: "bg-accent-yellow/15 text-foreground border-accent-yellow/60",
    approved: "bg-accent-cyan/10 text-foreground border-accent-cyan/60",
    paid: "bg-green-500/10 text-green-600 border-green-500/50",
    rejected: "bg-accent-red/10 text-accent-red border-accent-red/50",
  };
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase border ${styles[status] ?? "bg-muted text-muted-foreground border-foreground/30"}`}
    >
      {t(`admin.payouts.status.${status}`, status)}
    </span>
  );
};

const CreatorPayoutPanel: React.FC = () => {
  const { t } = useTranslation();

  const [statusFilter, setStatusFilter] = useState<string>("requested");
  const [items, setItems] = useState<AdminCreatorPayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [action, setAction] = useState<Action | null>(null);
  const [target, setTarget] = useState<AdminCreatorPayout | null>(null);
  const [note, setNote] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getCreatorPayouts({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
      });
      setItems(data.payouts);
    } catch {
      toast.error(t("admin.payouts.loadFailed"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openReview = (nextAction: Action, payout: AdminCreatorPayout) => {
    setAction(nextAction);
    setTarget(payout);
    setNote("");
    setExternalRef("");
    setConfirmOpen(true);
  };

  const submit = async () => {
    if (!action || !target) return;
    setSaving(true);
    try {
      await adminApi.reviewCreatorPayout(target.id, action, {
        note: note.trim() || undefined,
        external_ref: externalRef.trim() || undefined,
      });
      toast.success(t(`admin.payouts.actionSuccess.${action}`));
      setConfirmOpen(false);
      setTarget(null);
      await load();
    } catch {
      toast.error(t("admin.payouts.actionFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <BrutalCard shadow="default">
        <BrutalCardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <BrutalCardTitle className="text-sm">
              {t("admin.payouts.title")}
            </BrutalCardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 border-brutal border-foreground bg-background px-2 font-mono text-xs"
              >
                <option value="all">{t("admin.payouts.filter.all")}</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`admin.payouts.status.${status}`)}
                  </option>
                ))}
              </select>
              <BrutalButton size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </BrutalButton>
            </div>
          </div>
        </BrutalCardHeader>
        <BrutalCardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.payouts.columns.id")}</TableHead>
                <TableHead>{t("admin.payouts.columns.creator")}</TableHead>
                <TableHead>{t("admin.payouts.columns.credits")}</TableHead>
                <TableHead>{t("admin.payouts.columns.amount")}</TableHead>
                <TableHead>{t("admin.payouts.columns.method")}</TableHead>
                <TableHead>{t("admin.payouts.columns.status")}</TableHead>
                <TableHead>{t("admin.payouts.columns.time")}</TableHead>
                <TableHead>{t("admin.payouts.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">#{item.id}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <div>user {item.creator_user_id}</div>
                    <div className="text-[10px] text-muted-foreground">{item.note ?? "-"}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.credits}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <div>{formatCny(item.amount_cny)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {(item.settlement_rate * 100).toFixed(2)}%
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.method ?? "-"}</TableCell>
                  <TableCell>
                    <PayoutStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>{formatTime(item.requested_at)}</div>
                    {item.paid_at ? <div>{formatTime(item.paid_at)}</div> : null}
                    {item.external_ref ? (
                      <div className="font-mono">{item.external_ref}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {item.status === "requested" ? (
                        <>
                          <BrutalButton
                            size="sm"
                            variant="primary"
                            onClick={() => openReview("approve", item)}
                          >
                            {t("admin.payouts.actions.approve")}
                          </BrutalButton>
                          <BrutalButton
                            size="sm"
                            variant="outline"
                            onClick={() => openReview("reject", item)}
                          >
                            {t("admin.payouts.actions.reject")}
                          </BrutalButton>
                        </>
                      ) : null}
                      {item.status === "approved" ? (
                        <BrutalButton
                          size="sm"
                          variant="green"
                          onClick={() => openReview("mark-paid", item)}
                        >
                          {t("admin.payouts.actions.markPaid")}
                        </BrutalButton>
                      ) : null}
                      {item.status === "paid" || item.status === "rejected" ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {loading ? "..." : t("admin.state.noData")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </BrutalCardContent>
      </BrutalCard>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setTarget(null);
        }}
        title={t(`admin.payouts.confirmTitle.${action ?? "approve"}`)}
        description={
          target ? (
            <div className="space-y-2">
              <p>
                {t("admin.payouts.confirmBody", {
                  id: target.id,
                  creator: target.creator_user_id,
                  credits: target.credits,
                  amount: formatCny(target.amount_cny),
                  action: action ? t(`admin.payouts.actionLabel.${action}`) : "",
                })}
              </p>
              {action === "mark-paid" ? (
                <BrutalInput
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                  placeholder={t("admin.payouts.externalRef")}
                  className="h-8 font-mono text-xs"
                />
              ) : null}
              <BrutalInput
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("admin.payouts.note")}
                className="h-8 font-mono text-xs"
              />
            </div>
          ) : null
        }
        confirmLabel={t(`admin.payouts.actions.${action === "mark-paid" ? "markPaid" : action ?? "approve"}`)}
        cancelLabel={t("skill.cancel")}
        destructive={action === "reject"}
        loading={saving}
        onConfirm={() => void submit()}
      />
    </section>
  );
};

export default CreatorPayoutPanel;
