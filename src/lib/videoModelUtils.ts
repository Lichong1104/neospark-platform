import type { VideoDurationRange, VideoModelsData } from "@/types/video";

/**
 * 视频模型配置相关的纯工具函数。
 * 抽取自 CanvasVideoGenCompose，供 LandingComposer（过渡页参数）与
 * CanvasVideoGenCompose（画布视频生成节点）共用。
 */

export const normalizeVideoRatio = (ratio: string) => ratio.replace(/\s+/g, "");

export const VIDEO_DURATION_MIN = 4;
export const VIDEO_DURATION_MAX = 30;
export const VIDEO_DURATION_MAX_NON_25 = 15;

/** Omni 模型集合（含 Vertex AI Gemini Omni Flash） */
export const OMNI_MODELS = new Set([
  "omni-fast",
  "omni-fast-v2v",
  "gemini-omni-flash-preview",
]);
export const isOmniModel = (model: string) => OMNI_MODELS.has(model);

/** MiniMax-H3 模型集合 */
export const MINIMAX_H3_MODELS = new Set(["minimax-h3"]);
export const isMinimaxH3Model = (model: string) => MINIMAX_H3_MODELS.has(model);

/** 阿里云 DashScope Wan 3.0 模型集合 */
export const WAN3_MODELS = new Set(["wan3.0-video"]);
export const isWan3Model = (model: string) => WAN3_MODELS.has(model);

/**
 * 支持参考语音输入的模型（与后端真实消费能力保持一致）：
 * - Moyu 系（seedance）→ metadata.content 中 audio_url 项
 * - MiniMax-H3 / Wan3.0-video → 上游原生支持
 * 其余模型（gemini-omni-flash、omni-fast 系、kling 系、grok-imagine）后端会忽略音频参数。
 */
const REFERENCE_AUDIO_MODELS = new Set([
  "seedance-2.5",
  "seedance-2.0",
  "seedance-2.0-fast",
  "minimax-h3",
  "wan3.0-video",
]);
export const supportsReferenceAudio = (model: string) =>
  REFERENCE_AUDIO_MODELS.has(model);

/** 支持文档输入（doc/xls/ppt/pdf/md 等，最多 1 个，≤100MB）：仅 Wan3.0 */
export const supportsDocumentInput = (model: string) => isWan3Model(model);

/** 判断模型是否只发送基础参数（不携带 generate_audio / watermark） */
export const isBaseParamsOnlyModel = (model: string) =>
  isOmniModel(model) || isMinimaxH3Model(model) || isWan3Model(model);

/** 返回模型支持的最大参考图数量 */
export const getMaxRefImages = (model: string) => (isOmniModel(model) ? 5 : 9);

/** 根据模型返回支持的最大时长：Seedance 2.5 / Wan 3.0 最长 30 秒，其他保持 15 秒。 */
export const getModelMaxDuration = (model: string | undefined): number =>
  model === "seedance-2.5" || model === "wan3.0-video"
    ? VIDEO_DURATION_MAX
    : VIDEO_DURATION_MAX_NON_25;

export const defaultDurationOptions = (): string[] =>
  Array.from({ length: VIDEO_DURATION_MAX_NON_25 - VIDEO_DURATION_MIN + 1 }, (_, i) =>
    String(VIDEO_DURATION_MIN + i)
  );

export const defaultDurationOptionsForModel = (model: string): string[] => {
  const max = getModelMaxDuration(model);
  return Array.from({ length: max - VIDEO_DURATION_MIN + 1 }, (_, i) =>
    String(VIDEO_DURATION_MIN + i)
  );
};

/** 解析 durations：兼容旧的全局单条格式与新的按模型 record 格式（含 default 兜底） */
export const resolveDurationRange = (
  d: VideoModelsData["durations"] | undefined,
  model?: string
): VideoDurationRange | undefined => {
  if (!d) return undefined;
  if ("min" in d) return d;
  return (model ? d[model] : undefined) ?? d["default"];
};

export const mergeDurationOptionsFromApi = (
  d: VideoModelsData["durations"] | undefined,
  model?: string
): string[] => {
  const max = getModelMaxDuration(model);
  const range = resolveDurationRange(d, model);
  if (!range) return defaultDurationOptionsForModel(model ?? "");
  const min = Number.isFinite(range.min) ? range.min : VIDEO_DURATION_MIN;
  const apiMax = Number.isFinite(range.max) ? range.max : max;
  const lo = Math.max(VIDEO_DURATION_MIN, Math.ceil(min));
  const hi = Math.min(max, Math.floor(apiMax));
  if (lo > hi) return defaultDurationOptionsForModel(model ?? "");
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
