import http from "./request";
import type { ApiKeyItem, ApiKeyListData, CreateApiKeyData, CreateApiKeyParams, UpdateApiKeyParams } from "@/types/apiKeys";

type AnyApiResponse<T> = {
  code?: string | number;
  message?: string;
  msg?: string;
  data?: T;
};

function unwrap<T>(res: unknown): T {
  const r = res as AnyApiResponse<T>;
  if (r && typeof r === "object" && "data" in r && r.data !== undefined) return r.data as T;
  return res as T;
}

export async function listApiKeys(params?: { include_inactive?: boolean }): Promise<ApiKeyListData> {
  const res = await http.get<ApiKeyListData>("/api-keys", params as unknown as Record<string, unknown>);
  return unwrap<ApiKeyListData>(res);
}

export async function getApiKeyDetail(keyId: number): Promise<ApiKeyItem> {
  const res = await http.get<ApiKeyItem>(`/api-keys/${keyId}`);
  return unwrap<ApiKeyItem>(res);
}

export async function createApiKey(params: CreateApiKeyParams): Promise<CreateApiKeyData> {
  const res = await http.post<CreateApiKeyData>("/api-keys", params);
  return unwrap<CreateApiKeyData>(res);
}

export async function updateApiKey(keyId: number, params: UpdateApiKeyParams): Promise<ApiKeyItem> {
  const res = await http.put<ApiKeyItem>(`/api-keys/${keyId}`, params);
  return unwrap<ApiKeyItem>(res);
}

export async function deleteApiKey(keyId: number): Promise<null> {
  const res = await http.del<null>(`/api-keys/${keyId}`);
  return unwrap<null>(res);
}

const apiKeysApi = {
  listApiKeys,
  getApiKeyDetail,
  createApiKey,
  updateApiKey,
  deleteApiKey,
};

export default apiKeysApi;

