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
  MessageStatusResponse,
  UpdateSessionTitleParams,
  DeleteSessionParams,
  BillingHistoryParams,
  BillingHistoryData,
} from "@/types/drawing";
import type { ApiResponse } from "@/types/common";

/**
 * 获取绘画模型配置
 */
export async function getModelsConfig(): Promise<ModelsConfigMap> {
  const res = await http.get<ModelsConfigMap>("/api/v1/drawing/models/config");
  return res.data;
}

/**
 * 创建绘画会话
 */
export async function createSession(params?: CreateSessionParams): Promise<CreateSessionResponse> {
  const res = await http.post<CreateSessionResponse>("/api/v1/drawing/sessions", params);
  return res.data ?? (res as unknown as CreateSessionResponse);
}

/**
 * 获取会话列表
 */
export async function listSessions(params?: ListSessionsParams): Promise<SessionItem[]> {
  const res = await http.get<SessionItem[]>("/api/v1/drawing/sessions", params as Record<string, unknown>);
  return res.data;
}

/**
 * 获取会话详情
 */
export async function getSessionDetail(sessionId: string): Promise<SessionDetail> {
  const res = await http.get<SessionDetail>(`/api/v1/drawing/sessions/${sessionId}`);
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
    `/api/v1/drawing/sessions/${sessionId}/generate`,
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
    `/api/v1/drawing/sessions/${sessionId}/generate-batch`,
    params
  );
  return res.data ?? (res as unknown as GenerateBatchData);
}

/**
 * 查询消息生成状态
 */
export async function getMessageStatus(messageId: string): Promise<MessageStatusResponse> {
  const res = await http.get<MessageStatusResponse>(`/api/v1/drawing/messages/${messageId}`);
  return res.data;
}

/**
 * 修改会话标题
 */
export async function updateSessionTitle(
  sessionId: string,
  params: UpdateSessionTitleParams
): Promise<ApiResponse<unknown>> {
  return http.put(`/api/v1/drawing/sessions/${sessionId}/title`, params);
}

/**
 * 删除会话
 */
export async function deleteSession(
  sessionId: string,
  params?: DeleteSessionParams
): Promise<ApiResponse<unknown>> {
  return http.del(`/api/v1/drawing/sessions/${sessionId}`, params as Record<string, unknown>);
}

/**
 * 获取扣费历史
 */
export async function getBillingHistory(params?: BillingHistoryParams): Promise<BillingHistoryData> {
  const res = await http.get<BillingHistoryData>(
    "/api/v1/drawing/billing/history",
    params as Record<string, unknown>
  );
  return res.data;
}

const drawingApi = {
  getModelsConfig,
  createSession,
  listSessions,
  getSessionDetail,
  generateImage,
  generateBatch,
  getMessageStatus,
  updateSessionTitle,
  deleteSession,
  getBillingHistory,
};
export default drawingApi;
