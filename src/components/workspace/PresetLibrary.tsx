import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, Loader2, BookOpen, Sparkles, Copy, Check, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { BrutalButton } from "@/components/ui/brutal-button";
import {
  BrutalCard,
  BrutalCardContent,
  BrutalCardHeader,
  BrutalCardTitle,
} from "@/components/ui/brutal-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listAiDesignTools,
  type AiDesignTool,
  type AiDesignToolExampleGroup,
} from "@/api/prompts";

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
  const [tools, setTools] = useState<AiDesignTool[]>([]);
  const [filteredTools, setFilteredTools] = useState<AiDesignTool[]>([]);
  const [activeToolSlug, setActiveToolSlug] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchTools = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await listAiDesignTools();
      if (controller.signal.aborted) return;
      setTools(res.items);
      setFilteredTools(res.items);
    } catch {
      // silently fail
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchTools();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [isOpen, fetchTools]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTools(tools);
      return;
    }
    const q = searchQuery.trim().toLowerCase();
    const filtered = tools.filter(
      (tool) =>
        tool.title.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.default_prompt.toLowerCase().includes(q) ||
        tool.example_prompts.some(
          (group) =>
            group.label.toLowerCase().includes(q) ||
            group.prompts.some((p) => p.toLowerCase().includes(q))
        )
    );
    setFilteredTools(filtered);
  }, [searchQuery, tools]);

  // 下拉菜单有数据时，默认选中第一个；搜索后若当前选中项被过滤掉，也切到第一个
  useEffect(() => {
    if (filteredTools.length === 0) return;
    const stillExists = filteredTools.some((t) => t.slug === activeToolSlug);
    if (!stillExists) {
      setActiveToolSlug(filteredTools[0].slug);
    }
  }, [filteredTools, activeToolSlug]);

  const activeTool = filteredTools.find((tool) => tool.slug === activeToolSlug);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b-brutal border-foreground bg-card">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center bg-accent-cyan border-brutal border-foreground brutal-shadow-cyan">
            <BookOpen className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <h2 className="font-mono font-black text-base uppercase tracking-widest">
              {t("intelligenceHub.promptArsenal", {
                defaultValue: "Prompt Arsenal",
              })}
            </h2>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              AI Design Tools · {tools.length} available
            </p>
          </div>
        </div>
        <BrutalButton
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="border-brutal border-foreground"
        >
          <X className="w-5 h-5" />
        </BrutalButton>
      </div>

      {/* Search & Filter */}
      <div className="px-5 py-4 border-b-brutal border-foreground bg-background space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("intelligenceHub.searchPrompts", {
              defaultValue: "Search tools, prompts or examples...",
            })}
            className="w-full h-10 border-brutal border-foreground bg-card py-2 pl-10 pr-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-cyan/30"
          />
        </div>

        <ToolSelect
          tools={filteredTools}
          activeSlug={activeToolSlug}
          onChange={setActiveToolSlug}
        />
      </div>

      {/* Tools List */}
      <div className="flex-1 overflow-y-auto p-5 bg-background">
        {loading && tools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-accent-cyan animate-spin" />
            <p className="font-mono text-xs uppercase text-muted-foreground">
              Loading tools...
            </p>
          </div>
        ) : !activeTool ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 flex items-center justify-center border-brutal border-foreground bg-muted">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-mono text-sm text-muted-foreground">
              {t("intelligenceHub.noPrompts", {
                defaultValue: "No tools found",
              })}
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <ToolCard
              tool={activeTool}
              onSelectPrompt={(prompt) => {
                onSelectPreset(prompt);
                onClose();
              }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t-brutal border-foreground bg-card">
        <p className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {activeTool
            ? `${activeTool.title} · ${tools.findIndex((t) => t.slug === activeTool.slug) + 1} / ${tools.length}`
            : `${tools.length} tools available`}
        </p>
      </div>
    </div>
  );
};

/* ============== 子组件：工具下拉选择 ============== */

interface ToolSelectProps {
  tools: AiDesignTool[];
  activeSlug: string;
  onChange: (slug: string) => void;
}

