import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { Film } from "lucide-react";
import { STATIC_BASE_URL } from "@/api/request";
import {
  canvasImageSlotLabel,
  canvasVideoSlotLabel,
} from "@/lib/canvasImageSlots";
import { useTranslation } from "react-i18next";

type CanvasItem = {
  id?: string;
  src: string;
  name: string;
  type?: "image" | "video";
};

function toFullUrl(src: string): string {
  if (!src) return "";
  return src.startsWith("http") ? src : `${STATIC_BASE_URL}${src}`;
}

function getSelectionTextBeforeCaret(root: HTMLElement): string {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return "";
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return "";

  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString();
}

function replaceTextInRangeWithNode(
  root: HTMLElement,
  replaceLen: number,
  node: Node
) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return;

  // Expand backwards by replaceLen characters across text nodes inside root.
  const endRange = range.cloneRange();
  let remaining = replaceLen;
  let startContainer: Node | null = endRange.startContainer;
  let startOffset = endRange.startOffset;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const texts: Text[] = [];
  let n = walker.nextNode();
  while (n) {
    texts.push(n as Text);
    n = walker.nextNode();
  }

  // Find current text node index
  let idx = texts.findIndex((t) => t === startContainer);
  if (idx === -1) {
    // if caret is not in text node (e.g. root), just insert.
    range.insertNode(node);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }

  let curOffset = startOffset;
  while (remaining > 0 && idx >= 0) {
    const t = texts[idx];
    const canTake = Math.min(curOffset, remaining);
    remaining -= canTake;
    curOffset -= canTake;
    if (remaining === 0) {
      startContainer = t;
      startOffset = curOffset;
      break;
    }
    idx -= 1;
    if (idx >= 0) curOffset = texts[idx].data.length;
  }

  const del = document.createRange();
  del.setStart(startContainer!, startOffset);
  del.setEnd(endRange.startContainer, endRange.startOffset);
  del.deleteContents();
  del.insertNode(node);
  del.collapse(false);
  sel.removeAllRanges();
  sel.addRange(del);
}

function serializeNode(
  node: Node,
  imageSlotPrefix: string,
  videoSlotPrefix: string
): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node as Text).data;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  if (el.dataset?.token === "canvas-image" && el.dataset?.slot) {
    return `@${canvasImageSlotLabel(Number(el.dataset.slot), imageSlotPrefix)}`;
  }
  if (el.dataset?.token === "canvas-video" && el.dataset?.slot) {
    return `@${canvasVideoSlotLabel(Number(el.dataset.slot), videoSlotPrefix)}`;
  }
  if (el.tagName === "BR") return "\n";
  let out = "";
  el.childNodes.forEach((child) => {
    out += serializeNode(child, imageSlotPrefix, videoSlotPrefix);
  });
  return out;
}

function serializeEditor(
  root: HTMLElement,
  imageSlotPrefix: string,
  videoSlotPrefix: string
): string {
  const parts: string[] = [];
  root.childNodes.forEach((child, index) => {
    if (
      index > 0 &&
      child.nodeType === Node.ELEMENT_NODE &&
      ["DIV", "P"].includes((child as HTMLElement).tagName)
    ) {
      parts.push("\n");
    }
    parts.push(serializeNode(child, imageSlotPrefix, videoSlotPrefix));
  });
  return parts.join("");
}

