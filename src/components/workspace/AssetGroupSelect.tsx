import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import assetGroupsApi from "@/api/assetGroups";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AssetGroup } from "@/types/storage";

interface AssetGroupSelectProps {
  /**
   * filter: 展示筛选（选项为「全部资产 + 各组」，值为 "" 表示全部）
   * assign: 生成时指定（选项为「默认分组 + 各组」，值为 "" 表示不传 id 自动归入默认分组）
   */
  mode: "filter" | "assign";
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /**
   * boxed: 带边框的下拉框（侧栏筛选等场景）
   * quiet: 无边框 chip 样式，与参数 chips 视觉一致（生成面板等场景）
   */
  variant?: "boxed" | "quiet";
}

/** 分组名称长度上限（后端允许 128，前端收窄） */
const MAX_NAME_LENGTH = 30;

const rowClass =
  "flex w-full items-center gap-1 px-2.5 py-2 text-left text-xs font-mono transition-none";

/**
 * 资产组选择器。
 * 自动拉取当前用户的资产组列表；加载失败时静默降级为不显示。
 * 弹层内支持就地创建/重命名/删除分组（默认分组不可修改）。
 */
const AssetGroupSelect: React.FC<AssetGroupSelectProps> = ({
  mode,
  value,
  onChange,
  className,
  variant = "boxed",
}) => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // filter 模式下首次加载后自动选中默认分组（仅一次，用户可手动切回「全部资产」）
  const autoSelectedDefault = useRef(false);

  const loadGroups = useCallback(async () => {
    try {
      const items = await assetGroupsApi.listAssetGroups();
      setGroups(items);
    } catch {
      // 资产组不可用时静默降级（旧版后端 / 网络错误）
      setGroups([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (mode !== "filter" || !loaded || autoSelectedDefault.current) return;
    if (value !== "") return;
    const defaultGroup = groups.find((g) => g.is_default);
    if (defaultGroup) {
      autoSelectedDefault.current = true;
      onChange(defaultGroup.group_id);
    }
  }, [mode, loaded, value, groups, onChange]);

  /** 校验名称，返回清洗后的名称；不合法时 toast 并返回 null */
  const validateName = useCallback(
    (raw: string, excludeGroupId?: string): string | null => {
      const name = raw.trim();
      if (!name) {
        toast.error(t("assetGroup.emptyName"));
        return null;
      }
      const duplicated = groups.some(
        (g) =>
          g.group_id !== excludeGroupId &&
          g.name.trim().toLowerCase() === name.toLowerCase()
      );
      if (duplicated) {
        toast.error(t("assetGroup.duplicateName"));
        return null;
      }
      return name;
    },
    [groups, t]
  );

  const handleCreate = async () => {
    const name = validateName(newName);
    if (!name || busy) return;
    setBusy(true);
    try {
      const group = await assetGroupsApi.createAssetGroup(name);
      await loadGroups();
      onChange(group.group_id);
      setNewName("");
      setIsCreating(false);
      setOpen(false);
      toast.success(t("assetGroup.created"));
    } catch {
      toast.error(t("assetGroup.createFailed"));
    } finally {
      setBusy(false);
    }
  };

  const startRename = (group: AssetGroup) => {
    setDeletingId(null);
    setIsCreating(false);
    setRenamingId(group.group_id);
    setRenameValue(group.name);
  };

  const handleRename = async (group: AssetGroup) => {
    const name = validateName(renameValue, group.group_id);
    if (!name || busy) return;
    setBusy(true);
    try {
      await assetGroupsApi.renameAssetGroup(group.group_id, name);
      await loadGroups();
      setRenamingId(null);
      toast.success(t("assetGroup.renamed"));
    } catch {
      toast.error(t("assetGroup.renameFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (group: AssetGroup) => {
    if (busy) return;
    setBusy(true);
    try {
      await assetGroupsApi.deleteAssetGroup(group.group_id);
      if (value === group.group_id) {
        onChange("");
      }
      await loadGroups();
      setDeletingId(null);
      toast.success(t("assetGroup.deleted"));
    } catch {
      toast.error(t("assetGroup.deleteFailed"));
    } finally {
      setBusy(false);
    }
  };

  // assign 模式下「默认分组」由空值代表（后端不传 id 自动归入默认组），
  // 从列表中剔除默认组避免出现两个同名选项。
  const visibleGroups =
    mode === "assign" ? groups.filter((g) => !g.is_default) : groups;

  const baseOption = {
    value: "",
    label:
      mode === "filter" ? t("assetGroup.allAssets") : t("assetGroup.defaultGroup"),
  };
  const selectedGroup = groups.find((g) => g.group_id === value);

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={t("assetGroup.selectGroup")}
            className={cn(
              "flex items-center gap-1 font-mono transition-none",
              variant === "boxed"
                ? "w-full border border-foreground/20 bg-card px-1.5 py-1 text-[11px] hover:bg-secondary"
                : "h-7 shrink-0 rounded-md px-2 text-[10px] text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
              open && variant === "quiet" && "bg-foreground/[0.06] text-foreground"
            )}
          >
            {loaded ? (
              <FolderOpen
                className={cn(
                  "flex-shrink-0 text-foreground/70",
                  variant === "boxed" ? "h-3 w-3" : "h-3 w-3 opacity-70"
                )}
              />
            ) : (
              <Loader2
                className={cn(
                  "flex-shrink-0 animate-spin text-foreground/70",
                  variant === "boxed" ? "h-3 w-3" : "h-3 w-3 opacity-70"
                )}
              />
            )}
            <span className="min-w-0 flex-1 truncate text-left">
              {selectedGroup
                ? selectedGroup.name
                : value
                  ? value
                  : baseOption.label}
            </span>
            {selectedGroup && (
              <span className="flex-shrink-0 text-foreground/50">
                ({selectedGroup.item_count})
              </span>
            )}
            <ChevronDown
              className={cn(
                "flex-shrink-0 transition-transform",
                variant === "boxed" ? "h-2.5 w-2.5" : "h-2.5 w-2.5 opacity-70",
                open && "rotate-180"
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-60 rounded-none border-2 border-foreground bg-card p-0 shadow-none"
        >
          <div className="max-h-64 overflow-y-auto">
            {/* 全部资产 / 默认分组 */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={cn(
                rowClass,
                "border-b border-foreground/10 hover:bg-accent-yellow",
                value === "" && "bg-accent-cyan/20 font-bold"
              )}
            >
              <span className="min-w-0 flex-1 truncate">{baseOption.label}</span>
              {value === "" && <Check className="h-3 w-3 flex-shrink-0" />}
            </button>

            {/* 各分组 */}
            {visibleGroups.map((group) => {
              if (renamingId === group.group_id) {
                return (
                  <div
                    key={group.group_id}
                    className="flex items-center gap-1 border-b border-foreground/10 px-2 py-1.5"
                  >
                    <input
                      autoFocus
                      value={renameValue}
                      maxLength={MAX_NAME_LENGTH}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(group);
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          setRenamingId(null);
                        }
                      }}
                      className="min-w-0 flex-1 border border-foreground/20 bg-background px-1.5 py-1 text-xs font-mono outline-none focus:border-accent-cyan"
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(group)}
                      disabled={busy}
                      title={t("assetGroup.save")}
                      className="flex-shrink-0 border border-foreground/20 bg-accent-cyan p-1 transition-none hover:brightness-110 disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      disabled={busy}
                      title={t("assetGroup.cancel")}
                      className="flex-shrink-0 border border-foreground/20 bg-card p-1 transition-none hover:bg-secondary disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              }

              if (deletingId === group.group_id) {
                return (
                  <div
                    key={group.group_id}
                    className="border-b border-foreground/10 px-2.5 py-2"
                  >
                    <p className="text-[11px] font-mono leading-snug">
                      {t("assetGroup.deleteConfirm", {
                        name: group.name,
                        count: group.item_count,
                      })}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(group)}
                        disabled={busy}
                        className="flex items-center gap-1 bg-accent-red px-2 py-1 text-[10px] font-bold uppercase text-card transition-none hover:brightness-110 disabled:opacity-50"
                      >
                        {busy && <Loader2 className="h-3 w-3 animate-spin" />}
                        {t("assetGroup.delete")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        disabled={busy}
                        className="border border-foreground/20 bg-card px-2 py-1 text-[10px] font-bold uppercase transition-none hover:bg-secondary disabled:opacity-50"
                      >
                        {t("assetGroup.cancel")}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={group.group_id}
                  className="group/row relative flex items-center border-b border-foreground/10 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(group.group_id);
                      setOpen(false);
                    }}
                    className={cn(
                      rowClass,
                      "pr-14 hover:bg-accent-yellow",
                      value === group.group_id && "bg-accent-cyan/20 font-bold"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {group.name}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-foreground/50">
                      {group.item_count}
                    </span>
                  </button>
                  {group.is_default ? (
                    <span
                      title={t("assetGroup.manageHint")}
                      className="pointer-events-none absolute right-2 text-[9px] text-foreground/40"
                    >
                      {t("assetGroup.manageHint")}
                    </span>
                  ) : (
                    <div className="absolute right-1 flex items-center gap-0.5 opacity-0 transition-none group-hover/row:opacity-100">
                      <button
                        type="button"
                        title={t("assetGroup.rename")}
                        onClick={() => startRename(group)}
                        className="border border-foreground/20 bg-card p-1 transition-none hover:bg-secondary"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title={t("assetGroup.delete")}
                        onClick={() => {
                          setRenamingId(null);
                          setIsCreating(false);
                          setDeletingId(group.group_id);
                        }}
                        className="border border-foreground/20 bg-card p-1 text-accent-red transition-none hover:bg-secondary"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 新建分组 */}
          <div className="border-t-2 border-foreground">
            {isCreating ? (
              <div className="flex items-center gap-1 px-2 py-1.5">
                <input
                  autoFocus
                  value={newName}
                  maxLength={MAX_NAME_LENGTH}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setIsCreating(false);
                      setNewName("");
                    }
                  }}
                  placeholder={t("assetGroup.groupNamePlaceholder")}
                  className="min-w-0 flex-1 border border-foreground/20 bg-background px-1.5 py-1 text-xs font-mono outline-none focus:border-accent-cyan"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={busy || !newName.trim()}
                  title={t("assetGroup.create")}
                  className="flex-shrink-0 border border-foreground/20 bg-accent-cyan p-1 transition-none hover:brightness-110 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewName("");
                  }}
                  disabled={busy}
                  title={t("assetGroup.cancel")}
                  className="flex-shrink-0 border border-foreground/20 bg-card p-1 transition-none hover:bg-secondary disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRenamingId(null);
                  setDeletingId(null);
                  setIsCreating(true);
                }}
                className={cn(rowClass, "font-bold uppercase hover:bg-accent-yellow")}
              >
                <Plus className="h-3 w-3 flex-shrink-0" />
                {t("assetGroup.createGroup")}
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AssetGroupSelect;
