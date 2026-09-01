import { useCallback, useEffect, useRef, useState } from "react";
import type { Edge } from "@xyflow/react";
import { buildPipelineWaves, isGeneratorNode } from "@/lib/workflow/executor";
import type { WorkflowNode, WorkflowNodeData } from "@/lib/workflow/types";

interface PipelineState {
  waves: string[][];
  waveIdx: number;
  waveStarted: boolean;
}

interface UseWorkflowRunnerArgs {
  nodes: WorkflowNode[];
  edges: Edge[];
  updateNodeData: (id: string, data: Partial<WorkflowNodeData>) => void;
}

/**
 * 前端驱动的波次调度器（移植自 HeliosGen 的 usePipelineRunner）。
 * run() 构建并行波次后，逐波给生成节点置 pendingGenerate；
 * 监听节点 status，当前波所有生成节点进入终态后推进下一波。
 */
export function useWorkflowRunner({
  nodes,
  edges,
  updateNodeData,
}: UseWorkflowRunnerArgs) {
  const [pipeline, setPipeline] = useState<PipelineState | null>(null);
  const waveEverActive = useRef(false);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const isRunning = pipeline !== null;
  const genNodeCount = nodes.filter((n) => isGeneratorNode(n)).length;

  const run = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    // 重置所有生成节点，保证再次运行时 pendingGenerate 能重新从 false→true 触发。
    for (const n of currentNodes) {
      if (isGeneratorNode(n)) {
        updateNodeData(n.id, {
          status: "idle",
          pendingGenerate: false,
          pipelineQueued: false,
          outputImages: undefined,
          outputVideo: undefined,
          error: undefined,
        });
      }
    }

    const waves = buildPipelineWaves(currentNodes, currentEdges);
    if (waves.length === 0) return;

    // 标记后续波次的生成节点为「等待中」
    for (let i = 1; i < waves.length; i++) {
      for (const nodeId of waves[i]) {
        const node = currentNodes.find((n) => n.id === nodeId);
        if (isGeneratorNode(node)) updateNodeData(nodeId, { pipelineQueued: true });
      }
    }

    waveEverActive.current = false;
    setPipeline({ waves, waveIdx: 0, waveStarted: false });
  }, [updateNodeData]);

  useEffect(() => {
    if (!pipeline) return;
    const { waves, waveIdx, waveStarted } = pipeline;
    const currentWave = waves[waveIdx];
    if (!currentWave) {
      setPipeline(null);
      return;
    }

    const genIds = currentWave.filter((nodeId) =>
      isGeneratorNode(nodes.find((n) => n.id === nodeId))
    );

    // 启动当前波：给生成节点置 pendingGenerate
    if (!waveStarted) {
      waveEverActive.current = false;
      for (const nodeId of genIds) updateNodeData(nodeId, { pendingGenerate: true });
      setPipeline((p) => (p ? { ...p, waveStarted: true } : null));
      return;
    }

    // 纯输入波（无生成节点）——直接推进
    if (genIds.length === 0) {
      const nextIdx = waveIdx + 1;
      if (nextIdx >= waves.length) {
        setPipeline(null);
      } else {
        waveEverActive.current = false;
        setPipeline({ waves, waveIdx: nextIdx, waveStarted: false });
      }
      return;
    }

    // 仅当有节点真正进入 running 后，才认为该波已开始，避免竞态误判完成。
    const anyActive = genIds.some(
      (nodeId) => nodes.find((x) => x.id === nodeId)?.data.status === "running"
    );
    if (anyActive) waveEverActive.current = true;
    if (!waveEverActive.current) return;

    const allDone = genIds.every((nodeId) => {
      const n = nodes.find((x) => x.id === nodeId);
      if (!n) return true;
      return n.data.status === "done" || n.data.status === "error";
    });
    if (!allDone) return;

    const nextIdx = waveIdx + 1;
    if (nextIdx >= waves.length) {
      setPipeline(null);
    } else {
      waveEverActive.current = false;
      for (const nodeId of waves[nextIdx]) {
        if (isGeneratorNode(nodes.find((n) => n.id === nodeId))) {
          updateNodeData(nodeId, { pendingGenerate: true, pipelineQueued: false });
        }
      }
      setPipeline({ waves, waveIdx: nextIdx, waveStarted: true });
    }
  }, [nodes, pipeline, updateNodeData]);

  return { run, isRunning, genNodeCount };
}
