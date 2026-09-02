import { describe, it, expect } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { resolveInputs, isGeneratorNode } from "@/lib/workflow/executor";
import type { WorkflowNodeData } from "@/lib/workflow/types";

function node(
  id: string,
  type: string,
  data: Partial<WorkflowNodeData> = {}
): Node<WorkflowNodeData> {
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

  it("多个上游图片/视频输入可收集到同一目标（fan-out 反向聚合）", () => {
    const nodes = [
      node("img1", "imageInput", { imageUrl: "https://x/1.jpg" }),
      node("img2", "imageInput", { imageUrl: "https://x/2.jpg" }),
      node("target", "imageGen"),
    ];
    const edges = [
      edge("e1", "img1", "target"),
      edge("e2", "img2", "target"),
    ];
    const res = resolveInputs("target", nodes, edges);
    expect(res.images).toEqual(["https://x/1.jpg", "https://x/2.jpg"]);
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
