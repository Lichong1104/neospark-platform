import http from "./request";
import type {
  SkillMeta,
  SkillDetail,
  CreateAgentSessionRequest,
  CreateAgentSessionResponse,
  AgentSessionItem,
  AgentMessage,
} from "@/types/skills";
import type { ApiResponse } from "@/types/common";

/**
 * 获取 Skill 列表
 */
export async function listSkills(params?: {
  type?: string;
  tag?: string;
}): Promise<SkillMeta[]> {
  const res = await http.get<SkillMeta[]>("/skills", params as Record<string, unknown>);
  return res.data;
}

/**
 * 获取 Skill 详情
 */
export async function getSkill(skillId: string): Promise<SkillDetail> {
  const res = await http.get<SkillDetail>(`/skills/${skillId}`);
  return res.data;
}

/**
 * 上传自定义 Skill（ZIP 包）
 */
export async function uploadSkill(formData: FormData): Promise<{ skill_id: string; name: string; status: string }> {
  const res = await http.postForm<{ skill_id: string; name: string; status: string }>("/skills/upload", formData);
  return res.data;
}

/**
 * 删除 Skill
 */
export async function deleteSkill(skillId: string): Promise<ApiResponse<unknown>> {
  return http.del(`/skills/${skillId}`);
}

/**
 * 创建 Agent 会话
 */
export async function createSession(
  params: CreateAgentSessionRequest
): Promise<CreateAgentSessionResponse> {
  const res = await http.post<CreateAgentSessionResponse>("/skills/sessions", params);
  return res.data ?? (res as unknown as CreateAgentSessionResponse);
}

/**
 * 获取会话列表
 */
export async function listSessions(): Promise<AgentSessionItem[]> {
  const res = await http.get<AgentSessionItem[]>("/skills/sessions");
  return res.data;
}

/**
 * 获取会话消息
 */
export async function getSessionMessages(sessionId: string): Promise<AgentMessage[]> {
  const res = await http.get<AgentMessage[]>(`/skills/sessions/${sessionId}/messages`);
  return res.data;
}

/**
 * 流式执行（SSE）— 不走 http 封装，直接 fetch
 */
export async function executeStream(
  params: {
    session_id: string;
    skill_ids: string[];
    command: string;
  },
  onEvent: (event: string, data: unknown) => void,
  signal?: AbortSignal
): Promise<void> {
  const { STATIC_BASE_URL } = await import("./request");
  const token = localStorage.getItem("access_token");

  const response = await fetch(`${STATIC_BASE_URL}/api/v1/skills/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

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
      } else if (line.startsWith("data:") && currentEvent) {
        try {
          const data = JSON.parse(line.replace("data:", "").trim());
          onEvent(currentEvent, data);
        } catch {
          onEvent(currentEvent, { raw: line.replace("data:", "").trim() });
        }
      } else if (line.trim() === "") {
        currentEvent = null;
      }
    }
  }
}

const skillsApi = {
  listSkills,
  getSkill,
  uploadSkill,
  deleteSkill,
  createSession,
  listSessions,
  getSessionMessages,
  executeStream,
};

export default skillsApi;
