import { BASE_URL, STATIC_BASE_URL } from "@/api/request";

function getStaticOrigin(): string {
  try {
    return new URL(STATIC_BASE_URL).origin;
  } catch {
    return "";
  }
}

function shouldRewriteToSameOrigin(u: URL): boolean {
  const staticOrigin = getStaticOrigin();
  if (staticOrigin && u.origin === staticOrigin) return true;
  const isStaticPath =
    u.pathname.startsWith("/uploads/") || u.pathname.startsWith("/storage/");
  return isStaticPath && u.hostname.endsWith("useneospark.com");
}

/**
 * Build a URL that the browser can `fetch` without CORS issues:
 * - Remote assets on the API host are rewritten to a same-origin path
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
      if (shouldRewriteToSameOrigin(u)) {
        return `${u.pathname}${u.search}`;
      }
      return src;
    } catch {
      return src;
    }
  }
  return src.startsWith("/") ? src : `/${src}`;
}

/**
 * Fetch an image/asset blob without cross-origin CORS failures.
 * Tries same-origin path first (via proxy), then falls back to the authenticated download API.
 */
export async function fetchAssetBlob(
  src: string,
  fileName = "asset"
): Promise<Blob> {
  const fetchableUrl = toFetchableAssetUrl(src);

  if (!fetchableUrl.startsWith("http")) {
    try {
      const response = await fetch(fetchableUrl, { credentials: "include" });
      if (response.ok) return response.blob();
    } catch {
      // fall through to API proxy
    }
  }

  const { getToken } = await import("@/api/token");
  const token = getToken();
  const url = `${BASE_URL}/drawing/download?url=${encodeURIComponent(src)}&name=${encodeURIComponent(fileName)}`;
  const response = await fetch(url, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  return response.blob();
}
