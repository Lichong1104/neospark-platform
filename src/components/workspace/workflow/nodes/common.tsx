import type { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
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
  label,
  status,
  icon,
  accent,
  children,
  hasTarget = false,
  hasSource = false,
  showStatus = true,
}: {
  label: string;
  status: WorkflowNodeStatus;
  icon: ReactNode;
  accent: string;
  children: ReactNode;
  hasTarget?: boolean;
  hasSource?: boolean;
  showStatus?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-lg border-brutal border-foreground bg-card brutal-shadow",
        status === "error" && "border-accent-pink"
      )}
    >
      <header className="flex items-center gap-1.5 border-b-brutal border-foreground px-2 py-1.5">
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center border border-foreground",
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
              "rounded px-1 py-0.5 text-[9px] font-bold uppercase leading-none",
              STATUS_CLASS[status]
            )}
          >
            {STATUS_LABEL[status]}
          </span>
        ) : null}
      </header>
      <div className="p-2">{children}</div>
      {hasTarget && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="!h-3 !w-3 !border-2 !border-foreground !bg-accent-yellow"
        />
      )}
      {hasSource && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="!h-3 !w-3 !border-2 !border-foreground !bg-accent-cyan"
        />
      )}
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
        className="w-full rounded border border-foreground/20 bg-background px-1 py-1 text-[10px] text-foreground outline-none focus:border-foreground/50"
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
