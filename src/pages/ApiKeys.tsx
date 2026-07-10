import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import { BrutalInput } from "@/components/ui/brutal-input";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Plus, RefreshCw, Search, Shield, Trash2, Pencil, Terminal, Bolt, Loader2 } from "lucide-react";
import apiKeysApi from "@/api/apiKeys";
import type { ApiKeyItem, ApiKeyStatus, CreateApiKeyData } from "@/types/apiKeys";
import { useTranslation } from "react-i18next";
import { formatMaybeDate } from "@/lib/date";

function statusBadge(status: ApiKeyStatus, labels: { active: string; inactive: string; expired: string; unknown: string }) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-accent-green text-foreground text-[11px] font-bold uppercase border border-foreground/30">
          <span className="inline-block w-1.5 h-1.5 bg-foreground/70" />
          {labels.active}
        </span>
      );
    case "inactive":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-secondary text-foreground text-[11px] font-bold uppercase border border-foreground/30">
          <span className="inline-block w-1.5 h-1.5 bg-foreground/40" />
          {labels.inactive}
        </span>
      );
    case "expired":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-accent-red text-card text-[11px] font-bold uppercase border border-foreground/30">
          <span className="inline-block w-1.5 h-1.5 bg-card/80" />
          {labels.expired}
        </span>
      );
    default:
      return <Badge variant="outline">{labels.unknown}</Badge>;
  }
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

