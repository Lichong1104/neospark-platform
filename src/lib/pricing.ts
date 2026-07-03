import type { ModelsConfigMap } from "@/types/drawing";

/**
 * 视频生成预估积分计算
 *
 * 与后端 services/video_service_v2.py 的 _calculate_token_cost + 1.1 倍系数保持一致。
 * Seedance 2.0 系列按新版官方定价计算：
 *   tokens = duration * width * height * 24 / 1024
 *   积分 = tokens * 单价(元/百万) / 70_000 * 1.1
 *
 * 其中 70_000 = 1_000_000 * 0.07（1 元 = 1/0.07 积分），1.1 为业务溢价系数。
 */

// 新版 Seedance 2.0 官方 token 单价（元/百万 tokens），不含视频输入场景
const SEEDANCE_TOKEN_PRICE_PER_MILLION: Record<string, Record<string, number>> = {
  "seedance-2.0": {
    "480p": 46,
    "720p": 46,
    "1080p": 51,
    "4k": 26,
  },
  "seedance-2.0-fast": {
    "480p": 37,
    "720p": 37,
  },
  "seedance-2.0-mini": {
    "480p": 23,
    "720p": 23,
  },
};

// 各分辨率在长边上的基准像素（对应新版 CSV 的 16:9 长边）
const SEEDANCE_LONG_EDGE_PIXELS: Record<string, number> = {
  "480p": 864,
  "720p": 1280,
  "1080p": 1920,
  "4k": 3840,
};

// 帧率固定 24fps（与新版 CSV 一致）
const VIDEO_FRAME_RATE = 24;

// 业务溢价系数（与后端 _settle_task 中保持一致）
const VIDEO_TOKEN_COST_MULTIPLIER = 1.1;

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

/**
 * 根据分辨率和宽高比计算视频像素尺寸。
 *
 * 16:9 和 9:16 直接使用新版 CSV 中的实际尺寸，其他比例按长边等比估算，
 * 保证任意时长都可以按官方 token 公式估算价格。
 */
const getSeedanceVideoDimensions = (
  resolution: string,
  ratio: string
): { width: number; height: number } => {
  const normalizedResolution = resolution.toLowerCase();

  // 新版 CSV 中的实际尺寸
  if (normalizedResolution === "480p") {
    if (ratio === "16:9") return { width: 864, height: 496 };
    if (ratio === "9:16") return { width: 496, height: 864 };
  } else if (normalizedResolution === "720p") {
    if (ratio === "16:9") return { width: 1280, height: 720 };
    if (ratio === "9:16") return { width: 720, height: 1280 };
  } else if (normalizedResolution === "1080p") {
    if (ratio === "16:9") return { width: 1920, height: 1080 };
    if (ratio === "9:16") return { width: 1080, height: 1920 };
  } else if (normalizedResolution === "4k") {
    if (ratio === "16:9") return { width: 3840, height: 2160 };
    if (ratio === "9:16") return { width: 2160, height: 3840 };
  }

  // 其他比例按长边等比估算
  const longEdge = SEEDANCE_LONG_EDGE_PIXELS[normalizedResolution] || 1280;
  const [w, h] = ratio.split(":").map((v) => parseInt(v, 10));
  const ratioValue = (w || 1) / (h || 1);

  if (ratioValue >= 1) {
    return { width: longEdge, height: Math.round(longEdge / ratioValue) };
  }
  return { width: Math.round(longEdge * ratioValue), height: longEdge };
};

/**
 * 基于新版 CSV/官方 token 公式估算 Seedance 视频积分。
 *
 * 公式：
 *   tokens = duration * width * height * 24 / 1024
 *   积分 = floor(tokens * price_per_million / 70_000 * 1.1)
 */
const calculateSeedanceTokenEstimatedCost = (
  model: string,
  duration: number,
  resolution: string,
  ratio: string
): number | null => {
  const normalized = normalizeSeedanceModel(model);
  const pricePerMillion =
    SEEDANCE_TOKEN_PRICE_PER_MILLION[normalized]?.[resolution.toLowerCase()];
  if (pricePerMillion === undefined) return null;

  const { width, height } = getSeedanceVideoDimensions(resolution, ratio);
  const tokens = (duration * width * height * VIDEO_FRAME_RATE) / 1024;
  const rawCost = (tokens * pricePerMillion) / 70_000;
  return Math.max(1, Math.floor(rawCost * VIDEO_TOKEN_COST_MULTIPLIER));
};

export const calculateVideoEstimatedCost = (
  model: string,
  duration: number,
  resolution: string,
  ratio: string = "16:9"
): number | null => {
  if (!model || !resolution || !Number.isFinite(duration) || duration <= 0) {
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

  // Seedance 2.0 系列：按新版 token 公式（支持任意时长，包括 8s 等中间值）
  const normalized = normalizeSeedanceModel(model);
  if (normalized in SEEDANCE_TOKEN_PRICE_PER_MILLION) {
    return calculateSeedanceTokenEstimatedCost(model, duration, resolution, ratio);
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
