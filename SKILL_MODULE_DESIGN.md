# NeoSpark Canvas — Skill 模块前端设计文档

> 基于现有项目代码风格编写，与 Brutalist UI、IntelligenceHub、AgentChatArea 完全兼容。

---

## 一、设计原则

1. **风格一致**：沿用 Brutalist 设计（`border-brutal`、`brutal-shadow`、`brutal-press`）
2. **位置自然**：Skill Agent 作为 IntelligenceHub 的第三个标签（IMAGE / VIDEO / **SKILL**）
3. **代码同构**：API 层沿用 `http.get/post` 风格，类型定义沿用 `src/types/` 方式
4. **状态轻量**：不使用 Redux/Zustand，沿用 `useState` + `useRef` + TanStack Query
5. **国际化**：所有文案走 `useTranslation`，支持 `t("skill.xxx")`

---

## 二、整体架构

```
App.tsx
├── Routes
│   ├── /                    → Index（主画布）
│   │   └── IntelligenceHub（右侧 400px 面板）
│   │       ├── IMAGE Tab   → 现有标准模式 / AgentChatArea
│   │       ├── VIDEO Tab   → VideoGenerationPanel
│   │       └── SKILL Tab   → ★ SkillChatArea（新增）
│   │
│   ├── /skills              → ★ SkillMarketPage（Skill 市场）
│   ├── /skills/:id          → ★ SkillDetailPage（Skill 详情）
│   └── ...existing routes
│
└── Global Providers
    ├── QueryClientProvider
    ├── AuthProvider
    └── TooltipProvider
```

---

## 三、IntelligenceHub 改造

### 3.1 标签扩展

现有是 IMAGE / VIDEO 两标签，增加 **SKILL** 标签：

```tsx
// IntelligenceHub.tsx — Tabs 区域改造

const [activeTab, setActiveTab] = useState<"IMAGE" | "VIDEO" | "SKILL">("IMAGE");

// Tabs 渲染（在三标签场景下）
<div className="flex border-b-brutal border-foreground">
  <button
    onClick={() => setActiveTab("IMAGE")}
    className={cn(
      "flex-1 px-4 py-3 font-mono font-bold text-sm uppercase tracking-wider transition-none flex items-center justify-center gap-2",
      activeTab === "IMAGE"
        ? "bg-foreground text-card"
        : "bg-card text-foreground/50 hover:text-foreground"
    )}
  >
    <ImageIcon className="w-4 h-4" />
    {t("intelligenceHub.imageTab")}
  </button>
  <button
    onClick={() => setActiveTab("VIDEO")}
    className={cn(
      "flex-1 px-4 py-3 font-mono font-bold text-sm uppercase tracking-wider transition-none flex items-center justify-center gap-2 border-l-brutal border-foreground",
      activeTab === "VIDEO"
        ? "bg-foreground text-card"
        : "bg-card text-foreground/50 hover:text-foreground"
    )}
  >
    <Video className="w-4 h-4" />
    {t("intelligenceHub.videoTab")}
  </button>
  {/* ★ 新增 SKILL 标签 */}
  <button
    onClick={() => setActiveTab("SKILL")}
    className={cn(
      "flex-1 px-4 py-3 font-mono font-bold text-sm uppercase tracking-wider transition-none flex items-center justify-center gap-2 border-l-brutal border-foreground",
      activeTab === "SKILL"
        ? "bg-accent-pink text-card"
        : "bg-card text-foreground/50 hover:text-foreground"
    )}
  >
    <Wrench className="w-4 h-4" />
    {t("intelligenceHub.skillTab")}
  </button>
</div>
```

### 3.2 Tab 内容区改造

```tsx
// IntelligenceHub.tsx — 面板内容区域

<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
  {/* VIDEO Panel — 保持现有 */}
  <div className={cn("flex flex-col flex-1 min-h-0", activeTab !== "VIDEO" && "hidden")}>
    <VideoGenerationPanel ... />
  </div>

  {/* IMAGE Panel — 保持现有 */}
  <div className={cn("flex flex-col flex-1 min-h-0", activeTab !== "IMAGE" && "hidden")}>
    <ChatView ... />
  </div>

  {/* ★ SKILL Panel — 新增 */}
  <div className={cn("flex flex-col flex-1 min-h-0", activeTab !== "SKILL" && "hidden")}>
    <SkillChatArea
      onImagesGenerated={onImagesGenerated}
      onVideoGenerated={onVideoGenerated}
      selectedCanvasImage={selectedCanvasImage}
      selectedCanvasImages={selectedCanvasImages}
      canvasImages={canvasImages}
    />
  </div>
</div>
```

