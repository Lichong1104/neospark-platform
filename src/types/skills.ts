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
  credit_cost_per_call: number;
  icon?: string;
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
