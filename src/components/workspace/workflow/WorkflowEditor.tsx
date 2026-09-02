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
import {
  ArrowLeft,
  Clapperboard,
  Image,
  MessageSquare,
  Sparkles,
  Trash2,
} from "lucide-react";
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

let seq = 0;
const makeId = () => `wf_${Date.now().toString(36)}_${(seq += 1)}`;

export function WorkflowEditor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false);

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
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b-brutal border-foreground bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/canvas")}
            className="inline-flex h-8 items-center gap-1.5 rounded border-brutal border-foreground bg-card px-2.5 text-[11px] font-bold uppercase tracking-wide brutal-shadow brutal-press transition-none hover:bg-secondary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("workflow.backToCanvas")}
          </button>

          <div className="h-6 w-px bg-foreground/20" />

          <h1 className="text-sm font-bold uppercase tracking-wide text-foreground">
            {t("workflowCanvas.title")}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <ToolbarButton
            onClick={() => setIsMaterialsOpen((v) => !v)}
            active={isMaterialsOpen}
            icon={<Image className="h-3 w-3" />}
            label={t("workflow.materials")}
          />

          <div className="h-5 w-px bg-foreground/20" />

          <ToolbarButton
            onClick={addTextNode}
            icon={<MessageSquare className="h-3 w-3" />}
            label={t("workflow.addTextNode")}
          />
          <ToolbarButton
            onClick={addImageGenNode}
            icon={<Sparkles className="h-3 w-3" />}
            label={t("workflow.addImageGenNode")}
            accent="bg-accent-cyan"
          />
          <ToolbarButton
            onClick={addVideoGenNode}
            icon={<Clapperboard className="h-3 w-3" />}
            label={t("workflow.addVideoGenNode")}
            accent="bg-accent-purple"
          />

          <div className="h-5 w-px bg-foreground/20" />

          <div className="flex h-8 items-center rounded border-brutal border-foreground bg-card px-2.5 font-mono text-[11px] text-foreground">
            <span className="text-muted-foreground">{t("workflowCanvas.nodes")}:</span>
            <span className="ml-1 font-bold">{nodes.length}</span>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-8 items-center gap-1.5 rounded border-brutal border-foreground bg-card px-2.5 text-[11px] font-bold uppercase tracking-wide brutal-shadow brutal-press transition-none hover:bg-secondary"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("workflow.clear")}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className={cn(
            "shrink-0 overflow-hidden border-r-brutal border-foreground bg-card transition-all duration-200 ease-in-out",
            isMaterialsOpen ? "w-72" : "w-0 border-r-0"
          )}
        >
          <div className="h-full w-72">
            <MaterialsPanel onAddAsset={handleAddAsset} />
          </div>
        </div>

        <div ref={canvasRef} className="relative h-full min-w-0 flex-1 bg-background">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            deleteKeyCode={["Backspace", "Delete"]}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant="dots" gap={20} size={1.2} color="hsl(var(--foreground) / 0.10)" />
            <Controls />
            <MiniMap />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-xs rounded border-brutal border-foreground bg-card px-6 py-5 brutal-shadow text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                  {t("workflowCanvas.emptyHint")}
                </p>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {t("workflow.materialsHint")}
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
  active,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  accent?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded border-brutal border-foreground px-2.5 text-[10px] font-bold uppercase tracking-wide brutal-shadow transition-none",
        active
          ? "bg-foreground text-card brutal-shadow"
          : "brutal-press hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        !active && (accent || "bg-card hover:bg-secondary")
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-sm border border-foreground/30",
          active ? "bg-card text-foreground" : accent
        )}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}
