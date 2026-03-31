import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Home, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-grid p-4">
      <div className="max-w-sm w-full text-center animate-fade-in">
        {/* 404 block */}
        <div className="inline-block border-brutal border-foreground brutal-shadow-heavy bg-card p-8 mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-accent-red" />
            <span className="text-6xl font-bold font-mono">404</span>
          </div>
          <div className="text-sm font-bold uppercase tracking-widest mb-2">
            {t("notFound.title")}
          </div>
          <p className="text-xs text-muted-foreground font-mono mb-6 max-w-[240px] mx-auto">
            {t("notFound.message")}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono mb-6 border border-foreground/10 bg-secondary/30 px-3 py-2">
            {location.pathname}
          </p>
          <Link to="/">
            <button className="h-9 px-6 bg-accent-cyan text-foreground font-bold text-xs uppercase tracking-wider border-brutal border-foreground brutal-shadow brutal-press hover:brightness-110 inline-flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" />
              {t("notFound.returnBtn")}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
