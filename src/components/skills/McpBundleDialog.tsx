import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { McpBundleInfo } from "@/hooks/useMcpBundleDownload";

interface McpBundleDialogProps {
  /** 有值即打开。密钥只在下载那一刻可见，所以内容全部来自这里 */
  bundle: McpBundleInfo | null;
  skillName: string;
  onOpenChange: (open: boolean) => void;
}

/** 一段可复制的命令 + 说明。 */
const CommandBlock: React.FC<{
  label: string;
  command: string;
  hint: string;
  copiedLabel: string;
  copyLabel: string;
  copied: boolean;
  onCopy: () => void;
}> = ({ label, command, hint, copiedLabel, copyLabel, copied, onCopy }) => (
  <div>
    <div className="mb-1.5 flex items-center justify-between gap-3">
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      <button
        onClick={onCopy}
        className="h-7 px-2.5 inline-flex items-center gap-1.5 border-brutal border-foreground bg-card text-[11px] font-bold uppercase transition-none hover:bg-secondary"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
    <pre className="max-h-40 overflow-auto border-brutal border-foreground bg-secondary/40 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
      {command}
    </pre>
    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
  </div>
);

/**
 * 下载 MCP 包之后弹出的接入指引。
 *
 * 包里的 README 已经写清怎么配，但用户得先解压、再找文件、再对着文档敲命令；
 * 这里把填好密钥的命令直接摆出来，省掉中间所有步骤。
 */
const McpBundleDialog: React.FC<McpBundleDialogProps> = ({ bundle, skillName, onOpenChange }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<"claude" | "codex" | null>(null);

  if (!bundle) return null;

  const claudeCommand =
    `claude mcp add --transport http ${bundle.skillId} ${bundle.endpoint} ` +
    `--header "Authorization: Bearer ${bundle.apiKey}" --scope user`;

  const codexSnippet =
    `[mcp_servers.${bundle.skillId}]\n` +
    `url = "${bundle.endpoint}"\n` +
    `http_headers = { "Authorization" = "Bearer ${bundle.apiKey}" }`;

  const copy = async (which: "claude" | "codex", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // 剪贴板不可用时静默降级，命令本身在框里可以手动选中
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl border-brutal border-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold uppercase tracking-wider">
            {t("skill.mcpGuideTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("skill.mcpGuideDesc", { name: skillName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <CommandBlock
            label={t("skill.mcpGuideClaude")}
            command={claudeCommand}
            hint={t("skill.mcpGuideClaudeHint")}
            copiedLabel={t("skill.mcpGuideCopied")}
            copyLabel={t("skill.mcpGuideCopy")}
            copied={copied === "claude"}
            onCopy={() => void copy("claude", claudeCommand)}
          />
          <CommandBlock
            label={t("skill.mcpGuideCodex")}
            command={codexSnippet}
            hint={t("skill.mcpGuideCodexHint")}
            copiedLabel={t("skill.mcpGuideCopied")}
            copyLabel={t("skill.mcpGuideCopy")}
            copied={copied === "codex"}
            onCopy={() => void copy("codex", codexSnippet)}
          />
          <p className="border-t border-foreground/15 pt-3 text-[11px] leading-relaxed text-muted-foreground">
            {t("skill.mcpGuideNote")}
          </p>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 border-brutal border-foreground brutal-press bg-foreground text-background text-[11px] font-bold uppercase tracking-wider transition-none hover:bg-foreground/90"
          >
            {t("skill.mcpGuideClose")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default McpBundleDialog;