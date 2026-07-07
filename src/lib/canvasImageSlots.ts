/**
 * Canvas resources are numbered independently by type:
 * - Images: 图1 / 图片1 / image1, 图2 / 图片2 / image2, ... (videos skipped)
 * - Videos: 视频1 / video1, 视频2 / video2, ... (images skipped)
 * Prompts may reference them as @图1, @图片1, @image1, @视频1, @video1, ...
 */

const CANVAS_IMAGE_PREFIX_ALIASES = ["图", "图片", "image"] as const;
const CANVAS_VIDEO_PREFIX_ALIASES = ["视频", "video"] as const;

function createCanvasImageSlotRegex(): RegExp {
  return /@(图|图片|image)(\d+)/gi;
}

function createCanvasVideoSlotRegex(): RegExp {
  return /@(视频|video)(\d+)/gi;
}

function isImagePrefix(prefix: string): boolean {
  return CANVAS_IMAGE_PREFIX_ALIASES.some(
    (a) => a.toLowerCase() === prefix.toLowerCase()
  );
}

function isVideoPrefix(prefix: string): boolean {
  return CANVAS_VIDEO_PREFIX_ALIASES.some(
    (a) => a.toLowerCase() === prefix.toLowerCase()
  );
}

export function canvasImageSlotLabel(slot: number, prefix = "图"): string {
  return `${prefix}${slot}`;
}

export function canvasVideoSlotLabel(slot: number, prefix = "视频"): string {
  return `${prefix}${slot}`;
}

export function promptHasCanvasSlotMention(prompt: string): boolean {
  return createCanvasImageSlotRegex().test(prompt);
}

export function promptHasCanvasImageSlotMention(prompt: string): boolean {
  return createCanvasImageSlotRegex().test(prompt);
}

export function promptHasCanvasVideoSlotMention(prompt: string): boolean {
  return createCanvasVideoSlotRegex().test(prompt);
}

export function parseOrderedSlotNumbersFromPrompt(prompt: string): number[] {
  return parseOrderedImageSlotNumbersFromPrompt(prompt);
}

export function parseOrderedImageSlotNumbersFromPrompt(prompt: string): number[] {
  return parseOrderedSlotNumbers(createCanvasImageSlotRegex(), prompt, isImagePrefix);
}

export function parseOrderedVideoSlotNumbersFromPrompt(prompt: string): number[] {
  return parseOrderedSlotNumbers(createCanvasVideoSlotRegex(), prompt, isVideoPrefix);
}

function parseOrderedSlotNumbers(
  re: RegExp,
  prompt: string,
  prefixValidator: (prefix: string) => boolean
): number[] {
  const ordered: number[] = [];
  const seen = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(prompt)) !== null) {
    const prefix = m[1];
    if (!prefixValidator(prefix)) continue;
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
  return validatePromptCanvasImageSlots(prompt, imageCount);
}

export function validatePromptCanvasImageSlots(
  prompt: string,
  imageCount: number
): { ok: true } | { ok: false; invalidSlot: number } {
  return validateSlots(
    createCanvasImageSlotRegex(),
    prompt,
    imageCount,
    isImagePrefix
  );
}

export function validatePromptCanvasVideoSlots(
  prompt: string,
  videoCount: number
): { ok: true } | { ok: false; invalidSlot: number } {
  return validateSlots(
    createCanvasVideoSlotRegex(),
    prompt,
    videoCount,
    isVideoPrefix
  );
}

function validateSlots(
  re: RegExp,
  prompt: string,
  count: number,
  prefixValidator: (prefix: string) => boolean
): { ok: true } | { ok: false; invalidSlot: number } {
  let m: RegExpExecArray | null;
  while ((m = re.exec(prompt)) !== null) {
    const prefix = m[1];
    if (!prefixValidator(prefix)) continue;
    const n = Number(m[2]);
    if (!Number.isFinite(n) || n < 1 || n > count) {
      return { ok: false, invalidSlot: n };
    }
  }
  return { ok: true };
}

export function resolveImagesFromPromptSlots<T extends { src: string; type?: string }>(
  canvasImages: T[],
  prompt: string
): T[] {
  const imagesOnly = canvasImages.filter((i) => (i.type ?? "image") !== "video");
  const slots = parseOrderedImageSlotNumbersFromPrompt(prompt);
  return resolveBySlots(imagesOnly, slots);
}

export function resolveVideosFromPromptSlots<T extends { src: string; type?: string }>(
  canvasImages: T[],
  prompt: string
): T[] {
  const videosOnly = canvasImages.filter((i) => i.type === "video");
  const slots = parseOrderedVideoSlotNumbersFromPrompt(prompt);
  return resolveBySlots(videosOnly, slots);
}

function resolveBySlots<T extends { src: string }>(
  items: T[],
  slots: number[]
): T[] {
  const result: T[] = [];
  const seenSrc = new Set<string>();
  for (const n of slots) {
    const item = items[n - 1];
    if (!item) continue;
    if (!seenSrc.has(item.src)) {
      seenSrc.add(item.src);
      result.push(item);
    }
  }
  return result;
}
