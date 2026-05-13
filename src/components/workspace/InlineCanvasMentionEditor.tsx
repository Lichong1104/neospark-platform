import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { STATIC_BASE_URL } from "@/api/request";
import { canvasImageSlotLabel } from "@/lib/canvasImageSlots";
import { useTranslation } from "react-i18next";

type CanvasItem = { id?: string; src: string; name: string; type?: "image" | "video" };

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

function replaceTextInRangeWithNode(root: HTMLElement, replaceLen: number, node: Node) {
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

function serializeEditor(root: HTMLElement, imageSlotPrefix: string): string {
  const parts: string[] = [];
  root.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      parts.push((child as Text).data);
      return;
    }
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      if (el.dataset?.token === "canvas-image" && el.dataset?.slot) {
        parts.push(`@${canvasImageSlotLabel(Number(el.dataset.slot), imageSlotPrefix)}`);
        return;
      }
      parts.push(el.innerText);
      return;
    }
  });
  return parts.join("");
}

function renderFromValue(
  root: HTMLElement,
  value: string,
  slotItems: { slot: number; item: CanvasItem }[],
  imageSlotPrefix: string
) {
  // Clear & rebuild simple inline nodes.
  root.innerHTML = "";

  const slotMap = new Map<number, CanvasItem>();
  slotItems.forEach((r) => slotMap.set(r.slot, r.item));

  const re = /@(图|image)(\d+)/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (start > last) root.appendChild(document.createTextNode(value.slice(last, start)));
    const slot = Number(m[2]);
    const item = slotMap.get(slot);
    if (item) {
      const span = document.createElement("span");
      span.dataset.token = "canvas-image";
      span.dataset.slot = String(slot);
      span.contentEditable = "false";
      span.className =
        "inline-flex items-center align-middle px-1.5 py-0.5 mx-0.5 border border-foreground/20 bg-secondary/10";

      const img = document.createElement("img");
      img.src = toFullUrl(item.src);
      img.alt = item.name;
      img.className = "w-5 h-5 object-cover border border-foreground/20";
      span.appendChild(img);

      const label = document.createElement("span");
      label.className = "ml-1 text-[11px] font-bold font-mono text-accent-cyan";
      label.textContent = canvasImageSlotLabel(slot, imageSlotPrefix);
      span.appendChild(label);

      root.appendChild(span);
    } else {
      root.appendChild(document.createTextNode(m[0]));
    }
    last = end;
  }
  if (last < value.length) root.appendChild(document.createTextNode(value.slice(last)));
}

