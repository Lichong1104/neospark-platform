import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  Wrench,
  X,
  ExternalLink,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import agentsApi from "@/api/agents";
import { useAgentStream } from "@/hooks/useAgentStream";
import { getErrorMessage } from "@/lib/errorMessage";
import type { AgentSkill, AgentChatMessage } from "@/types/agents";
import type { CanvasImage } from "./CanvasArea";
import MessageBubble from "./MessageBubble";
import StreamingIndicator from "./StreamingIndicator";

interface AgentHubChatAreaProps {
  onImagesGenerated?: (images: { url: string; local_path: string }[]) => void;
  onVideoGenerated?: (videoUrl: string) => void;
  selectedCanvasImage?: {
    src: string;
    name: string;
    type?: "image" | "video";
  } | null;
  selectedCanvasImages?: CanvasImage[];
  canvasImages?: CanvasImage[];
  modeToggle?: React.ReactNode;
}

const DEFAULT_AGENT_MODEL = "deepseek:deepseek-v4-flash";

function looksLikeFileGeneration(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return false;
  const head = trimmed.slice(0, 500);
  return (
    head.includes('"filename"') ||
    head.includes('"url"') ||
    head.includes(".docx") ||
    head.includes(".pdf")
  );
}

const AgentHubChatArea: React.FC<AgentHubChatAreaProps> = ({
  onImagesGenerated,
  onVideoGenerated: _onVideoGenerated,
  selectedCanvasImage: _selectedCanvasImage,
  selectedCanvasImages: _selectedCanvasImages,
  canvasImages: _canvasImages,
  modeToggle,
}) => {
  const { t } = useTranslation();

  const [inputValue, setInputValue] = useState("");
  const [availableSkills, setAvailableSkills] = useState<AgentSkill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [isGeneratingFile, setIsGeneratingFile] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [skillPopoverOpen, setSkillPopoverOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isStreaming,
    streamContent,
    messages,
    startStream,
    appendMessage,
    setMessages,
    clearMessages,
  } = useAgentStream();

  // 加载可用 Skills
  useEffect(() => {
    let cancelled = false;
    setIsLoadingSkills(true);
    agentsApi
      .listSkills()
      .then((skills) => {
        if (cancelled) return;
        setAvailableSkills(skills);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(getErrorMessage(err, t("agentHub.loadSkillsFailed")));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSkills(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  // 自动滚动
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

  const getSkillDisplay = useCallback(
    (skill: AgentSkill) => {
      const name = t(`skillNames.${skill.id}.name`, {
        defaultValue: skill.name,
      });
      const description = t(`skillNames.${skill.id}.description`, {
        defaultValue: skill.description,
      });
      return { name, description };
    },
    [t]
  );

  const handleClearChat = useCallback(() => {
    clearMessages();
    setSessionId(null);
    textareaRef.current?.focus();
  }, [clearMessages]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming || isGeneratingFile) return;
    const command = inputValue.trim();
    setInputValue("");

    const userMsg: AgentChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: command,
      timestamp: new Date().toISOString(),
    };
    appendMessage(userMsg);

    const isDocxOnly =
      selectedSkills.length === 1 && selectedSkills[0] === "docx-generator";

    // docx-generator 走非流式，避免传输大 base64 片段
    if (isDocxOnly) {
      setIsGeneratingFile(true);
      try {
        const res = await agentsApi.chatMulti({
          skill_ids: selectedSkills,
          message: command,
          stream: false,
          session_id: sessionId || undefined,
          model_override: DEFAULT_AGENT_MODEL,
        });

        if (res.session_id) {
          setSessionId(res.session_id);
        }

        appendMessage({
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: res.content,
          timestamp: new Date().toISOString(),
        });
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, t("agentHub.chatFailed")));
        setMessages((prev) => [
          ...prev,
          {
            id: `error_${Date.now()}`,
            role: "system",
            content: t("agentHub.streamError"),
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsGeneratingFile(false);
      }
      return;
    }

    try {
      await startStream((onEvent, signal) =>
        agentsApi.chatMultiStream(
          {
            skill_ids: selectedSkills,
            message: command,
            stream: true,
            session_id: sessionId || undefined,
            model_override: DEFAULT_AGENT_MODEL,
          },
          (event, data) => {
            onEvent(event, data);
            if (data.session_id) {
              setSessionId(data.session_id);
            }
            if (event === "error") {
              toast.error(
                String(data.error || data.message || t("agentHub.streamError"))
              );
            }
          },
          signal
        )
      );

      // 流正常结束但未收到任何 assistant/system 输出时给出提示
      setMessages((prev) => {
        const hasResponse = prev.some(
          (m) => m.role === "assistant" || m.role === "system"
        );
        if (hasResponse) return prev;
        return [
          ...prev,
          {
            id: `no_output_${Date.now()}`,
            role: "system",
            content: t("agentHub.noOutput"),
            timestamp: new Date().toISOString(),
          },
        ];
      });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, t("agentHub.chatFailed")));
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: "system",
          content: t("agentHub.streamError"),
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [
    inputValue,
    isStreaming,
    isGeneratingFile,
    selectedSkills,
    sessionId,
    appendMessage,
    startStream,
    setMessages,
    t,
  ]);

  const displayMessages = messages;
  const selectedSkillDisplays = availableSkills
    .filter((s) => selectedSkills.includes(s.id))
    .map((s) => getSkillDisplay(s));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b-brutal border-foreground bg-background px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center border-brutal border-foreground bg-accent-pink">
            <Sparkles className="h-3 w-3 text-foreground" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">
            {t("agentHub.tabTitle")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              disabled={isStreaming}
              className="inline-flex h-6 items-center gap-1 px-1.5 text-[10px] font-bold uppercase text-muted-foreground border border-transparent hover:border-foreground/20 hover:bg-secondary disabled:opacity-50 transition-none"
              title={t("agentHub.clearChat")}
            >
              <X className="h-3 w-3" />
              {t("agentHub.clear")}
            </button>
          )}
        </div>
      </div>

      {/* Skill 选择器 */}
      <div className="shrink-0 border-b border-foreground/10 bg-card px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Wrench className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("agentHub.loadedSkills")}
            </span>
          </div>
          <a
            href="/skills"
            className="inline-flex items-center gap-0.5 text-[10px] font-mono text-accent-pink hover:underline"
            onClick={(e) => {
              e.preventDefault();
              window.open("/skills", "_blank");
            }}
          >
            {t("agentHub.browseMarket")}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          {isLoadingSkills ? (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("agentHub.loadingSkills")}
            </div>
          ) : (availableSkills?.length ?? 0) === 0 ? (
            <span className="text-[10px] text-muted-foreground">
              {t("agentHub.noSkillsAvailable")}
            </span>
          ) : (
            <>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                {selectedSkills.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground">
                    {t("agentHub.noSkillsSelected")}
                  </span>
                ) : (
                  selectedSkillDisplays.map(({ name }, idx) => (
                    <span
                      key={`${name}-${idx}`}
                      className="inline-flex max-w-[140px] items-center truncate border border-accent-pink bg-accent-pink/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-foreground"
                    >
                      {name}
                    </span>
                  ))
                )}
              </div>
              <SkillSelectorPopover
                skills={availableSkills}
                selected={selectedSkills}
                onToggle={toggleSkill}
                open={skillPopoverOpen}
                onOpenChange={setSkillPopoverOpen}
              />
            </>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        <div className="space-y-3">
          {displayMessages.length === 0 && !isStreaming && (
            <EmptyState onSelectExample={setInputValue} />
          )}

          {displayMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isExpanded={expandedTools.has(msg.id)}
              onToggleExpand={() =>
                setExpandedTools((prev) => {
                  const next = new Set(prev);
                  if (next.has(msg.id)) {
                    next.delete(msg.id);
                  } else {
                    next.add(msg.id);
                  }
                  return next;
                })
              }
            />
          ))}

          {isStreaming && streamContent && (
            looksLikeFileGeneration(streamContent) ? (
              <GeneratingDocumentIndicator />
            ) : (
              <MessageBubble
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamContent,
                  timestamp: new Date().toISOString(),
                }}
                isStreaming
              />
            )
          )}

          {isStreaming && !streamContent && <StreamingIndicator />}

          {isGeneratingFile && <GeneratingDocumentIndicator />}

          <div ref={messagesEndRef} className="h-px" />
        </div>
      </div>

      {/* 输入区 */}
      <div className="shrink-0 border-t-brutal border-foreground bg-card p-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t("agentHub.inputPlaceholder")}
            className="w-full min-h-[72px] max-h-[120px] resize-none bg-background border-brutal border-foreground p-3 pr-12 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-pink/30"
            rows={2}
            disabled={isStreaming || isGeneratingFile}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming || isGeneratingFile}
            className={cn(
              "absolute right-2 bottom-2 h-8 w-8 inline-flex items-center justify-center border-brutal border-foreground brutal-press",
              !inputValue.trim() || isStreaming || isGeneratingFile
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-accent-pink text-foreground hover:brightness-110"
            )}
            title={isStreaming || isGeneratingFile ? t("agentHub.thinking") : t("agentHub.send")}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {modeToggle && <div className="shrink-0">{modeToggle}</div>}
            <span className="truncate text-[10px] text-muted-foreground font-mono">
              {selectedSkills.length > 0
                ? t("agentHub.skillsActive", { count: selectedSkills.length })
                : t("agentHub.noSkillsSelected")}
            </span>
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
            Shift + Enter {t("agentHub.newLine")}
          </span>
        </div>
      </div>
    </div>
  );
};

