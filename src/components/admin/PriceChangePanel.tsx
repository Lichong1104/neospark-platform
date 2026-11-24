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
import type { AdminPriceChangeRequest } from "@/types/admin";
import { RefreshCw } from "lucide-react";

type Action = "approve" | "reject";

const STATUSES = ["pending", "approved", "rejected"] as const;

const formatTime = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const PriceChangePanel: React.FC = () => {
  const { t } = useTranslation();

  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [items, setItems] = useState<AdminPriceChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [action, setAction] = useState<Action>("approve");
  const [target, setTarget] = useState<AdminPriceChangeRequest | null>(null);
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPriceChangeRequests({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
      });
      setItems(data.requests);
    } catch {
      toast.error(t("admin.priceChanges.loadFailed"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openReview = (nextAction: Action, request: AdminPriceChangeRequest) => {
    setAction(nextAction);
    setTarget(request);
    setNote("");
    setConfirmOpen(true);
  };

  const submit = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await adminApi.reviewPriceChangeRequest(target.id, action, note.trim() || undefined);
      toast.success(t(`admin.priceChanges.actionSuccess.${action}`));
      setConfirmOpen(false);
      setTarget(null);
      await load();
    } catch {
      toast.error(t("admin.priceChanges.actionFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <BrutalCard shadow="default">
        <BrutalCardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <BrutalCardTitle className="text-sm">
                {t("admin.priceChanges.title")}
              </BrutalCardTitle>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("admin.priceChanges.hint")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 border-brutal border-foreground bg-background px-2 font-mono text-xs"
              >
                <option value="all">{t("admin.priceChanges.filter.all")}</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`admin.priceChanges.status.${status}`)}
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
                <TableHead>{t("admin.priceChanges.columns.id")}</TableHead>
                <TableHead>{t("admin.priceChanges.columns.skill")}</TableHead>
                <TableHead>{t("admin.priceChanges.columns.creator")}</TableHead>
                <TableHead>{t("admin.priceChanges.columns.price")}</TableHead>
                <TableHead>{t("admin.priceChanges.columns.mode")}</TableHead>
                <TableHead>{t("admin.priceChanges.columns.reason")}</TableHead>
                <TableHead>{t("admin.priceChanges.columns.status")}</TableHead>
                <TableHead>{t("admin.priceChanges.columns.time")}</TableHead>
                <TableHead>{t("admin.priceChanges.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">#{item.id}</TableCell>
                  <TableCell className="font-mono text-xs">{item.skill_id}</TableCell>
                  <TableCell className="font-mono text-xs">{item.creator_user_id}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.current_price_credits} → {item.requested_price_credits}
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">
                    {item.requested_mode ?? "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.reason ?? "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase border border-foreground/30 bg-muted text-muted-foreground">
                      {t(`admin.priceChanges.status.${item.status}`, item.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>{formatTime(item.created_at)}</div>
                    {item.review_note ? (
                      <div className="text-[10px]">{item.review_note}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {item.status === "pending" ? (
                      <div className="flex items-center gap-1">
                        <BrutalButton
                          size="sm"
                          variant="primary"
                          onClick={() => openReview("approve", item)}
                        >
                          {t("admin.priceChanges.actions.approve")}
                        </BrutalButton>
                        <BrutalButton
                          size="sm"
                          variant="outline"
                          onClick={() => openReview("reject", item)}
                        >
                          {t("admin.priceChanges.actions.reject")}
                        </BrutalButton>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
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
        title={t(`admin.priceChanges.confirmTitle.${action}`)}
        description={
          target ? (
            <div className="space-y-2">
              <p>
                {t("admin.priceChanges.confirmBody", {
                  skill: target.skill_id,
                  current: target.current_price_credits,
                  requested: target.requested_price_credits,
                  action: t(`admin.priceChanges.actionLabel.${action}`),
                })}
              </p>
              <BrutalInput
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("admin.priceChanges.note")}
                className="h-8 font-mono text-xs"
              />
            </div>
          ) : null
        }
        confirmLabel={t(`admin.priceChanges.actions.${action}`)}
        cancelLabel={t("skill.cancel")}
        destructive={action === "reject"}
        loading={saving}
        onConfirm={() => void submit()}
      />
    </section>
  );
};

export default PriceChangePanel;
