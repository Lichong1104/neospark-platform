import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// 临时开关：用于本地/临时关闭路由登录校验
// 需要恢复时改为 false 即可
const DISABLE_ROUTE_AUTH = false;

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (DISABLE_ROUTE_AUTH) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex gap-1">
          <span className="w-3 h-3 bg-accent-cyan border-brutal border-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-3 h-3 bg-accent-pink border-brutal border-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-3 h-3 bg-accent-yellow border-brutal border-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // 把原访问路径透传给登录页，登录成功后回跳
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
