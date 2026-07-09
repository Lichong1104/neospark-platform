type ErrorWithResponse = {
  message?: string;
  code?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
};

export type PollingErrorKind =
  | "network"
  | "timeout"
  | "server"
  | "auth"
  | "notFound"
  | "client"
  | "unknown";

export interface ClassifiedPollingError {
  kind: PollingErrorKind;
  status?: number;
  message: string;
}

function getErrorMessage(err: ErrorWithResponse): string {
  if (typeof err?.response?.data === "string") {
    return err.response.data;
  }
  if (err?.response?.data && typeof err.response.data === "object") {
    const data = err.response.data as { message?: string; detail?: string };
    if (data.message) return data.message;
    if (data.detail) return data.detail;
  }
  return err?.message || "Unknown error";
}

export function classifyPollingError(err: unknown): ClassifiedPollingError {
  const e = err as ErrorWithResponse;
  const status = e?.response?.status;
  const code = e?.code;
  const message = getErrorMessage(e);

  if (status === 401 || status === 403) {
    return { kind: "auth", status, message };
  }
  if (status === 404) {
    return { kind: "notFound", status, message };
  }
  if (status !== undefined && status >= 400 && status < 500) {
    return { kind: "client", status, message };
  }
  if (status !== undefined && status >= 500) {
    return { kind: "server", status, message };
  }
  if (
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    /timeout/i.test(message)
  ) {
    return { kind: "timeout", status, message };
  }
  if (
    code === "ERR_NETWORK" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    /network/i.test(message)
  ) {
    return { kind: "network", status, message };
  }
  return { kind: "unknown", status, message };
}

export function shouldRetryPollingError(kind: PollingErrorKind): boolean {
  return kind === "network" || kind === "timeout" || kind === "server";
}