function renderFromValue(
  root: HTMLElement,
  value: string,
  imageSlotItems: { slot: number; item: CanvasItem }[],
  videoSlotItems: { slot: number; item: CanvasItem }[],
  imageSlotPrefix: string,
  videoSlotPrefix: string
) {
  // Clear & rebuild simple inline nodes.
  root.innerHTML = "";

  const imageSlotMap = new Map<number, CanvasItem>();
  imageSlotItems.forEach((r) => imageSlotMap.set(r.slot, r.item));
  const videoSlotMap = new Map<number, CanvasItem>();
  videoSlotItems.forEach((r) => videoSlotMap.set(r.slot, r.item));

  const re = /@(图|图片|image|视频|video)(\d+)/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (start > last)
      root.appendChild(document.createTextNode(value.slice(last, start)));
    const prefix = m[1];
    const slot = Number(m[2]);
    const isVideo = isVideoPrefix(prefix);
    const item = isVideo
      ? videoSlotMap.get(slot)
      : imageSlotMap.get(slot);
    if (item) {
      const span = document.createElement("span");
      span.dataset.token = isVideo ? "canvas-video" : "canvas-image";
      span.dataset.slot = String(slot);
      span.contentEditable = "false";
      span.className =
        "inline-flex items-center align-middle px-1.5 py-0.5 mx-0.5 border border-foreground/20 bg-secondary/10";

      if (isVideo) {
        const iconWrap = document.createElement("span");
        iconWrap.className =
          "w-5 h-5 flex items-center justify-center bg-foreground/10 border border-foreground/20";
        // The Film icon is rendered as a React component; in vanilla DOM we use an SVG string.
        iconWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>`;
        span.appendChild(iconWrap);
      } else {
        const img = document.createElement("img");
        img.src = toFullUrl(item.src);
        img.alt = item.name;
        img.className = "w-5 h-5 object-cover border border-foreground/20";
        span.appendChild(img);
      }

      const label = document.createElement("span");
      label.className = cn(
        "ml-1 text-[11px] font-bold font-mono",
        isVideo ? "text-accent-purple" : "text-accent-cyan"
      );
      label.textContent = isVideo
        ? canvasVideoSlotLabel(slot, videoSlotPrefix)
        : canvasImageSlotLabel(slot, imageSlotPrefix);
      span.appendChild(label);

      root.appendChild(span);
    } else {
      root.appendChild(document.createTextNode(m[0]));
    }
    last = end;
  }
  if (last < value.length)
    root.appendChild(document.createTextNode(value.slice(last)));
}

function isImagePrefix(prefix: string): boolean {
  return ["图", "图片", "image"].some(
    (a) => a.toLowerCase() === prefix.toLowerCase()
  );
}

function isVideoPrefix(prefix: string): boolean {
  return ["视频", "video"].some(
    (a) => a.toLowerCase() === prefix.toLowerCase()
  );
}

export function InlineCanvasMentionEditor({
  value,
  onChange,
  canvasImages,
  allowedTypes = ["image"],
  placeholder,
  className,
  onSubmit,
  enableSubmitOnEnter = true,
  onPasteImageFile,
  submitAction,
  footerLeft,
  embedded = false,
}: {
  value: string;
  onChange: (next: string) => void;
  canvasImages: CanvasItem[];
  allowedTypes?: ("image" | "video")[];
  placeholder?: string;
  className?: string;
  onSubmit?: () => void;
  enableSubmitOnEnter?: boolean;
  onPasteImageFile?: (file: File) => void;
  /** 嵌入输入框右下角的操作（如生成按钮） */
  submitAction?: React.ReactNode;
  /** 嵌入输入框左下角（如生成参数摘要） */
  footerLeft?: React.ReactNode;
  /** 画布节点内嵌：更紧凑、无外边框 */
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const [mentionTail, setMentionTail] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const imageSlotPrefix = t("intelligenceHub.canvasImageSlotPrefix");
  const videoSlotPrefix = t("intelligenceHub.canvasVideoSlotPrefix");
  const allowImage = allowedTypes.includes("image");
  const allowVideo = allowedTypes.includes("video");

  const imageSlotItems = useMemo(() => {
    let slot = 0;
    return canvasImages
      .filter((i) => (i.type ?? "image") !== "video")
      .map((item) => {
        slot += 1;
        return { slot, item, kind: "image" as const };
      });
  }, [canvasImages]);

  const videoSlotItems = useMemo(() => {
    let slot = 0;
    return canvasImages
      .filter((i) => i.type === "video")
      .map((item) => {
        slot += 1;
        return { slot, item, kind: "video" as const };
      });
  }, [canvasImages]);

  const slotItems = useMemo(() => {
    const items: { slot: number; item: CanvasItem; kind: "image" | "video" }[] = [];
    if (allowImage) items.push(...imageSlotItems);
    if (allowVideo) items.push(...videoSlotItems);
    return items;
  }, [allowImage, allowVideo, imageSlotItems, videoSlotItems]);

  const visibleMentions = useMemo(() => {
    if (mentionTail === null) return [];
    const q = mentionTail.trim().toLowerCase();
    const result = slotItems
      .filter(({ item, slot, kind }) => {
        if (!q) return true;
        const imagePrefix = imageSlotPrefix.toLowerCase();
        const videoPrefix = videoSlotPrefix.toLowerCase();

        // Exact slot queries like "图1" / "image1" / "视频1" / "video1"
        const imageExact = new RegExp(`^(?:图|图片|image)(\\d+)$`, "i").exec(q);
        const videoExact = new RegExp(`^(?:视频|video)(\\d+)$`, "i").exec(q);

        if (imageExact && kind === "image") {
          return Number(imageExact[1]) === slot;
        }
        if (videoExact && kind === "video") {
          return Number(videoExact[1]) === slot;
        }

        // Prefix-only queries like "图" / "image" / "视频" / "video"
        const isImagePrefixQuery =
          new RegExp(`^(?:图|图片|${imagePrefix})\\d*$`, "i").test(q) ||
          /^image\d*$/i.test(q);
        const isVideoPrefixQuery =
          new RegExp(`^(?:视频|${videoPrefix})\\d*$`, "i").test(q) ||
          /^video\d*$/i.test(q);

        if (isImagePrefixQuery && kind !== "image") return false;
        if (isVideoPrefixQuery && kind !== "video") return false;

        return (
          item.name.toLowerCase().includes(q) ||
          item.src.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
    return result;
  }, [imageSlotPrefix, videoSlotPrefix, mentionTail, slotItems]);

  // Reset highlight to first item whenever the mention dropdown opens or query changes.
  useEffect(() => {
    setHighlightedIndex(0);
  }, [mentionTail]);

  // Keep DOM in sync on external value changes (not while focused to avoid caret jumps).
  useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    if (isFocused) return;
    // Avoid rebuilding tokens (which can trigger image re-decode / refetch) if DOM already matches.
    const current = serializeEditor(root, imageSlotPrefix, videoSlotPrefix);
    if (current !== value) {
      renderFromValue(
        root,
        value,
        imageSlotItems,
        videoSlotItems,
        imageSlotPrefix,
        videoSlotPrefix
      );
    }
  }, [
    value,
    imageSlotItems,
    videoSlotItems,
    isFocused,
    imageSlotPrefix,
    videoSlotPrefix,
  ]);

  const emitChangeFromDom = useCallback(() => {
    const root = editorRef.current;
    if (!root) return;
    const next = serializeEditor(root, imageSlotPrefix, videoSlotPrefix);
    onChange(next);
  }, [onChange, imageSlotPrefix, videoSlotPrefix]);

  const updateMentionTailFromCaret = useCallback(() => {
    const root = editorRef.current;
    if (!root) return;
    const before = getSelectionTextBeforeCaret(root);
    const idx = before.lastIndexOf("@");
    if (idx < 0) {
      setMentionTail(null);
      return;
    }
    const tail = before.slice(idx + 1);
    if (/\s/.test(tail)) {
      setMentionTail(null);
      return;
    }
    setMentionTail(tail);
  }, []);

  const applyMention = useCallback(
    (slot: number, kind: "image" | "video") => {
      const root = editorRef.current;
      if (!root) return;
      const picked =
        kind === "video"
          ? videoSlotItems.find((x) => x.slot === slot)
          : imageSlotItems.find((x) => x.slot === slot);
      if (!picked) return;

      const span = document.createElement("span");
      span.dataset.token = kind === "video" ? "canvas-video" : "canvas-image";
      span.dataset.slot = String(slot);
      span.contentEditable = "false";
      span.className =
        "inline-flex items-center align-middle px-1.5 py-0.5 mx-0.5 border border-foreground/20 bg-secondary/10";

      if (kind === "video") {
        const iconWrap = document.createElement("span");
        iconWrap.className =
          "w-5 h-5 flex items-center justify-center bg-foreground/10 border border-foreground/20";
        iconWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>`;
        span.appendChild(iconWrap);
      } else {
        const img = document.createElement("img");
        img.src = toFullUrl(picked.item.src);
        img.alt = picked.item.name;
        img.className = "w-5 h-5 object-cover border border-foreground/20";
        span.appendChild(img);
      }

      const label = document.createElement("span");
      label.className = cn(
        "ml-1 text-[11px] font-bold font-mono",
        kind === "video" ? "text-accent-purple" : "text-accent-cyan"
      );
      label.textContent =
        kind === "video"
          ? canvasVideoSlotLabel(slot, videoSlotPrefix)
          : canvasImageSlotLabel(slot, imageSlotPrefix);
      span.appendChild(label);

      // Replace "@<tail>" with token node.
      const replaceLen = 1 + (mentionTail?.length ?? 0);
      replaceTextInRangeWithNode(root, replaceLen, span);
      setMentionTail(null);
      emitChangeFromDom();
      root.focus();
    },
    [emitChangeFromDom, imageSlotItems, imageSlotPrefix, mentionTail, videoSlotItems, videoSlotPrefix]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const hasMentions = mentionTail !== null && visibleMentions.length > 0;

      if (hasMentions) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            Math.min(prev + 1, visibleMentions.length - 1)
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const picked = visibleMentions[highlightedIndex];
          if (picked) {
            applyMention(picked.slot, picked.kind);
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setMentionTail(null);
          return;
        }
      }

      if (
        enableSubmitOnEnter &&
        e.key === "Enter" &&
        (e.ctrlKey || e.metaKey)
      ) {
        e.preventDefault();
        onSubmit?.();
        return;
      }
      // Keep mention tail updated on navigation/backspace.
      window.setTimeout(() => updateMentionTailFromCaret(), 0);
    },
    [
      mentionTail,
      visibleMentions,
      highlightedIndex,
      applyMention,
      enableSubmitOnEnter,
      onSubmit,
      updateMentionTailFromCaret,
    ]
  );

  const handleInput = useCallback(() => {
    emitChangeFromDom();
    updateMentionTailFromCaret();
  }, [emitChangeFromDom, updateMentionTailFromCaret]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          e.preventDefault();
          onPasteImageFile?.(file);
          break;
        }
      }
    },
    [onPasteImageFile]
  );

  const hasFooter = Boolean(footerLeft || submitAction);

  const noItemsMessage = allowImage
    ? allowVideo
      ? t("intelligenceHub.canvasMentionNoItems")
      : t("intelligenceHub.canvasMentionNoImages")
    : allowVideo
      ? t("intelligenceHub.canvasMentionNoVideos")
      : t("intelligenceHub.canvasMentionNoItems");

  return (
    <div
      className={cn(
        "relative flex flex-col",
        embedded
          ? "rounded-sm bg-background/90"
          : "border-brutal border-foreground bg-background",
        className
      )}
    >
      <div className="relative min-h-0 flex-1">
        {mentionTail !== null && (
          <div className="absolute left-0 right-0 bottom-full mb-1 z-30 max-h-40 overflow-y-auto border border-foreground/20 bg-card brutal-shadow">
            {visibleMentions.length === 0 ? (
              <div className="px-2.5 py-2 text-[10px] text-muted-foreground">
                {slotItems.length === 0
                  ? noItemsMessage
                  : t("intelligenceHub.canvasMentionNoMatch")}
              </div>
            ) : (
              visibleMentions.map(({ item, slot, kind }, index) => (
                <button
                  key={`${kind}-${slot}-${item.src}`}
                  type="button"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => applyMention(slot, kind)}
                  className={cn(
                    "w-full px-2.5 py-2 text-left border-b border-foreground/10 last:border-b-0 transition-none flex items-center gap-2",
                    index === highlightedIndex
                      ? "bg-accent-cyan/15"
                      : "hover:bg-secondary"
                  )}
                >
                  {kind === "video" ? (
                    <span className="w-7 h-7 flex items-center justify-center bg-foreground/10 border border-foreground/20 shrink-0">
                      <Film className="w-4 h-4 text-accent-purple" />
                    </span>
                  ) : (
                    <img
                      src={toFullUrl(item.src)}
                      alt={item.name}
                      className="w-7 h-7 object-cover border border-foreground/20 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold truncate">
                      <span
                        className={cn(
                          "mr-1",
                          kind === "video"
                            ? "text-accent-purple"
                            : "text-accent-cyan"
                        )}
                      >
                        {kind === "video"
                          ? canvasVideoSlotLabel(slot, videoSlotPrefix)
                          : canvasImageSlotLabel(slot, imageSlotPrefix)}
                      </span>
                      {item.name}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {!isFocused && (!value || value.trim().length === 0) && placeholder && (
          <div
            className={cn(
              "absolute text-muted-foreground/45 font-mono pointer-events-none select-none",
              embedded
                ? "left-2.5 top-2 text-[11px] leading-snug"
                : "left-3 top-3 text-sm"
            )}
          >
            {placeholder}
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            setMentionTail(null);
            // Normalize DOM only when needed (rebuilding tokens can look like "reloading images").
            const root = editorRef.current;
            if (!root) return;
            const current = serializeEditor(root, imageSlotPrefix, videoSlotPrefix);
            if (current !== value) {
              renderFromValue(
                root,
                value,
                imageSlotItems,
                videoSlotItems,
                imageSlotPrefix,
                videoSlotPrefix
              );
            }
          }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onMouseUp={() => updateMentionTailFromCaret()}
          onKeyUp={() => updateMentionTailFromCaret()}
          onPaste={handlePaste}
          className={cn(
            "w-full shrink-0 overflow-y-auto overflow-x-hidden font-mono whitespace-pre-wrap break-words",
            embedded
              ? "min-h-[80px] h-[80px] px-2.5 pt-2.5 pb-2.5 text-[11px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-inset focus:ring-accent-cyan/50"
              : cn(
                  "min-h-[112px] h-[112px] px-3 pt-3 pb-3 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-cyan/60",
                  "sm:min-h-[128px] sm:h-[128px] md:min-h-[140px] md:h-[140px]"
                )
          )}
        />
      </div>

      {hasFooter ? (
        <div
          className={cn(
            "flex shrink-0 items-center gap-1",
            embedded
              ? "border-t border-foreground/8 bg-foreground/[0.03] px-1.5 py-1"
              : "gap-1.5 border-t border-foreground/10 bg-secondary/20 px-2 py-1.5"
          )}
        >
          {footerLeft ? (
            <div className="flex min-w-0 flex-1 items-center gap-1">
              {footerLeft}
            </div>
          ) : (
            <div className="flex-1" />
          )}
          {submitAction ? (
            <div className="shrink-0 pointer-events-auto">{submitAction}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
