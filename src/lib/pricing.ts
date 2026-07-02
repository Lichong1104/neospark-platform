import type { ModelsConfigMap } from "@/types/drawing";

/**
 * 视频生成预估积分计算
 *
 * 与后端 services/video_service_v2.py 的 _calculate_price 保持一致。
 * Seedance 2.0 系列按官方价格 × 1.25 ÷ 0.07 换算，已移除 7.9 折补偿。
 */

export const VIDEO_SEEDANCE_PRICING: Record<
  string,
  Record<string, Record<number, number>>
> = {
  "seedance-2.0": {
    "480p": { 4: 134, 5: 167, 6: 200, 7: 234, 8: 267, 9: 301, 10: 334, 11: 367, 12: 401, 13: 434, 14: 467, 15: 501 },
    "720p": { 4: 284, 5: 355, 6: 426, 7: 497, 8: 568, 9: 639, 10: 710, 11: 781, 12: 852, 13: 923, 14: 994, 15: 1065 },
    "1080p": { 4: 708, 5: 885, 6: 1062, 7: 1239, 8: 1416, 9: 1593, 10: 1770, 11: 1947, 12: 2124, 13: 2302, 14: 2479, 15: 2656 },
    "4k": { 4: 1444, 5: 1805, 6: 2166, 7: 2527, 8: 2888, 9: 3249, 10: 3610, 11: 3971, 12: 4332, 13: 4693, 14: 5054, 15: 5415 },
  },
  "seedance-2.0-fast": {
    "480p": { 4: 107, 5: 134, 6: 161, 7: 188, 8: 215, 9: 242, 10: 269, 11: 295, 12: 322, 13: 349, 14: 376, 15: 403 },
    "720p": { 4: 228, 5: 285, 6: 342, 7: 400, 8: 457, 9: 514, 10: 571, 11: 628, 12: 685, 13: 742, 14: 799, 15: 856 },
  },
};

const VIDEO_FALLBACK_PRICE_PER_SECOND: Record<string, number> = {
  "seedance-2.0": 22,
  "seedance-2.0-fast": 18,
};

const OMNI_PRICE_PER_SECOND: Record<string, number> = {
  "omni-fast": 15,
  "omni-fast-v2v": 18,
};

/** 7.9 折补偿：ceil(base / 0.79) == (base * 100 + 78) // 79 */
const applyCompensation = (base: number): number =>
  Math.floor((base * 100 + 78) / 79);

/** 腾讯云 Kling 价格系数（与后端 tencent_vod_client.py 保持一致） */
const KLING_PRICE_MULTIPLIER: Record<string, number> = {
  "480p": 0.8,
  "720p": 1.0,
  "1080p": 1.5,
  "2k": 2.5,
  "4k": 3.5,
};

const normalizeSeedanceModel = (model: string): string => {
  if (model === "doubao-seedance-2-0-260128") return "seedance-2.0";
  if (model === "doubao-seedance-2-0-fast-260128") return "seedance-2.0-fast";
  return model;
};

export const calculateVideoEstimatedCost = (
  model: string,
  duration: number,
  resolution: string
): number | null => {
  if (!model || !resolution || !Number.isFinite(duration)) {
    return null;
  }

  // Omni 模型：保持原固定单价 + 7.9 折补偿
  if (model in OMNI_PRICE_PER_SECOND) {
    return applyCompensation(OMNI_PRICE_PER_SECOND[model] * duration);
  }

  // 腾讯云 Kling：基准 15 积分/秒（720p）× 分辨率系数 × 7.9 折补偿
  if (model === "kling-3.0" || model === "kling-3.0-omni") {
    const multiplier = KLING_PRICE_MULTIPLIER[resolution.toLowerCase()] ?? 1.0;
    const omniPremium = model === "kling-3.0-omni" ? 1.2 : 1.0;
    const base = Math.floor(15 * duration * multiplier * omniPremium);
    return applyCompensation(base);
  }

  // Seedance 2.0 系列
  const normalized = normalizeSeedanceModel(model);
  const modelPricing = VIDEO_SEEDANCE_PRICING[normalized];
  if (modelPricing) {
    const resolutionPricing = modelPricing[resolution.toLowerCase()];
    if (resolutionPricing && duration in resolutionPricing) {
      return resolutionPricing[duration];
    }
    // 异常 fallback：按秒计价（无 7.9 折补偿）
    const fallback = VIDEO_FALLBACK_PRICE_PER_SECOND[normalized] ?? 22;
    return fallback * duration;
  }

  return null;
};

/**
 * 图像生成预估积分计算
 *
 * 优先从 modelsConfig 中读取当前模型/分辨率的价格。
 * gpt-image-2 的 medium/high 质量在前端 modelsConfig 中只返回 low 价格，
 * 这里按后端默认 quality 价格表补全。
 */

const GPT_IMAGE_2_QUALITY_PRICING: Record<
  string,
  Record<string, number>
> = {
  "512": { low: 4, medium: 4, high: 4 },
  "1K": { low: 4, medium: 7, high: 12 },
  "2K": { low: 8, medium: 8, high: 8 },
  "4K": { low: 15, medium: 15, high: 15 },
};

export const calculateImageEstimatedCost = (
  modelsConfig: ModelsConfigMap | null,
  model: string,
  resolution: string,
  gptImageQuality: "low" | "medium" | "high" = "low"
): number | null => {
  if (!modelsConfig || !model || !resolution) {
    return null;
  }

  const modelConfig = modelsConfig[model];
  if (!modelConfig) {
    return null;
  }

  // gpt-image-2  quality 加价
  if (model === "gpt-image-2") {
    const qualityPricing = GPT_IMAGE_2_QUALITY_PRICING[resolution];
    if (qualityPricing && gptImageQuality in qualityPricing) {
      return qualityPricing[gptImageQuality];
    }
  }

  const resolutionOption = modelConfig.supported_resolutions.find(
    (r) => r.value === resolution
  );
  if (resolutionOption) {
    return resolutionOption.price;
  }

  return null;
};

/**
 * 通用积分显示格式化
 */
export const formatEstimatedCost = (
  cost: number | null | undefined
): string => {
  if (cost === null || cost === undefined) return "--";
  return `${cost} 积分`;
};
