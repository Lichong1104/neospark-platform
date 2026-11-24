import http from "./request";
import type {
  SkillMeta,
  SkillDetail,
  CreateAgentSessionRequest,
  CreateAgentSessionResponse,
  AgentSessionItem,
  AgentMessage,
  SkillSubmissionItem,
  SkillReviewsSummary,
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
  is_active?: boolean;
  price_points?: number;
  pricing_mode?: string;
  billing_enabled?: boolean;
  free_quota?: number;
  free_quota_period?: string | null;
  estimated_token_credits?: number;
  estimated_asset_credits?: number;
  execution_mode?: string;
  preview?: string | null;
  previews?: string[] | null;
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
    is_active: skill.is_active ?? true,
    owner_id: skill.owner_id ?? null,
    price_points: skill.price_points ?? 0,
    pricing_mode: (skill.pricing_mode as SkillMeta["pricing_mode"]) ?? "inherit",
    billing_enabled: skill.billing_enabled ?? true,
    free_quota: skill.free_quota ?? 0,
    free_quota_period:
      (skill.free_quota_period as SkillMeta["free_quota_period"]) ?? null,
    estimated_token_credits: skill.estimated_token_credits ?? 0,
    estimated_asset_credits: skill.estimated_asset_credits ?? 0,
    execution_mode: skill.execution_mode,
    preview: skill.preview ?? skill.previews?.[0] ?? null,
    previews: skill.previews ?? (skill.preview ? [skill.preview] : []),
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
 * 更新 Skill 名称 / 简介（管理员或所有者）
 */
export async function updateSkill(
  skillId: string,
  body: { name?: string; description?: string }
): Promise<ApiResponse<unknown>> {
  return http.patch(`/agents/skills/${skillId}`, body);
}

/**
 * 停用 / 启用 Skill（管理员或所有者）
 */
export async function toggleSkillStatus(
  skillId: string,
  isActive: boolean
): Promise<ApiResponse<unknown>> {
  return http.patch(`/agents/skills/${skillId}/status`, { is_active: isActive });
}

/**
 * 删除 Skill（管理员或所有者）
 */
export async function deleteSkill(skillId: string): Promise<ApiResponse<unknown>> {
  return http.del(`/agents/skills/${skillId}`);
}

/**
 * 替换 Skill 的预览图（可多张，第一张为封面）。管理员或所有者可操作。
 */
export async function updateSkillImages(
  skillId: string,
  files: File[]
): Promise<{ preview_image: string; preview_images: string[] }> {
  const formData = new FormData();
  for (const file of files) formData.append("preview_image", file, file.name);
  const res = (await http.patch(`/agents/skills/${encodeURIComponent(skillId)}/images`, formData)) as unknown as {
    preview_image: string;
    preview_images: string[];
  };
  return res;
}

/** 管理员直接设价响应 */
export interface SkillPricingUpdateResult {
  skill_id: string;
  price_credits: number;
  pricing_mode: string;
  creator_share_rate: number | null;
  max_skill_fee_credits: number | null;
  pricing_version: number;
  price_review_status: string | null;
}

/**
 * 管理员直接设定技能价格 / 分成率 / 封顶（PUT /admin/skills/{id}/pricing）
 * 未传字段保持原值；分成率仅管理员可见可改。创作者改价走 POST /creator/skills/{id}/price-change
 */
export async function updateSkillPricing(
  skillId: string,
  payload: {
    price_credits?: number;
    pricing_mode?: string;
    creator_share_rate?: number;
    max_skill_fee_credits?: number;
    reason?: string;
  }
): Promise<SkillPricingUpdateResult> {
  const res = (await http.put<SkillPricingUpdateResult>(
    `/admin/skills/${encodeURIComponent(skillId)}/pricing`,
    payload
  )) as unknown as SkillPricingUpdateResult;
  return res;
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

/**
 * 下载 Skill 的 MCP 使用包（zip blob，需自行触发下载）
 *
 * 包里自带当前用户对该 Skill 的调用密钥与客户端配置，解压后可直接在
 * Claude Code / Codex 里接入，且只暴露这一个技能。
 *
 * 注意：每次下载都会轮换密钥，之前下载的包会随之失效。
 */
export async function downloadMcpBundle(skillId: string): Promise<Blob> {
  const { default: axios } = await import("axios");
  const { BASE_URL } = await import("./request");
  const { getToken } = await import("./token");
  const token = getToken();
  const response = await axios.get(
    `${BASE_URL}/agents/skills/${encodeURIComponent(skillId)}/mcp-bundle`,
    {
      responseType: "blob",
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  return response.data;
}

/**
 * 获取 Skill 的用户评分聚合 + 评论列表（公开可读；登录后带 my_review）
 */
export async function getSkillReviews(
  skillId: string,
  offset = 0,
  limit = 50
): Promise<SkillReviewsSummary> {
  const res = await http.get<SkillReviewsSummary>(
    `/agents/skills/${encodeURIComponent(skillId)}/reviews`,
    { offset, limit }
  );
  return res.data ?? (res as unknown as SkillReviewsSummary);
}

/**
 * 提交/更新自己对该 Skill 的评分与评论（upsert，未传字段保留旧值）
 */
export async function putSkillReview(
  skillId: string,
  payload: { rating?: number | null; comment?: string | null }
): Promise<ApiResponse<unknown>> {
  return http.put(`/agents/skills/${encodeURIComponent(skillId)}/reviews`, payload);
}

/**
 * 删除一条评分/评论（本人或管理员）
 */
export async function deleteSkillReview(
  skillId: string,
  reviewId: number
): Promise<ApiResponse<unknown>> {
  return http.del(
    `/agents/skills/${encodeURIComponent(skillId)}/reviews/${reviewId}`
  );
}

const skillsApi = {
  listSkills,
  getSkill,
  getSkillReviews,
  putSkillReview,
  deleteSkillReview,
  uploadSkill,
  listMySubmissions,
  updateSkill,
  updateSkillImages,
  updateSkillPricing,
  toggleSkillStatus,
  deleteSkill,
  downloadMcpBundle,
  createSession,
  listSessions,
  getSessionMessages,
  executeStream,
};

export default skillsApi;
