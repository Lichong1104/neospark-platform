import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** 说明这次操作会发生什么，尤其是不可撤销的后果 */
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** 删除、停用等破坏性动作用红色确认按钮 */
  destructive?: boolean;
  /** 确认后正在请求中：两个按钮都禁用，防重复提交 */
  loading?: boolean;
  onConfirm: () => void;
}

/**
 * 统一的操作确认弹窗。
 *
 * 替代 window.confirm —— 浏览器原生弹窗样式脱离产品、无法本地化排版，也拦不住
 * 重复提交。用法：把 open 绑在一个 state 上，菜单项 onSelect 时置 true。
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
  onConfirm,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-brutal border-foreground brutal-shadow bg-card max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-bold uppercase tracking-wider text-base">
            {title}
          </AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            disabled={loading}
            className="border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider h-9"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              // 交给调用方收尾（关闭弹窗 / 等请求回来），避免弹窗先关掉看不到结果
              e.preventDefault();
              onConfirm();
            }}
            className={cn(
              "border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider hover:brightness-110 h-9",
              destructive
                ? "bg-accent-red text-card"
                : "bg-foreground text-card"
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;