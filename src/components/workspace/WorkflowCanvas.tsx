import { useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkflowRunner } from "@/hooks/useWorkflowRunner";
import {
  WORKFLOW_NODE_SIZE,
  type WorkflowNode,
  type WorkflowNodeType,
} from "@/lib/workflow/types";
import { WorkflowNodeLibrary } from "./workflow/WorkflowNodeLibrary";
import { TextInputNode } from "./workflow/nodes/TextInputNode";
import { ImageInputNode } from "./workflow/nodes/ImageInputNode";
import { VideoInputNode } from "./workflow/nodes/VideoInputNode";
import { ImageGenNode } from "./workflow/nodes/ImageGenNode";
import { VideoGenNode } from "./workflow/nodes/VideoGenNode";

const nodeTypes: NodeTypes = {
  textInput: TextInputNode,
  imageInput: ImageInputNode,
  videoInput: VideoInputNode,
  imageGen: ImageGenNode,
  videoGen: VideoGenNode,
};

const KNOWN_TYPES = new Set<string>([
  "textInput",
  "imageInput",
  "videoInput",
  "imageGen",
  "videoGen",
]);

let seq = 0;
const makeId = () => `wf_${Date.now().toString(36)}_${(seq += 1)}`;

export function WorkflowCanvas({ onExit }: { onExit?: () => void }) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner onExit={onExit} />
    </ReactFlowProvider>
  );
}

function WorkflowCanvasInner({ onExit }: { onExit?: () => void }) {
  const { t } = useTranslation();
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { updateNodeData, screenToFlowPosition } = useReactFlow();
  const { run, isRunning, genNodeCount } = useWorkflowRunner({
    nodes,
    edges,
    updateNodeData,
  });

  const addNodeAt = useCallback(
    (type: WorkflowNodeType, position?: { x: number; y: number }) => {
      const size = WORKFLOW_NODE_SIZE[type];
      const stagger = (nodes.length % 6) * 40;
      const node: WorkflowNode = {
        id: makeId(),
        type,
        position: position ?? { x: 120 + stagger, y: 100 + stagger },
        data: { status: "idle" },
        style: { width: size.w },
      };
      setNodes((nds) => nds.concat(node));
    },
    [nodes.length, setNodes]
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((eds) => addEdge({ ...conn, type: "smoothstep" }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/reactflow");
      if (!KNOWN_TYPES.has(type)) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNodeAt(type as WorkflowNodeType, position);
    },
    [screenToFlowPosition, addNodeAt]
  );

  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  const handleRun = useCallback(() => {
    if (genNodeCount === 0) {
      toast.info(t("workflow.runEmpty"));
      return;
    }
    run();
  }, [genNodeCount, run, t]);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-background">
      <WorkflowNodeLibrary onAddNode={addNodeAt} />

      <div className="relative h-full min-w-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          deleteKeyCode={["Backspace", "Delete"]}
          onDragOver={onDragOver}
          onDrop={onDrop}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant="dots" gap={20} size={1.2} color="hsl(var(--foreground) / 0.10)" />
          <Controls />
          <MiniMap />
        </ReactFlow>

        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1.5 rounded border-brutal border-foreground bg-card px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide brutal-shadow brutal-press transition-none hover:bg-secondary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("workflow.backToCanvas")}
            </button>
          ) : null}
          <div className="rounded border-brutal border-foreground bg-card px-2.5 py-1.5 font-mono text-[11px] text-foreground">
            {t("workflowCanvas.nodes")}: <span className="font-bold">{nodes.length}</span>
          </div>
        </div>

        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 rounded border-brutal border-foreground bg-card px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide brutal-shadow brutal-press transition-none hover:bg-secondary disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("workflow.clear")}
          </button>
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            className={cn(
              "inline-flex items-center gap-1.5 rounded border-brutal border-foreground px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide brutal-shadow brutal-press transition-none disabled:opacity-60",
              isRunning ? "bg-muted text-muted-foreground" : "bg-accent-green text-foreground hover:brightness-110"
            )}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("workflow.running")}
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                {t("workflow.run")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