export function InlineCanvasMentionEditor({
  value,
  onChange,
  canvasImages,
  placeholder,
  className,
  onSubmit,
  enableSubmitOnEnter = true,
  onPasteImageFile,
}: {
  value: string;
  onChange: (next: string) => void;
  canvasImages: CanvasItem[];
  placeholder?: string;
  className?: string;
  onSubmit?: () => void;
  enableSubmitOnEnter?: boolean;
  onPasteImageFile?: (file: File) => void;
}) {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const [mentionTail, setMentionTail] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const imageSlotPrefix = t("intelligenceHub.canvasImageSlotPrefix");

  const slotItems = useMemo(() => {
    let slot = 0;
    return canvasImages
      .filter((i) => (i.type ?? "image") !== "video")
      .map((item) => {
        slot += 1;
        return { slot, item };
      });
  }, [canvasImages]);

  const visibleMentions = useMemo(() => {
    if (mentionTail === null) return [];
    const q = mentionTail.trim().toLowerCase();
    return slotItems
      .filter(({ item, slot }) => {
        if (!q) return true;
        const label = canvasImageSlotLabel(slot, imageSlotPrefix).toLowerCase();
        if (
          new RegExp(`^${imageSlotPrefix.toLowerCase()}\\d*$`).test(q) ||
          /^image\d*$/.test(q)
        ) {
          return label.startsWith(q) || `image${slot}`.startsWith(q);
        }
        const exact = /^(?:图|image)(\d+)$/.exec(q);
        if (exact) return Number(exact[1]) === slot;
        return item.name.toLowerCase().includes(q) || item.src.toLowerCase().includes(q);
      })
      .slice(0, 12);
  }, [imageSlotPrefix, mentionTail, slotItems]);

  // Keep DOM in sync on external value changes (not while focused to avoid caret jumps).
  useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    if (isFocused) return;
    // Avoid rebuilding tokens (which can trigger image re-decode / refetch) if DOM already matches.
    const current = serializeEditor(root, imageSlotPrefix);
    if (current !== value) {
      renderFromValue(root, value, slotItems, imageSlotPrefix);
    }
  }, [value, slotItems, isFocused, imageSlotPrefix]);

  const emitChangeFromDom = useCallback(() => {
    const root = editorRef.current;
    if (!root) return;
    const next = serializeEditor(root, imageSlotPrefix);
    onChange(next);
  }, [onChange, imageSlotPrefix]);

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
    (slot: number) => {
      const root = editorRef.current;
      if (!root) return;
      const picked = slotItems.find((x) => x.slot === slot);
      if (!picked) return;

      const span = document.createElement("span");
      span.dataset.token = "canvas-image";
      span.dataset.slot = String(slot);
      span.contentEditable = "false";
      span.className =
        "inline-flex items-center align-middle px-1.5 py-0.5 mx-0.5 border border-foreground/20 bg-secondary/10";

      const img = document.createElement("img");
      img.src = toFullUrl(picked.item.src);
      img.alt = picked.item.name;
      img.className = "w-5 h-5 object-cover border border-foreground/20";
      span.appendChild(img);

      const label = document.createElement("span");
      label.className = "ml-1 text-[11px] font-bold font-mono text-accent-cyan";
      label.textContent = canvasImageSlotLabel(slot, imageSlotPrefix);
      span.appendChild(label);

      // Replace "@<tail>" with token node.
      const replaceLen = 1 + (mentionTail?.length ?? 0);
      replaceTextInRangeWithNode(root, replaceLen, span);
      setMentionTail(null);
      emitChangeFromDom();
      root.focus();
    },
    [emitChangeFromDom, imageSlotPrefix, mentionTail, slotItems]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (enableSubmitOnEnter && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit?.();
        return;
      }
      // Keep mention tail updated on navigation/backspace.
      window.setTimeout(() => updateMentionTailFromCaret(), 0);
    },
    [enableSubmitOnEnter, onSubmit, updateMentionTailFromCaret]
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

  return (
    <div className={cn("relative", className)}>
      {mentionTail !== null && (
        <div className="absolute left-0 right-0 bottom-full mb-1 z-30 max-h-40 overflow-y-auto border border-foreground/20 bg-card brutal-shadow">
          {visibleMentions.length === 0 ? (
            <div className="px-2.5 py-2 text-[10px] text-muted-foreground">
              {slotItems.length === 0
                ? t("intelligenceHub.canvasMentionNoImages")
                : t("intelligenceHub.canvasMentionNoMatch")}
            </div>
          ) : (
            visibleMentions.map(({ item, slot }) => (
              <button
                key={`${slot}-${item.src}`}
                type="button"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => applyMention(slot)}
                className="w-full px-2.5 py-2 text-left border-b border-foreground/10 last:border-b-0 hover:bg-secondary transition-none flex items-center gap-2"
              >
                <img
                  src={toFullUrl(item.src)}
                  alt={item.name}
                  className="w-7 h-7 object-cover border border-foreground/20 shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">
                    <span className="text-accent-cyan mr-1">
                      {canvasImageSlotLabel(slot, imageSlotPrefix)}
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
        <div className="absolute left-3 top-3 text-muted-foreground/50 font-mono text-sm pointer-events-none select-none">
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
          const current = serializeEditor(root, imageSlotPrefix);
          if (current !== value) {
            renderFromValue(root, value, slotItems, imageSlotPrefix);
          }
        }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={() => updateMentionTailFromCaret()}
        onKeyUp={() => updateMentionTailFromCaret()}
        onPaste={handlePaste}
        className={cn(
          "w-full h-full p-3 border-brutal border-foreground bg-background font-mono text-sm whitespace-pre-wrap break-words",
          "focus:outline-none focus:ring-2 focus:ring-accent-cyan",
          "min-h-[72px] md:min-h-[96px] xl:min-h-[120px]"
        )}
      />
    </div>
  );
}

