import React from "react";
import { User, Bot, Wrench, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
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
  const isSystem = message.role === "system";

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

  if (isSystem) {
    return (
      <div className="flex justify-center px-4">
        <div className="px-3 py-1.5 bg-accent-red/10 border border-accent-red/30 text-xs text-accent-red">
          {message.content}
        </div>
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
