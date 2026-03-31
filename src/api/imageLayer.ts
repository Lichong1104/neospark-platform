import http from "./request";
import type { ApiResponse } from "@/types/common";
import type {
  CreateLayerTaskParams,
  CreateLayerTaskResponse,
  LayerTaskDetail,
  ListLayerTasksParams,
  CreateBgRemovalParams,
  CreateBgRemovalResponse,
  BgRemovalTaskDetail,
  ListBgRemovalTasksParams,
  BgRemovalPriceResponse,
  CreateUpscaleParams,
  CreateUpscaleResponse,
  UpscaleTaskDetail,
  ListUpscaleTasksParams,
  UpscalePriceParams,
  UpscalePriceResponse,
} from "@/types/imageLayer";

// ==================== 图片分层 ====================

/** 上传图片用于分层（复用 storage 上传，file_type=image） */
export async function uploadLayerImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_type", "image");
  return http.postForm("/api/v1/image-layer/upload", formData);
}

/** 创建分层任务 */
export async function createLayerTask(params: CreateLayerTaskParams): Promise<CreateLayerTaskResponse> {
  const res = await http.post<CreateLayerTaskResponse>("/api/v1/image-layer/tasks", params);
  return res.data ?? (res as unknown as CreateLayerTaskResponse);
}

/** 查询分层任务状态 */
export async function getLayerTask(taskId: string): Promise<LayerTaskDetail> {
  const res = await http.get<LayerTaskDetail>(`/api/v1/image-layer/tasks/${taskId}`);
  return res.data;
}

/** 获取分层任务列表 */
export async function listLayerTasks(params?: ListLayerTasksParams) {
  const res = await http.get<LayerTaskDetail[]>("/api/v1/image-layer/tasks", params as Record<string, unknown>);
  return res.data;
}

/** 删除分层任务 */
export async function deleteLayerTask(taskId: string): Promise<ApiResponse<unknown>> {
  return http.del(`/api/v1/image-layer/tasks/${taskId}`);
}

// ==================== 背景移除 ====================

/** 创建背景移除任务 */
export async function createBgRemovalTask(params: CreateBgRemovalParams): Promise<CreateBgRemovalResponse> {
  const res = await http.post<CreateBgRemovalResponse>("/api/v1/image-layer/background/tasks", params);
  return res.data ?? (res as unknown as CreateBgRemovalResponse);
}

/** 查询背景移除任务状态 */
export async function getBgRemovalTask(taskId: string): Promise<BgRemovalTaskDetail> {
  const res = await http.get<BgRemovalTaskDetail>(`/api/v1/image-layer/background/tasks/${taskId}`);
  return res.data;
}

/** 获取背景移除任务列表 */
export async function listBgRemovalTasks(params?: ListBgRemovalTasksParams) {
  const res = await http.get<BgRemovalTaskDetail[]>(
    "/api/v1/image-layer/background/tasks",
    params as Record<string, unknown>
  );
  return res.data;
}

/** 删除背景移除任务 */
export async function deleteBgRemovalTask(taskId: string): Promise<ApiResponse<unknown>> {
  return http.del(`/api/v1/image-layer/background/tasks/${taskId}`);
}

/** 计算背景移除价格 */
export async function calculateBgRemovalPrice(): Promise<BgRemovalPriceResponse> {
  const res = await http.post<BgRemovalPriceResponse>("/api/v1/image-layer/background/calculate-price");
  return res.data;
}

// ==================== 画质增强 ====================

/** 创建画质增强任务 */
export async function createUpscaleTask(params: CreateUpscaleParams): Promise<CreateUpscaleResponse> {
  const res = await http.post<CreateUpscaleResponse>("/api/v1/image-layer/upscale/tasks", params);
  return res.data ?? (res as unknown as CreateUpscaleResponse);
}

/** 查询画质增强任务状态 */
export async function getUpscaleTask(taskId: string): Promise<UpscaleTaskDetail> {
  const res = await http.get<UpscaleTaskDetail>(`/api/v1/image-layer/upscale/tasks/${taskId}`);
  return res.data;
}

/** 获取画质增强任务列表 */
export async function listUpscaleTasks(params?: ListUpscaleTasksParams) {
  const res = await http.get<UpscaleTaskDetail[]>(
    "/api/v1/image-layer/upscale/tasks",
    params as Record<string, unknown>
  );
  return res.data;
}

/** 删除画质增强任务 */
export async function deleteUpscaleTask(taskId: string): Promise<ApiResponse<unknown>> {
  return http.del(`/api/v1/image-layer/upscale/tasks/${taskId}`);
}

/** 计算画质增强价格 */
export async function calculateUpscalePrice(params: UpscalePriceParams): Promise<UpscalePriceResponse> {
  const res = await http.post<UpscalePriceResponse>("/api/v1/image-layer/upscale/calculate-price", params);
  return res.data;
}

const imageLayerApi = {
  // 分层
  uploadLayerImage,
  createLayerTask,
  getLayerTask,
  listLayerTasks,
  deleteLayerTask,
  // 背景移除
  createBgRemovalTask,
  getBgRemovalTask,
  listBgRemovalTasks,
  deleteBgRemovalTask,
  calculateBgRemovalPrice,
  // 画质增强
  createUpscaleTask,
  getUpscaleTask,
  listUpscaleTasks,
  deleteUpscaleTask,
  calculateUpscalePrice,
};
export default imageLayerApi;
