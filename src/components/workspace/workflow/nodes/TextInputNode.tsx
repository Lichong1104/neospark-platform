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
      label={t("workflow.nodeText")}
      status="idle"
      showStatus={false}
      icon={<MessageSquare className="h-3 w-3" />}
      accent="bg-accent-green"
      hasSource
    >
      <textarea
        value={data.text ?? ""}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        placeholder={t("workflow.textPlaceholder")}
        className="h-20 w-full resize-none rounded border border-foreground/20 bg-background p-1.5 text-xs text-foreground outline-none focus:border-foreground/50"
      />
    </NodeCard>
  );
}

export const TextInputNode = memo(TextInputNodeImpl);
