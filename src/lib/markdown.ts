/**
 * 判断文本是否包含 Markdown 语法；纯文本走 whitespace-pre-wrap，
 * 避免被 markdown 渲染吞掉换行。
 */
export function looksLikeMarkdown(content: string): boolean {
  return (
    /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|~~~|\|)/.test(content) ||
    /\*\*[^*\n]+\*\*/.test(content) ||
    /`[^`\n]+`/.test(content) ||
    /\[[^\]\n]+\]\([^)\n]+\)/.test(content) ||
    /(^|\n)\s*(-{3,}|\*{3,}|_{3,})\s*(\n|$)/.test(content)
  );
}
