import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const MdCode: React.FC<React.HTMLAttributes<HTMLElement>> = (props) => {
  const { className, children } = props;
  const isBlock = /language-/.test(className || "");
  if (isBlock) {
    return (
      <code
        {...props}
        className={cn(
          "block w-full overflow-x-auto bg-background px-3 py-2 text-xs leading-relaxed",
          className
        )}
      />
    );
  }
  return (
    <code
      {...props}
      className="break-all border border-foreground/20 bg-secondary/40 px-1 py-0.5 text-[0.85em] font-mono text-accent-pink"
    >
      {children}
    </code>
  );
};

const MdPre: React.FC<React.HTMLAttributes<HTMLPreElement>> = (props) => (
  <pre
    {...props}
    className="my-2 overflow-x-auto border-brutal border-foreground bg-background"
  />
);

const MdA: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = (props) => (
  <a
    {...props}
    target="_blank"
    rel="noopener noreferrer"
    className="break-all font-medium text-accent-cyan underline decoration-accent-cyan/60 underline-offset-2 hover:decoration-accent-cyan"
  />
);

const MdImg: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
  // 图片交给上层 images 附件网格渲染；正文里出现裸图片时兜底显示为可点击链接样式
  <a
    href={props.src}
    target="_blank"
    rel="noopener noreferrer"
    className="break-all font-medium text-accent-cyan underline underline-offset-2"
  >
    🖼 {props.alt || props.src}
  </a>
);

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Agent 回复的 Markdown 渲染器，排版遵循 neo-brutalist 风格：
 * 标题带左侧色条、代码块带边框、表格/引用/分割线均有明确边界，
 * 长链接与 URL 任意位置断行，避免撑破气泡。
 */
const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className,
}) => (
  <div
    className={cn(
      "break-words text-sm leading-relaxed [overflow-wrap:anywhere]",
      // 段落与列表
      "[&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
      "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5",
      "[&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5",
      "[&_li]:my-0.5 [&_li>p]:my-0",
      // 标题：加粗 + 左侧 accent-pink 色条
      "[&_h1]:my-3 [&_h1]:border-b-2 [&_h1]:border-foreground/80 [&_h1]:pb-1 [&_h1]:text-lg [&_h1]:font-bold",
      "[&_h2]:my-3 [&_h2]:border-l-4 [&_h2]:border-accent-pink [&_h2]:pl-2 [&_h2]:text-base [&_h2]:font-bold",
      "[&_h3]:my-2.5 [&_h3]:border-l-2 [&_h3]:border-accent-pink/70 [&_h3]:pl-2 [&_h3]:text-sm [&_h3]:font-bold",
      "[&_h4]:my-2 [&_h4]:text-sm [&_h4]:font-bold",
      "[&_h1:first-child]:mt-0 [&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0",
      // 强调
      "[&_strong]:font-bold [&_strong]:text-foreground",
      "[&_em]:italic",
      "[&_del]:text-muted-foreground",
      // 引用
      "[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-accent-cyan/60 [&_blockquote]:bg-secondary/30 [&_blockquote]:px-3 [&_blockquote]:py-1.5 [&_blockquote]:text-foreground/80",
      // 分割线
      "[&_hr]:my-3 [&_hr]:border-0 [&_hr]:border-t-2 [&_hr]:border-dashed [&_hr]:border-foreground/30",
      // 表格
      "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs",
      "[&_th]:border [&_th]:border-foreground/40 [&_th]:bg-secondary/50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-bold",
      "[&_td]:border [&_td]:border-foreground/25 [&_td]:px-2 [&_td]:py-1 [&_td]:align-top",
      className
    )}
  >
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{ a: MdA, img: MdImg, pre: MdPre, code: MdCode }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

export default MarkdownContent;
