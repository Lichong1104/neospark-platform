/** Skill 元数据 */
export interface SkillMeta {
  skill_id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  skill_type: "system" | "user";
  is_active: boolean;
  /** 上传者用户 ID（系统内置 Skill 为 null），用于「自己上传」判断 */
  owner_id?: number | null;
  /** 预览图（第一张为卡片封面） */
  preview?: string | null;
  /** 全部预览图，按顺序 */
  previews?: string[];
  /** 每次调用的固定扣费积分；0 表示按 token 用量实扣（见 docs/PRICING.md 第七节） */
  price_points?: number;
  icon?: string;
  /** 执行模式：inline（进程内代码块）/ subprocess（子进程脚本） */
  execution_mode?: string;
  pricing_mode?: "inherit" | "fixed" | "free";
  billing_enabled?: boolean;
  free_quota?: number;
  free_quota_period?: "month" | "lifetime";
  estimated_token_credits?: number;
  estimated_asset_credits?: number;
  /** 仅管理员可见 */
  creator_share_rate?: number | null;
  max_skill_fee_credits?: number | null;
  pricing_version?: number;
  price_review_status?: string | null;
}

/** Skill 详情 */
export interface SkillDetail extends SkillMeta {
  instructions: string;
  frontmatter: Record<string, unknown>;
  scripts?: string[];
  references?: string[];
}

/** 创建 Agent 会话请求 */
export interface CreateAgentSessionRequest {
  title?: string;
  loaded_skills: string[];
  model?: string;
}

/** 创建 Agent 会话响应 */
export interface CreateAgentSessionResponse {
  session_id: string;
  title: string;
  created_at: string;
}

/** 会话列表项 */
export interface AgentSessionItem {
  session_id: string;
  title: string;
  status: string;
  total_messages: number;
  total_credit_spent: number;
  created_at: string;
  updated_at: string;
}

/** Agent 消息 */
export interface AgentMessage {
  message_id: string;
  role: "user" | "assistant" | "skill_call" | "skill_result" | "system";
  sequence: number;
  content: string;
  skill_name?: string;
  script_name?: string;
  script_args?: Record<string, unknown>;
  script_output?: string;
  script_error?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  credit_cost?: number;
  created_at: string;
}

/** SSE 流事件 */
export interface StreamEvent {
  event: "start" | "output" | "tool_call" | "tool_result" | "error" | "end";
  data: {
    run_id?: string;
    command?: string;
    skills?: string[];
    content?: string;
    tool?: string;
    arguments?: Record<string, unknown>;
    message?: string;
    status?: string;
    credit_cost?: number;
  };
}

/** Skill 提交状态 */
export type SkillSubmissionStatus = "pending" | "approved" | "rejected";

/** 单条用户评分/评论（rating 与 comment 至少有一项） */
export interface SkillReview {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
  /** 当前登录用户是否是作者（匿名访问恒为 false） */
  is_mine: boolean;
}

/** GET /agents/skills/{skillId}/reviews 聚合响应 */
export interface SkillReviewsSummary {
  skill_id: string;
  /** 全部评分的平均值（无评分时为 null） */
  rating_avg: number | null;
  rating_count: number;
  comment_count: number;
  /** 当前登录用户自己的记录（匿名访问为 null） */
  my_review: SkillReview | null;
  comments: SkillReview[];
  offset: number;
  limit: number;
}
/** 我的 Skill 提交记录 */
export interface SkillSubmissionItem {
  id: number;
  skill_id: string;
  name: string;
  description: string;
  version: string;
  execution_mode: string;
  status: SkillSubmissionStatus;
  reject_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}
