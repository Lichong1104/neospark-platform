import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";
import { getToken } from "./token";
import type { ApiResponse } from "@/types/common";

// API 基础路径 — 按需修改为实际后端地址
// const BASE_URL = "http://116.204.67.82:9100";
// const BASE_URL = "https://api.useneospark.com/api/v1";
const BASE_URL = "http://localhost:8000/api/v1";
// 静态资源基础路径（去掉 /api/v1）
const STATIC_BASE_URL = BASE_URL.replace(/\/api\/v1\/?$/, "");

const instance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 0,
  // 让后端写入的 HttpOnly Cookie（如 neospark_session）随请求自动携带
  withCredentials: true,
});

// 请求拦截器：自动注入 JWT Token
instance.interceptors.request.use(
  (config) => {
    const token = getToken();
    // const token = true;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // config.headers.Authorization = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwIjoiYWNjZXNzIiwianRpIjoiRFlxODZxN016eXJjNEQwayIsImlhdCI6MTc3NTAzMzU5MywiZXhwIjoxNzc1NjM4MzkzLCJhdWQiOiJuZW9zcGFyay1hcGkiLCJpc3MiOiJuZW9zcGFyayIsImVtYWlsIjoiY2w1NDQzNDhAZ21haWwuY29tIiwic2lkIjoiMTAifQ.Ug5uR20d3rm5D2wNqdiFpTUYwsSngUVcEw78ePdHx6M`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：直接返回 data
instance.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => Promise.reject(error)
);

function get<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<ApiResponse<T>> {
  return instance.get(url, { params });
}

function post<T, D = unknown>(url: string, data?: D): Promise<ApiResponse<T>> {
  return instance.post(url, data);
}

function postForm<T>(url: string, formData: FormData): Promise<ApiResponse<T>> {
  return instance.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

function put<T, D = unknown>(url: string, data?: D): Promise<ApiResponse<T>> {
  return instance.put(url, data);
}

function del<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<ApiResponse<T>> {
  return instance.delete(url, { params });
}

const http = { get, post, postForm, put, del };

export { http, BASE_URL, STATIC_BASE_URL };
export type { ApiResponse };
export default http;