---

## 四、核心组件设计

### 4.1 SkillChatArea（Skill Agent 对话区）

位置：`src/components/workspace/SkillChatArea.tsx`

功能：选择 Skill → 输入命令 → SSE 流式对话 → 渲染结果（支持图片回 Canvas）

```tsx
// SkillChatArea.tsx — 完整结构

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Send,
  Wrench,
  Loader2,
  User,
  Bot,
  Terminal,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { STATIC_BASE_URL } from "@/api/request";
import skillsApi from "@/api/skills";
import type { SkillMeta, AgentMessage } from "@/types/skills";
import type { CanvasImage } from "./CanvasArea";

interface SkillChatAreaProps {
  onImagesGenerated?: (images: { url: string; local_path: string }[]) => void;
  onVideoGenerated?: (videoUrl: string) => void;
  selectedCanvasImage?: { src: string; name: string; type?: "image" | "video" } | null;
  selectedCanvasImages?: CanvasImage[];
  canvasImages?: CanvasImage[];
}

const SkillChatArea: React.FC<SkillChatAreaProps> = ({
  onImagesGenerated,
  onVideoGenerated,
  selectedCanvasImage,
}) => {
  const { t } = useTranslation();

  // === 状态 ===
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<SkillMeta[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // === 加载可用 Skills ===
  useEffect(() => {
    skillsApi.listSkills().then(setAvailableSkills).catch(() => {
      toast.error(t("skill.loadSkillsFailed"));
    });
  }, [t]);

  // === 自动滚动 ===
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  // === 切换 Skill 选择 ===
  const toggleSkill = useCallback((skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  }, []);

  // === 发送命令（SSE 流式）===
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;
    const command = inputValue.trim();
    setInputValue("");

    // 添加用户消息
    const userMsg: AgentMessage = {
      message_id: `user_${Date.now()}`,
      role: "user",
      sequence: messages.length + 1,
      content: command,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // 确保有 session
    let sid = sessionId;
    if (!sid) {
      try {
        const session = await skillsApi.createSession({
          title: command.slice(0, 30),
          loaded_skills: selectedSkills,
        });
        sid = session.session_id;
        setSessionId(sid);
      } catch {
        toast.error(t("skill.createSessionFailed"));
        return;
      }
    }

    setIsStreaming(true);
    setStreamContent("");

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch(
        `${STATIC_BASE_URL.replace(/\/api\/v1$/, "")}/api/v1/skills/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
          },
          body: JSON.stringify({
            session_id: sid,
            skill_ids: selectedSkills,
            command,
            stream: true,
          }),
          signal: abortController.signal,
        }
      );

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
              handleEvent(currentEvent, data);
            } catch {
              // ignore malformed JSON
            }
          } else if (line.trim() === "") {
            currentEvent = null;
          }
        }
      }

      // SSE 结束，固化流式内容为 assistant 消息
      setMessages((prev) => [
        ...prev,
        {
          message_id: `assistant_${Date.now()}`,
          role: "assistant",
          sequence: prev.length + 1,
          content: streamContent || "（无输出）",
          created_at: new Date().toISOString(),
        },
      ]);
      setStreamContent("");
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error(err.message || t("skill.streamError"));
        setMessages((prev) => [
          ...prev,
          {
            message_id: `error_${Date.now()}`,
            role: "system",
            sequence: prev.length + 1,
            content: t("skill.streamError"),
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [inputValue, isStreaming, messages, sessionId, selectedSkills, streamContent, t]);

  // === 处理 SSE 事件 ===
  const handleEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case "output":
        setStreamContent((prev) => prev + (data.content || ""));
        break;
      case "tool_call":
        setMessages((prev) => [
          ...prev,
          {
            message_id: `tool_${Date.now()}`,
            role: "skill_call",
            sequence: prev.length + 1,
            content: `调用: ${data.tool}`,
            skill_name: data.tool,
            script_args: data.arguments,
            created_at: new Date().toISOString(),
          },
        ]);
        break;
      case "tool_result":
        setMessages((prev) => [
          ...prev,
          {
            message_id: `result_${Date.now()}`,
            role: "skill_result",
            sequence: prev.length + 1,
            content: data.content || JSON.stringify(data),
            script_output: data.content,
            created_at: new Date().toISOString(),
          },
        ]);
        break;
      case "error":
        toast.error(data.message || t("skill.streamError"));
        break;
      case "end":
        // 在 finally 中统一处理
        break;
    }
  }, [t]);

  // === 渲染 ===
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Skill 选择器 */}
      <div className="p-3 border-b border-foreground/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("skill.loadedSkills")}
          </span>
          <a
            href="/skills"
            className="text-[10px] font-mono text-accent-pink hover:underline"
            onClick={(e) => {
              e.preventDefault();
              window.open("/skills", "_blank");
            }}
          >
            {t("skill.browseMarket")} →
          </a>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {availableSkills.map((skill) => (
            <SkillChip
              key={skill.skill_id}
              skill={skill}
              isActive={selectedSkills.includes(skill.skill_id)}
              onToggle={() => toggleSkill(skill.skill_id)}
            />
          ))}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <EmptyState onSelectExample={setInputValue} />
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.message_id}
            message={msg}
            isExpanded={expandedTools.has(msg.message_id)}
            onToggleExpand={() =>
              setExpandedTools((prev) => {
                const next = new Set(prev);
                if (next.has(msg.message_id)) {
                  next.delete(msg.message_id);
                } else {
                  next.add(msg.message_id);
                }
                return next;
              })
            }
          />
        ))}

        {/* 流式内容 */}
        {isStreaming && streamContent && (
          <MessageBubble
            message={{
              message_id: "streaming",
              role: "assistant",
              sequence: Infinity,
              content: streamContent,
              created_at: new Date().toISOString(),
            }}
            isStreaming
          />
        )}

        {isStreaming && !streamContent && <StreamingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区 */}
      <div className="p-3 border-t-brutal border-foreground bg-card">
        <div className="relative">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t("skill.inputPlaceholder")}
            className="w-full min-h-[60px] max-h-[160px] p-3 pr-12 bg-background border-brutal border-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
            rows={2}
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming}
            className={cn(
              "absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center border-brutal border-foreground brutal-press",
              !inputValue.trim() || isStreaming
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-accent-pink text-foreground hover:brightness-110"
            )}
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>
            {selectedSkills.length > 0
              ? t("skill.skillsActive", { count: selectedSkills.length })
              : t("skill.noSkillsSelected")}
          </span>
          <span>Shift + Enter {t("skill.newLine")}</span>
        </div>
      </div>
    </div>
  );
};

