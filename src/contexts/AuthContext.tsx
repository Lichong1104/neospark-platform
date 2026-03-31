import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getToken, clearToken } from "@/api/token";
import authApi from "@/api/auth";
import type { UserInfo } from "@/types/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  userInfo: UserInfo | null;
  isLoading: boolean;
  login: (email: string, token: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userEmail: null,
  userInfo: null,
  isLoading: true,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken());
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem("auth_email");
  });
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 启动时：优先尝试获取用户信息（兼容 cookie session 与 token 登录）
  useEffect(() => {
    authApi
      .getCurrentUser()
      .then((info) => {
        setUserInfo(info);
        setUserEmail(info.email);
        setIsAuthenticated(true);
      })
      .catch(() => {
        // 未登录或登录态无效：清理本地 token 状态
        clearToken();
        setIsAuthenticated(false);
        setUserEmail(null);
        setUserInfo(null);
        localStorage.removeItem("auth_email");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback((email: string, _token: string) => {
    // token 已在 authApi.login 中通过 setToken 保存
    setIsAuthenticated(true);
    setUserEmail(email);
    localStorage.setItem("auth_email", email);
    // 获取完整用户信息
    authApi.getCurrentUser().then(setUserInfo).catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // 即使后端登出失败也清除本地状态
    }
    clearToken();
    setIsAuthenticated(false);
    setUserEmail(null);
    setUserInfo(null);
    localStorage.removeItem("auth_email");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const info = await authApi.getCurrentUser();
      setUserInfo(info);
      setUserEmail(info.email);
    } catch {
      // silent
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, userEmail, userInfo, isLoading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