const GeneratingDocumentIndicator: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center border-brutal border-foreground bg-accent-pink/10">
        <Sparkles className="h-3.5 w-3.5 text-accent-pink" />
      </div>
      <div className="max-w-[85%] px-3 py-2 border-brutal border-foreground bg-accent-yellow/10">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-accent-yellow" />
          <span className="font-bold uppercase tracking-wider">
            {t("agentHub.generatingDocument")}
          </span>
        </div>
      </div>
    </div>
  );
};

interface SkillSelectorPopoverProps {
  skills: AgentSkill[];
  selected: string[];
  onToggle: (skillId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SkillSelectorPopover: React.FC<SkillSelectorPopoverProps> = ({
  skills,
  selected,
  onToggle,
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-6 shrink-0 items-center gap-1 border-brutal border-foreground bg-card px-2 text-[10px] font-bold uppercase text-foreground hover:bg-secondary transition-none"
        >
          <Wrench className="h-3 w-3" />
          {t("agentHub.selectSkills")}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[280px] rounded-none border-brutal border-foreground bg-card p-0 shadow-brutal"
      >
        <div className="border-b border-foreground/10 bg-secondary/30 px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("agentHub.selectSkills")}
          </span>
        </div>
        <div className="max-h-[240px] overflow-y-auto p-2">
          <div className="space-y-1">
            {skills.map((skill) => {
              const isActive = selected.includes(skill.id);
              const name = t(`skillNames.${skill.id}.name`, {
                defaultValue: skill.name,
              });
              const description = t(`skillNames.${skill.id}.description`, {
                defaultValue: skill.description,
              });
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => onToggle(skill.id)}
                  className={cn(
                    "flex w-full items-start gap-2 border p-2 text-left transition-none",
                    isActive
                      ? "border-accent-pink bg-accent-pink/10"
                      : "border-foreground/20 bg-card hover:border-foreground/40 hover:bg-secondary"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {isActive ? (
                      <div className="flex h-4 w-4 items-center justify-center border-brutal border-foreground bg-accent-pink">
                        <Check className="h-3 w-3 text-foreground" />
                      </div>
                    ) : (
                      <div className="h-4 w-4 border border-foreground/30" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase">{name}</div>
                    <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground line-clamp-2">
                      {description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface EmptyStateProps {
  onSelectExample: (text: string) => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onSelectExample }) => {
  const { t } = useTranslation();
  const examples = [
    t("agentHub.example1"),
    t("agentHub.example2"),
    t("agentHub.example3"),
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-2 py-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center border-brutal border-foreground bg-accent-pink/10">
        <Sparkles className="h-7 w-7 text-accent-pink/70" />
      </div>
      <h2 className="mb-1.5 text-sm font-bold uppercase tracking-widest">
        {t("agentHub.welcomeTitle")}
      </h2>
      <p className="mb-5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
        {t("agentHub.welcomeDesc")}
      </p>
      <div className="w-full max-w-[280px] space-y-2">
        {examples.map((example, idx) => (
          <button
            key={idx}
            onClick={() => onSelectExample(example)}
            className="w-full border border-foreground/20 bg-background px-3 py-2 text-left text-xs font-mono text-muted-foreground transition-none hover:border-foreground/40 hover:bg-secondary hover:text-foreground"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
};

export { AgentHubChatArea };
export default AgentHubChatArea;
