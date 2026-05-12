/**
 * Canvas images are numbered 图1, 图2, … in array order (videos skipped).
 * Prompts may reference them as @图1, @图2, …
 */

export function canvasImageSlotLabel(slot: number): string {
  return `图${slot}`;
}

export function parseOrderedSlotNumbersFromPrompt(prompt: string): number[] {
  const ordered: number[] = [];
  const seen = new Set<number>();
  let m: RegExpExecArray | null;
  const re = /@图(\d+)/g;
  while ((m = re.exec(prompt)) !== null) {
    const n = Number(m[1]);
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
  const re = /@图(\d+)/g;
  while ((m = re.exec(prompt)) !== null) {
    const n = Number(m[1]);
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
