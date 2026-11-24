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
import ConfirmDialog from "@/components/ui/confirm-dialog";
import adminApi from "@/api/admin";
import type { AdminTokenPricingView, AdminTokenRate } from "@/types/admin";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";

const DEFAULT_KEY = "default";
// 1 积分 = 0.07 元（后端 DEFAULT_CREDIT_FACE_VALUE_CNY），用于本地毛利预览
const CREDIT_FACE_VALUE_FEN = 7;

type RowDraft = {
  input: string;
  output: string;
  costInput: string;
  costOutput: string;
};

type Draft = Record<string, RowDraft>;

const toDraft = (pricing: Record<string, AdminTokenRate>): Draft => {
  const draft: Draft = {};
  Object.entries(pricing).forEach(([model, rates]) => {
    draft[model] = {
      input: String(rates.input),
      output: String(rates.output),
      costInput: rates.cost_per_million ? String(rates.cost_per_million.input) : "",
      costOutput: rates.cost_per_million ? String(rates.cost_per_million.output) : "",
    };
  });
  return draft;
};

const parseNonNegativeInt = (raw: string): number | null => {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
};

/** 把草稿转成提交体；任一字段非法时返回 null。 */
const buildPricing = (draft: Draft): Record<string, AdminTokenRate> | null => {
  const pricing: Record<string, AdminTokenRate> = {};
  for (const [model, row] of Object.entries(draft)) {
    const input = parseNonNegativeInt(row.input);
    const output = parseNonNegativeInt(row.output);
    if (!model.trim() || input === null || output === null) return null;
    const rate: AdminTokenRate = { input, output };
    const costInputRaw = row.costInput.trim();
    const costOutputRaw = row.costOutput.trim();
    if (costInputRaw !== "" || costOutputRaw !== "") {
      const costInput = parseNonNegativeInt(costInputRaw);
      const costOutput = parseNonNegativeInt(costOutputRaw);
      if (costInput === null || costOutput === null) return null;
      rate.cost_per_million = { input: costInput, output: costOutput };
    }
    pricing[model.trim()] = rate;
  }
  return pricing;
};

const normalizeRow = (rate: AdminTokenRate | undefined): string =>
  rate
    ? JSON.stringify([
        rate.input,
        rate.output,
        rate.cost_per_million?.input ?? null,
        rate.cost_per_million?.output ?? null,
      ])
    : "null";

const formatCny = (yuan: number | null | undefined): string =>
  typeof yuan === "number" && Number.isFinite(yuan) ? `¥${yuan.toFixed(2)}` : "-";

const formatRate = (rate: number | null | undefined): string =>
  typeof rate === "number" && Number.isFinite(rate) ? `${(rate * 100).toFixed(1)}%` : "-";

const MarginCell: React.FC<{ credits: string; costFen: string }> = ({ credits, costFen }) => {
  const creditValue = parseNonNegativeInt(credits);
  const costValue = parseNonNegativeInt(costFen);
  if (creditValue === null || costValue === null) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }
  const revenueFen = creditValue * CREDIT_FACE_VALUE_FEN;
  const marginFen = revenueFen - costValue;
  const marginRate = revenueFen > 0 ? marginFen / revenueFen : null;
  const negative = marginFen < 0;
  return (
    <div className={`font-mono text-[11px] ${negative ? "text-accent-red" : "text-green-600"}`}>
      <div>{formatCny(marginFen / 100)}</div>
      <div className="text-[10px] text-muted-foreground">{formatRate(marginRate)}</div>
    </div>
  );
};

