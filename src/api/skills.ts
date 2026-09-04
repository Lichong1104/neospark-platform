import http from "./request";
import type {
  SkillMeta,
  SkillDetail,
  CreateAgentSessionRequest,
  CreateAgentSessionResponse,
  AgentSessionItem,
  AgentMessage,
  SkillSubmissionItem,
} from "@/types/skills";
import type { ApiResponse } from "@/types/common";

/** 后端 /agents/skills 返回的 Skill 原始结构（字段多于前端展示所需，按需取用） */
interface BackendSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  metadata?: Record<string, unknown> | null;
  is_public?: boolean;
  owner_id?: number | null;
  price_points?: number;
  execution_mode?: string;
  scripts?: Record<string, string>;
  instructions?: string;
  has_code?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** 后端 Skill → 市场卡片元数据 */
function toSkillMeta(skill: BackendSkill): SkillMeta {
  const meta = skill.metadata ?? {};
  const author =
    typeof meta.author === "string"
      ? meta.author
      : skill.owner_id
        ? "Community"
        : "NeoSpark";
  const tags = Array.isArray(meta.tags)
    ? meta.tags.filter((t): t is string => typeof t === "string")
    : [];
  return {
    skill_id: skill.id,
    name: skill.name,
    description: skill.description ?? "",
    version: skill.version ?? "0.0.0",
    author,
    tags,
    skill_type: skill.owner_id ? "user" : "system",
    is_active: true,
    credit_cost_per_call: skill.price_points ?? 0,
    execution_mode: skill.execution_mode,
  };
}

/**
 * 获取 Skill 列表（市场）
 * 注意：/agents/skills 返回裸数组（非 {code,data} 包装），http 拦截器已解包 response.data
 */
export async function listSkills(params?: {
  type?: string;
  tag?: string;
}): Promise<SkillMeta[]> {
  const res = (await http.get<BackendSkill[]>("/agents/skills", params as Record<string, unknown>)) as unknown as BackendSkill[];
  return (res ?? []).map(toSkillMeta);
}

/**
 * 获取 Skill 详情（市场详情页；instructions 仅管理员可见，普通用户为空）
 */
export async function getSkill(skillId: string): Promise<SkillDetail> {
  const skill = (await http.get<BackendSkill>(`/agents/skills/${skillId}`)) as unknown as BackendSkill;
  return {
    ...toSkillMeta(skill),
    instructions: skill.instructions ?? "",
    frontmatter: skill.metadata ?? {},
    scripts:
      skill.execution_mode === "subprocess" && skill.scripts
        ? Object.keys(skill.scripts)
        : [],
    references: [],
  };
}

/**
 * 提交 Skill 审核（.md 或 .zip 包），管理员通过后上架
 */
export async function uploadSkill(formData: FormData): Promise<{ skill_id: string; name: string; status: string }> {
  const res = (await http.postForm<{ skill_id: string; name: string; status: string }>("/skills/upload", formData)) as unknown as { skill_id: string; name: string; status: string };
  return res;
}

/**
 * 我的 Skill 提交记录
 */
export async function listMySubmissions(): Promise<SkillSubmissionItem[]> {
  const res = (await http.get<{ items: SkillSubmissionItem[] }>("/skills/submissions/mine")) as unknown as { items: SkillSubmissionItem[] };
  return res.items ?? [];
}

/**
 * 删除 Skill（管理员）
 */
export async function deleteSkill(skillId: string): Promise<ApiResponse<unknown>> {
  return http.del(`/agents/admin/skills/${skillId}`);
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
 * 获取会话列表（后端返回 {sessions, total}）
 */
export async function listSessions(): Promise<AgentSessionItem[]> {
  const res = (await http.get<{ sessions: AgentSessionItem[] }>("/skills/sessions")) as unknown as { sessions: AgentSessionItem[] };
  return res.sessions ?? [];
}

/**
 * 获取会话消息（后端返回 {messages, total}）
 */
export async function getSessionMessages(sessionId: string): Promise<AgentMessage[]> {
  const res = (await http.get<{ messages: AgentMessage[] }>(`/skills/sessions/${sessionId}/messages`)) as unknown as { messages: AgentMessage[] };
  return res.messages ?? [];
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
  listMySubmissions,
  deleteSkill,
  createSession,
  listSessions,
  getSessionMessages,
  executeStream,
};

export default skillsApi;
