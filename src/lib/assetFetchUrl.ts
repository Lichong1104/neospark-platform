import { STATIC_BASE_URL } from "@/api/request";

function getStaticOrigin(): string {
  try {
    return new URL(STATIC_BASE_URL).origin;
  } catch {
    return "";
  }
}

/**
 * Build a URL that the browser can `fetch` without CORS issues:
 * - Remote assets on the same host as {@link STATIC_BASE_URL} are rewritten to a same-origin path
 *   (e.g. `/uploads/...`) so the Vite dev proxy (or production reverse-proxy) can forward the request.
 * - Relative paths are normalized to start with `/`.
 * - `data:` and `blob:` URLs are returned as-is.
 */
export function toFetchableAssetUrl(src: string): string {
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  if (/^https?:\/\//i.test(src)) {
    try {
      const u = new URL(src);
      const staticOrigin = getStaticOrigin();
      if (staticOrigin && u.origin === staticOrigin) {
        return `${u.pathname}${u.search}`;
      }
      return src;
    } catch {
      return src;
    }
  }
  return src.startsWith("/") ? src : `/${src}`;
}
