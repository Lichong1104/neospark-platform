import type { WorkflowNodeType } from "./types";

/** 一键预设模板：线性链路，相邻节点自动连线 */
export interface WorkflowTemplate {
  id: string;
  labelKey: string;
  chain: WorkflowNodeType[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  { id: "text-to-video", labelKey: "workflow.tplTextToVideo", chain: ["textInput", "imageGen", "videoGen"] },
  { id: "text-to-image", labelKey: "workflow.tplTextToImage", chain: ["textInput", "imageGen"] },
  { id: "image-to-video", labelKey: "workflow.tplImageToVideo", chain: ["imageInput", "videoGen"] },
  { id: "image-to-image", labelKey: "workflow.tplImageToImage", chain: ["imageInput", "imageGen"] },
];
