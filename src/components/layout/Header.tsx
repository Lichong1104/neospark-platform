import React, { useState, useEffect } from "react";
import { Moon, Sun, User, Globe, CreditCard, Sparkles, LogOut } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const { logout } = useAuth();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") ||
        localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggleLanguage = () => {
    const currentBase = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
    const newLang = currentBase === "en" ? "zh" : "en";
    i18n.changeLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="h-14 bg-card border-b-brutal border-foreground flex items-center justify-between select-none">
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-0">
        <div
          className="w-16 h-14 flex items-center justify-center cursor-pointer group border-r-brutal border-foreground shrink-0"
          onClick={() => navigate("/")}
        >
          <div className="w-8 h-8 bg-accent-cyan text-foreground flex items-center justify-center font-black text-base border-brutal border-foreground brutal-shadow-cyan group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] transition-transform">
            N
          </div>
        </div>
        
        <div className="flex items-center gap-4 px-5">
          <span className="text-sm font-bold tracking-tight hidden sm:inline">
            NEOSPARK
          </span>
          <div className="w-px h-6 bg-foreground/12 hidden sm:block" />
          <nav className="hidden sm:flex items-center gap-1">
            <NavButton to="/" active={isActive("/")}>
              <Sparkles className="w-3.5 h-3.5" />
              {t("header.workspace", { defaultValue: "Workspace" })}
            </NavButton>
            <NavButton to="/pricing" active={isActive("/pricing")}>
              <CreditCard className="w-3.5 h-3.5" />
              {t("header.pricing", { defaultValue: "Pricing" })}
            </NavButton>
          </nav>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 pr-4">
        {/* Language */}
        <button
          onClick={toggleLanguage}
          className="h-9 px-2.5 flex items-center gap-1.5 bg-card border-brutal border-foreground hover:bg-secondary brutal-press text-xs font-bold uppercase"
          title={i18n.language === "en" ? "Switch to Chinese" : "切换为英文"}
        >
          <Globe className="w-4 h-4" />
          {i18n.language === "en" ? "EN" : "中"}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="w-9 h-9 flex items-center justify-center bg-card border-brutal border-foreground hover:bg-secondary brutal-press"
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User */}
        <Link to="/user">
          <div className={`w-9 h-9 flex items-center justify-center border-brutal border-foreground brutal-press cursor-pointer ${
            isActive("/user")
              ? "bg-accent-purple text-card brutal-shadow-purple"
              : "bg-card hover:bg-secondary"
          }`}>
            <User className="w-4 h-4" />
          </div>
        </Link>

        {/* Logout */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="w-9 h-9 flex items-center justify-center bg-card border-brutal border-foreground hover:bg-accent-red hover:text-card brutal-press"
              title={t("login.logout")}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-brutal border-foreground brutal-shadow bg-card max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-bold uppercase tracking-wider text-base">{t("login.logout")}</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">{t("login.logoutConfirm")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider h-9">
                {t("login.logoutCancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => { await logout(); navigate("/login"); }}
                className="bg-accent-red text-card border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider hover:brightness-110 h-9"
              >
                {t("login.logoutConfirmBtn")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  );
};

const NavButton: React.FC<{
  to: string;
  active: boolean;
  children: React.ReactNode;
}> = ({ to, active, children }) => (
  <Link to={to}>
    <button
      className={`h-8 px-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-none border-brutal border-foreground brutal-press ${
        active
          ? "bg-foreground text-card"
          : "bg-card text-foreground hover:bg-accent-yellow"
      }`}
    >
      {children}
    </button>
  </Link>
);

export { Header };
