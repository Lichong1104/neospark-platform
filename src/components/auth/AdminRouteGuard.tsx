import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import adminApi from "@/api/admin";

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const { userInfo, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (authLoading) return;

      // 优先使用 /auth/me 的 is_admin 字段（文档建议之一）
      if (typeof userInfo?.is_admin === "boolean") {
        if (!cancelled) {
          setIsAdmin(userInfo.is_admin);
          setChecking(false);
        }
        return;
      }

      try {
        const res = await adminApi.checkAdmin();
        if (!cancelled) {
          setIsAdmin(!!res.is_admin);
          setChecking(false);
        }
      } catch {
        // 403/401 等都视为无管理员权限
        if (!cancelled) {
          setIsAdmin(false);
          setChecking(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, userInfo?.is_admin]);

  if (authLoading || checking) {
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

  if (!isAdmin) {
    return <Navigate to="/" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
};

export default AdminRouteGuard;

