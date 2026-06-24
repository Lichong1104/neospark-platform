/** Agent Skill 元数据（来自 /agents/skills） */
export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  model: string;
  tools: string[];
  dependencies: string[];
  has_code: boolean;
  code_functions: string[];
  created_at: string;
  updated_at: string;
}

/** Agent Skill 函数签名 */
export interface AgentSkillFunction {
  name: string;
  signature?: string;
  docstring?: string;
  parameters?: Array<{
    name: string;
    kind: string;
    required: boolean;
    annotation?: string;
    default?: string;
  }>;
  return_type?: string;
}

/** 单 Skill 对话请求 */
export interface AgentChatRequest {
  skill_id: string;
  message: string;
  model_override?: string | null;
  stream?: boolean;
  session_id?: string | null;
}

/** 多 Skill 对话请求 */
export interface AgentMultiChatRequest {
  skill_ids: string[];
  message: string;
  model_override?: string | null;
  stream?: boolean;
  session_id?: string | null;
}

/** 非流式对话响应 */
export interface AgentChatResponse {
  content: string;
  skill_id: string;
  model: string;
  session_id: string;
}

/** 前端消息模型 */
export interface AgentChatMessage {
  id: string;
  role: "user" | "assistant" | "skill_call" | "skill_result" | "system";
  content: string;
  skill_name?: string;
  skill_id?: string;
  script_args?: Record<string, unknown>;
  script_output?: string;
  credit_cost?: number;
  timestamp: string;
  images?: { url: string; local_path: string }[];
}

/** SSE 流事件 */
export interface AgentStreamEvent {
  event: "start" | "output" | "tool_call" | "tool_result" | "error" | "end";
  data: {
    content?: string;
    session_id?: string;
    skill_id?: string;
    skill_name?: string;
    tool?: string;
    arguments?: Record<string, unknown>;
    result?: string;
    error?: string;
    credit_cost?: number;
    images?: { url: string; local_path: string }[];
  };
}