const ToolSelect: React.FC<ToolSelectProps> = ({ tools, activeSlug, onChange }) => {
  const activeTool = tools.find((t) => t.slug === activeSlug);

  return (
    <div className="relative">
      <Select value={activeSlug} onValueChange={onChange} disabled={tools.length === 0}>
        <SelectTrigger
          aria-label="Select AI design tool"
          className="relative h-11 w-full rounded-none border-brutal border-foreground bg-card px-0 font-mono text-sm text-foreground brutal-shadow focus:ring-2 focus:ring-accent-cyan/30 focus:ring-offset-0 [&>svg]:hidden [&>span]:line-clamp-1"
        >
          <div className="flex flex-1 items-center gap-3 pl-4 pr-2">
            <span className="text-lg">{activeTool ? getToolIcon(activeTool.title) : "✨"}</span>
            <SelectValue placeholder="Select a design tool">
              {activeTool ? activeTool.title : "Select a design tool"}
            </SelectValue>
          </div>
          <div className="flex h-full w-10 shrink-0 items-center justify-center border-l-brutal border-foreground bg-accent-yellow">
            <svg
              className="w-4 h-4 text-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </SelectTrigger>

        <SelectContent
          position="popper"
          sideOffset={4}
          align="start"
          className="z-50 w-[var(--radix-select-trigger-width)] min-w-[240px] rounded-none border-brutal border-foreground bg-background p-0 brutal-shadow"
        >
          <div className="flex flex-col">
            {tools.map((tool) => (
              <SelectItem
                key={tool.slug}
                value={tool.slug}
                className="relative flex w-full cursor-pointer items-center rounded-none border-b border-foreground/20 py-3 pl-12 pr-4 font-mono text-sm text-foreground transition-none last:border-b-0 focus:bg-accent-yellow focus:text-foreground data-[state=checked]:bg-accent-cyan/10 data-[state=checked]:font-bold"
              >
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base">
                  {getToolIcon(tool.title)}
                </span>
                <span className="truncate">{tool.title}</span>
              </SelectItem>
            ))}
          </div>
        </SelectContent>
      </Select>

      {activeTool && (
        <p className="mt-2 text-[10px] font-mono text-muted-foreground leading-relaxed">
          {activeTool.description}
        </p>
      )}
    </div>
  );
};

/* ============== 子组件：工具卡片 ============== */

interface ToolCardProps {
  tool: AiDesignTool;
  onSelectPrompt: (prompt: string) => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelectPrompt }) => {
  const toolIcon = getToolIcon(tool.title);

  return (
    <BrutalCard shadow="default" className="overflow-hidden">
      <BrutalCardHeader className="bg-card">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 flex items-center justify-center bg-accent-yellow border-brutal border-foreground brutal-shadow text-2xl">
            {toolIcon}
          </div>
          <div className="min-w-0 flex-1">
            <BrutalCardTitle className="text-base leading-tight">
              {tool.title}
            </BrutalCardTitle>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {tool.description}
            </p>
          </div>
        </div>
      </BrutalCardHeader>

      <BrutalCardContent className="bg-background/50 space-y-5">
        {/* 默认提示词 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-widest text-accent-cyan">
            <Sparkles className="w-3 h-3" />
            Default Prompt
          </div>
          <DefaultPromptCard
            prompt={tool.default_prompt}
            onUse={() => onSelectPrompt(tool.default_prompt)}
          />
        </div>

        {/* 示例提示词 */}
        <div className="pt-3 space-y-5 border-t-brutal border-foreground/20">
          {tool.example_prompts.map((group, groupIndex) => (
            <ExampleGroup
              key={`${tool.slug}-${group.label}-${groupIndex}`}
              group={group}
              groupIndex={groupIndex}
              onSelectPrompt={onSelectPrompt}
            />
          ))}
        </div>
      </BrutalCardContent>
    </BrutalCard>
  );
};

/* ============== 子组件：默认提示词卡片 ============== */

interface DefaultPromptCardProps {
  prompt: string;
  onUse: () => void;
}

