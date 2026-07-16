import type { VideoModelsData } from "@/types/video";

/**
 * 视频模型配置相关的纯工具函数。
 * 抽取自 CanvasVideoGenCompose，供 LandingComposer（过渡页参数）与
 * CanvasVideoGenCompose（画布视频生成节点）共用。
 */

export const normalizeVideoRatio = (ratio: string) => ratio.replace(/\s+/g, "");

export const VIDEO_DURATION_MIN = 4;
export const VIDEO_DURATION_MAX = 15;

export const defaultDurationOptions = (): string[] =>
  Array.from({ length: VIDEO_DURATION_MAX - VIDEO_DURATION_MIN + 1 }, (_, i) =>
    String(VIDEO_DURATION_MIN + i)
  );

export const mergeDurationOptionsFromApi = (
  d: VideoModelsData["durations"] | undefined
): string[] => {
  if (!d) return defaultDurationOptions();
  const min = Number.isFinite(d.min) ? d.min : VIDEO_DURATION_MIN;
  const max = Number.isFinite(d.max) ? d.max : VIDEO_DURATION_MAX;
  const lo = Math.max(VIDEO_DURATION_MIN, Math.ceil(min));
  const hi = Math.min(VIDEO_DURATION_MAX, Math.floor(max));
  if (lo > hi) return defaultDurationOptions();
  return Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i));
};

export function pickDurationInOptions(value: string, options: string[]): string {
  if (options.includes(value)) return value;
  return options[0] ?? "5";
}

/** `VideoModelsData.resolutions` 可能是数组或按模型的 record，统一取成一个列表。 */
export function resolveResolutionList(
  resolutions: VideoModelsData["resolutions"] | undefined
): string[] {
  if (Array.isArray(resolutions)) return resolutions;
  const first = Object.values(resolutions ?? {})[0];
  return Array.isArray(first) ? first : [];
}
