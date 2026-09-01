import type { Edge, Node } from "@xyflow/react";

/** 工作流节点类型 */
export type WorkflowNodeType =
  | "textInput"
  | "imageInput"
  | "videoInput"
  | "imageGen"
  | "videoGen";

/** 生成节点的执行状态（输入节点无异步，不参与状态机） */
export type WorkflowNodeStatus = "idle" | "running" | "done" | "error";

/** 工作流节点 data 字段 */
export interface WorkflowNodeData extends Record<string, unknown> {
  label?: string;
  status: WorkflowNodeStatus;
  /** 由 runner 置位，触发该节点执行生成 */
  pendingGenerate?: boolean;
  /** 尚未轮到的波次节点，仅用于 UI 等待标记 */
  pipelineQueued?: boolean;
  error?: string;

  // 文本输入节点
  text?: string;
  // 图片输入节点（完整 URL，用于预览）
  imageUrl?: string;
  // 视频输入节点（完整 URL）
  videoUrl?: string;

  // 图片生成节点：内联兜底 prompt（未连接文本节点时使用）
  prompt?: string;
  // 图片生成节点输出（完整 URL 列表）
  outputImages?: string[];

  // 视频生成节点输出（完整 URL）
  outputVideo?: string;
}

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

/** 默认节点尺寸 */
export const WORKFLOW_NODE_SIZE: Record<WorkflowNodeType, { w: number; h: number }> = {
  textInput: { w: 260, h: 140 },
  imageInput: { w: 240, h: 170 },
  videoInput: { w: 240, h: 170 },
  imageGen: { w: 320, h: 260 },
  videoGen: { w: 320, h: 260 },
};

export function isGeneratorNodeType(type?: string | null): boolean {
  return type === "imageGen" || type === "videoGen";
}