export default SkillChatArea;
```

### 4.2 SkillChip（Skill 选择标签）

```tsx
// components/workspace/SkillChip.tsx

import React from "react";
import { X, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkillMeta } from "@/types/skills";

interface SkillChipProps {
  skill: SkillMeta;
  isActive: boolean;
  onToggle: () => void;
}

const SkillChip: React.FC<SkillChipProps> = ({ skill, isActive, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider border transition-none",
        isActive
          ? "bg-accent-pink/15 border-accent-pink text-foreground"
          : "bg-card border-foreground/30 text-muted-foreground hover:border-foreground/60"
      )}
    >
      <Wrench className={cn("w-3 h-3", isActive && "text-accent-pink")} />
      <span className="truncate max-w-[100px]">{skill.name}</span>
      {isActive && <X className="w-3 h-3" />}
    </button>
  );
};

export default SkillChip;
```

### 4.3 MessageBubble（消息气泡）

```tsx
// components/workspace/MessageBubble.tsx

import React from "react";
import { User, Bot, Wrench, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentMessage } from "@/types/skills";

interface MessageBubbleProps {
  message: AgentMessage;
  isStreaming?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming,
  isExpanded,
  onToggleExpand,
}) => {
  const isUser = message.role === "user";
  const isToolCall = message.role === "skill_call";
  const isToolResult = message.role === "skill_result";

  if (isToolCall) {
    return (
      <div className="ml-8 border rounded-none bg-muted/20 overflow-hidden">
        <button
          onClick={onToggleExpand}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/40 transition-none"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <Wrench className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-muted-foreground">
            调用 <span className="font-medium text-foreground">{message.skill_name}</span>
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground">运行中...</span>
        </button>
        {isExpanded && message.script_args && (
          <pre className="px-3 pb-2 text-[10px] font-mono bg-background overflow-x-auto">
            {JSON.stringify(message.script_args, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  if (isToolResult) {
    return (
      <div className="ml-8 border border-green-500/30 rounded-none bg-green-500/5 px-3 py-2">
        <div className="flex items-center gap-1.5 text-[10px] text-green-600 mb-1">
          <CheckCircle className="w-3 h-3" />
          执行完成
        </div>
        <pre className="text-[10px] font-mono text-foreground/80 whitespace-pre-wrap">
          {message.script_output || message.content}
        </pre>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-7 h-7 flex-shrink-0 flex items-center justify-center border-brutal border-foreground",
          isUser ? "bg-accent-cyan" : "bg-accent-pink/10"
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-accent-pink" />
        )}
      </div>

      <div
        className={cn(
          "max-w-[85%] px-3 py-2 border-brutal border-foreground text-sm leading-relaxed",
          isUser
            ? "bg-accent-cyan/10"
            : isStreaming
            ? "bg-accent-pink/5 border-dashed border-accent-pink/40"
            : "bg-card"
        )}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
};

export default MessageBubble;
```

### 4.4 StreamingIndicator（流式加载动画）

```tsx
// components/workspace/StreamingIndicator.tsx

import React from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const StreamingIndicator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 px-4">
      <div className="w-7 h-7 flex items-center justify-center border-brutal border-foreground bg-accent-pink/10">
        <Sparkles className="w-3.5 h-3.5 text-accent-pink animate-pulse" />
      </div>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-accent-pink rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">
          {t("skill.thinking")}
        </span>
      </div>
    </div>
  );
};

export default StreamingIndicator;
```

---

## 五、API 层

### 5.1 skills.ts（API 模块）

位置：`src/api/skills.ts`

风格与现有 `drawing.ts`、`video.ts` 保持一致。

```ts
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
export async function uploadSkill(formData: FormData): Promise<{ skill_id: string; name: string }> {
  const res = await http.postForm<{ skill_id: string; name: string }>("/skills/upload", formData);
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
  onEvent: (event: string, data: any) => void,
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
```

### 5.2 更新 api/index.ts

```ts
// src/api/index.ts — 新增一行
export { default as skillsApi } from "./skills";
```

---

## 六、类型定义

### 6.1 skills.ts（类型文件）

位置：`src/types/skills.ts`

风格与现有 `drawing.ts`、`auth.ts` 保持一致。

```ts
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
```

---

## 七、Skill 市场页面

### 7.1 SkillMarketPage

位置：`src/pages/SkillMarket.tsx`

```tsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Wrench,
  Upload,
  X,
  Plus,
  Tag,
  User,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import skillsApi from "@/api/skills";
import { Header } from "@/components/layout/Header";
import type { SkillMeta } from "@/types/skills";

const SkillMarketPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "system" | "user">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: skills, isLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: () => skillsApi.listSkills(),
  });

  const filteredSkills = useMemo(() => {
    if (!skills) return [];
    return skills.filter((skill: SkillMeta) => {
      if (filter !== "all" && skill.skill_type !== filter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          skill.name.toLowerCase().includes(q) ||
          skill.description.toLowerCase().includes(q) ||
          skill.tags?.some((tag) => tag.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [skills, filter, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto p-6">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-pink flex items-center justify-center border-brutal border-foreground">
              <Wrench className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wider">
                {t("skill.marketTitle")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t("skill.marketSubtitle")}
              </p>
            </div>
          </div>
          <UploadSkillButton />
        </div>

        {/* 过滤栏 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("skill.searchPlaceholder")}
              className="w-full pl-9 pr-3 py-2 bg-background border-brutal border-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
            />
          </div>
          <div className="flex border-brutal border-foreground">
            {(["all", "system", "user"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-2 text-xs font-bold uppercase tracking-wider transition-none",
                  filter === f
                    ? "bg-foreground text-card"
                    : "bg-card text-foreground hover:bg-secondary"
                )}
              >
                {t(`skill.filter.${f}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Skill 网格 */}
        {isLoading ? (
          <SkillGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map((skill) => (
              <SkillMarketCard key={skill.skill_id} skill={skill} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillMarketPage;
```

### 7.2 SkillMarketCard

```tsx
// components/skills/SkillMarketCard.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, Tag, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { SkillMeta } from "@/types/skills";

interface SkillMarketCardProps {
  skill: SkillMeta;
}

const SkillMarketCard: React.FC<SkillMarketCardProps> = ({ skill }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div
      className="bg-card border-brutal border-foreground brutal-shadow brutal-press hover:brightness-105 cursor-pointer transition-none"
      onClick={() => navigate(`/skills/${skill.skill_id}`)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-pink/10 flex items-center justify-center border-brutal border-foreground">
              <Wrench className="w-5 h-5 text-accent-pink" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">{skill.name}</h3>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>v{skill.version}</span>
                <span>·</span>
                <span>{skill.author}</span>
              </div>
            </div>
          </div>
          {skill.skill_type === "system" ? (
            <div className="flex items-center gap-1 text-[10px] text-accent-cyan">
              <Shield className="w-3 h-3" />
              {t("skill.system")}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-accent-yellow">
              <User className="w-3 h-3" />
              {t("skill.custom")}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
          {skill.description}
        </p>

        {skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] font-bold uppercase border border-foreground/30 bg-background"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
          <span className="text-[10px] font-mono text-muted-foreground">
            {skill.credit_cost_per_call > 0
              ? `${skill.credit_cost_per_call} pts/次`
              : t("skill.free")}
          </span>
          <span className="text-[10px] text-accent-pink font-bold">
            {t("skill.viewDetails")} →
          </span>
        </div>
      </div>
    </div>
  );
};

export default SkillMarketCard;
```

---

## 八、路由注册

```tsx
// App.tsx — 新增路由

import SkillMarket from "./pages/SkillMarket";
import SkillDetail from "./pages/SkillDetail";

// 在 Routes 中添加：
<Route
  path="/skills"
  element={
    <ProtectedRoute>
      <SkillMarket />
    </ProtectedRoute>
  }
/>
<Route
  path="/skills/:skillId"
  element={
    <ProtectedRoute>
      <SkillDetail />
    </ProtectedRoute>
  }
/>
```

---

## 九、国际化词条

```json
// 中文 (zh)
{
  "skill": {
    "tab": "Skill",
    "loadedSkills": "已加载技能",
    "browseMarket": "浏览市场",
    "noSkillsSelected": "未选择技能，Agent 将以通用模式运行",
    "skillsActive": "已激活 {{count}} 个技能",
    "inputPlaceholder": "输入命令，或选择上方技能后执行...",
    "newLine": "换行",
    "thinking": "Agent 思考中...",
    "streamError": "流式输出出错，请重试",
    "loadSkillsFailed": "加载技能列表失败",
    "createSessionFailed": "创建会话失败",
    "marketTitle": "Skill 市场",
    "marketSubtitle": "发现和管理 AI 技能",
    "searchPlaceholder": "搜索技能...",
    "filter.all": "全部",
    "filter.system": "系统",
    "filter.user": "我的",
    "system": "系统",
    "custom": "自定义",
    "free": "免费",
    "viewDetails": "查看详情",
    "uploadTitle": "上传 Skill",
    "uploadDesc": "上传 ZIP 格式的 Skill 包（包含 SKILL.md）"
  }
}

// 英文 (en)
{
  "skill": {
    "tab": "Skill",
    "loadedSkills": "Loaded Skills",
    "browseMarket": "Browse Market",
    "noSkillsSelected": "No skills selected. Agent will run in general mode.",
    "skillsActive": "{{count}} skills active",
    "inputPlaceholder": "Enter command, or select skills above...",
    "newLine": "newline",
    "thinking": "Agent thinking...",
    "streamError": "Stream error. Please retry.",
    "loadSkillsFailed": "Failed to load skills",
    "createSessionFailed": "Failed to create session",
    "marketTitle": "Skill Market",
    "marketSubtitle": "Discover and manage AI skills",
    "searchPlaceholder": "Search skills...",
    "filter.all": "All",
    "filter.system": "System",
    "filter.user": "My Skills",
    "system": "System",
    "custom": "Custom",
    "free": "Free",
    "viewDetails": "Details",
    "uploadTitle": "Upload Skill",
    "uploadDesc": "Upload a ZIP skill package (must include SKILL.md)"
  }
}
```

---

## 十、新增文件清单

### 必须新增的文件

| 文件 | 说明 |
|------|------|
| `src/types/skills.ts` | Skill 类型定义 |
| `src/api/skills.ts` | Skill API 模块 |
| `src/components/workspace/SkillChatArea.tsx` | Skill Agent 对话区（核心） |
| `src/components/workspace/SkillChip.tsx` | Skill 选择标签 |
| `src/components/workspace/MessageBubble.tsx` | 消息气泡（支持 tool_call/tool_result） |
| `src/components/workspace/StreamingIndicator.tsx` | 流式加载动画 |
| `src/components/skills/SkillMarketCard.tsx` | Skill 市场卡片 |
| `src/components/skills/UploadSkillButton.tsx` | 上传按钮 + 弹窗 |
| `src/pages/SkillMarket.tsx` | Skill 市场页面 |
| `src/pages/SkillDetail.tsx` | Skill 详情页面 |

### 需要修改的文件

| 文件 | 修改内容 |
|------|---------|
| `src/App.tsx` | 新增 `/skills`、`/skills/:skillId` 路由 |
| `src/api/index.ts` | 导出 `skillsApi` |
| `src/components/workspace/IntelligenceHub.tsx` | 新增 SKILL Tab，渲染 SkillChatArea |
| `src/i18n/locales/zh.json` | 添加 skill 词条 |
| `src/i18n/locales/en.json` | 添加 skill 词条 |

---

## 十一、与后端 API 对照

| 前端功能 | 调用方法 | 后端端点 |
|---------|---------|---------|
| 获取 Skill 列表 | `skillsApi.listSkills()` | `GET /api/v1/skills` |
| 获取 Skill 详情 | `skillsApi.getSkill(id)` | `GET /api/v1/skills/:id` |
| 上传 Skill | `skillsApi.uploadSkill(formData)` | `POST /api/v1/skills/upload` |
| 删除 Skill | `skillsApi.deleteSkill(id)` | `DELETE /api/v1/skills/:id` |
| 创建会话 | `skillsApi.createSession(data)` | `POST /api/v1/skills/sessions` |
| 获取会话列表 | `skillsApi.listSessions()` | `GET /api/v1/skills/sessions` |
| 获取会话消息 | `skillsApi.getSessionMessages(id)` | `GET /api/v1/skills/sessions/:id/messages` |
| 流式执行 | `skillsApi.executeStream(...)` | `POST /api/v1/skills/stream` (SSE) |

---

## 十二、实施步骤

| 步骤 | 文件 | 工作量 |
|------|------|--------|
| 1 | `src/types/skills.ts` | 0.5h |
| 2 | `src/api/skills.ts` + 更新 `index.ts` | 0.5h |
| 3 | `SkillChip.tsx` + `MessageBubble.tsx` + `StreamingIndicator.tsx` | 1h |
| 4 | `SkillChatArea.tsx`（核心，含 SSE 处理） | 2h |
| 5 | 改造 `IntelligenceHub.tsx`（加 SKILL Tab） | 0.5h |
| 6 | `SkillMarketCard.tsx` + `UploadSkillButton.tsx` | 1h |
| 7 | `SkillMarket.tsx` + `SkillDetail.tsx` | 1h |
| 8 | `App.tsx` 路由 + i18n 词条 | 0.5h |
| **合计** | | **~7h** |
