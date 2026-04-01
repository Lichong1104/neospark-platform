import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// 临时开关：用于本地/临时关闭路由登录校验
// 需要恢复时改为 false 即可
const DISABLE_ROUTE_AUTH = false;

interface LoginRouteGuardProps {
  children: React.ReactNode;
}

const LoginRouteGuard: React.FC<LoginRouteGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (DISABLE_ROUTE_AUTH) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex gap-1">
          <span
            className="w-3 h-3 bg-accent-cyan border-brutal border-foreground animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-3 h-3 bg-accent-pink border-brutal border-foreground animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-3 h-3 bg-accent-yellow border-brutal border-foreground animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default LoginRouteGuard;
