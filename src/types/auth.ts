/** 发送验证码请求 */
export interface SendCodeParams {
  email: string;
}

/** 发送验证码响应 */
export type SendCodeResponse = void;

/** 登录请求 */
export interface LoginParams {
  email: string;
  code?: string;
}

/** 登录响应 */
export interface LoginResponse {
  user_id?: number;
  email?: string;
  access_token?: string;
  token_type?: string;
  is_new_user?: boolean;
  message?: string;
  redirect_url?: string;
}

/** 登出响应 */
export interface LogoutResponse {
  message: string;
}

/** 当前用户信息 */
export interface UserInfo {
  id: number;
  email: string;
  is_logged_in: boolean;
  last_login_at: string;
  created_at: string;
  /** 当前积分余额（后端字段名可能为 balance） */
  balance?: number;
}
