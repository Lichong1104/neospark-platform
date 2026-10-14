import React, { useState } from "react";
import { MoreVertical, Pencil, FileText, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import type { SkillMeta } from "@/types/skills";
import { useAuth } from "@/contexts/AuthContext";
import skillsApi from "@/api/skills";
import { getErrorMessage } from "@/lib/errorMessage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SkillManageMenuProps {
  skill: SkillMeta;
}

type EditMode = "rename" | "description" | null;

/** 单卡管理菜单：改名 / 改简介 / 停用·启用 / 删除。管理员或所有者可见。 */
const SkillManageMenu: React.FC<SkillManageMenuProps> = ({ skill }) => {
  const { t } = useTranslation();
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState<EditMode>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const canManage = !!(
    userInfo?.is_admin ||
    (userInfo?.id != null && skill.owner_id != null && skill.owner_id === userInfo.id)
  );

  if (!canManage) return null;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["skills"] });
  };

  const openEdit = (mode: Exclude<EditMode, null>) => {
    setEditMode(mode);
    setValue(mode === "rename" ? skill.name : skill.description);
  };

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error(t("skill.updateFailed"));
      return;
    }
    setSaving(true);
    try {
      if (editMode === "rename") {
        await skillsApi.updateSkill(skill.skill_id, { name: trimmed });
      } else if (editMode === "description") {
        await skillsApi.updateSkill(skill.skill_id, { description: trimmed });
      }
      toast.success(t("skill.updateSuccess"));
      setEditMode(null);
      invalidate();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, t("skill.updateFailed")));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    try {
      await skillsApi.toggleSkillStatus(skill.skill_id, !skill.is_active);
      toast.success(t("skill.updateSuccess"));
      invalidate();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, t("skill.updateFailed")));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("skill.deleteConfirm"))) return;
    try {
      await skillsApi.deleteSkill(skill.skill_id);
      toast.success(t("skill.deleteSuccess"));
      invalidate();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, t("skill.deleteFailed")));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            aria-label={t("skill.manage")}
            className="w-6 h-6 flex items-center justify-center border border-foreground/20 bg-card hover:bg-secondary transition-none shrink-0"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[150px]">
          <DropdownMenuItem onSelect={() => openEdit("rename")}>
            <Pencil className="w-3.5 h-3.5 mr-2" />
            {t("skill.rename")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openEdit("description")}>
            <FileText className="w-3.5 h-3.5 mr-2" />
            {t("skill.editDescription")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void handleToggle()}>
            <Power className="w-3.5 h-3.5 mr-2" />
            {skill.is_active ? t("skill.disable") : t("skill.enable")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => void handleDelete()}
            className="text-accent-red focus:text-accent-red"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            {t("skill.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={editMode !== null}
        onOpenChange={(open) => {
          if (!open) setEditMode(null);
        }}
      >
        <DialogContent className="sm:max-w-md border-brutal border-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold uppercase tracking-wider">
              {editMode === "rename" ? t("skill.rename") : t("skill.editDescription")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              {skill.skill_id} · {skill.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                {editMode === "rename" ? t("skill.nameLabel") : t("skill.descriptionLabel")}
              </label>
              {editMode === "rename" ? (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={t("skill.nameLabel")}
                  className="w-full px-3 py-2 bg-background border-brutal border-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
                />
              ) : (
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={t("skill.descriptionLabel")}
                  rows={4}
                  className="w-full px-3 py-2 bg-background border-brutal border-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
                />
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditMode(null)}
                disabled={saving}
                className="px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground bg-card hover:bg-secondary transition-none"
              >
                {t("skill.cancel")}
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving || !value.trim()}
                className="px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground brutal-press bg-accent-pink text-foreground hover:brightness-110 transition-none disabled:bg-muted disabled:text-muted-foreground"
              >
                {t("skill.save")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SkillManageMenu;
