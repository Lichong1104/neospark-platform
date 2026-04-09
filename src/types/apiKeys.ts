export type ApiKeyStatus = "active" | "inactive" | "expired";

export interface ApiKeyItem {
  id: number;
  name: string;
  is_active: boolean;
  status: ApiKeyStatus;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ApiKeyListData {
  items: ApiKeyItem[];
  total: number;
  active_count: number;
  expired_count: number;
}

export interface CreateApiKeyParams {
  name: string;
  expires_days?: number | null;
}

export interface CreateApiKeyData {
  key: ApiKeyItem & {
    api_key?: string;
  };
  usage?: {
    header_name?: string;
    header_value?: string;
    curl_example?: string;
  };
  warning?: string;
}

export interface UpdateApiKeyParams {
  name?: string;
  is_active?: boolean;
}

