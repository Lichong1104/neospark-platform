import http from "./request";
import { getToken } from "./token";
import { BASE_URL } from "./request";
import type {
  CreateVideoParams,
  CreateVideoResponse,
  VideoTaskDetail,
  ListVideoTasksParams,
  VideoTaskListData,
  VideoWsMessage,
} from "@/types/video";
import type { ApiResponse } from "@/types/common";

/**
 * 创建视频生成任务
 */
export async function createVideoTask(params: CreateVideoParams): Promise<CreateVideoResponse> {
  const res = await http.post<CreateVideoResponse>("/api/v1/video/generations", params);
  return res.data ?? (res as unknown as CreateVideoResponse);
}

/**
 * 获取视频任务详情
 */
export async function getVideoTask(taskId: string): Promise<VideoTaskDetail> {
  const res = await http.get<VideoTaskDetail>(`/api/v1/video/generations/${taskId}`);
  return res.data;
}

/**
 * 获取视频任务列表
 */
export async function listVideoTasks(params?: ListVideoTasksParams): Promise<VideoTaskListData> {
  const res = await http.get<VideoTaskListData>(
    "/api/v1/video/generations",
    params as Record<string, unknown>
  );
  return res.data;
}

/**
 * 取消/删除视频任务
 */
export async function deleteVideoTask(taskId: string): Promise<ApiResponse<unknown>> {
  return http.del(`/api/v1/video/generations/${taskId}`);
}

/**
 * 创建视频任务的 WebSocket 连接
 * @param taskId 任务 ID
 * @param onMessage 消息回调
 * @returns WebSocket 实例
 */
export function connectVideoWs(
  taskId: string,
  onMessage: (data: VideoWsMessage) => void
): WebSocket {
  const token = getToken();
  const wsBase = BASE_URL.replace(/^http/, "ws");
  const url = `${wsBase}/api/v1/video/ws?task_id=${taskId}${token ? `&token=${token}` : ""}`;

  const ws = new WebSocket(url);

  ws.onmessage = (event) => {
    try {
      const data: VideoWsMessage = JSON.parse(event.data);
      onMessage(data);
    } catch {
      // ignore parse errors
    }
  };

  // 心跳保持连接
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send("ping");
    }
  }, 30000);

  ws.onclose = () => clearInterval(heartbeat);

  return ws;
}

const videoApi = {
  createVideoTask,
  getVideoTask,
  listVideoTasks,
  deleteVideoTask,
  connectVideoWs,
};
export default videoApi;
