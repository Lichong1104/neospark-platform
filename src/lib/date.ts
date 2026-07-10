/**
 * 将 ISO 时间字符串格式化为本地可读格式。
 * 对于 null/undefined/无效值返回 "—"。
 */
export function formatMaybeDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