const ApiKeys: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ApiKeyItem[]>([]);
  const [stats, setStats] = useState<{ total: number; active_count: number; expired_count: number }>({
    total: 0,
    active_count: 0,
    expired_count: 0,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createExpiresDays, setCreateExpiresDays] = useState<string>("");
  const [created, setCreated] = useState<CreateApiKeyData | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const copy = async (text: string) => {
    try {
      await copyToClipboard(text);
      toast.success(t("apiKeys.toast.copied"));
    } catch {
      toast.error(t("apiKeys.toast.copyFailed"));
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((k) => `${k.name} ${k.id} ${k.status}`.toLowerCase().includes(q));
  }, [items, query]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiKeysApi.listApiKeys({ include_inactive: includeInactive });
      setItems(data.items || []);
      setStats({ total: data.total ?? (data.items?.length ?? 0), active_count: data.active_count ?? 0, expired_count: data.expired_count ?? 0 });
    } catch (e) {
      toast.error(t("apiKeys.toast.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  const onCreate = async () => {
    const name = createName.trim();
    if (!name) {
      toast.error(t("apiKeys.toast.nameRequired"));
      return;
    }
    const expires_days = createExpiresDays.trim() ? Number(createExpiresDays.trim()) : undefined;
    if (expires_days !== undefined && (Number.isNaN(expires_days) || expires_days < 1 || expires_days > 365)) {
      toast.error(t("apiKeys.toast.expiresDaysRange"));
      return;
    }

    setLoading(true);
    try {
      const data = await apiKeysApi.createApiKey({ name, expires_days });
      setCreated(data);
      toast.success(t("apiKeys.toast.created"));
      await load();
    } catch {
      toast.error(t("apiKeys.toast.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (k: ApiKeyItem) => {
    setEditId(k.id);
    setEditName(k.name);
    setEditOpen(true);
  };

  const onEditSave = async () => {
    if (editId == null) return;
    const name = editName.trim();
    if (!name) {
      toast.error(t("apiKeys.toast.nameRequired"));
      return;
    }
    setLoading(true);
    try {
      await apiKeysApi.updateApiKey(editId, { name });
      toast.success(t("apiKeys.toast.saved"));
      setEditOpen(false);
      await load();
    } catch {
      toast.error(t("apiKeys.toast.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const onToggleActive = async (k: ApiKeyItem, next: boolean) => {
    setLoading(true);
    try {
      await apiKeysApi.updateApiKey(k.id, { is_active: next });
      toast.success(next ? t("apiKeys.toast.enabled") : t("apiKeys.toast.disabled"));
      await load();
    } catch {
      toast.error(t("apiKeys.toast.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (k: ApiKeyItem) => {
    setLoading(true);
    try {
      await apiKeysApi.deleteApiKey(k.id);
      toast.success(t("apiKeys.toast.deleted"));
      await load();
    } catch {
      toast.error(t("apiKeys.toast.deleteFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden">
      <main className="h-full p-6 md:p-8 bg-background overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <BrutalCard shadow="default" className="overflow-hidden">
            <BrutalCardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-5 px-5">
              <div className="w-12 h-12 bg-accent-cyan border-brutal border-foreground flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold uppercase tracking-widest truncate">{t("apiKeys.title")}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="px-2 py-0.5 bg-accent-yellow text-foreground text-[11px] font-bold uppercase border border-foreground/30">
                    <Shield className="w-3 h-3 inline mr-1" />
                    {t("apiKeys.badge.oneTimeReveal")}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Terminal className="w-3 h-3" />
                    {t("apiKeys.badge.frontendNotUse")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-3">
                  {t("apiKeys.subtitle")}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <BrutalButton variant="outline" size="sm" onClick={() => load()} disabled={loading} className="gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  {t("apiKeys.actions.refresh")}
                </BrutalButton>
                <BrutalButton
                  variant="cyan"
                  size="sm"
                  onClick={() => { setCreateOpen(true); setCreated(null); }}
                  className="gap-1.5"
                  disabled={loading}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("apiKeys.actions.create")}
                </BrutalButton>
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-4">
              <BrutalCard shadow="default" className="overflow-hidden h-full">
                <BrutalCardHeader className="bg-card pb-3 pt-4 px-4">
                  <BrutalCardTitle className="flex items-center gap-2 text-sm">
                    <div className="p-1.5 bg-accent-purple/80 border border-foreground/30">
                      <Bolt className="w-3.5 h-3.5 text-card" />
                    </div>
                    {t("apiKeys.stats.total")}
                  </BrutalCardTitle>
                </BrutalCardHeader>
                <BrutalCardContent className="flex items-center justify-between py-5 px-4">
                  <div className="text-4xl font-bold font-mono tabular-nums leading-none">{stats.total}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("apiKeys.stats.totalHint")}</div>
                </BrutalCardContent>
              </BrutalCard>
            </div>

            <div className="md:col-span-4">
              <BrutalCard shadow="default" className="overflow-hidden h-full">
                <BrutalCardHeader className="bg-card pb-3 pt-4 px-4">
                  <BrutalCardTitle className="flex items-center gap-2 text-sm">
                    <div className="p-1.5 bg-accent-green/80 border border-foreground/30">
                      <Check className="w-3.5 h-3.5 text-card" />
                    </div>
                    {t("apiKeys.stats.active")}
                  </BrutalCardTitle>
                </BrutalCardHeader>
                <BrutalCardContent className="flex items-center justify-between py-5 px-4">
                  <div className="text-4xl font-bold font-mono tabular-nums leading-none">{stats.active_count}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("apiKeys.stats.activeHint")}</div>
                </BrutalCardContent>
              </BrutalCard>
            </div>

            <div className="md:col-span-4">
              <BrutalCard shadow="default" className="overflow-hidden h-full">
                <BrutalCardHeader className="bg-card pb-3 pt-4 px-4">
                  <BrutalCardTitle className="flex items-center gap-2 text-sm">
                    <div className="p-1.5 bg-accent-red/80 border border-foreground/30">
                      <Shield className="w-3.5 h-3.5 text-card" />
                    </div>
                    {t("apiKeys.stats.expired")}
                  </BrutalCardTitle>
                </BrutalCardHeader>
                <BrutalCardContent className="flex items-center justify-between py-5 px-4">
                  <div className="text-4xl font-bold font-mono tabular-nums leading-none">{stats.expired_count}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("apiKeys.stats.expiredHint")}</div>
                </BrutalCardContent>
              </BrutalCard>
            </div>

            <div className="md:col-span-12">
              <BrutalCard shadow="default" className="overflow-hidden">
                <BrutalCardHeader className="bg-card pb-3 pt-4 px-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <BrutalCardTitle className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-accent-cyan/80 border border-foreground/30">
                        <KeyRound className="w-3.5 h-3.5 text-card" />
                      </div>
                      {t("apiKeys.list.title")}
                    </BrutalCardTitle>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <BrutalInput
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder={t("apiKeys.list.searchPlaceholder")}
                          className="pl-9"
                        disabled={loading}
                        />
                      </div>
                      <div className="flex items-center gap-2 px-3 h-10 bg-secondary border-brutal border-foreground">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("apiKeys.list.includeInactive")}</span>
                      <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} disabled={loading} />
                      </div>
                    </div>
                  </div>
                </BrutalCardHeader>

                <BrutalCardContent className="p-0">
                  <div className="relative overflow-x-auto" aria-busy={loading}>
                    {loading && (
                      <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="px-4 py-3 bg-card border-brutal border-foreground brutal-shadow flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t("common.loading")}
                        </div>
                      </div>
                    )}
                    <Table className="font-mono">
                      <TableHeader>
                        <TableRow className="border-b border-foreground/15">
                          <TableHead className="w-[320px]">{t("apiKeys.table.name")}</TableHead>
                          <TableHead>{t("apiKeys.table.status")}</TableHead>
                          <TableHead>{t("apiKeys.table.lastUsed")}</TableHead>
                          <TableHead>{t("apiKeys.table.expires")}</TableHead>
                          <TableHead>{t("apiKeys.table.created")}</TableHead>
                          <TableHead className="text-right">{t("apiKeys.table.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                              {t("apiKeys.empty")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filtered.map((k) => (
                            <TableRow key={k.id} className="border-b border-foreground/10 hover:bg-secondary/60">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 bg-card border-brutal border-foreground flex items-center justify-center shrink-0">
                                    <KeyRound className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold uppercase tracking-wider truncate text-xs">{k.name}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono mt-1">ID {k.id}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{statusBadge(k.status, {
                                active: t("apiKeys.status.active"),
                                inactive: t("apiKeys.status.inactive"),
                                expired: t("apiKeys.status.expired"),
                                unknown: t("apiKeys.status.unknown"),
                              })}</TableCell>
                              <TableCell className="text-xs">{formatMaybeDate(k.last_used_at)}</TableCell>
                              <TableCell className="text-xs">{k.expires_at ? formatMaybeDate(k.expires_at) : t("apiKeys.table.never")}</TableCell>
                              <TableCell className="text-xs">{formatMaybeDate(k.created_at)}</TableCell>
                              <TableCell className="text-right">
                                <div className="inline-flex items-center justify-end gap-2">
                                  <BrutalButton size="sm" variant="outline" onClick={() => openEdit(k)} className="gap-1.5" disabled={loading}>
                                    <Pencil className="w-3.5 h-3.5" />
                                    {t("apiKeys.actions.edit")}
                                  </BrutalButton>
                                  <BrutalButton
                                    size="sm"
                                    variant={k.is_active ? "default" : "green"}
                                    onClick={() => onToggleActive(k, !k.is_active)}
                                    disabled={k.status === "expired" || loading}
                                  >
                                    {k.is_active ? t("apiKeys.actions.disable") : t("apiKeys.actions.enable")}
                                  </BrutalButton>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <BrutalButton variant="red" size="sm" className="gap-1.5" disabled={loading}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {t("apiKeys.actions.delete")}
                                      </BrutalButton>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="border-brutal border-foreground brutal-shadow bg-card">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="font-bold uppercase tracking-wider">{t("apiKeys.deleteDialog.title")}</AlertDialogTitle>
                                        <AlertDialogDescription className="text-sm">
                                          {t("apiKeys.deleteDialog.descPrefix")} <span className="font-bold text-foreground">{k.name}</span>. {t("apiKeys.deleteDialog.descSuffix")}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider">
                                          {t("common.cancel")}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => onDelete(k)}
                                          disabled={loading}
                                          className="bg-accent-red text-card border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider hover:brightness-110"
                                        >
                                          {t("apiKeys.actions.delete")}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </BrutalCardContent>
              </BrutalCard>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setCreated(null); }}>
        <DialogContent className="border-brutal border-foreground brutal-shadow bg-card sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-wider flex items-center gap-2">
              <div className="p-1.5 bg-accent-cyan/80 border border-foreground/30">
                <KeyRound className="w-3.5 h-3.5 text-card" />
              </div>
              {t("apiKeys.createDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("apiKeys.createDialog.desc")}
            </DialogDescription>
          </DialogHeader>

          {created?.key?.api_key ? (
            <div className="space-y-4">
              <div className="bg-foreground text-card p-4 border-brutal border-foreground brutal-shadow">
                <div className="text-accent-green mb-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 bg-accent-green" />
                  {t("apiKeys.createDialog.keyOnce")}
                </div>
                <div className="flex items-start gap-2">
                  <code className="flex-1 text-xs sm:text-sm break-all p-3 bg-card text-foreground border-brutal border-foreground font-mono">
                    {created.key.api_key}
                  </code>
                  <BrutalButton variant="yellow" size="sm" className="gap-2" onClick={() => copy(created.key.api_key || "")}>
                    <Copy className="w-4 h-4" /> {t("common.copy")}
                  </BrutalButton>
                </div>
                <div className="mt-3 text-xs text-card/70">
                  {created.warning || t("apiKeys.createDialog.warning")}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <BrutalCard shadow="default" className="overflow-hidden">
                  <BrutalCardHeader className="bg-card pb-3 pt-4 px-4">
                    <BrutalCardTitle className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-accent-yellow border border-foreground/30">
                        <Terminal className="w-3.5 h-3.5" />
                      </div>
                      HEADER
                    </BrutalCardTitle>
                  </BrutalCardHeader>
                  <BrutalCardContent className="pt-3 px-4 pb-4">
                    <div className="flex items-start gap-2">
                      <code className="flex-1 text-xs break-all p-2 bg-secondary border border-foreground/15">
                        {created.usage?.header_value || `X-API-Key: ${created.key.api_key}`}
                      </code>
                      <BrutalButton
                        variant="outline"
                        size="sm"
                        onClick={() => copy(created.usage?.header_value || `X-API-Key: ${created.key.api_key}`)}
                      >
                        {t("common.copy")}
                      </BrutalButton>
                    </div>
                  </BrutalCardContent>
                </BrutalCard>
                <BrutalCard shadow="default" className="overflow-hidden">
                  <BrutalCardHeader className="bg-card pb-3 pt-4 px-4">
                    <BrutalCardTitle className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-accent-purple/80 border border-foreground/30">
                        <Terminal className="w-3.5 h-3.5 text-card" />
                      </div>
                      CURL
                    </BrutalCardTitle>
                  </BrutalCardHeader>
                  <BrutalCardContent className="pt-3 px-4 pb-4">
                    <div className="flex items-start gap-2">
                      <code className="flex-1 text-xs break-all p-2 bg-secondary border border-foreground/15">
                        {created.usage?.curl_example || `curl -H "X-API-Key: ${created.key.api_key}" https://api.example.com/api/v1/balance`}
                      </code>
                      <BrutalButton
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copy(
                            created.usage?.curl_example || `curl -H "X-API-Key: ${created.key.api_key}" https://api.example.com/api/v1/balance`
                          )
                        }
                      >
                        {t("common.copy")}
                      </BrutalButton>
                    </div>
                  </BrutalCardContent>
                </BrutalCard>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider">{t("apiKeys.form.name")}</div>
                <BrutalInput value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder={t("apiKeys.form.namePlaceholder")} />
                <div className="text-xs text-muted-foreground">{t("apiKeys.form.nameHint")}</div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider">{t("apiKeys.form.expiresDays")}</div>
                <BrutalInput
                  value={createExpiresDays}
                  onChange={(e) => setCreateExpiresDays(e.target.value)}
                  placeholder={t("apiKeys.form.expiresDaysPlaceholder")}
                  inputMode="numeric"
                />
                <div className="text-xs text-muted-foreground">{t("apiKeys.form.expiresDaysHint")}</div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <BrutalButton
              variant="outline"
              onClick={() => { setCreateOpen(false); setCreateName(""); setCreateExpiresDays(""); setCreated(null); }}
            >
              {t("common.close")}
            </BrutalButton>
            {!created?.key?.api_key && (
              <BrutalButton onClick={onCreate} disabled={loading} variant="cyan" className="gap-2">
                <Plus className="w-4 h-4" />
                {t("apiKeys.actions.create")}
              </BrutalButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-brutal border-foreground brutal-shadow bg-card">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-wider">{t("apiKeys.editDialog.title")}</DialogTitle>
            <DialogDescription>{t("apiKeys.editDialog.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider">{t("apiKeys.form.name")}</div>
            <BrutalInput value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <BrutalButton variant="outline" onClick={() => setEditOpen(false)}>{t("common.cancel")}</BrutalButton>
            <BrutalButton variant="yellow" onClick={onEditSave} disabled={loading}>{t("common.save")}</BrutalButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiKeys;

