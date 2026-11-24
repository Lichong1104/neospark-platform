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
import type { AdminRefundPayload, AdminSkillRefund } from "@/types/admin";
import { RefreshCw } from "lucide-react";

const SCOPES = ["all", "skill_fee", "token", "compute"] as const;

const formatTime = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const errorDetail = (err: unknown): { code?: string; message?: string } => {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (detail && typeof detail === "object") return detail as { code?: string; message?: string };
  if (typeof detail === "string") return { message: detail };
  return {};
};

const RefundPanel: React.FC = () => {
  const { t } = useTranslation();

  const [invocationInput, setInvocationInput] = useState("");
  const [userInput, setUserInput] = useState("");
  const [refunds, setRefunds] = useState<AdminSkillRefund[]>([]);
  const [loading, setLoading] = useState(false);

  const [scope, setScope] = useState<string>("all");
  const [credits, setCredits] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [pending, setPending] = useState<AdminRefundPayload | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [overWindowOpen, setOverWindowOpen] = useState(false);

  const load = useCallback(
    async (invocationId?: string, userId?: string) => {
      setLoading(true);
      try {
        const data = await adminApi.getSkillRefunds({
          invocation_id: Number(invocationId) > 0 ? Number(invocationId) : undefined,
          user_id: Number(userId) > 0 ? Number(userId) : undefined,
          limit: 50,
        });
        setRefunds(data.refunds);
      } catch {
        toast.error(t("admin.refunds.loadFailed"));
        setRefunds([]);
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const requestRefund = () => {
    const invocationId = Number(invocationInput.trim());
    if (!Number.isInteger(invocationId) || invocationId <= 0) {
      toast.error(t("admin.refunds.invocationRequired"));
      return;
    }
    if (!reason.trim()) {
      toast.error(t("admin.refunds.reasonRequired"));
      return;
    }
    let parsedCredits: number | undefined;
    if (credits.trim() !== "") {
      parsedCredits = Number(credits);
      if (!Number.isInteger(parsedCredits) || parsedCredits <= 0) {
        toast.error(t("admin.refunds.invalidCredits"));
        return;
      }
    }
    setPending({
      refund_credits: parsedCredits,
      refund_scope: scope,
      reason: reason.trim(),
      note: note.trim() || undefined,
    });
    setConfirmOpen(true);
  };

  const execute = async (payload: AdminRefundPayload) => {
    const invocationId = Number(invocationInput.trim());
    setSaving(true);
    try {
      await adminApi.refundSkillInvocation(invocationId, payload);
      toast.success(t("admin.refunds.success"));
      setConfirmOpen(false);
      setOverWindowOpen(false);
      setPending(null);
      setCredits("");
      setReason("");
      setNote("");
      await load(invocationInput, userInput);
    } catch (err) {
      const detail = errorDetail(err);
      if (detail.code === "refund_over_window") {
        setConfirmOpen(false);
        setOverWindowOpen(true);
        return;
      }
      toast.error(detail.message || t("admin.refunds.failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <BrutalCard shadow="default">
        <BrutalCardHeader>
          <BrutalCardTitle className="text-sm">{t("admin.refunds.title")}</BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
            <BrutalInput
              value={invocationInput}
              onChange={(e) => setInvocationInput(e.target.value)}
              placeholder={t("admin.refunds.invocationId")}
              className="h-9 font-mono text-xs md:col-span-1"
            />
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="h-9 border-brutal border-foreground bg-background px-2 font-mono text-xs"
            >
              {SCOPES.map((item) => (
                <option key={item} value={item}>
                  {t(`admin.refunds.scope.${item}`)}
                </option>
              ))}
            </select>
            <BrutalInput
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              placeholder={t("admin.refunds.creditsOptional")}
              className="h-9 font-mono text-xs"
            />
            <BrutalInput
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("admin.refunds.reason")}
              className="h-9 font-mono text-xs md:col-span-2"
            />
            <BrutalButton size="sm" variant="primary" onClick={requestRefund} className="h-9">
              {t("admin.refunds.submit")}
            </BrutalButton>
            <BrutalInput
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("admin.refunds.note")}
              className="h-9 font-mono text-xs md:col-span-2"
            />
            <span className="text-[11px] text-muted-foreground md:col-span-4">
              {t("admin.refunds.hint")}
            </span>
          </div>
        </BrutalCardContent>
      </BrutalCard>

      <BrutalCard shadow="default">
        <BrutalCardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <BrutalCardTitle className="text-sm">{t("admin.refunds.history")}</BrutalCardTitle>
            <div className="flex items-center gap-2">
              <BrutalInput
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={t("admin.refunds.userId")}
                className="h-9 w-32 font-mono text-xs"
              />
              <BrutalButton
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => void load(invocationInput, userInput)}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </BrutalButton>
            </div>
          </div>
        </BrutalCardHeader>
        <BrutalCardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.refunds.columns.id")}</TableHead>
                <TableHead>{t("admin.refunds.columns.invocation")}</TableHead>
                <TableHead>{t("admin.refunds.columns.credits")}</TableHead>
                <TableHead>{t("admin.refunds.columns.scope")}</TableHead>
                <TableHead>{t("admin.refunds.columns.reversal")}</TableHead>
                <TableHead>{t("admin.refunds.columns.status")}</TableHead>
                <TableHead>{t("admin.refunds.columns.reason")}</TableHead>
                <TableHead>{t("admin.refunds.columns.time")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">#{item.id}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <div>{item.invocation_id}</div>
                    <div className="text-[10px] text-muted-foreground">user {item.user_id}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <div>{item.refund_credits}</div>
                    <div className="text-[10px] text-muted-foreground">{item.refund_type}</div>
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">{item.refund_scope}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.creator_reversal_credits > 0 ? `-${item.creator_reversal_credits}` : "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase border border-foreground/30 bg-muted text-muted-foreground">
                      {item.status}
                    </span>
                    {item.over_window ? (
                      <span className="ml-1 inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase border border-accent-red/50 bg-accent-red/10 text-accent-red">
                        {t("admin.refunds.overWindowBadge")}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>{item.reason ?? "-"}</div>
                    {item.note ? <div className="text-[10px]">{item.note}</div> : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTime(item.executed_at ?? item.created_at)}
                  </TableCell>
                </TableRow>
              ))}
              {refunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {loading ? "..." : t("admin.state.noRecords")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </BrutalCardContent>
      </BrutalCard>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("admin.refunds.confirmTitle")}
        description={
          pending ? (
            <p>
              {t("admin.refunds.confirmBody", {
                invocation: invocationInput || "-",
                credits: pending.refund_credits ?? t("admin.refunds.allRemaining"),
                scope: t(`admin.refunds.scope.${pending.refund_scope}`),
              })}
            </p>
          ) : null
        }
        confirmLabel={t("admin.refunds.confirmRefund")}
        cancelLabel={t("skill.cancel")}
        destructive
        loading={saving}
        onConfirm={() => {
          if (pending) void execute(pending);
        }}
      />

      <ConfirmDialog
        open={overWindowOpen}
        onOpenChange={setOverWindowOpen}
        title={t("admin.refunds.overWindowTitle")}
        description={t("admin.refunds.overWindowBody")}
        confirmLabel={t("admin.refunds.overWindowConfirm")}
        cancelLabel={t("skill.cancel")}
        destructive
        loading={saving}
        onConfirm={() => {
          if (pending) void execute({ ...pending, confirm_over_window: true });
        }}
      />
    </section>
  );
};

export default RefundPanel;
