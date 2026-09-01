import { describe, it, expect } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
  buildPipelineWaves,
  topoSort,
  resolveInputs,
  isGeneratorNode,
} from "@/lib/workflow/executor";
import type { WorkflowNodeData } from "@/lib/workflow/types";

function node(id: string, type: string, data: Partial<WorkflowNodeData> = {}): Node<WorkflowNodeData> {
  return {
    id,
    type: type as never,
    position: { x: 0, y: 0 },
    data: { status: "idle", ...data },
  };
}

function edge(id: string, source: string, target: string): Edge {
  return { id, source, target };
}

describe("topoSort", () => {
  it("按依赖顺序排序线性链", () => {
    const nodes = [
      node("t", "textInput", { text: "hi" }),
      node("i", "imageGen"),
      node("v", "videoGen"),
    ];
    const edges = [edge("e1", "t", "i"), edge("e2", "i", "v")];
    expect(topoSort(nodes, edges)).toEqual(["t", "i", "v"]);
  });

  it("无依赖节点按任意顺序输出", () => {
    const nodes = [node("a", "imageGen"), node("b", "imageGen")];
    const result = topoSort(nodes, []);
    expect(result.sort()).toEqual(["a", "b"]);
  });
});

describe("buildPipelineWaves", () => {
  it("线性链切成 3 波", () => {
    const nodes = [
      node("t", "textInput", { text: "hi" }),
      node("i", "imageGen"),
      node("v", "videoGen"),
    ];
    const edges = [edge("e1", "t", "i"), edge("e2", "i", "v")];
    expect(buildPipelineWaves(nodes, edges)).toEqual([["t"], ["i"], ["v"]]);
  });

  it("两个独立分支落在同一波", () => {
    const nodes = [
      node("t", "textInput", { text: "hi" }),
      node("i1", "imageGen"),
      node("i2", "imageGen"),
    ];
    const edges = [edge("e1", "t", "i1"), edge("e2", "t", "i2")];
    const waves = buildPipelineWaves(nodes, edges);
    expect(waves).toEqual([["t"], ["i1", "i2"]]);
  });

  it("菱形依赖正确分层", () => {
    const nodes = [
      node("a", "textInput", { text: "x" }),
      node("b", "imageGen"),
      node("c", "imageGen"),
      node("d", "videoGen"),
    ];
    const edges = [
      edge("ab", "a", "b"),
      edge("ac", "a", "c"),
      edge("bd", "b", "d"),
      edge("cd", "c", "d"),
    ];
    const waves = buildPipelineWaves(nodes, edges);
    expect(waves[0]).toEqual(["a"]);
    expect(waves[1].sort()).toEqual(["b", "c"]);
    expect(waves[2]).toEqual(["d"]);
  });
});

describe("resolveInputs", () => {
  it("按上游节点类型收集 prompt/images/videos", () => {
    const nodes = [
      node("t", "textInput", { text: "a cat" }),
      node("img", "imageInput", { imageUrl: "https://x/y.jpg" }),
      node("gen", "imageGen", { outputImages: ["https://x/o.jpg"] }),
      node("v", "videoInput", { videoUrl: "https://x/v.mp4" }),
      node("target", "videoGen"),
    ];
    const edges = [
      edge("e1", "t", "target"),
      edge("e2", "img", "target"),
      edge("e3", "gen", "target"),
      edge("e4", "v", "target"),
    ];
    const res = resolveInputs("target", nodes, edges);
    expect(res.prompt).toBe("a cat");
    expect(res.images).toEqual(["https://x/y.jpg", "https://x/o.jpg"]);
    expect(res.videos).toEqual(["https://x/v.mp4"]);
  });

  it("忽略不指向目标节点的边", () => {
    const nodes = [
      node("t", "textInput", { text: "ignored" }),
      node("target", "imageGen"),
    ];
    const edges = [edge("e1", "t", "other")];
    expect(resolveInputs("target", nodes, edges).prompt).toBe("");
  });
});

describe("isGeneratorNode", () => {
  it("判定生成节点", () => {
    expect(isGeneratorNode(node("a", "imageGen"))).toBe(true);
    expect(isGeneratorNode(node("b", "videoGen"))).toBe(true);
    expect(isGeneratorNode(node("c", "textInput"))).toBe(false);
    expect(isGeneratorNode(undefined)).toBe(false);
  });
});
