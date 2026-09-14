import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Bookmark, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BrutalButton } from "@/components/ui/brutal-button";
import {
  listUserPrompts,
  deleteUserPrompt,
  type SavedUserPrompt,
} from "@/api/prompts";

interface MyPromptsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
}

const PAGE_SIZE = 50;

const formatDate = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
};

const MyPromptsPanel: React.FC<MyPromptsPanelProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
}) => {
  const { t } = useTranslation();
  const [prompts, setPrompts] = useState<SavedUserPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPrompts = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const data = await listUserPrompts({ page: 1, page_size: PAGE_SIZE });
      if (controller.signal.aborted) return;
      setPrompts(data.items || []);
    } catch {
      if (!controller.signal.aborted) setPrompts([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchPrompts();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [isOpen, fetchPrompts]);

  const handleDelete = async (id: number) => {
    if (confirmDelete === id) {
      try {
        await deleteUserPrompt(id);
        toast.success(t("myPrompts.deleted"));
        setPrompts((prev) => prev.filter((p) => p.id !== id));
      } catch {
        toast.error(t("myPrompts.deleteFailed"));
      }
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b-brutal border-foreground bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border-brutal border-foreground bg-accent-yellow brutal-shadow">
            <Bookmark className="h-4 w-4 text-foreground" />
          </div>
          <div>
            <h2 className="font-mono font-black text-base uppercase tracking-widest">
              {t("myPrompts.title")}
            </h2>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              {t("myPrompts.count", { count: prompts.length })}
            </p>
          </div>
        </div>
        <BrutalButton
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="border-brutal border-foreground"
        >
          <X className="h-5 w-5" />
        </BrutalButton>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 bg-background">
        {loading && prompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-yellow" />
            <p className="font-mono text-xs uppercase text-muted-foreground">
              {t("myPrompts.loading")}
            </p>
          </div>
        ) : prompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Bookmark className="h-10 w-10 text-muted-foreground" />
            <p className="font-mono text-sm text-muted-foreground">
              {t("myPrompts.empty")}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {t("myPrompts.emptyHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {prompts.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "border-brutal border-foreground bg-card",
                  confirmDelete === p.id && "bg-accent-red/10"
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectPrompt(p.prompt);
                    onClose();
                  }}
                  className="block w-full p-3 text-left transition-none hover:bg-accent-yellow/5"
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground line-clamp-4">
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
                </button>
                <div className="flex items-center justify-between border-t border-foreground/10 px-3 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-cyan">
                    {t("myPrompts.useHint")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className={cn(
                      "transition-none",
                      confirmDelete === p.id
                        ? "text-[10px] font-bold uppercase text-accent-red"
                        : "text-muted-foreground hover:text-accent-red"
                    )}
                    aria-label={t("myPrompts.delete")}
                  >
                    {confirmDelete === p.id ? (
                      t("myPrompts.confirmDelete")
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { MyPromptsPanel };
