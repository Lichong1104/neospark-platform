/** 通用 API 响应格式 */
export interface ApiResponse<T = unknown> {
  code: number;
  message?: string;
  msg?: string;
  data: T;
}

/** 分页参数 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/** 分页响应 */
export interface PaginatedData<T> {
  total: number;
  offset: number;
  limit: number;
  items?: T[];
}
