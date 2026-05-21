import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Send,
  Wrench,
  Loader2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { STATIC_BASE_URL } from "@/api/request";
import skillsApi from "@/api/skills";
import type { SkillMeta, AgentMessage } from "@/types/skills";
import type { CanvasImage } from "./CanvasArea";
import SkillChip from "./SkillChip";
import MessageBubble from "./MessageBubble";
import StreamingIndicator from "./StreamingIndicator";
import { getErrorMessage } from "@/lib/errorMessage";

interface SkillChatAreaProps {
  onImagesGenerated?: (images: { url: string; local_path: string }[]) => void;
  onVideoGenerated?: (videoUrl: string) => void;
  selectedCanvasImage?: { src: string; name: string; type?: "image" | "video" } | null;
  selectedCanvasImages?: CanvasImage[];
  canvasImages?: CanvasImage[];
}

const SkillChatArea: React.FC<SkillChatAreaProps> = ({
  onImagesGenerated,
  selectedCanvasImage,
}) => {
  const { t } = useTranslation();

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<SkillMeta[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamContentRef = useRef("");

  streamContentRef.current = streamContent;

  useEffect(() => {
    setIsLoadingSkills(true);
    skillsApi
      .listSkills()
      .then((skills) => {
        setAvailableSkills(skills);
        const systemSkills = skills
          .filter((s) => s.skill_type === "system")
          .slice(0, 3)
          .map((s) => s.skill_id);
        setSelectedSkills(systemSkills);
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, t("skill.loadSkillsFailed")));
      })
      .finally(() => setIsLoadingSkills(false));
  }, [t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent, isStreaming]);

  const toggleSkill = useCallback((skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  }, []);

  const handleEvent = useCallback(
    (event: string, data: Record<string, unknown>) => {
      switch (event) {
        case "output":
          setStreamContent((prev) => prev + (String(data.content || "")));
          break;
        case "tool_call": {
          const toolName = String(data.tool || "");
          const args = data.arguments as Record<string, unknown> | undefined;
          setMessages((prev) => [
            ...prev,
            {
              message_id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              role: "skill_call",
              sequence: prev.length + 1,
              content: `调用: ${toolName}`,
              skill_name: toolName,
              script_args: args,
              created_at: new Date().toISOString(),
            },
          ]);
          break;
        }
        case "tool_result": {
          setMessages((prev) => [
            ...prev,
            {
              message_id: `result_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              role: "skill_result",
              sequence: prev.length + 1,
              content: String(data.content || JSON.stringify(data)),
              script_output: String(data.content || ""),
              created_at: new Date().toISOString(),
            },
          ]);
          break;
        }
        case "error":
          toast.error(String(data.message || t("skill.streamError")));
          break;
      }
    },
    [t]
  );

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;
    const command = inputValue.trim();
    setInputValue("");

    const userMsg: AgentMessage = {
      message_id: `user_${Date.now()}`,
      role: "user",
      sequence: messages.length + 1,
      content: command,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    let sid = sessionId;
    if (!sid) {
      try {
        const session = await skillsApi.createSession({
          title: command.slice(0, 30),
          loaded_skills: selectedSkills,
        });
        sid = session.session_id;
        setSessionId(sid);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, t("skill.createSessionFailed")));
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
    }

    setIsStreaming(true);
    setStreamContent("");
    streamContentRef.current = "";

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      await skillsApi.executeStream(
        {
          session_id: sid,
          skill_ids: selectedSkills,
          command,
        },
        handleEvent,
        abortController.signal
      );

      const finalContent = streamContentRef.current;
      if (finalContent) {
        setMessages((prev) => [
          ...prev,
          {
            message_id: `assistant_${Date.now()}`,
            role: "assistant",
            sequence: prev.length + 1,
            content: finalContent,
            created_at: new Date().toISOString(),
          },
        ]);
      }
      setStreamContent("");
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name !== "AbortError") {
        toast.error(getErrorMessage(err, t("skill.streamError")));
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
      setStreamContent("");
    }
  }, [inputValue, isStreaming, messages, sessionId, selectedSkills, handleEvent, t]);

  const displayMessages = messages;

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
        <div className="flex flex-wrap gap-1.5 min-h-[28px]">
          {isLoadingSkills ? (
            <span className="text-[10px] text-muted-foreground">
              {t("skill.loadingSkills")}
            </span>
          ) : availableSkills.length === 0 ? (
            <span className="text-[10px] text-muted-foreground">
              {t("skill.noSkillsAvailable")}
            </span>
          ) : (
            availableSkills.map((skill) => (
              <SkillChip
                key={skill.skill_id}
                skill={skill}
                isActive={selectedSkills.includes(skill.skill_id)}
                onToggle={() => toggleSkill(skill.skill_id)}
              />
            ))
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {displayMessages.length === 0 && !isStreaming && (
          <EmptyState onSelectExample={setInputValue} t={t} />
        )}

        {displayMessages.map((msg) => (
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

interface EmptyStateProps {
  onSelectExample: (text: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onSelectExample, t }) => {
  const examples = [
    t("skill.example1"),
    t("skill.example2"),
    t("skill.example3"),
  ];

  return (
    <div className="flex items-start gap-4 pt-6 px-2">
      <div className="w-14 h-14 border-brutal border-foreground/30 flex items-center justify-center flex-shrink-0 bg-accent-pink/5">
        <Zap className="w-7 h-7 text-accent-pink/40" />
      </div>
      <div className="flex flex-col justify-center">
        <h2 className="text-base font-bold uppercase tracking-widest mb-2">
          {t("skill.welcomeTitle")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mb-4">
          {t("skill.welcomeDesc")}
        </p>
        <div className="space-y-1.5">
          {examples.map((example, idx) => (
            <button
              key={idx}
              onClick={() => onSelectExample(example)}
              className="block w-full text-left px-2.5 py-1.5 text-xs font-mono text-muted-foreground border border-foreground/20 bg-background hover:bg-secondary hover:text-foreground transition-none"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkillChatArea;
