import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Film, Image as ImageIcon, MessageSquare, Sparkles, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeType } from "@/lib/workflow/types";

const ITEMS: Array<{
  type: WorkflowNodeType;
  labelKey: string;
  icon: React.ReactNode;
  accent: string;
}> = [
  { type: "textInput", labelKey: "workflow.nodeText", icon: <MessageSquare className="h-3.5 w-3.5" />, accent: "bg-accent-green" },
  { type: "imageInput", labelKey: "workflow.nodeImageInput", icon: <ImageIcon className="h-3.5 w-3.5" />, accent: "bg-accent-orange" },
  { type: "videoInput", labelKey: "workflow.nodeVideoInput", icon: <Film className="h-3.5 w-3.5" />, accent: "bg-accent-purple" },
  { type: "imageGen", labelKey: "workflow.nodeImage", icon: <Sparkles className="h-3.5 w-3.5" />, accent: "bg-accent-cyan" },
  { type: "videoGen", labelKey: "workflow.nodeVideo", icon: <Clapperboard className="h-3.5 w-3.5" />, accent: "bg-accent-pink" },
];

export const WorkflowNodeLibrary = memo(function WorkflowNodeLibrary({
  onAddNode,
}: {
  onAddNode: (type: WorkflowNodeType) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex w-56 shrink-0 flex-col border-r-brutal border-foreground bg-card">
      <div className="border-b-brutal border-foreground px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {t("workflow.nodeLibrary")}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
        {ITEMS.map((item) => (
          <button
            key={item.type}
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/reactflow", item.type);
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => onAddNode(item.type)}
            className="flex w-full cursor-grab items-center gap-2 rounded border-brutal border-foreground bg-background px-2.5 py-2 text-left brutal-shadow transition-none hover:bg-secondary active:cursor-grabbing"
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center border border-foreground",
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
      <div className="border-t-brutal border-foreground px-3 py-2 text-[9px] font-mono text-muted-foreground">
        {t("workflow.libraryHint")}
      </div>
    </div>
  );
});
