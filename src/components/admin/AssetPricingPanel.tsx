import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
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
import { BrutalInput } from "@/components/ui/brutal-input";
import { Switch } from "@/components/ui/switch";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import adminApi from "@/api/admin";
import type { AdminAssetPricingItem } from "@/types/admin";
import { Pencil, Plus, RefreshCw } from "lucide-react";

const ASSET_TYPES = [
  "image",
  "video",
  "background_removal",
  "layer",
  "upscale",
  "angles",
] as const;

// 1 积分 = 0.07 元（后端 DEFAULT_CREDIT_FACE_VALUE_CNY），用于本地毛利预览
const CREDIT_FACE_VALUE_CNY = 0.07;

type FormState = {
  asset_type: string;
  provider: string;
  model: string;
  resolution: string;
  duration: string;
  unit_credits: string;
  cost_fen: string;
  is_active: boolean;
};

const emptyForm = (): FormState => ({
  asset_type: "image",
  provider: "",
  model: "",
  resolution: "",
  duration: "0",
  unit_credits: "0",
  cost_fen: "",
  is_active: true,
});

const toForm = (item: AdminAssetPricingItem): FormState => ({
  asset_type: item.asset_type,
  provider: item.provider ?? "",
  model: item.model,
  resolution: item.resolution ?? "",
  duration: String(item.duration ?? 0),
  unit_credits: String(item.unit_credits),
  cost_fen: item.cost_fen === null ? "" : String(item.cost_fen),
  is_active: item.is_active,
});

const parseNonNegativeInt = (raw: string, fallback?: number): number | null => {
  if (raw.trim() === "") return fallback ?? null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
};

const formatTime = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatCny = (value: number | null | undefined): string =>
  typeof value === "number" && Number.isFinite(value) ? `¥${value.toFixed(2)}` : "-";

const formatRate = (value: number | null | undefined): string =>
  typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "-";

