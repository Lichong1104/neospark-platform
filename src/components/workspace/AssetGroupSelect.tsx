import React, { useCallback, useEffect, useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import assetGroupsApi from "@/api/assetGroups";
import { BrutalDropdown } from "@/components/ui/brutal-dropdown";
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
}

/**
 * 资产组选择器。
 * 自动拉取当前用户的资产组列表；加载失败时静默降级为不显示。
 * 下拉底部支持就地创建新组（创建后自动选中新组）。
 */
const AssetGroupSelect: React.FC<AssetGroupSelectProps> = ({
  mode,
  value,
  onChange,
  className,
}) => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

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

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const group = await assetGroupsApi.createAssetGroup(name);
      await loadGroups();
      onChange(group.group_id);
      setNewName("");
      setIsCreating(false);
    } catch {
      toast.error(t("assetGroup.createFailed"));
    }
  };

  if (loaded && groups.length === 0 && mode === "filter") {
    // 筛选模式下用户还没有任何组时不展示选择器
    return null;
  }

  // assign 模式下「默认分组」由空值代表（后端不传 id 自动归入默认组），
  // 从列表中剔除默认组避免出现两个同名选项。
  const visibleGroups =
    mode === "assign" ? groups.filter((g) => !g.is_default) : groups;

  const baseOption = {
    value: "",
    label:
      mode === "filter" ? t("assetGroup.allAssets") : t("assetGroup.defaultGroup"),
  };
  const options = [
    baseOption,
    ...visibleGroups.map((g) => ({ value: g.group_id, label: g.name })),
  ];

  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <BrutalDropdown
            options={options}
            value={value}
            onChange={onChange}
            icon={<FolderOpen className="w-3 h-3" />}
            placeholder={t("assetGroup.selectGroup")}
            fullWidth
          />
        </div>
        <button
          type="button"
          title={t("assetGroup.createGroup")}
          onClick={() => setIsCreating((v) => !v)}
          className="p-1 border border-foreground/20 bg-card hover:bg-secondary transition-none flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {isCreating && (
        <div className="flex items-center gap-1 mt-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setIsCreating(false);
            }}
            placeholder={t("assetGroup.groupNamePlaceholder")}
            className="flex-1 min-w-0 px-1.5 py-1 text-[11px] font-mono bg-card border border-foreground/20 outline-none focus:border-accent-cyan"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="px-1.5 py-1 text-[10px] font-bold uppercase bg-accent-cyan border-brutal border-foreground brutal-press disabled:opacity-50"
          >
            {t("assetGroup.create")}
          </button>
        </div>
      )}
    </div>
  );
};

export default AssetGroupSelect;
