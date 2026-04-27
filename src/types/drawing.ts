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
  /** 【多张】参考图 upload_id 列表（最多 14 张，Gemini 3 Pro / 3.1 Flash 以及 Tengda 全系列支持） */
  ref_upload_ids?: string[];
  /** 【多张】参考图路径列表（最多 14 张，Gemini 3 Pro / 3.1 Flash 以及 Tengda 全系列支持） */
  ref_image_paths?: string[];
  strength?: number;
  /** 提供商：默认 gemini */
  provider?: "gemini" | "tengda";
  /**
   * 画质档位：仅 Tengda `gpt-image-2` 支持
   * - standard: 普通（6 积分）
   * - high: 高级（12 积分）
   */
  quality?: "standard" | "high";
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
   * 画质档位：仅 Tengda `gpt-image-2` 支持
   * - standard: 普通
   * - high: 高级
   */
  quality?: "standard" | "high";
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
