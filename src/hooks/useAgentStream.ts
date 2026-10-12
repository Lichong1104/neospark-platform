import { useState, useRef, useCallback } from "react";
import type { AgentChatMessage, ContentBlock } from "@/types/agents";

interface UseAgentStreamReturn {
  isStreaming: boolean;
  streamContent: string;
  streamBlocks: ContentBlock[];
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

function isMediaType(t: unknown): t is "image" | "video" | "file" {
  return t === "image" || t === "video" || t === "file";
}

export function useAgentStream(): UseAgentStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [streamBlocks, setStreamBlocks] = useState<ContentBlock[]>([]);
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const streamContentRef = useRef("");
  const streamBlocksRef = useRef<ContentBlock[]>([]);
  const streamFilesRef = useRef<{ url: string; local_path: string }[]>([]);

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
      setStreamBlocks([]);
      streamContentRef.current = "";
      streamBlocksRef.current = [];
      streamFilesRef.current = [];

      const abortController = new AbortController();
      abortRef.current = abortController;

      const commitBlocks = () => setStreamBlocks(streamBlocksRef.current);

      const pushMediaBlock = (block: ContentBlock) => {
        streamBlocksRef.current = [...streamBlocksRef.current, block];
        commitBlocks();
      };

      const pushTextBlock = (text: string) => {
        if (!text) return;
        const prev = streamBlocksRef.current;
        const last = prev[prev.length - 1];
        if (last && last.type === "text") {
          streamBlocksRef.current = [
            ...prev.slice(0, -1),
            { ...last, text: last.text + text },
          ];
        } else {
          streamBlocksRef.current = [...prev, { type: "text", text }];
        }
        commitBlocks();
      };

      try {
        await streamFn(
          (event: string, data: Record<string, unknown>) => {
            switch (event) {
              case "output": {
                // 结束事件：blocks 为权威真源，content 为完整 markdown
                if (data.done === true) {
                  if (typeof data.content === "string") {
                    streamContentRef.current = data.content;
                    setStreamContent(data.content);
                  }
                  if (Array.isArray(data.blocks)) {
                    streamBlocksRef.current = data.blocks as ContentBlock[];
                    commitBlocks();
                  }
                  const files = data.files;
                  if (Array.isArray(files)) {
                    for (const f of files) {
                      const item = f as { url?: string; filename?: string };
                      if (typeof item?.url === "string" && item.url) {
                        streamFilesRef.current.push({
                          url: item.url,
                          local_path: item.filename || item.url,
                        });
                      }
                    }
                  }
                  break;
                }

                // 增量媒体块（image/video/file 一到即渲染）
                const blockType = data.type;
                if (isMediaType(blockType) && typeof data.url === "string" && data.url) {
                  pushMediaBlock({
                    type: blockType,
                    url: data.url,
                    filename:
                      typeof data.filename === "string" ? data.filename : undefined,
                    mime: typeof data.mime === "string" ? data.mime : undefined,
                  });
                }

                // 兼容旧 files 数组
                const files = data.files;
                if (Array.isArray(files)) {
                  for (const f of files) {
                    const item = f as {
                      url?: string;
                      filename?: string;
                      type?: string;
                    };
                    if (typeof item?.url === "string" && item.url) {
                      streamFilesRef.current.push({
                        url: item.url,
                        local_path: item.filename || item.url,
                      });
                      if (isMediaType(item.type)) {
                        pushMediaBlock({
                          type: item.type,
                          url: item.url,
                          filename: item.filename,
                        });
                      }
                    }
                  }
                }

                // 文本增量
                let text = "";
                if (data.type === "text" && typeof data.text === "string") {
                  text = data.text;
                } else if (typeof data.delta === "string") {
                  text = data.delta;
                } else if (typeof data.content === "string") {
                  text = data.content;
                } else if (typeof data.text === "string") {
                  text = data.text;
                } else if (typeof data.message === "string") {
                  text = data.message;
                }

                if (text) {
                  const current = streamContentRef.current;
                  let next = current;
                  if (text.startsWith(current) && text.length > current.length) {
                    next = text;
                  } else if (!current.startsWith(text)) {
                    next = current + text;
                  }
                  streamContentRef.current = next;
                  setStreamContent(next);
                  pushTextBlock(text);
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

        // 落最终消息：有文本或有媒体块即保留（修复纯图片回复丢图）
        const finalContent = streamContentRef.current;
        const finalBlocks = streamBlocksRef.current;
        if (finalContent || finalBlocks.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant_${Date.now()}`,
              role: "assistant",
              content: finalContent,
              blocks: finalBlocks.length > 0 ? finalBlocks : undefined,
              images:
                streamFilesRef.current.length > 0
                  ? [...streamFilesRef.current]
                  : undefined,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        setStreamContent("");
        setStreamBlocks([]);
      } catch (err: unknown) {
        const e = err as { name?: string };
        if (e.name !== "AbortError") {
          throw err;
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        setStreamContent("");
        setStreamBlocks([]);
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
    setStreamBlocks([]);
  }, []);

  return {
    isStreaming,
    streamContent,
    streamBlocks,
    messages,
    startStream,
    stopStream,
    appendMessage,
    clearMessages,
    setMessages,
  };
}
