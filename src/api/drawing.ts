import http from "./request";
import type {
  ModelsConfigMap,
  CreateSessionParams,
  CreateSessionResponse,
  ListSessionsParams,
  SessionItem,
  SessionDetail,
  GenerateImageParams,
  GenerateImageResponse,
  GenerateBatchParams,
  GenerateBatchData,
  GenerateMultiRefParams,
  GenerateMultiRefData,
  MessageStatusResponse,
  UpdateSessionTitleParams,
  DeleteSessionParams,
  BillingHistoryParams,
  BillingHistoryData,
  GenerateVideoFromMessageParams,
  GenerateVideoFromMessageResponse,
} from "@/types/drawing";
import type { ApiResponse } from "@/types/common";

/**
 * 获取绘画模型配置
 */
export async function getModelsConfig(): Promise<ModelsConfigMap> {
  const res = await http.get<ModelsConfigMap>("/drawing/models/config");
  return res.data;
}

/**
 * 创建绘画会话
 */
export async function createSession(params?: CreateSessionParams): Promise<CreateSessionResponse> {
  const res = await http.post<CreateSessionResponse>("/drawing/sessions", params);
  return res.data ?? (res as unknown as CreateSessionResponse);
}

/**
 * 获取会话列表
 */
export async function listSessions(params?: ListSessionsParams): Promise<SessionItem[]> {
  const res = await http.get<SessionItem[]>("/drawing/sessions", params as Record<string, unknown>);
  return res.data;
}

/**
 * 获取会话详情
 */
export async function getSessionDetail(sessionId: string): Promise<SessionDetail> {
  const res = await http.get<SessionDetail>(`/drawing/sessions/${sessionId}`);
  return res.data;
}

/**
 * 在会话中生成图片
 */
export async function generateImage(
  sessionId: string,
  params: GenerateImageParams
): Promise<GenerateImageResponse> {
  const res = await http.post<GenerateImageResponse>(
    `/drawing/sessions/${sessionId}/generate`,
    params
  );
  return res.data ?? (res as unknown as GenerateImageResponse);
}

/**
 * 电商详情页九宫格第二阶段：批量生成 10 张图
 */
export async function generateBatch(
  sessionId: string,
  params: GenerateBatchParams
): Promise<GenerateBatchData> {
  const res = await http.post<GenerateBatchData>(
    `/drawing/sessions/${sessionId}/generate-batch`,
    params
  );
  return res.data ?? (res as unknown as GenerateBatchData);
}

/**
 * 多参考图批量生成（并行）
 */
export async function generateMultiRef(
  sessionId: string,
  params: GenerateMultiRefParams
): Promise<GenerateMultiRefData> {
  const res = await http.post<GenerateMultiRefData>(
    `/drawing/sessions/${sessionId}/generate-multi-ref`,
    params
  );
  return res.data ?? (res as unknown as GenerateMultiRefData);
}

/**
 * 查询消息生成状态
 */
export async function getMessageStatus(messageId: string): Promise<MessageStatusResponse> {
  const res = await http.get<MessageStatusResponse>(`/drawing/messages/${messageId}`);
  return res.data;
}

/**
 * 基于已完成的绘画消息生成视频
 */
export async function generateVideoFromMessage(
  messageId: string,
  params: GenerateVideoFromMessageParams
): Promise<GenerateVideoFromMessageResponse> {
  const res = await http.post<GenerateVideoFromMessageResponse>(
    `/drawing/messages/${messageId}/generate-video`,
    params
  );
  return res.data ?? (res as unknown as GenerateVideoFromMessageResponse);
}

/**
 * 修改会话标题
 */
export async function updateSessionTitle(
  sessionId: string,
  params: UpdateSessionTitleParams
): Promise<ApiResponse<unknown>> {
  return http.put(`/drawing/sessions/${sessionId}/title`, params);
}

/**
 * 删除会话
 */
export async function deleteSession(
  sessionId: string,
  params?: DeleteSessionParams
): Promise<ApiResponse<unknown>> {
  return http.del(`/drawing/sessions/${sessionId}`, params as Record<string, unknown>);
}

/**
 * 获取扣费历史
 */
export async function getBillingHistory(params?: BillingHistoryParams): Promise<BillingHistoryData> {
  const res = await http.get<BillingHistoryData>(
    "/drawing/billing/history",
    params as Record<string, unknown>
  );
  return res.data;
}

/**
 * 批量打包图片为 ZIP 下载（返回 blob，需自行触发下载）
 */
export async function downloadZip(
  urls: string[],
  filename?: string
): Promise<Blob> {
  const { default: axios } = await import("axios");
  const { BASE_URL } = await import("./request");
  const { getToken } = await import("./token");
  const token = getToken();
  const response = await axios.post(
    `${BASE_URL}/drawing/download-zip`,
    { urls, filename },
    {
      responseType: "blob",
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  return response.data;
}

const drawingApi = {
  getModelsConfig,
  createSession,
  listSessions,
  getSessionDetail,
  generateImage,
  generateBatch,
  generateMultiRef,
  getMessageStatus,
  generateVideoFromMessage,
  updateSessionTitle,
  deleteSession,
  getBillingHistory,
};
export default drawingApi;
