import type { CanvasImage } from "@/components/workspace/CanvasArea";

export const CANVAS_GEN_NODE_WIDTH = 360;
export const CANVAS_GEN_COMPOSE_HEIGHT = 132;
/** 预览区 + 上下内边距（px-2 pt-2 / pb-2 pt-1） */
export const CANVAS_GEN_NODE_CHROME = 24;
export const CANVAS_GEN_PREVIEW_IMAGE = 168;
export const CANVAS_GEN_PREVIEW_VIDEO = 120;

export function getGenPreviewHeight(genType: "image" | "video"): number {
  return genType === "video"
    ? CANVAS_GEN_PREVIEW_VIDEO
    : CANVAS_GEN_PREVIEW_IMAGE;
}

/** @deprecated use getGenPreviewHeight */
export function getGenPlaceholderBodyHeight(genType: "image" | "video"): number {
  return getGenPreviewHeight(genType) + CANVAS_GEN_NODE_CHROME;
}

export function getGenNodeTotalHeight(genType: "image" | "video"): number {
  return getGenPreviewHeight(genType) + CANVAS_GEN_COMPOSE_HEIGHT + CANVAS_GEN_NODE_CHROME;
}

export function isGenPlaceholder(img: CanvasImage): boolean {
  return img.kind === "gen-placeholder";
}

export function createGenPlaceholderItem(
  genType: "image" | "video",
  placement: { x: number; y: number },
  name: string
): CanvasImage {
  return {
    id: Math.random().toString(36).substr(2, 8).toUpperCase(),
    x: placement.x,
    y: placement.y,
    width: CANVAS_GEN_NODE_WIDTH,
    height: getGenNodeTotalHeight(genType),
    selected: true,
    src: "",
    name,
    kind: "gen-placeholder",
    genType,
  };
}
