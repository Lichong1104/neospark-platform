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

/** 新建节点时的默认尺寸。节点建出来就带显式宽高，好让缩放有个起点 */
export const WORKFLOW_NODE_SIZE: Record<WorkflowNodeType, { w: number; h: number }> = {
  textInput: { w: 260, h: 200 },
  imageInput: { w: 240, h: 220 },
  videoInput: { w: 240, h: 220 },
  imageGen: { w: 320, h: 360 },
  videoGen: { w: 320, h: 420 },
};

/**
 * 每个节点都可自由缩放，这是拖拽下限，免得被拖到看不见或挤坏内部布局。
 *
 * 下限是按「内容最少要占多高」倒推的：生成节点里参数栅格、参考按钮这些是
 * 固定高度的，提示词框和输出区各留了 min-h，加起来就这么多。再小也不报错，
 * 内容区会自己滚，只是输出画面会被压得很小。
 */
export const WORKFLOW_NODE_MIN: Record<WorkflowNodeType, { minW: number; minH: number }> = {
  textInput: { minW: 200, minH: 120 },
  imageInput: { minW: 200, minH: 200 },
  videoInput: { minW: 200, minH: 200 },
  imageGen: { minW: 280, minH: 330 },
  videoGen: { minW: 280, minH: 380 },
};

export function isGeneratorNodeType(type?: string | null): boolean {
  return type === "imageGen" || type === "videoGen";
}
