import http from "./request";
import type {
  CreateVideoParams,
  CreateVideoResponse,
  VideoTaskDetail,
  ListVideoTasksParams,
  VideoTaskListData,
  VideoModelsData,
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

const videoApi = {
  getVideoModels,
  createVideoTask,
  getVideoTask,
  listVideoTasks,
  deleteVideoTask,
};
export default videoApi;
