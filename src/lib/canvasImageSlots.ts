/**
 * Canvas images are numbered 图1, 图2, … in array order (videos skipped).
 * Prompts may reference them as @图1, @图2, …
 */

const CANVAS_SLOT_PREFIX_ALIASES = ["图", "image"] as const;

function createCanvasSlotRegex(): RegExp {
  return /@(图|image)(\d+)/gi;
}

export function canvasImageSlotLabel(slot: number, prefix = "图"): string {
  return `${prefix}${slot}`;
}

export function promptHasCanvasSlotMention(prompt: string): boolean {
  return createCanvasSlotRegex().test(prompt);
}

export function parseOrderedSlotNumbersFromPrompt(prompt: string): number[] {
  const ordered: number[] = [];
  const seen = new Set<number>();
  let m: RegExpExecArray | null;
  const re = createCanvasSlotRegex();
  while ((m = re.exec(prompt)) !== null) {
    const prefix = m[1]?.toLowerCase();
    if (!CANVAS_SLOT_PREFIX_ALIASES.some((item) => item.toLowerCase() === prefix)) {
      continue;
    }
    const n = Number(m[2]);
    if (!Number.isFinite(n) || seen.has(n)) continue;
    seen.add(n);
    ordered.push(n);
  }
  return ordered;
}

export function validatePromptCanvasSlots(
  prompt: string,
  imageCount: number
): { ok: true } | { ok: false; invalidSlot: number } {
  let m: RegExpExecArray | null;
  const re = createCanvasSlotRegex();
  while ((m = re.exec(prompt)) !== null) {
    const prefix = m[1]?.toLowerCase();
    if (!CANVAS_SLOT_PREFIX_ALIASES.some((item) => item.toLowerCase() === prefix)) {
      continue;
    }
    const n = Number(m[2]);
    if (!Number.isFinite(n) || n < 1 || n > imageCount) {
      return { ok: false, invalidSlot: n };
    }
  }
  return { ok: true };
}

export function resolveImagesFromPromptSlots<T extends { src: string; type?: string }>(
  canvasImages: T[],
  prompt: string
): T[] {
  const imagesOnly = canvasImages.filter((i) => i.type !== "video");
  const slots = parseOrderedSlotNumbersFromPrompt(prompt);
  const result: T[] = [];
  const seenSrc = new Set<string>();
  for (const n of slots) {
    const img = imagesOnly[n - 1];
    if (!img) continue;
    if (!seenSrc.has(img.src)) {
      seenSrc.add(img.src);
      result.push(img);
    }
  }
  return result;
}
