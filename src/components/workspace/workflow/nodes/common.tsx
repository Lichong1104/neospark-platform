import { useCallback, type ReactNode } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { WorkflowNodeStatus } from "@/lib/workflow/types";

const STATUS_LABEL: Record<WorkflowNodeStatus, string> = {
  idle: "idle",
  running: "running",
  done: "done",
  error: "error",
};

const STATUS_CLASS: Record<WorkflowNodeStatus, string> = {
  idle: "bg-muted text-muted-foreground",
  running: "bg-accent-cyan text-foreground",
  done: "bg-accent-green text-foreground",
  error: "bg-accent-pink text-foreground",
};

export function NodeCard({
  id,
  label,
  status,
  icon,
  accent,
  children,
  hasTarget = false,
  hasSource = false,
  showStatus = true,
  action,
}: {
  id: string;
  label: string;
  status: WorkflowNodeStatus;
  icon: ReactNode;
  accent: string;
  children: ReactNode;
  hasTarget?: boolean;
  hasSource?: boolean;
  showStatus?: boolean;
  action?: ReactNode;
}) {
  const { t } = useTranslation();
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((ed) => ed.source !== id && ed.target !== id));
    },
    [id, setNodes, setEdges]
  );

  return (
    <div
      className={cn(
        "neo-node-card w-full border-brutal border-foreground bg-card brutal-shadow",
        status === "error" && "border-accent-pink"
      )}
    >
      <div className={cn("h-1.5 w-full", accent)} />
      <header className="flex items-center gap-1.5 border-b-brutal border-foreground px-2 py-1.5">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center border border-foreground",
            accent
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-wide text-foreground">
          {label}
        </span>
        {showStatus ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none",
              STATUS_CLASS[status]
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full bg-current",
                status === "running" && "animate-pulse"
              )}
            />
            {STATUS_LABEL[status]}
          </span>
        ) : null}
        {action ? <span className="nodrag">{action}</span> : null}
        <button
          type="button"
          onClick={handleDelete}
          className="nodrag flex h-4 w-4 shrink-0 items-center justify-center rounded border border-foreground/30 text-muted-foreground transition-colors hover:border-accent-red hover:bg-accent-red hover:text-foreground"
          title={t("workflow.deleteNode")}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </header>
      <div className="p-2">{children}</div>
      {hasTarget && <Handle type="target" position={Position.Left} id="in" />}
      {hasSource && <Handle type="source" position={Position.Right} id="out" />}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function NodeSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate text-[9px] font-bold uppercase text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="nodrag h-6 w-full cursor-pointer rounded border border-foreground/20 bg-background px-1 text-[10px] text-foreground outline-none transition-colors hover:border-foreground/40 focus:border-foreground"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
