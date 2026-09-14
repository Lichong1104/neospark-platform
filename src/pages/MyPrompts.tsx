import React, { useState, useEffect, useCallback } from "react";
import {
  BrutalCard,
  BrutalCardContent,
} from "@/components/ui/brutal-card";
import { Bookmark, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  listUserPrompts,
  deleteUserPrompt,
  type SavedUserPrompt,
} from "@/api/prompts";

const PAGE_SIZE = 20;

const formatDate = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
};

const MyPrompts = () => {
  const { t } = useTranslation();
  const [prompts, setPrompts] = useState<SavedUserPrompt[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const loadPrompts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listUserPrompts({ page: 1, page_size: PAGE_SIZE });
      setPrompts(data.items || []);
      setTotal(data.total ?? 0);
    } catch {
      setPrompts([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const handleDelete = async (id: number) => {
    if (confirmDelete === id) {
      try {
        await deleteUserPrompt(id);
        toast.success(t("myPrompts.deleted"));
        setPrompts((prev) => prev.filter((p) => p.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
      } catch {
        toast.error(t("myPrompts.deleteFailed"));
      }
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-background bg-grid">
      <main className="h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-8">
          {/* 头部 */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-brutal border-foreground bg-accent-cyan brutal-shadow-cyan">
              <Bookmark className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-black uppercase tracking-wider">
                {t("myPrompts.title")}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                {t("myPrompts.count", { count: total })}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : prompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 border-brutal border-dashed border-foreground/40 bg-card/60 py-16 text-center">
              <Bookmark className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-mono text-muted-foreground">
                {t("myPrompts.empty")}
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                {t("myPrompts.emptyHint")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {prompts.map((p) => (
                <BrutalCard
                  key={p.id}
                  shadow="default"
                  className={cn(
                    "overflow-hidden",
                    confirmDelete === p.id && "bg-accent-red/10"
                  )}
                >
                  <BrutalCardContent className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                        {p.prompt}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono text-muted-foreground">
                        <span>{formatDate(p.created_at)}</span>
                        {p.model ? (
                          <span className="border border-foreground/20 bg-background px-1.5 py-0.5">
                            {p.model}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className={cn(
                        "shrink-0 p-1.5 transition-none",
                        confirmDelete === p.id
                          ? "border-brutal border-foreground bg-accent-red text-card font-bold text-[10px] uppercase px-2"
                          : "text-muted-foreground hover:text-accent-red"
                      )}
                      aria-label={t("myPrompts.delete")}
                    >
                      {confirmDelete === p.id ? (
                        t("myPrompts.confirmDelete")
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </BrutalCardContent>
                </BrutalCard>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyPrompts;
