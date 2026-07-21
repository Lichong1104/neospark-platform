import type { VideoTaskSummary, CreateVideoResponse } from "@/types/video";

/** 模型分辨率配置 */
export interface ResolutionOption {
  value: string;
  label: string;
  price: number;
}

/** 模型宽高比配置 */
export interface AspectRatioOption {
  value: string;
  label: string;
}

/** 单个模型配置 */
export interface ModelConfig {
  name: string;
  provider: "gemini" | "tengda";
  description: string;
  supported_resolutions: ResolutionOption[];
  supported_aspect_ratios: AspectRatioOption[];
  image_to_image_extra: number;
  supports_image_to_image?: boolean;
}

/** 所有模型配置（key 为模型 ID） */
export type ModelsConfigMap = Record<string, ModelConfig>;

/** 标准模式 / 智能体（含九宫格）默认绘画模型 */
export const DEFAULT_DRAWING_MODEL = "gpt-image-2";

/** 创建会话请求 */
export interface CreateSessionParams {
  title?: string;
}

/** 创建会话响应 */
export interface CreateSessionResponse {
  session_id: string;
  title: string;
  created_at: string;
}

/** 会话列表查询参数 */
export interface ListSessionsParams {
  status?: "active" | "completed" | "archived";
  limit?: number;
  offset?: number;
}

/** 会话列表项 */
export interface SessionItem {
  session_id: string;
  title: string;
  status: string;
  preview_image: string | null;
  total_generations: number;
  total_cost: number;
  last_message_at: string;
}

/** 会话消息中的图片 */
export interface GeneratedImage {
  url: string;
  local_path: string;
}

/** 会话消息 */
export interface SessionMessage {
  message_id: string;
  role: "user" | "assistant";
  sequence: number;
  content: string;
  model?: string;
  width?: number;
  height?: number;
  num_images?: number;
  status?: "pending" | "generating" | "completed" | "failed" | "cancelled";
  images?: GeneratedImage[];
  actual_cost?: number;
  created_at: string;
  video_tasks?: VideoTaskSummary[];
}

/** 会话详情 */
export interface SessionDetail {
  session_id: string;
  title: string;
  status: string;
  total_generations: number;
  total_cost: number;
  messages: SessionMessage[];
  created_at: string;
  updated_at: string;
}

/** 生成图片请求 */
export interface GenerateImageParams {
  prompt: string;
  model: string;
  resolution: string;
  aspect_ratio: string;
  negative_prompt?: string;
  num_images?: number;
  /** 【单张，向后兼容】参考图路径，通常传已有结果的 `/uploads/...` 路径 */
  ref_image_path?: string;
  /** 【单张，向后兼容】来自 `POST /storage/upload` 的 upload_id，与 `ref_image_path` 二选一 */
  ref_upload_id?: string;
  /** 【多张】参考图 upload_id 列表（最多 14 张） */
  ref_upload_ids?: string[];
  /** 【多张】参考图路径列表（最多 14 张） */
  ref_image_paths?: string[];
  strength?: number;
  /** 提供商：默认 gemini */
  provider?: "gemini" | "tengda";
  /**
   * 画质档位：仅 `gpt-image-2` 支持
   * - low: 低质量（默认）
   * - medium: 中等质量
   * - high: 高质量
   */
  quality?: "low" | "medium" | "high";
  optimize_prompt?: boolean;
  /** `1` = 电商详情页九宫格第一阶段 */
  type?: number;
}

/** 电商批量出图（第二阶段） */
export interface GenerateBatchParams {
  assistant_message_id: string;
  ref_upload_id: string;
  model: string;
  resolution: string;
  aspect_ratio: string;
  negative_prompt?: string;
  strength?: number;
  provider?: "gemini" | "tengda";
  /**
   * 画质档位：仅 `gpt-image-2` 支持
   * - low: 低质量（默认）
   * - medium: 中等质量
   * - high: 高质量
   */
  quality?: "low" | "medium" | "high";
}

export interface GenerateBatchMessageItem {
  message_id: string;
  status: string;
  panel_type?: string;
}

export interface GenerateBatchData {
  messages: GenerateBatchMessageItem[];
  total_estimated_cost?: number;
}

/** 多参考图批量生成 */
export interface GenerateMultiRefParams {
  prompt: string;
  model: string;
  resolution: string;
  aspect_ratio: string;
  negative_prompt?: string;
  /** 参考图上传ID列表（与 ref_image_paths 二选一） */
  ref_upload_ids?: string[];
  /** 参考图路径列表（与 ref_upload_ids 二选一） */
  ref_image_paths?: string[];
  strength?: number;
  provider?: "gemini" | "tengda";
  quality?: "low" | "medium" | "high";
  concurrency?: number;
}

export interface GenerateMultiRefMessageItem {
  message_id: string;
  status: string;
  ref_index: number;
}

export interface GenerateMultiRefData {
  batch_request_id: string;
  messages: GenerateMultiRefMessageItem[];
  total_estimated_cost: number;
  ref_count: number;
}

/** 生成图片响应 */
export interface GenerateImageResponse {
  message_id: string;
  status: string;
  estimated_cost: number;
  created_at: string;
}

/** 消息状态查询响应 */
export interface MessageStatusResponse {
  message_id: string;
  status: "pending" | "generating" | "completed" | "failed" | "cancelled";
  sequence: number;
  images: GeneratedImage[];
  actual_cost?: number;
  generation_time?: number;
  error_msg?: string;
  created_at: string;
  completed_at?: string;
  video_tasks?: VideoTaskSummary[];
}

/** 修改会话标题请求 */
export interface UpdateSessionTitleParams {
  title: string;
}

/** 删除会话参数 */
export interface DeleteSessionParams {
  permanent?: boolean;
}

/** 扣费历史查询参数 */
export interface BillingHistoryParams {
  type?: "deduct" | "refund" | "recharge";
  limit?: number;
  offset?: number;
}

/** 扣费记录 */
export interface BillingTransaction {
  id: number;
  type: "deduct" | "refund" | "recharge";
  type_name: string;
  amount: number;
  amount_sign: string;
  balance_before: number;
  balance_after: number;
  reference_id: string;
  description: string;
  created_at: string;
}

/** 扣费历史响应 */
export interface BillingHistoryData {
  total: number;
  offset: number;
  limit: number;
  transactions: BillingTransaction[];
}

/** 基于绘画消息生成视频请求 */
export interface GenerateVideoFromMessageParams {
  prompt?: string;
  model?: string;
  duration?: number;
  ratio?: string;
  resolution?: string;
  generate_audio?: boolean;
  watermark?: boolean;
}

/** 基于绘画消息生成视频响应 */
export interface GenerateVideoFromMessageResponse extends CreateVideoResponse {
  source_message_id: string;
}
