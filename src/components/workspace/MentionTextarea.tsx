import React, { useCallback, useMemo, useRef, useState } from "react";
import { AtSign } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface MentionCandidate {
  id: string;
  name: string;
  description?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  /** 下拉关闭时按下 Enter 的原始行为（由父组件处理发送） */
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  /** 候选 Skill（通常为当前已选中的 Skill），@ 补全只在此列表内匹配 */
  skills: MentionCandidate[];
  placeholder?: string;
  disabled?: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  className?: string;
}

interface MentionQuery {
  /** '@' 在文本中的下标 */
  start: number;
  /** 光标位置 */
  caret: number;
  query: string;
}

/** 光标前是否处于一个未闭合的 @ 查询中（取光标前最后一个 @，其后无空白/@） */
function findMentionQuery(text: string, caret: number): MentionQuery | null {
  const before = text.slice(0, caret);
  const match = /@([^\s@]{0,30})$/.exec(before);
  if (!match) return null;
  return {
    start: caret - match[1].length - 1,
    caret,
    query: match[1],
  };
}

// 过滤时忽略查询末尾的标点（用户输入 "@助手，" 时仍能匹配到「助手」）
function trimQuery(query: string): string {
  return query.replace(/[，。、；：？！,.;:!?]+$/, "");
}

const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value,
  onChange,
  onKeyDown,
  skills,
  placeholder,
  disabled,
  textareaRef,
  className,
}) => {
  const { t } = useTranslation();
  const [mention, setMention] = useState<MentionQuery | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [caret, setCaret] = useState(value.length);
  const [composing, setComposing] = useState(false);
  const suppressNextRef = useRef(false);

  const candidates = useMemo(() => {
    const query = trimQuery(mention?.query ?? "").toLowerCase();
    const filtered = query
      ? skills.filter((s) => s.name.toLowerCase().includes(query))
      : skills;
    return filtered.slice(0, 6);
  }, [mention, skills]);

  const syncCaret = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    setCaret(el.selectionStart ?? el.value.length);
  }, [textareaRef]);

  const updateMention = useCallback(
    (text: string, caretPos: number) => {
      setMention(findMentionQuery(text, caretPos));
      setActiveIndex(0);
    },
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const pos = e.target.selectionStart ?? e.target.value.length;
    setCaret(pos);
    // 中文输入法组字期间不更新 @ 查询，避免候选词干扰下拉
    if (!composing) {
      updateMention(e.target.value, pos);
    }
  };

  const selectCandidate = useCallback(
    (candidate: MentionCandidate) => {
      const el = textareaRef.current;
      if (!el || !mention) return;
      const insert = `@${candidate.name} `;
      const next = value.slice(0, mention.start) + insert + value.slice(mention.caret);
      onChange(next);
      suppressNextRef.current = true;
      setMention(null);
      const newCaret = mention.start + insert.length;
      setCaret(newCaret);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(newCaret, newCaret);
      });
    },
    [mention, onChange, textareaRef, value]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // IME 组字期间（如中文输入法选字）完全放行，不拦截 Enter/方向键
    if (e.nativeEvent.isComposing) {
      return;
    }
    const open = mention !== null && candidates.length > 0;
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % candidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + candidates.length) % candidates.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectCandidate(candidates[activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    onKeyDown?.(e);
  };

  const dropdownOpen = mention !== null && candidates.length > 0 && !disabled;

  return (
    <div className="relative">
      {dropdownOpen && (
        <div className="absolute bottom-full left-0 right-0 z-20 mb-1 border-brutal border-foreground bg-card shadow-brutal">
          <div className="flex items-center gap-1.5 border-b border-foreground/10 bg-secondary/30 px-3 py-1.5">
            <AtSign className="h-3 w-3 text-accent-pink" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("agentHub.mentionHint")}
            </span>
          </div>
          <div className="max-h-[180px] overflow-y-auto p-1">
            {candidates.map((skill, idx) => (
              <button
                key={skill.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectCandidate(skill);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn(
                  "flex w-full items-start gap-2 border px-2 py-1.5 text-left transition-none",
                  idx === activeIndex
                    ? "border-accent-pink bg-accent-pink/10"
                    : "border-transparent hover:border-foreground/30"
                )}
              >
                <span className="mt-0.5 inline-flex shrink-0 items-center border border-accent-pink bg-accent-pink/10 px-1 text-[10px] font-bold text-foreground">
                  @{skill.name}
                </span>
                {skill.description && (
                  <span className="min-w-0 flex-1 truncate text-[10px] leading-snug text-muted-foreground">
                    {skill.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={(e) => {
          setComposing(false);
          // 组字结束后按最终文本重算 @ 查询
          const el = e.currentTarget;
          const pos = el.selectionStart ?? el.value.length;
          setCaret(pos);
          updateMention(el.value, pos);
        }}
        onSelect={syncCaret}
        onClick={syncCaret}
        onKeyUp={syncCaret}
        onBlur={() => {
          // 延迟关闭，保证 onMouseDown 先触发
          setTimeout(() => setMention(null), 150);
        }}
        placeholder={placeholder}
        className={className}
        rows={2}
        disabled={disabled}
      />
    </div>
  );
};

export default MentionTextarea;
