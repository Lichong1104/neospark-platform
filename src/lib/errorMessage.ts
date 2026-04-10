type ErrorLike = {
  response?: {
    data?: {
      detail?: unknown;
      message?: unknown;
    };
  };
  message?: unknown;
};

function normalizeDetail(detail: unknown): string | null {
  if (!detail) return null;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const maybeMsg = (item as { msg?: unknown }).msg;
          if (typeof maybeMsg === "string") return maybeMsg;
        }
        return null;
      })
      .filter(Boolean) as string[];
    if (parts.length > 0) return parts.join("; ");
  }

  if (detail && typeof detail === "object") {
    const maybeMsg = (detail as { msg?: unknown }).msg;
    if (typeof maybeMsg === "string") return maybeMsg;
    try {
      return JSON.stringify(detail);
    } catch {
      return String(detail);
    }
  }

  return String(detail);
}

export function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as ErrorLike;
  return (
    normalizeDetail(e?.response?.data?.detail) ||
    normalizeDetail(e?.response?.data?.message) ||
    normalizeDetail(e?.message) ||
    fallback
  );
}

