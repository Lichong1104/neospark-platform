import { memo } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NodeCard } from "./common";
import type { WorkflowNode } from "@/lib/workflow/types";

function TextInputNodeImpl({ id, data }: NodeProps<WorkflowNode>) {
  const { t } = useTranslation();
  const { updateNodeData } = useReactFlow();

  return (
    <NodeCard
      id={id}
      label={t("workflow.nodeText")}
      status="idle"
      showStatus={false}
      icon={<MessageSquare className="h-3.5 w-3.5" />}
      accent="bg-accent-green"
      hasSource
    >
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-bold uppercase text-muted-foreground">
          {t("workflow.prompt")}
        </span>
        <textarea
          value={data.text ?? ""}
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
          placeholder={t("workflow.textPlaceholder")}
          className="nodrag h-24 w-full resize-none rounded border border-foreground/20 bg-background p-2 text-xs leading-relaxed text-foreground outline-none transition-colors focus:border-foreground/50"
        />
      </div>
    </NodeCard>
  );
}

export const TextInputNode = memo(TextInputNodeImpl);