const DefaultPromptCard: React.FC<DefaultPromptCardProps> = ({
  prompt,
  onUse,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={onUse}
      className="group w-full text-left p-4 border-brutal border-foreground bg-card brutal-shadow hover:brutal-shadow-cyan hover:bg-accent-cyan/5 transition-none"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <Wand2 className="w-4 h-4 text-accent-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs leading-relaxed text-foreground">
            {prompt}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 bg-accent-cyan border-brutal border-foreground text-[10px] font-bold uppercase tracking-wider text-foreground">
              Click to use
            </span>
            <SizeBadge prompt={prompt} />
          </div>
        </div>
        <CopyButton copied={copied} onClick={handleCopy} />
      </div>
    </button>
  );
};

/* ============== 子组件：示例分组 ============== */

const GROUP_ACCENT_COLORS = [
  "bg-accent-pink",
  "bg-accent-cyan",
  "bg-accent-yellow",
  "bg-accent-green",
];

interface ExampleGroupProps {
  group: AiDesignToolExampleGroup;
  groupIndex: number;
  onSelectPrompt: (prompt: string) => void;
}

const ExampleGroup: React.FC<ExampleGroupProps> = ({
  group,
  groupIndex,
  onSelectPrompt,
}) => {
  const accentColor =
    GROUP_ACCENT_COLORS[groupIndex % GROUP_ACCENT_COLORS.length];
  const borderColor = accentColor.replace("bg-", "border-");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-8 h-8 flex items-center justify-center border-brutal border-foreground brutal-shadow text-base",
            accentColor
          )}
        >
          {group.icon}
        </div>
        <div className={cn("h-px flex-1 border-b-2 border-dashed", borderColor)} />
        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-foreground">
          {group.label}
        </span>
      </div>

      <div className="space-y-2 pl-1">
        {group.prompts.map((prompt, idx) => (
          <PromptRow
            key={idx}
            prompt={prompt}
            accentColor={accentColor}
            onSelect={() => onSelectPrompt(prompt)}
          />
        ))}
      </div>
    </div>
  );
};

/* ============== 子组件：单条提示词 ============== */

interface PromptRowProps {
  prompt: string;
  accentColor: string;
  onSelect: () => void;
}

const PromptRow: React.FC<PromptRowProps> = ({
  prompt,
  accentColor,
  onSelect,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={onSelect}
      className="group w-full text-left flex items-stretch border border-foreground/40 bg-card hover:border-foreground hover:bg-accent-yellow/5 transition-none"
    >
      <div
        className={cn(
          "w-1.5 shrink-0 border-r-brutal border-foreground",
          accentColor
        )}
      />
      <div className="flex-1 min-w-0 p-3">
        <p className="font-mono text-[11px] leading-relaxed text-foreground line-clamp-2">
          {prompt}
        </p>
        <div className="mt-2">
          <SizeBadge prompt={prompt} />
        </div>
      </div>
      <div className="shrink-0 w-9 flex items-center justify-center border-l border-foreground/40 bg-background">
        <CopyButton copied={copied} onClick={handleCopy} />
      </div>
    </button>
  );
};

/* ============== 工具组件：尺寸标签 + 复制按钮 ============== */

const SizeBadge: React.FC<{ prompt: string }> = ({ prompt }) => {
  const size = extractSizeTag(prompt);
  if (!size) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 bg-background border-brutal border-foreground text-[9px] font-mono text-muted-foreground">
      {size}
    </span>
  );
};

interface CopyButtonProps {
  copied: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const CopyButton: React.FC<CopyButtonProps> = ({ copied, onClick }) => (
  <div
    onClick={onClick}
    role="button"
    tabIndex={0}
    aria-label={copied ? "Copied" : "Copy prompt"}
    className="p-1.5 border-brutal border-foreground bg-card hover:bg-accent-yellow"
  >
    {copied ? (
      <Check className="w-3.5 h-3.5 text-green-700" />
    ) : (
      <Copy className="w-3.5 h-3.5 text-foreground" />
    )}
  </div>
);

/* ============== 工具函数 ============== */

function extractSizeTag(prompt: string): string | null {
  const match = prompt.match(/Size:\s*([^.]+)/i);
  return match ? match[1].trim() : null;
}

function getToolIcon(title: string): string {
  const map: Record<string, string> = {
    "Advertising Poster Generator": "📢",
  };
  return map[title] || "✨";
}

export { PresetLibrary };
