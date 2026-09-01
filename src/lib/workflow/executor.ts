import type { Edge, Node } from "@xyflow/react";
import type { WorkflowNodeData } from "./types";

/** 是否为生成节点（有异步执行，需要等待其完成） */
export function isGeneratorNode(node?: Node | null): boolean {
  return node?.type === "imageGen" || node?.type === "videoGen";
}

/** 对节点做拓扑排序（Kahn 算法），返回节点 id 顺序。存在环时结果会缺节点。 */
export function topoSort(nodes: Node[], edges: Edge[]): string[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });

  edges.forEach((e) => {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return;
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    adj.get(e.source)?.push(e.target);
  });

  const queue = nodes
    .filter((n) => (inDegree.get(n.id) ?? 0) === 0)
    .map((n) => n.id);
  const result: string[] = [];

  while (queue.length) {
    const id = queue.shift() as string;
    result.push(id);
    for (const next of adj.get(id) ?? []) {
      const d = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }

  return result;
}

/**
 * 把 DAG 切成并行波次：同波节点之间无依赖，可并行执行；波与波之间串行。
 * 深度 = 最长路径长度（从任意源节点算起）。
 */
export function buildPipelineWaves(nodes: Node[], edges: Edge[]): string[][] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });

  edges.forEach((e) => {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return;
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    adj.get(e.source)?.push(e.target);
  });

  const depth = new Map<string, number>();
  const queue = nodes
    .filter((n) => (inDegree.get(n.id) ?? 0) === 0)
    .map((n) => n.id);
  queue.forEach((id) => depth.set(id, 0));

  while (queue.length) {
    const id = queue.shift() as string;
    const d = depth.get(id) ?? 0;
    for (const next of adj.get(id) ?? []) {
      depth.set(next, Math.max(depth.get(next) ?? 0, d + 1));
      const nd = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, nd);
      if (nd === 0) queue.push(next);
    }
  }

  const byDepth = new Map<number, string[]>();
  nodes.forEach((n) => {
    const d = depth.get(n.id) ?? 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)?.push(n.id);
  });

  const waves: string[][] = [];
  [...byDepth.keys()].sort((a, b) => a - b).forEach((d) => waves.push(byDepth.get(d) ?? []));
  return waves;
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