const AssetPricingPanel: React.FC = () => {
  const { t } = useTranslation();

  const [items, setItems] = useState<AdminAssetPricingItem[]>([]);
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toggleTarget, setToggleTarget] = useState<AdminAssetPricingItem | null>(null);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggleReason, setToggleReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAssetPricing({
        asset_type: assetTypeFilter === "all" ? undefined : assetTypeFilter,
        is_active: activeFilter === "all" ? undefined : activeFilter === "active",
      });
      setItems(data.items);
    } catch {
      toast.error(t("admin.pricing.asset.loadFailed"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, assetTypeFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const marginPreview = useMemo(() => {
    const credits = parseNonNegativeInt(form.unit_credits);
    const costFen = parseNonNegativeInt(form.cost_fen, 0);
    if (credits === null || costFen === null) return null;
    const revenueCny = credits * CREDIT_FACE_VALUE_CNY;
    const costCny = form.cost_fen.trim() === "" ? null : costFen / 100;
    const marginCny = costCny === null ? null : revenueCny - costCny;
    return {
      revenueCny,
      costCny,
      marginCny,
      marginRate: marginCny !== null && revenueCny > 0 ? marginCny / revenueCny : null,
    };
  }, [form.cost_fen, form.unit_credits]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setReason("");
    setEditorOpen(true);
  };

  const openEdit = (item: AdminAssetPricingItem) => {
    setEditingId(item.id);
    setForm(toForm(item));
    setReason("");
    setEditorOpen(true);
  };

  const validate = (): boolean => {
    if (!form.model.trim()) {
      toast.error(t("admin.pricing.asset.modelRequired"));
      return false;
    }
    if (parseNonNegativeInt(form.unit_credits) === null) {
      toast.error(t("admin.pricing.asset.invalidNumber"));
      return false;
    }
    if (parseNonNegativeInt(form.duration, 0) === null) {
      toast.error(t("admin.pricing.asset.invalidNumber"));
      return false;
    }
    if (parseNonNegativeInt(form.cost_fen) === null && form.cost_fen.trim() !== "") {
      toast.error(t("admin.pricing.asset.invalidNumber"));
      return false;
    }
    return true;
  };

  const requestSave = () => {
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const save = async () => {
    if (!validate()) return;
    const unitCredits = parseNonNegativeInt(form.unit_credits);
    const duration = parseNonNegativeInt(form.duration, 0);
    const costFen = parseNonNegativeInt(form.cost_fen);
    if (unitCredits === null || duration === null) return;

    const payload = {
      asset_type: form.asset_type,
      provider: form.provider.trim(),
      model: form.model.trim(),
      resolution: form.resolution.trim(),
      duration,
      unit_credits: unitCredits,
      cost_fen: costFen,
      is_active: form.is_active,
      reason: reason.trim() || undefined,
    };

    setSaving(true);
    try {
      if (editingId === null) {
        await adminApi.createAssetPricing(payload);
        toast.success(t("admin.pricing.asset.createSuccess"));
      } else {
        await adminApi.updateAssetPricing(editingId, payload);
        toast.success(t("admin.pricing.asset.saveSuccess"));
      }
      setConfirmOpen(false);
      setEditorOpen(false);
      setReason("");
      await load();
    } catch {
      toast.error(t("admin.pricing.asset.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const requestToggle = (item: AdminAssetPricingItem) => {
    setToggleTarget(item);
    setToggleReason("");
    setToggleOpen(true);
  };

  const applyToggle = async () => {
    if (!toggleTarget) return;
    setSaving(true);
    try {
      await adminApi.setAssetPricingStatus(toggleTarget.id, {
        is_active: !toggleTarget.is_active,
        reason: toggleReason.trim() || undefined,
      });
      toast.success(t("admin.pricing.asset.statusSuccess"));
      setToggleOpen(false);
      setToggleTarget(null);
      await load();
    } catch {
      toast.error(t("admin.pricing.asset.statusFailed"));
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
              {t("admin.pricing.asset.title")}
            </BrutalCardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={assetTypeFilter}
                onChange={(e) => setAssetTypeFilter(e.target.value)}
                className="h-9 border-brutal border-foreground bg-background px-2 font-mono text-xs"
              >
                <option value="all">{t("admin.pricing.asset.filter.allTypes")}</option>
                {ASSET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="h-9 border-brutal border-foreground bg-background px-2 font-mono text-xs"
              >
                <option value="all">{t("admin.pricing.asset.filter.allStatus")}</option>
                <option value="active">{t("admin.pricing.asset.filter.active")}</option>
                <option value="inactive">{t("admin.pricing.asset.filter.inactive")}</option>
              </select>
              <BrutalButton size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </BrutalButton>
              <BrutalButton size="sm" variant="primary" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                {t("admin.pricing.asset.create")}
              </BrutalButton>
            </div>
          </div>
        </BrutalCardHeader>
        <BrutalCardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.pricing.asset.columns.type")}</TableHead>
                <TableHead>{t("admin.pricing.asset.columns.model")}</TableHead>
                <TableHead>{t("admin.pricing.asset.columns.variant")}</TableHead>
                <TableHead>{t("admin.pricing.asset.columns.unitCredits")}</TableHead>
                <TableHead>{t("admin.pricing.asset.columns.cost")}</TableHead>
                <TableHead>{t("admin.pricing.asset.columns.margin")}</TableHead>
                <TableHead>{t("admin.pricing.asset.columns.status")}</TableHead>
                <TableHead>{t("admin.pricing.asset.columns.updatedAt")}</TableHead>
                <TableHead>{t("admin.pricing.asset.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.asset_type}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <div className="font-bold">{item.model}</div>
                    <div className="text-[10px] text-muted-foreground">{item.provider || "-"}</div>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    <div>{item.resolution || "-"}</div>
                    <div>{item.duration ? `${item.duration}s` : "-"}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.unit_credits}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.cost_fen === null ? "-" : `${item.cost_fen} fen`}
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">
                    <div className="text-muted-foreground">{formatCny(item.margin?.revenue_cny)}</div>
                    <div className={item.margin?.margin_cny != null && item.margin.margin_cny < 0 ? "text-accent-red" : "text-green-600"}>
                      {formatCny(item.margin?.margin_cny)} · {formatRate(item.margin?.margin_rate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase border ${
                        item.is_active
                          ? "bg-green-500/10 text-green-600 border-green-500/50"
                          : "bg-muted text-muted-foreground border-foreground/30"
                      }`}
                    >
                      {item.is_active
                        ? t("admin.pricing.asset.filter.active")
                        : t("admin.pricing.asset.filter.inactive")}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTime(item.updated_at ?? item.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <BrutalButton size="sm" variant="ghost" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </BrutalButton>
                      <BrutalButton size="sm" variant="outline" onClick={() => requestToggle(item)}>
                        {item.is_active
                          ? t("admin.pricing.asset.disable")
                          : t("admin.pricing.asset.enable")}
                      </BrutalButton>
                    </div>
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

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="border-brutal border-foreground brutal-shadow bg-card max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-wider text-base">
              {editingId === null
                ? t("admin.pricing.asset.createTitle")
                : t("admin.pricing.asset.editTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider">
              {t("admin.pricing.asset.columns.type")}
              <select
                value={form.asset_type}
                onChange={(e) => setForm((prev) => ({ ...prev, asset_type: e.target.value }))}
                className="h-9 border-brutal border-foreground bg-background px-2 font-mono text-xs"
              >
                {ASSET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider">
              {t("admin.pricing.asset.form.model")}
              <BrutalInput
                value={form.model}
                onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                className="h-9 font-mono text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider">
              {t("admin.pricing.asset.form.provider")}
              <BrutalInput
                value={form.provider}
                onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
                className="h-9 font-mono text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider">
              {t("admin.pricing.asset.form.resolution")}
              <BrutalInput
                value={form.resolution}
                onChange={(e) => setForm((prev) => ({ ...prev, resolution: e.target.value }))}
                className="h-9 font-mono text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider">
              {t("admin.pricing.asset.form.duration")}
              <BrutalInput
                type="number"
                min={0}
                step={1}
                value={form.duration}
                onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                className="h-9 font-mono text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider">
              {t("admin.pricing.asset.form.unitCredits")}
              <BrutalInput
                type="number"
                min={0}
                step={1}
                value={form.unit_credits}
                onChange={(e) => setForm((prev) => ({ ...prev, unit_credits: e.target.value }))}
                className="h-9 font-mono text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider">
              {t("admin.pricing.asset.form.costFen")}
              <BrutalInput
                type="number"
                min={0}
                step={1}
                value={form.cost_fen}
                onChange={(e) => setForm((prev) => ({ ...prev, cost_fen: e.target.value }))}
                placeholder={t("admin.pricing.asset.form.costOptional")}
                className="h-9 font-mono text-xs"
              />
            </label>
            <label className="flex items-center gap-2 pt-5 text-xs font-bold uppercase tracking-wider">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
              />
              {t("admin.pricing.asset.form.active")}
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider md:col-span-2">
              {t("admin.pricing.asset.form.reason")}
              <BrutalInput
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("admin.pricing.reasonPlaceholder")}
                className="h-9 font-mono text-xs"
              />
            </label>
          </div>

          <div className="border-brutal border-foreground/30 bg-muted/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
            {t("admin.pricing.asset.marginPreview")}:{" "}
            {marginPreview
              ? `${formatCny(marginPreview.revenueCny)} → ${formatCny(marginPreview.marginCny)} (${formatRate(marginPreview.marginRate)})`
              : "-"}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <BrutalButton variant="outline" size="sm" onClick={() => setEditorOpen(false)}>
              {t("skill.cancel")}
            </BrutalButton>
            <BrutalButton variant="primary" size="sm" disabled={saving} onClick={requestSave}>
              {t("admin.pricing.asset.reviewSave")}
            </BrutalButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("admin.pricing.asset.confirmTitle")}
        description={t("admin.pricing.asset.confirmBody", {
          asset: `${form.asset_type}/${form.model || "-"}`,
          credits: form.unit_credits || "0",
        })}
        confirmLabel={t("admin.pricing.config.confirmSave")}
        cancelLabel={t("skill.cancel")}
        loading={saving}
        onConfirm={() => void save()}
      />

      <ConfirmDialog
        open={toggleOpen}
        onOpenChange={setToggleOpen}
        title={
          toggleTarget?.is_active
            ? t("admin.pricing.asset.disableConfirmTitle")
            : t("admin.pricing.asset.enableConfirmTitle")
        }
        description={
          <div className="space-y-2">
            <p>
              {t("admin.pricing.asset.toggleConfirmBody", {
                asset: toggleTarget ? `${toggleTarget.asset_type}/${toggleTarget.model}` : "-",
                state: toggleTarget?.is_active
                  ? t("admin.pricing.asset.filter.inactive")
                  : t("admin.pricing.asset.filter.active"),
                effect: toggleTarget?.is_active
                  ? t("admin.pricing.asset.effectDisable")
                  : t("admin.pricing.asset.effectEnable"),
              })}
            </p>
            <BrutalInput
              value={toggleReason}
              onChange={(e) => setToggleReason(e.target.value)}
              placeholder={t("admin.pricing.reasonPlaceholder")}
              className="h-8 font-mono text-xs"
            />
          </div>
        }
        confirmLabel={t("admin.pricing.asset.confirmToggle")}
        cancelLabel={t("skill.cancel")}
        destructive={toggleTarget?.is_active ?? false}
        loading={saving}
        onConfirm={() => void applyToggle()}
      />
    </section>
  );
};

export default AssetPricingPanel;
