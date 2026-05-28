/** Share of the visible canvas stage used as the default image max edge length */
const CANVAS_IMAGE_SIZE_RATIO = 0.65;

function getViewportMinSize(): number {
  if (typeof window === "undefined") return 0;
  return Math.min(window.innerWidth, window.innerHeight);
}

function getCanvasStageMinSize(): number | null {
  const stage = document.getElementById("onboarding-canvas-stage");
  if (!stage) return null;
  const { width, height } = stage.getBoundingClientRect();
  if (width <= 0 || height <= 0) return null;
  return Math.min(width, height);
}

/**
 * Max display edge length for images on the canvas.
 * Derived from the visible canvas area (or viewport before mount).
 */
export function getCanvasImageMaxSize(): number {
  const stageMin = getCanvasStageMinSize();
  const base = stageMin ?? getViewportMinSize();
  if (base <= 0) return 0;
  return Math.round(base * CANVAS_IMAGE_SIZE_RATIO);
}

export function toCanvasSize(
  width: number,
  height: number,
  maxSize = getCanvasImageMaxSize()
): { width: number; height: number } {
  const effectiveMax =
    maxSize > 0
      ? maxSize
      : Math.round(getViewportMinSize() * CANVAS_IMAGE_SIZE_RATIO);

  if (width <= 0 || height <= 0) {
    return { width: effectiveMax, height: effectiveMax };
  }
  const scale = Math.min(effectiveMax / width, effectiveMax / height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}
