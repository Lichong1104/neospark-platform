import { STATIC_BASE_URL } from "@/api/request";

/** 服务端相对路径 / 完整 URL → 完整 URL（用于预览展示） */
export function toFullUrl(value: string): string {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `${STATIC_BASE_URL}${value}`;
}

/** 完整 URL / 相对路径 → 服务端相对路径（用于 ref_image_path 等字段） */
export function toServerPath(value: string): string {
  if (!value) return "";
  if (value.startsWith(STATIC_BASE_URL)) return value.slice(STATIC_BASE_URL.length);
  if (value.startsWith("http")) {
    try {
      return new URL(value).pathname;
    } catch {
      return value;
    }
  }
  return value;
}
