/** ===== 图片分层 Image Layer ===== */

/** 分层上传响应（复用 storage upload） */

/** 创建分层任务请求 */
export interface CreateLayerTaskParams {
  image_path: string;
  num_layers: number;
  prompt?: string;
}

/** 分层定价信息 */
export interface LayerPricing {
  estimated_cost: number;
  currency: string;
  num_layers: number;
  price_per_layer: number;
  base_price: number;
}

/** 创建分层任务响应 */
export interface CreateLayerTaskResponse {
  task_id: string;
  status: string;
  pricing: LayerPricing;
  balance_after: number;
  created_at: string;
}

/** 分层任务详情 */
export interface LayerTaskDetail {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  num_layers?: number;
  layer_urls?: string[];
  local_paths?: string[];
  /** legacy format */
  layers?: { url: string; local_path: string }[];
  created_at: string;
  completed_at?: string;
}

/** 分层任务列表查询参数 */
export interface ListLayerTasksParams {
  page?: number;
  page_size?: number;
  status?: string;
}

/** ===== 背景移除 Background Removal ===== */

/** 创建背景移除任务请求 */
export interface CreateBgRemovalParams {
  image_path: string;
}

/** 创建背景移除任务响应 */
export interface CreateBgRemovalResponse {
  task_id: string;
  status: string;
  estimated_cost: number;
  created_at: string;
}

/** 背景移除任务详情 */
export interface BgRemovalTaskDetail {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  result_url?: string;
  local_path?: string;
}

/** 背景移除任务列表查询参数 */
export interface ListBgRemovalTasksParams {
  page?: number;
  page_size?: number;
  status?: string;
}

/** 背景移除价格响应 */
export interface BgRemovalPriceResponse {
  estimated_cost: number;
  currency: string;
}

/** ===== 画质增强 Image Upscale ===== */

/** 创建画质增强任务请求 */
export interface CreateUpscaleParams {
  image_url: string;
  target_resolution?: "2K" | "4K" | "8K";
  output_format?: "jpeg" | "png" | "webp";
}

/** 创建画质增强任务响应 */
export interface CreateUpscaleResponse {
  task_id: string;
  status: string;
  estimated_cost: number;
  message: string;
}

/** 画质增强结果 */
export interface UpscaleResult {
  url: string;
  external_url: string;
  width: number;
  height: number;
}

/** 画质增强任务详情 */
export interface UpscaleTaskDetail {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  target_resolution?: string;
  output_format?: string;
  result?: UpscaleResult;
}

/** 画质增强任务列表查询参数 */
export interface ListUpscaleTasksParams {
  page?: number;
  page_size?: number;
  status?: string;
}

/** 画质增强价格请求 */
export interface UpscalePriceParams {
  target_resolution: string;
}

/** 画质增强价格响应 */
export interface UpscalePriceResponse {
  target_resolution: string;
  estimated_cost: number;
  currency: string;
}