const TokenPricingPanel: React.FC = () => {
  const { t } = useTranslation();

  const [view, setView] = useState<AdminTokenPricingView | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newModel, setNewModel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getTokenPricing();
      setView(data);
      setDraft(toDraft(data.pricing));
    } catch {
      toast.error(t("admin.pricing.token.loadFailed"));
      setView(null);
      setDraft({});
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const models = useMemo(() => Object.keys(draft).sort((a, b) => a.localeCompare(b)), [draft]);

  const nextPricing = useMemo(() => buildPricing(draft), [draft]);

  const changedModels = useMemo(() => {
    if (!view || !nextPricing) return [];
    const keys = new Set([...Object.keys(view.pricing), ...Object.keys(nextPricing)]);
    return Array.from(keys)
      .filter((model) => normalizeRow(view.pricing[model]) !== normalizeRow(nextPricing[model]))
      .sort((a, b) => a.localeCompare(b));
  }, [nextPricing, view]);

  const changed = changedModels.length > 0;

  const updateRow = (model: string, patch: Partial<RowDraft>) => {
    setDraft((prev) => ({ ...prev, [model]: { ...prev[model], ...patch } }));
  };

  const addModel = () => {
    const key = newModel.trim();
    if (!key) {
      toast(t("admin.pricing.token.modelRequired"));
      return;
    }
    if (draft[key]) {
      toast(t("admin.pricing.token.modelExists"));
      return;
    }
    const fallback = draft[DEFAULT_KEY];
    setDraft((prev) => ({
      ...prev,
      [key]: {
        input: fallback?.input ?? "0",
        output: fallback?.output ?? "0",
        costInput: fallback?.costInput ?? "",
        costOutput: fallback?.costOutput ?? "",
      },
    }));
    setNewModel("");
  };

  const removeModel = (model: string) => {
    if (model === DEFAULT_KEY) {
      toast(t("admin.pricing.token.defaultRequired"));
      return;
    }
    setDraft((prev) => {
      const next = { ...prev };
      delete next[model];
      return next;
    });
  };

  const requestSave = () => {
    if (!nextPricing) {
      toast.error(t("admin.pricing.token.invalidNumber"));
      return;
    }
    if (!draft[DEFAULT_KEY]) {
      toast.error(t("admin.pricing.token.defaultRequired"));
      return;
    }
    if (!changed) {
      toast(t("admin.pricing.config.noChanges"));
      return;
    }
    setConfirmOpen(true);
  };

  const save = async () => {
    if (!nextPricing) return;
    setSaving(true);
    try {
      const data = await adminApi.updateTokenPricing({
        pricing: nextPricing,
        reason: reason.trim() || undefined,
      });
      setView(data);
      setDraft(toDraft(data.pricing));
      toast.success(t("admin.pricing.token.saveSuccess"));
      setConfirmOpen(false);
      setReason("");
    } catch {
      toast.error(t("admin.pricing.token.saveFailed"));
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
              {t("admin.pricing.token.title")}
            </BrutalCardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t("admin.pricing.config.version")}:{" "}
                <span className="font-mono">{view?.config_version ?? "-"}</span>
              </span>
              {changed ? (
                <span className="font-bold text-xs text-foreground">
                  {t("admin.pricing.config.pending", { count: changedModels.length })}
                </span>
              ) : null}
              <BrutalButton size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </BrutalButton>
            </div>
          </div>
        </BrutalCardHeader>
        <BrutalCardContent>
          <div className="mb-3 text-xs text-muted-foreground">
            {t("admin.pricing.token.hint")}
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <BrutalInput
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              placeholder={t("admin.pricing.token.modelPlaceholder")}
              className="h-9 w-64 font-mono text-xs"
            />
            <BrutalButton size="sm" variant="outline" onClick={addModel}>
              <Plus className="h-3.5 w-3.5" />
              {t("admin.pricing.token.addModel")}
            </BrutalButton>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.pricing.token.columns.model")}</TableHead>
                <TableHead>{t("admin.pricing.token.columns.input")}</TableHead>
                <TableHead>{t("admin.pricing.token.columns.output")}</TableHead>
                <TableHead>{t("admin.pricing.token.columns.costInput")}</TableHead>
                <TableHead>{t("admin.pricing.token.columns.costOutput")}</TableHead>
                <TableHead>{t("admin.pricing.token.columns.marginInput")}</TableHead>
                <TableHead>{t("admin.pricing.token.columns.marginOutput")}</TableHead>
                <TableHead>{t("admin.pricing.token.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => {
                const row = draft[model];
                return (
                  <TableRow key={model}>
                    <TableCell className="font-mono text-xs">
                      <div className="font-bold">{model}</div>
                      {model === DEFAULT_KEY ? (
                        <div className="text-[10px] text-muted-foreground">
                          {t("admin.pricing.token.fallback")}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <BrutalInput
                        type="number"
                        min={0}
                        step={1}
                        value={row.input}
                        onChange={(e) => updateRow(model, { input: e.target.value })}
                        className="h-8 w-24 font-mono text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <BrutalInput
                        type="number"
                        min={0}
                        step={1}
                        value={row.output}
                        onChange={(e) => updateRow(model, { output: e.target.value })}
                        className="h-8 w-24 font-mono text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <BrutalInput
                        type="number"
                        min={0}
                        step={1}
                        value={row.costInput}
                        onChange={(e) => updateRow(model, { costInput: e.target.value })}
                        placeholder="-"
                        className="h-8 w-24 font-mono text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <BrutalInput
                        type="number"
                        min={0}
                        step={1}
                        value={row.costOutput}
                        onChange={(e) => updateRow(model, { costOutput: e.target.value })}
                        placeholder="-"
                        className="h-8 w-24 font-mono text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <MarginCell credits={row.input} costFen={row.costInput} />
                    </TableCell>
                    <TableCell>
                      <MarginCell credits={row.output} costFen={row.costOutput} />
                    </TableCell>
                    <TableCell>
                      <BrutalButton
                        size="sm"
                        variant="ghost"
                        disabled={model === DEFAULT_KEY}
                        onClick={() => removeModel(model)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </BrutalButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {models.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
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
              disabled={saving || loading || !changed || !nextPricing}
              onClick={requestSave}
            >
              <Save className="h-3.5 w-3.5" />
              {t("admin.pricing.config.save")}
            </BrutalButton>
          </div>
        </BrutalCardContent>
      </BrutalCard>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("admin.pricing.token.confirmTitle")}
        description={t("admin.pricing.token.confirmBody", {
          count: changedModels.length,
        })}
        confirmLabel={t("admin.pricing.config.confirmSave")}
        cancelLabel={t("skill.cancel")}
        loading={saving}
        onConfirm={() => void save()}
      />
    </section>
  );
};

export default TokenPricingPanel;
