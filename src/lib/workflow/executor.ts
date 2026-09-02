import type { Edge, Node } from "@xyflow/react";
import type { WorkflowNodeData } from "./types";

/** 是否为生成节点（有异步执行，需要等待其完成） */
export function isGeneratorNode(node?: Node | null): boolean {
  return node?.type === "imageGen" || node?.type === "videoGen";
}

export interface ResolvedInputs {
  /** 来自上游文本节点的提示词（多文本以换行拼接） */
  prompt: string;
  /** 来自上游图片节点的图片完整 URL 列表 */
  images: string[];
  /** 来自上游视频节点的视频完整 URL 列表 */
  videos: string[];
}

/** 按目标节点的入边，从上游节点收集输入。 */
export function resolveInputs(
  nodeId: string,
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[]
): ResolvedInputs {
  const promptParts: string[] = [];
  const images: string[] = [];
  const videos: string[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n] as const));

  edges.forEach((e) => {
    if (e.target !== nodeId) return;
    const src = byId.get(e.source);
    if (!src) return;

    switch (src.type) {
      case "textInput":
        if (src.data.text?.trim()) promptParts.push(src.data.text.trim());
        break;
      case "imageInput":
        if (src.data.imageUrl) images.push(src.data.imageUrl);
        break;
      case "videoInput":
        if (src.data.videoUrl) videos.push(src.data.videoUrl);
        break;
      case "imageGen":
        if (src.data.outputImages?.length) images.push(...src.data.outputImages);
        break;
      case "videoGen":
        if (src.data.outputVideo) videos.push(src.data.outputVideo);
        break;
      default:
        break;
    }
  });

  return { prompt: promptParts.join("\n"), images, videos };
}
