import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import adminApi from "@/api/admin";
import type {
  AdminConfigValue,
  AdminPricingAuditItem,
  AdminPricingConfigView,
} from "@/types/admin";
import { RefreshCw, Save } from "lucide-react";

type Scope = "global" | "plan" | "category" | "creator";
const SCOPES: Scope[] = ["global", "plan", "category", "creator"];

type Draft = Record<string, string | boolean>;

const formatTime = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const toDraft = (value: AdminConfigValue, valueType: string): string | boolean =>
  valueType === "bool" ? Boolean(value) : String(value);

const fromDraft = (value: string | boolean, valueType: string): AdminConfigValue => {
  if (valueType === "bool") return Boolean(value);
  if (valueType === "int") return Number.parseInt(String(value), 10);
  return Number(String(value));
};

const PricingConfigPanel: React.FC = () => {
  const { t } = useTranslation();

  const [scope, setScope] = useState<Scope>("global");
  const [scopeKey, setScopeKey] = useState("*");
  const [view, setView] = useState<AdminPricingConfigView | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [original, setOriginal] = useState<Record<string, AdminConfigValue>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [audit, setAudit] = useState<AdminPricingAuditItem[]>([]);

  const effectiveKey = scope === "global" ? "*" : scopeKey.trim() || "*";

  const rows = useMemo(() => {
    if (!view) return [];
    const keys = new Set<string>([
      ...Object.keys(view.defaults),
      ...view.items.map((item) => item.config_key),
    ]);
    return Array.from(keys).map((key) => {
      const saved = view.items.find((item) => item.config_key === key);
      const fallback = view.defaults[key];
      const valueType = saved?.value_type ?? fallback?.value_type ?? "string";
      const value = saved?.value ?? fallback?.value ?? "";
      return {
        key,
        valueType,
        value,
        description: saved?.description ?? fallback?.description ?? "",
        defaults: fallback?.value,
        updatedAt: saved?.updated_at ?? null,
      };
    });
  }, [view]);

  const loadAudit = useCallback(async () => {
    try {
      const res = await adminApi.getPricingConfigAudit({
        scope,
        page: 1,
        page_size: 20,
      });
      setAudit(res.items);
    } catch {
      setAudit([]);
    }
  }, [scope]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPricingConfigs({
        scope,
        scope_key: effectiveKey,
      });
      setView(data);
      const nextOriginal: Record<string, AdminConfigValue> = {};
      const nextDraft: Draft = {};
      const keys = new Set<string>([
        ...Object.keys(data.defaults),
        ...data.items.map((item) => item.config_key),
      ]);
      keys.forEach((key) => {
        const saved = data.items.find((item) => item.config_key === key);
        const fallback = data.defaults[key];
        const valueType = saved?.value_type ?? fallback?.value_type ?? "string";
        const value = saved?.value ?? fallback?.value ?? "";
        nextOriginal[key] = value;
        nextDraft[key] = toDraft(value, valueType);
      });
      setOriginal(nextOriginal);
      setDraft(nextDraft);
    } catch {
      toast.error(t("admin.pricing.config.loadFailed"));
      setView(null);
    } finally {
      setLoading(false);
    }
    await loadAudit();
  }, [effectiveKey, loadAudit, scope, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const changedItems = useMemo(() => {
    return rows
      .filter((row) => {
        const next = draft[row.key];
        if (next === undefined) return false;
        return String(next) !== String(original[row.key]);
      })
      .map((row) => ({
        config_key: row.key,
        value: fromDraft(draft[row.key], row.valueType),
      }));
  }, [draft, original, rows]);

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.updatePricingConfigs({
        scope,
        scope_key: effectiveKey,
        items: changedItems,
        reason: reason.trim() || undefined,
      });
      toast.success(t("admin.pricing.config.saveSuccess"));
      setConfirmOpen(false);
      setReason("");
      await load();
    } catch {
      toast.error(t("admin.pricing.config.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const requestSave = () => {
    if (changedItems.length === 0) {
      toast(t("admin.pricing.config.noChanges"));
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <section className="space-y-4">
      <BrutalCard shadow="default">
        <BrutalCardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <BrutalCardTitle className="text-sm">
              {t("admin.pricing.config.title")}
            </BrutalCardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={scope}
                onChange={(e) => {
                  const next = e.target.value as Scope;
                  setScope(next);
                  if (next === "global") setScopeKey("*");
                }}
                className="h-9 border-brutal border-foreground bg-background px-2 font-mono text-xs"
              >
                {SCOPES.map((s) => (
                  <option key={s} value={s}>
                    {t(`admin.pricing.config.scope.${s}`)}
                  </option>
                ))}
              </select>
              <BrutalInput
                value={scopeKey}
                disabled={scope === "global"}
                onChange={(e) => setScopeKey(e.target.value)}
                placeholder={t("admin.pricing.config.scopeKey")}
                className="h-9 w-40 font-mono text-xs"
              />
              <BrutalButton size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </BrutalButton>
            </div>
          </div>
        </BrutalCardHeader>
        <BrutalCardContent>
          <div className="mb-3 text-xs text-muted-foreground">
            {t("admin.pricing.config.version")}:{" "}
            <span className="font-mono">{view?.config_version ?? "-"}</span>
            {changedItems.length > 0 ? (
              <span className="ml-3 font-bold text-foreground">
                {t("admin.pricing.config.pending", { count: changedItems.length })}
              </span>
            ) : null}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.pricing.config.columns.key")}</TableHead>
                <TableHead>{t("admin.pricing.config.columns.value")}</TableHead>
                <TableHead>{t("admin.pricing.config.columns.default")}</TableHead>
                <TableHead>{t("admin.pricing.config.columns.type")}</TableHead>
                <TableHead>{t("admin.pricing.config.columns.updatedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-mono text-xs">
                    <div className="font-bold">{row.key}</div>
                    <div className="text-[10px] text-muted-foreground">{row.description}</div>
                  </TableCell>
                  <TableCell>
                    {row.valueType === "bool" ? (
                      <Switch
                        checked={Boolean(draft[row.key])}
                        onCheckedChange={(checked) =>
                          setDraft((prev) => ({ ...prev, [row.key]: checked }))
                        }
                      />
                    ) : (
                      <BrutalInput
                        type="number"
                        step={row.valueType === "decimal" ? "0.01" : "1"}
                        value={String(draft[row.key] ?? "")}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, [row.key]: e.target.value }))
                        }
                        className="h-8 w-36 font-mono text-xs"
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {String(row.defaults ?? "-")}
                  </TableCell>
                  <TableCell className="font-mono text-[10px] uppercase text-muted-foreground">
                    {row.valueType}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTime(row.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {loading ? "..." : t("admin.state.noData")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
            <BrutalInput
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("admin.pricing.reasonPlaceholder")}
              className="h-9 flex-1 font-mono text-xs"
            />
            <BrutalButton
              size="sm"
              variant="primary"
              disabled={saving || loading || changedItems.length === 0}
              onClick={requestSave}
            >
              <Save className="h-3.5 w-3.5" />
              {t("admin.pricing.config.save")}
            </BrutalButton>
          </div>
        </BrutalCardContent>
      </BrutalCard>

      <BrutalCard shadow="default">
        <BrutalCardHeader>
          <BrutalCardTitle className="text-sm">
            {t("admin.pricing.audit.title")}
          </BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.pricing.audit.columns.time")}</TableHead>
                <TableHead>{t("admin.pricing.audit.columns.key")}</TableHead>
                <TableHead>{t("admin.pricing.audit.columns.old")}</TableHead>
                <TableHead>{t("admin.pricing.audit.columns.new")}</TableHead>
                <TableHead>{t("admin.pricing.audit.columns.operator")}</TableHead>
                <TableHead>{t("admin.pricing.audit.columns.reason")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTime(item.created_at)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <div>{item.config_key}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {item.scope}/{item.scope_key}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.old_value ?? "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.new_value ?? "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{item.operator_id ?? "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.reason ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
              {audit.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    {t("admin.state.noRecords")}
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
        title={t("admin.pricing.config.confirmTitle")}
        description={t("admin.pricing.config.confirmBody", {
          count: changedItems.length,
          scope: `${scope}/${effectiveKey}`,
        })}
        confirmLabel={t("admin.pricing.config.confirmSave")}
        cancelLabel={t("skill.cancel")}
        loading={saving}
        onConfirm={() => void save()}
      />
    </section>
  );
};

export default PricingConfigPanel;
