import { useState, useRef, useCallback } from "react";
import type { AgentChatMessage } from "@/types/agents";

interface UseAgentStreamReturn {
  isStreaming: boolean;
  streamContent: string;
  messages: AgentChatMessage[];
  startStream: (
    streamFn: (
      onEvent: (event: string, data: Record<string, unknown>) => void,
      signal: AbortSignal
    ) => Promise<void>
  ) => Promise<void>;
  stopStream: () => void;
  appendMessage: (msg: AgentChatMessage) => void;
  clearMessages: () => void;
  setMessages: React.Dispatch<React.SetStateAction<AgentChatMessage[]>>;
}

export function useAgentStream(): UseAgentStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const streamContentRef = useRef("");

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    async (
      streamFn: (
        onEvent: (event: string, data: Record<string, unknown>) => void,
        signal: AbortSignal
      ) => Promise<void>
    ) => {
      setIsStreaming(true);
      setStreamContent("");
      streamContentRef.current = "";

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        await streamFn(
          (event: string, data: Record<string, unknown>) => {
            switch (event) {
              case "output": {
                const content = data.content;
                const delta = data.delta;

                let text = "";
                if (typeof delta === "string") {
                  text = delta;
                } else if (typeof content === "string") {
                  text = content;
                } else if (typeof data.text === "string") {
                  text = data.text;
                } else if (typeof data.message === "string") {
                  text = data.message;
                }

                if (text) {
                  const current = streamContentRef.current;
                  let next = current;
                  if (
                    text.startsWith(current) &&
                    text.length > current.length
                  ) {
                    // 后端返回的是完整累积内容（而非增量），直接替换
                    next = text;
                  } else if (!current.startsWith(text)) {
                    // 后端返回的是增量片段，追加
                    next = current + text;
                  }
                  // 若 text 是 current 的前缀或完全重复，则保持 current 不变，避免重复

                  streamContentRef.current = next;
                  setStreamContent(next);
                }
                break;
              }
              case "tool_call": {
                const toolName = String(data.tool || "");
                const args = data.arguments as
                  | Record<string, unknown>
                  | undefined;
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `tool_${Date.now()}_${Math.random()
                      .toString(36)
                      .slice(2, 6)}`,
                    role: "skill_call",
                    content: `调用: ${toolName}`,
                    skill_name: toolName,
                    script_args: args,
                    timestamp: new Date().toISOString(),
                  },
                ]);
                break;
              }
              case "tool_result": {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `result_${Date.now()}_${Math.random()
                      .toString(36)
                      .slice(2, 6)}`,
                    role: "skill_result",
                    content: String(data.content || JSON.stringify(data)),
                    script_output: String(data.content || ""),
                    timestamp: new Date().toISOString(),
                  },
                ]);
                break;
              }
              case "error":
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `error_${Date.now()}`,
                    role: "system",
                    content: String(data.error || "Stream error"),
                    timestamp: new Date().toISOString(),
                  },
                ]);
                break;
              case "end":
                break;
            }
          },
          abortController.signal
        );

        const finalContent = streamContentRef.current;
        if (finalContent) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant_${Date.now()}`,
              role: "assistant",
              content: finalContent,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        setStreamContent("");
      } catch (err: unknown) {
        const e = err as { name?: string };
        if (e.name !== "AbortError") {
          throw err;
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        setStreamContent("");
      }
    },
    []
  );

  const appendMessage = useCallback((msg: AgentChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamContent("");
  }, []);

  return {
    isStreaming,
    streamContent,
    messages,
    startStream,
    stopStream,
    appendMessage,
    clearMessages,
    setMessages,
  };
}
