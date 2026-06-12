import http from "./request";
import type {
  CreateVideoParams,
  CreateVideoResponse,
  VideoTaskDetail,
  ListVideoTasksParams,
  VideoTaskListData,
  VideoModelsData,
  UploadVideoAssetData,
  CreateVideoWatermarkRemovalParams,
  CreateVideoWatermarkRemovalResponse,
  VideoWatermarkRemovalTaskDetail,
  ListVideoWatermarkRemovalTasksParams,
  VideoWatermarkRemovalTaskListData,
} from "@/types/video";
import type { ApiResponse } from "@/types/common";

/**
 * 获取视频模型配置
 */
export async function getVideoModels(): Promise<VideoModelsData> {
  const res = await http.get<VideoModelsData>("/video/models");
  return res.data;
}

/**
 * 创建视频生成任务（文生视频 / 图生视频 / 多模态）
 */
export async function createVideoTask(params: CreateVideoParams): Promise<CreateVideoResponse> {
  const res = await http.post<CreateVideoResponse>("/video/generations", params);
  return res.data;
}

/**
 * 获取视频任务详情
 */
export async function getVideoTask(taskId: string): Promise<VideoTaskDetail> {
  const res = await http.get<VideoTaskDetail>(`/video/generations/${taskId}`);
  return res.data;
}

/**
 * 获取视频任务列表
 */
export async function listVideoTasks(params?: ListVideoTasksParams): Promise<VideoTaskListData> {
  const res = await http.get<VideoTaskListData>(
    "/video/generations",
    params as Record<string, unknown>
  );
  return res.data;
}

/**
 * 取消/删除视频任务
 */
export async function deleteVideoTask(taskId: string): Promise<ApiResponse<unknown>> {
  return http.del(`/video/generations/${taskId}`);
}

/**
 * 上传视频资产
 */
export async function uploadVideoAsset(
  file: File,
  assetType: string = "image",
  name?: string
): Promise<UploadVideoAssetData> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("asset_type", assetType);
  if (name) formData.append("name", name);

  const res = await http.postForm<UploadVideoAssetData>("/video/assets", formData);
  return res.data;
}

/**
 * 创建视频水印移除任务
 */
export async function createVideoWatermarkRemovalTask(
  params: CreateVideoWatermarkRemovalParams
): Promise<CreateVideoWatermarkRemovalResponse> {
  const res = await http.post<CreateVideoWatermarkRemovalResponse>("/video/remove-watermark", params);
  return res.data;
}

/**
 * 获取视频水印移除任务详情
 */
export async function getVideoWatermarkRemovalTask(taskId: string): Promise<VideoWatermarkRemovalTaskDetail> {
  const res = await http.get<VideoWatermarkRemovalTaskDetail>(`/video/remove-watermark/${taskId}`);
  return res.data;
}

/**
 * 获取视频水印移除任务列表
 */
export async function listVideoWatermarkRemovalTasks(
  params?: ListVideoWatermarkRemovalTasksParams
): Promise<VideoWatermarkRemovalTaskListData> {
  const res = await http.get<VideoWatermarkRemovalTaskListData>(
    "/video/remove-watermark",
    params as Record<string, unknown>
  );
  return res.data;
}

const videoApi = {
  getVideoModels,
  createVideoTask,
  getVideoTask,
  listVideoTasks,
  deleteVideoTask,
  uploadVideoAsset,
  createVideoWatermarkRemovalTask,
  getVideoWatermarkRemovalTask,
  listVideoWatermarkRemovalTasks,
};
export default videoApi;
