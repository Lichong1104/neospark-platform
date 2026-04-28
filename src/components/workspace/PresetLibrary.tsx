import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Search,
  Loader2,
  BookOpen,
  ImageOff,
  ChevronDown,
  PanelsTopLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { listPrompts, type PromptItem, type CategoryItem } from "@/api/prompts";

interface PresetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (prompt: string) => void;
}

const PresetLibrary: React.FC<PresetLibraryProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  const { t } = useTranslation();
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showCategoryNav, setShowCategoryNav] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const pageSize = 24;
  const abortRef = useRef<AbortController | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
  }>({ active: false, startX: 0, startScrollLeft: 0 });
  const activeCategoryName =
    activeCategory === "all"
      ? t("intelligenceHub.all", { defaultValue: "All" })
      : categories.find((cat) => cat.id === activeCategory)?.name || activeCategory;
  const filteredCategories = categories.filter((cat) => {
    if (!categoryQuery.trim()) return true;
    const query = categoryQuery.trim().toLowerCase();
    return (
      cat.name.toLowerCase().includes(query) || cat.id.toLowerCase().includes(query)
    );
  });

  const fetchPrompts = useCallback(
    async (pageNum: number, reset: boolean = false) => {
      // 取消上一个未完成的请求
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const params: {
          category?: string;
          search?: string;
          promptType?: string;
          page: number;
          page_size: number;
        } = {
          page: pageNum,
          page_size: pageSize,
          promptType: "image",
        };
        if (activeCategory && activeCategory !== "all") {
          params.category = activeCategory;
        }
        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }
        const res = await listPrompts(params);
        if (controller.signal.aborted) return;

        if (reset) {
          setPrompts(res.items);
        } else {
          setPrompts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newItems = res.items.filter(
              (item) => !existingIds.has(item.id)
            );
            return [...prev, ...newItems];
          });
        }
        setTotal(res.total);
        setCategories(res.categories);
        setHasMore(pageNum * pageSize < res.total);
      } catch {
        // silently fail
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [activeCategory, searchQuery]
  );

  useEffect(() => {
    if (!isOpen) return;
    setPage(1);
    fetchPrompts(1, true);
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [isOpen, fetchPrompts]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPrompts(nextPage, false);
  };

  const onCategoryWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = categoryScrollRef.current;
    if (!el) return;
    // Map vertical wheel to horizontal scroll for better UX.
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, []);

  const onCategoryPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = categoryScrollRef.current;
      if (!el) return;
      dragStateRef.current = {
        active: true,
        startX: e.clientX,
        startScrollLeft: el.scrollLeft,
      };
      try {
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    },
    []
  );

  const onCategoryPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = categoryScrollRef.current;
      if (!el) return;
      const state = dragStateRef.current;
      if (!state.active) return;
      const dx = e.clientX - state.startX;
      el.scrollLeft = state.startScrollLeft - dx;
    },
    []
  );

  const onCategoryPointerUp = useCallback(() => {
    dragStateRef.current.active = false;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background/95 text-foreground backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <BookOpen className="w-4 h-4" />
          {t("intelligenceHub.promptArsenal")}
        </h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-none hover:bg-secondary hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-border px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              t("intelligenceHub.searchPrompts", {
                defaultValue: "Search prompts...",
              })
            }
            className="w-full rounded-sm border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="relative">
        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "shrink-0 rounded-sm border px-3 py-1.5 text-xs font-medium transition-none",
                activeCategory === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-secondary"
              )}
            >
              {t("intelligenceHub.all", { defaultValue: "All" })} ({total})
            </button>

            <div
              ref={categoryScrollRef}
              className={cn(
                "min-w-0 flex-1 overflow-x-auto scrollbar-hide select-none",
                "cursor-grab active:cursor-grabbing"
              )}
              onWheel={onCategoryWheel}
              onPointerDown={onCategoryPointerDown}
              onPointerMove={onCategoryPointerMove}
              onPointerUp={onCategoryPointerUp}
              onPointerCancel={onCategoryPointerUp}
              onPointerLeave={onCategoryPointerUp}
            >
              <div className="flex w-max items-center gap-1.5 pr-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "shrink-0 rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-none",
                      activeCategory === cat.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-secondary"
                    )}
                  >
                    {cat.name} ({cat.count})
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowCategoryNav((prev) => !prev)}
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border transition-none",
                showCategoryNav
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-secondary"
              )}
              title={t("intelligenceHub.categoryNav", {
                defaultValue: "Category nav",
              })}
            >
              <PanelsTopLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-20 overflow-hidden border-b border-border bg-background shadow-sm transition-all duration-300 ease-out",
            showCategoryNav
              ? "max-h-60 translate-y-0 opacity-100"
              : "pointer-events-none max-h-0 -translate-y-1 opacity-0 border-b-0"
          )}
        >
          <div className="px-3 py-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                  placeholder={t("intelligenceHub.searchCategories", {
                    defaultValue: "Search categories...",
                  })}
                  className="w-full rounded-sm border border-input bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowCategoryNav(false)}
                className="rounded-sm border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {t("common.close", { defaultValue: "Close" })}
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto">
              <div className="grid grid-cols-2 gap-1.5">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setShowCategoryNav(false);
                    }}
                    className={cn(
                      "truncate rounded-sm border px-2.5 py-1.5 text-left text-xs font-medium transition-none",
                      activeCategory === cat.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-secondary"
                    )}
                    title={`${cat.name} (${cat.count})`}
                  >
                    {cat.name} ({cat.count})
                  </button>
                ))}
              </div>
              {filteredCategories.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  {t("intelligenceHub.noCategoryMatch", {
                    defaultValue: "No matching categories",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && prompts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-accent-cyan animate-spin" />
          </div>
        ) : prompts.length === 0 ? (
          <div className="text-center py-12 text-card/50 font-mono text-sm">
            {t("intelligenceHub.noPrompts", { defaultValue: "No prompts found" })}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {prompts.map((item) => (
                <PromptCard
                  key={item.id}
                  item={item}
                  onSelect={() => {
                    onSelectPreset(item.prompt);
                    onClose();
                  }}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center py-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="rounded-sm border border-border bg-background px-6 py-2 text-xs font-semibold tracking-wide text-foreground transition-none hover:bg-secondary disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("intelligenceHub.loadMore", { defaultValue: "Load More" })
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-border p-3">
        <p className="text-center text-[11px] text-muted-foreground">
          {t("intelligenceHub.clickPreset")} · {prompts.length} / {total}{" "}
          {t("intelligenceHub.presetsAvailable", { count: total })}
        </p>
      </div>
    </div>
  );
};

/* 子组件：单张提示词卡片 */
const PromptCard: React.FC<{ item: PromptItem; onSelect: () => void }> = ({
  item,
  onSelect,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onSelect}
      className="group flex h-full flex-col overflow-hidden rounded-sm border border-border bg-card text-left transition-none hover:bg-secondary/60"
    >
      {/* 图片区：始终占位，加载失败显示占位图 */}
      <div className="relative aspect-video shrink-0 overflow-hidden bg-muted">
        {!imgError && item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ImageOff className="h-6 w-6 text-muted-foreground/60" />
          </div>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="line-clamp-1 text-sm font-semibold text-foreground">
          {item.title}
        </div>
        <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.prompt.slice(0, 120)}
          {item.prompt.length > 120 ? "..." : ""}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
};

export { PresetLibrary };
