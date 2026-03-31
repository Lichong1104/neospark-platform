import http, { BASE_URL } from "./request";
import { setToken, clearToken } from "./token";
import type {
  SendCodeParams,
  SendCodeResponse,
  LoginParams,
  LoginResponse,
  LogoutResponse,
  UserInfo,
} from "@/types/auth";
import type { ApiResponse } from "@/types/common";

/**
 * 发送邮箱验证码
 */
export function sendCode(params: SendCodeParams): Promise<SendCodeResponse> {
  return http.post(
    "/api/v1/auth/send-code",
    params
  ) as unknown as Promise<SendCodeResponse>;
}

/**
 * 用户登录/注册（验证码方式）
 * 登录成功后自动保存 token
 */
export async function login(params: LoginParams): Promise<LoginResponse> {
  const res = await http.post<LoginResponse>("/api/v1/auth/login", params);
  const data = res.data ?? (res as unknown as LoginResponse);
  if (data.access_token) {
    setToken(data.access_token);
  }
  return data;
}

/**
 * 用户登出
 */
export async function logout(): Promise<LogoutResponse> {
  const res = await http.post<LogoutResponse>("/api/v1/auth/logout");
  clearToken();
  return res.data ?? (res as unknown as LogoutResponse);
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<UserInfo> {
  const res = await http.get<UserInfo>("/api/v1/auth/me");
  return res.data;
}

/**
 * Google OAuth 登录入口（浏览器重定向 + 后端回调写 Cookie）
 * @param next 登录成功后跳回的前端站内路径
 */
export function googleLogin(next: string = "/"): void {
  if (typeof window === "undefined") return;
  const redirectTo = "/";
  const url = `${BASE_URL}/api/v1/auth/google/login?next=/`;
  window.location.href = url;
}

const authApi = { sendCode, login, logout, getCurrentUser, googleLogin };
export default authApi;
