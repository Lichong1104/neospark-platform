import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type {
  AdminPagedResponse,
  AdminSkillSubmissionDetail,
  AdminSkillSubmissionItem,
} from "@/types/admin";
import { Check, RefreshCw, X } from "lucide-react";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const PAGE_SIZE = 20;

const formatTime = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    pending: "bg-accent-yellow/15 text-foreground border-accent-yellow/60",
    approved: "bg-green-500/10 text-green-600 border-green-500/50",
    rejected: "bg-accent-red/10 text-accent-red border-accent-red/50",
  };
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase border ${styles[status] ?? "bg-muted text-muted-foreground border-foreground/30"}`}
    >
      {t(`admin.skillReviews.status.${status}`, status)}
    </span>
  );
};

const SkillReviewPanel: React.FC = () => {
  const { t } = useTranslation();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminPagedResponse<AdminSkillSubmissionItem> | null>(null);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AdminSkillSubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await adminApi.getSkillSubmissions({
          status: statusFilter === "all" ? undefined : statusFilter,
          page,
          page_size: PAGE_SIZE,
        })
      );
    } catch {
      toast.error(t("admin.skillReviews.loadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (submissionId: number) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      setDetail(await adminApi.getSkillSubmission(submissionId));
    } catch {
      toast.error(t("admin.skillReviews.detailLoadFailed"));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const approve = async (submissionId: number) => {
    if (!window.confirm(t("admin.skillReviews.approveConfirm"))) return;
    setActionLoading(true);
    try {
      await adminApi.approveSkillSubmission(submissionId);
      toast.success(t("admin.skillReviews.approveSuccess"));
      setDetailOpen(false);
      setRejectOpen(false);
      await load();
    } catch {
      toast.error(t("admin.skillReviews.actionFailed"));
    } finally {
      setActionLoading(false);
    }
  };

  const openReject = () => {
    setRejectReason("");
    setRejectOpen(true);
  };

  const reject = async () => {
    if (!detail) return;
    if (!rejectReason.trim()) {
      toast.error(t("admin.skillReviews.rejectReasonRequired"));
      return;
    }
    setActionLoading(true);
    try {
      await adminApi.rejectSkillSubmission(detail.id, rejectReason.trim());
      toast.success(t("admin.skillReviews.rejectSuccess"));
      setRejectOpen(false);
      setDetailOpen(false);
      await load();
    } catch {
      toast.error(t("admin.skillReviews.actionFailed"));
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <section className="space-y-4">
      <BrutalCard shadow="default">
        <BrutalCardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <BrutalCardTitle className="text-sm">
              {t("admin.skillReviews.title")}
            </BrutalCardTitle>
            <div className="flex items-center gap-2">
              <div className="flex border-brutal border-foreground">
                {(["pending", "approved", "rejected", "all"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setStatusFilter(f);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-none ${
                      statusFilter === f
                        ? "bg-foreground text-card"
                        : "bg-card text-foreground hover:bg-secondary"
                    }`}
                  >
                    {t(`admin.skillReviews.filter.${f}`)}
                  </button>
                ))}
              </div>
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
                <TableHead className="w-[60px]">ID</TableHead>
                <TableHead>{t("admin.skillReviews.columns.skillId")}</TableHead>
                <TableHead>{t("admin.skillReviews.columns.name")}</TableHead>
                <TableHead>{t("admin.skillReviews.columns.submitter")}</TableHead>
                <TableHead>{t("admin.skillReviews.columns.version")}</TableHead>
                <TableHead>{t("admin.skillReviews.columns.mode")}</TableHead>
                <TableHead>{t("admin.skillReviews.columns.status")}</TableHead>
                <TableHead>{t("admin.skillReviews.columns.submittedAt")}</TableHead>
                <TableHead className="text-right">
                  {t("admin.skillReviews.columns.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.id}</TableCell>
                  <TableCell className="font-mono text-xs">{item.skill_id}</TableCell>
                  <TableCell className="text-xs">{item.name}</TableCell>
                  <TableCell className="text-xs">
                    <div>{item.user_email ?? "-"}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {item.user_name ?? ""}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">v{item.version}</TableCell>
                  <TableCell className="text-xs">
                    {t(`admin.skillReviews.mode.${item.execution_mode}`, item.execution_mode)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTime(item.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <BrutalButton size="sm" variant="outline" onClick={() => void openDetail(item.id)}>
                        {t("admin.skillReviews.actions.view")}
                      </BrutalButton>
                      {item.status === "pending" ? (
                        <>
                          <BrutalButton
                            size="sm"
                            variant="primary"
                            disabled={actionLoading}
                            onClick={() => void approve(item.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {t("admin.skillReviews.actions.approve")}
                          </BrutalButton>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(data?.items ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    {loading ? "..." : t("admin.skillReviews.empty")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-end gap-2">
              <BrutalButton
                size="sm"
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                {t("admin.actions.prev")}
              </BrutalButton>
              <span className="text-xs font-mono text-muted-foreground">
                {page} / {totalPages}
              </span>
              <BrutalButton
                size="sm"
                variant="outline"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("admin.actions.next")}
              </BrutalButton>
            </div>
          ) : null}
        </BrutalCardContent>
      </BrutalCard>

      {/* 详情 + 审核弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl border-brutal border-foreground max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold uppercase tracking-wider">
              {detail ? detail.name : t("admin.skillReviews.actions.view")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              {detail ? `${detail.skill_id} · v${detail.version}` : ""}
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="py-10 text-center text-sm text-muted-foreground">...</div>
          ) : (
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs md:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">
                    {t("admin.skillReviews.columns.submitter")}:{" "}
                  </span>
                  {detail.user_email ?? "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("admin.skillReviews.columns.mode")}:{" "}
                  </span>
                  {t(`admin.skillReviews.mode.${detail.execution_mode}`, detail.execution_mode)}
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("admin.skillReviews.columns.status")}:{" "}
                  </span>
                  <StatusBadge status={detail.status} />
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("admin.skillReviews.columns.submittedAt")}:{" "}
                  </span>
                  {formatTime(detail.created_at)}
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">
                    {t("admin.skillReviews.file")}:{" "}
                  </span>
                  <span className="font-mono">{detail.filename}</span>
                </div>
                {detail.reject_reason ? (
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-muted-foreground">
                      {t("admin.skillReviews.rejectReason")}:{" "}
                    </span>
                    <span className="text-accent-red">{detail.reject_reason}</span>
                  </div>
                ) : null}
              </div>

              {detail.package_files.length > 0 ? (
                <div>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("admin.skillReviews.packageFiles")}
                  </div>
                  <div className="max-h-28 overflow-y-auto border border-foreground/20 bg-background p-2 font-mono text-[11px]">
                    {detail.package_files.map((f) => (
                      <div key={f}>{f}</div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("admin.skillReviews.contentTitle")}
                </div>
                <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap border border-foreground/20 bg-background p-3 font-mono text-[11px] leading-relaxed">
                  {detail.content}
                </pre>
              </div>
            </div>
          )}

          {detail && detail.status === "pending" ? (
            <DialogFooter className="gap-2 sm:gap-2">
              <BrutalButton
                size="sm"
                variant="outline"
                disabled={actionLoading}
                onClick={openReject}
              >
                <X className="h-3.5 w-3.5" />
                {t("admin.skillReviews.actions.reject")}
              </BrutalButton>
              <BrutalButton
                size="sm"
                variant="primary"
                disabled={actionLoading}
                onClick={() => void approve(detail.id)}
              >
                <Check className="h-3.5 w-3.5" />
                {t("admin.skillReviews.actions.approve")}
              </BrutalButton>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 驳回原因弹窗 */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md border-brutal border-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold uppercase tracking-wider">
              {t("admin.skillReviews.rejectTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {detail ? `${detail.skill_id} · ${detail.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t("admin.skillReviews.rejectReason")}
            rows={3}
            className="w-full p-3 bg-background border-brutal border-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <BrutalButton size="sm" variant="outline" disabled={actionLoading} onClick={() => setRejectOpen(false)}>
              {t("skill.cancel")}
            </BrutalButton>
            <BrutalButton size="sm" variant="primary" disabled={actionLoading} onClick={() => void reject()}>
              {t("admin.skillReviews.actions.reject")}
            </BrutalButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default SkillReviewPanel;
