import http, { BASE_URL } from "./request";
import { getToken } from "./token";
import type {
  AgentSkill,
  AgentSkillFunction,
  AgentChatRequest,
  AgentMultiChatRequest,
  AgentChatResponse,
} from "@/types/agents";
import type { ApiResponse } from "@/types/common";

/**
 * 解包响应：兼容后端直接返回数据 / 包装为 { code, data } 两种格式。
 * request.ts 的响应拦截器已返回 response.data，因此当后端直接返回数据时 res 即为目标值。
 */
function unwrap<T>(res: ApiResponse<T> | T): T {
  if (
    res !== null &&
    typeof res === "object" &&
    !Array.isArray(res) &&
    "code" in res &&
    "data" in res
  ) {
    return (res as ApiResponse<T>).data;
  }
  return res as T;
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<{
  status: string;
  skills_loaded: number;
  skills_with_code: number;
  skill_ids: string[];
  providers: string[];
}> {
  const res = await http.get<{
    status: string;
    skills_loaded: number;
    skills_with_code: number;
    skill_ids: string[];
    providers: string[];
  }>("/agents/health");
  return unwrap(res);
}

/**
 * 列出所有 Skill
 */
export async function listSkills(): Promise<AgentSkill[]> {
  const res = await http.get<AgentSkill[]>("/agents/skills");
  return unwrap(res);
}

/**
 * 获取单个 Skill 详情
 */
export async function getSkill(skillId: string): Promise<AgentSkill> {
  const res = await http.get<AgentSkill>(`/agents/skills/${skillId}`);
  return unwrap(res);
}

/**
 * 获取 Skill 代码函数签名
 */
export async function getSkillFunctions(
  skillId: string
): Promise<{ skill_id: string; has_code: boolean; functions: AgentSkillFunction[] }> {
  const res = await http.get<{
    skill_id: string;
    has_code: boolean;
    functions: AgentSkillFunction[];
  }>(`/agents/skills/${skillId}/functions`);
  return unwrap(res);
}

/**
 * 单 Skill 对话（非流式）
 */
export async function chatSingle(
  payload: AgentChatRequest
): Promise<AgentChatResponse> {
  const res = await http.post<AgentChatResponse>("/agents/chat", payload);
  return unwrap(res);
}

/**
 * 多 Skill 对话（非流式）
 */
export async function chatMulti(
  payload: AgentMultiChatRequest
): Promise<AgentChatResponse> {
  const res = await http.post<AgentChatResponse>("/agents/chat/multi", payload);
  return unwrap(res);
}

async function parseSSEStream(
  response: Response,
  onEvent: (event: string, data: Record<string, unknown>) => void,
  signal?: AbortSignal
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent: string | null = null;

    for (const line of lines) {
      if (line.startsWith("event:")) {
        currentEvent = line.replace("event:", "").trim();
      } else if (line.startsWith("data:")) {
        const raw = line.replace("data:", "").trim();
        if (raw === "[DONE]") continue;

        const eventName =
          currentEvent || (raw.includes('"error"') ? "error" : "output");
        try {
          const data = JSON.parse(raw);
          onEvent(eventName, data);
        } catch {
          onEvent(eventName, { raw });
        }
      } else if (line.trim() === "") {
        currentEvent = null;
      }
    }
  }
}

function extractSessionIdFromHeaders(response: Response): string | null {
  return (
    response.headers.get("x-session-id") ||
    response.headers.get("session-id") ||
    response.headers.get("x-conversation-id") ||
    null
  );
}

/** 发出 session_id 事件，供 UI 捕获并持久化 */
function emitSessionIdFromHeaders(
  response: Response,
  onEvent: (event: string, data: Record<string, unknown>) => void
): void {
  const sessionId = extractSessionIdFromHeaders(response);
  if (sessionId) {
    onEvent("session_id", { session_id: sessionId });
  }
}

/**
 * 单 Skill 流式对话（SSE）
 */
export async function chatStream(
  payload: AgentChatRequest,
  onEvent: (event: string, data: Record<string, unknown>) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = getToken();
  const response = await fetch(`${BASE_URL}/agents/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
    signal,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  emitSessionIdFromHeaders(response, onEvent);
  await parseSSEStream(response, onEvent, signal);
}

/**
 * 多 Skill 流式对话（SSE）
 */
export async function chatMultiStream(
  payload: AgentMultiChatRequest,
  onEvent: (event: string, data: Record<string, unknown>) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = getToken();
  const response = await fetch(`${BASE_URL}/agents/chat/multi/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
    signal,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  emitSessionIdFromHeaders(response, onEvent);
  await parseSSEStream(response, onEvent, signal);
}

/**
 * 上传 Skill（管理员）
 */
export async function uploadSkill(
  file: File
): Promise<{ success: boolean; skill_id: string; message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await http.postForm<{
    success: boolean;
    skill_id: string;
    message: string;
  }>("/agents/admin/skills/upload", formData);
  return unwrap(res);
}

/**
 * 删除 Skill（管理员）
 */
export async function deleteSkill(
  skillId: string
): Promise<ApiResponse<unknown>> {
  return http.del(`/agents/admin/skills/${skillId}`);
}

const agentsApi = {
  healthCheck,
  listSkills,
  getSkill,
  getSkillFunctions,
  chatSingle,
  chatMulti,
  chatStream,
  chatMultiStream,
  uploadSkill,
  deleteSkill,
};

export default agentsApi;
