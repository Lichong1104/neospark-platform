import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow,
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
import { ArrowLeft, Clapperboard, MessageSquare, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MaterialsPanel, type WorkflowAsset } from "./MaterialsPanel";
import { TextInputNode } from "./nodes/TextInputNode";
import { ImageInputNode } from "./nodes/ImageInputNode";
import { VideoInputNode } from "./nodes/VideoInputNode";
import { ImageGenNode } from "./nodes/ImageGenNode";
import { VideoGenNode } from "./nodes/VideoGenNode";
import {
  WORKFLOW_NODE_SIZE,
  type WorkflowNode,
  type WorkflowNodeType,
} from "@/lib/workflow/types";

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

export function WorkflowEditor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { updateNodeData, screenToFlowPosition } = useReactFlow();
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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

  const addAssetNode = useCallback(
    (type: "image" | "video", src: string, _name?: string) => {
      const nodeType = type === "image" ? "imageInput" : "videoInput";
      const size = WORKFLOW_NODE_SIZE[nodeType];
      const rect = canvasRef.current?.getBoundingClientRect();
      const center = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const flowPos = screenToFlowPosition(center);
      const stagger = (nodes.length % 6) * 24;
      const position = {
        x: flowPos.x - size.w / 2 + stagger,
        y: flowPos.y - size.h / 2 + stagger,
      };
      const node: WorkflowNode = {
        id: makeId(),
        type: nodeType,
        position,
        data: {
          status: "idle",
          [type === "image" ? "imageUrl" : "videoUrl"]: src,
        },
        style: { width: size.w },
      };
      setNodes((nds) => nds.concat(node));
    },
    [nodes.length, screenToFlowPosition, setNodes]
  );

  const addTextNode = useCallback(() => addNodeAt("textInput"), [addNodeAt]);
  const addImageGenNode = useCallback(() => addNodeAt("imageGen"), [addNodeAt]);
  const addVideoGenNode = useCallback(() => addNodeAt("videoGen"), [addNodeAt]);

  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((eds) => addEdge({ ...conn, type: "smoothstep" }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDraggingOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
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

  const handleAddAsset = useCallback(
    (asset: WorkflowAsset) => {
      addAssetNode(asset.type, asset.src, asset.name);
    },
    [addAssetNode]
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b-brutal border-foreground bg-card px-3 py-2">
        <button
          type="button"
          onClick={() => navigate("/canvas")}
          className="inline-flex items-center gap-1.5 rounded border-brutal border-foreground bg-card px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide brutal-shadow brutal-press transition-none hover:bg-secondary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("workflow.backToCanvas")}
        </button>

        <h1 className="text-sm font-bold uppercase tracking-wide text-foreground">
          {t("workflowCanvas.title")}
        </h1>

        <div className="flex items-center gap-1.5">
          <ToolbarButton onClick={addTextNode} icon={<MessageSquare className="h-3 w-3" />} label={t("workflow.addTextNode")} />
          <ToolbarButton onClick={addImageGenNode} icon={<Sparkles className="h-3 w-3" />} label={t("workflow.addImageGenNode")} accent="bg-accent-cyan" />
          <ToolbarButton onClick={addVideoGenNode} icon={<Clapperboard className="h-3 w-3" />} label={t("workflow.addVideoGenNode")} accent="bg-accent-purple" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="rounded border-brutal border-foreground bg-card px-2.5 py-1.5 font-mono text-[11px] text-foreground">
            {t("workflowCanvas.nodes")}: <span className="font-bold">{nodes.length}</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded border-brutal border-foreground bg-card px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide brutal-shadow brutal-press transition-none hover:bg-secondary"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("workflow.clear")}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <MaterialsPanel onAddAsset={handleAddAsset} />

        <div
          ref={canvasRef}
          className={cn(
            "relative h-full min-w-0 flex-1 bg-background transition-colors",
            isDraggingOver && "bg-accent-cyan/5"
          )}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            deleteKeyCode={["Backspace", "Delete"]}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant="dots" gap={20} size={1.2} color="hsl(var(--foreground) / 0.10)" />
            <Controls />
            <MiniMap />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded border-brutal border-foreground bg-card px-6 py-4 brutal-shadow text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("workflowCanvas.emptyHint")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon,
  label,
  accent,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded border-brutal border-foreground px-2 py-1 text-[10px] font-bold uppercase tracking-wide brutal-shadow brutal-press transition-none hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        accent || "bg-card hover:bg-secondary"
      )}
    >
      <span className={cn("flex h-4 w-4 items-center justify-center border border-foreground/30", accent)}>{icon}</span>
      {label}
    </button>
  );
}
