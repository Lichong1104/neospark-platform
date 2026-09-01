import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Film, Image as ImageIcon, MessageSquare, Sparkles, Clapperboard, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeType } from "@/lib/workflow/types";
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from "@/lib/workflow/templates";

interface LibraryItem {
  type: WorkflowNodeType;
  labelKey: string;
  icon: React.ReactNode;
  accent: string;
}

const GROUPS: Array<{ labelKey: string; items: LibraryItem[] }> = [
  {
    labelKey: "workflow.groupInputs",
    items: [
      { type: "textInput", labelKey: "workflow.nodeText", icon: <MessageSquare className="h-3.5 w-3.5" />, accent: "bg-accent-green" },
      { type: "imageInput", labelKey: "workflow.nodeImageInput", icon: <ImageIcon className="h-3.5 w-3.5" />, accent: "bg-accent-orange" },
      { type: "videoInput", labelKey: "workflow.nodeVideoInput", icon: <Film className="h-3.5 w-3.5" />, accent: "bg-accent-purple" },
    ],
  },
  {
    labelKey: "workflow.groupGenerators",
    items: [
      { type: "imageGen", labelKey: "workflow.nodeImage", icon: <Sparkles className="h-3.5 w-3.5" />, accent: "bg-accent-cyan" },
      { type: "videoGen", labelKey: "workflow.nodeVideo", icon: <Clapperboard className="h-3.5 w-3.5" />, accent: "bg-accent-pink" },
    ],
  },
];

export const WorkflowNodeLibrary = memo(function WorkflowNodeLibrary({
  onAddNode,
  onApplyTemplate,
}: {
  onAddNode: (type: WorkflowNodeType) => void;
  onApplyTemplate: (template: WorkflowTemplate) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex w-56 shrink-0 flex-col border-r-brutal border-foreground bg-card">
      <div className="border-b-brutal border-foreground px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {t("workflow.nodeLibrary")}
      </div>
      <div className="scrollbar-brutal flex-1 space-y-4 overflow-y-auto p-2.5">
        {/* 一键模板 */}
        <div className="space-y-1.5">
          <div className="px-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("workflow.templates")}
          </div>
          {WORKFLOW_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onApplyTemplate(tpl)}
              className="flex w-full items-center gap-2 rounded border-brutal border-foreground bg-accent-yellow px-2.5 py-2 text-left brutal-shadow transition-none hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs font-bold uppercase tracking-wide text-foreground">
                {t(tpl.labelKey)}
              </span>
            </button>
          ))}
        </div>

        {/* 节点分组 */}
        {GROUPS.map((group) => (
          <div key={group.labelKey} className="space-y-2">
            <div className="px-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {t(group.labelKey)}
            </div>
            {group.items.map((item) => (
              <button
                key={item.type}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/reactflow", item.type);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => onAddNode(item.type)}
                className="group flex w-full cursor-grab items-center gap-2 rounded border-brutal border-foreground bg-background px-2.5 py-2 text-left brutal-shadow transition-none hover:-translate-x-0.5 hover:-translate-y-0.5 active:cursor-grabbing active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center border border-foreground transition-transform group-hover:scale-110",
                    item.accent
                  )}
                >
                  {item.icon}
                </span>
                <span className="truncate text-xs font-bold uppercase tracking-wide text-foreground">
                  {t(item.labelKey)}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t-brutal border-foreground px-3 py-2 text-[9px] font-mono text-muted-foreground">
        {t("workflow.libraryHint")}
      </div>
    </div>
  );
});
