import React, { useState, useEffect } from "react";
import {
  Moon,
  Sun,
  User,
  Globe,
  CreditCard,
  Sparkles,
  LogOut,
  Shield,
  CirclePlay,
  ChevronRight,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const VIDEO_GUIDE_EVENT = "neospark:open-video-guide";

export const dispatchOpenVideoGuide = () => {
  window.dispatchEvent(new CustomEvent(VIDEO_GUIDE_EVENT));
};

type UserMenuDockProps = {
  /** fixed: 页面左下角悬浮；sidebar: 嵌入左侧工具栏底部；topbar: 嵌入顶部条 */
  variant?: "fixed" | "sidebar" | "topbar";
};

const UserMenuDock: React.FC<UserMenuDockProps> = ({ variant = "fixed" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSidebar = variant === "sidebar";
  const isTopbar = variant === "topbar";
  const { i18n, t } = useTranslation();
  const { logout, userInfo } = useAuth();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        document.documentElement.classList.contains("dark") ||
        localStorage.getItem("theme") === "dark"
      );
    }
    return false;
  });

  const langBase = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const isChinese = langBase === "zh";
  const showVideoGuide = isChinese;

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
    const newLang = langBase === "en" ? "zh" : "en";
    i18n.changeLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const isActive = (path: string) => location.pathname === path;

  const avatarLabel =
    userInfo?.email?.charAt(0).toUpperCase() ||
    userInfo?.email?.slice(0, 1).toUpperCase() ||
    "U";

  const closeAnd = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id="onboarding-user-menu-trigger"
            className={cn(
              "transition-none brutal-press select-none",
              isSidebar
                ? "w-full h-14 shrink-0 flex flex-col items-center justify-center border-t-brutal border-foreground bg-card hover:bg-accent-cyan hover:text-foreground data-[state=open]:bg-accent-purple data-[state=open]:text-card"
                : isTopbar
                ? "flex h-9 w-9 items-center justify-center border-brutal border-foreground bg-card brutal-shadow hover:bg-accent-cyan hover:text-foreground data-[state=open]:bg-accent-purple data-[state=open]:text-card data-[state=open]:brutal-shadow-purple"
                : [
                    "fixed z-[100] bottom-5 left-5 flex h-12 w-12 items-center justify-center border-brutal border-foreground bg-card brutal-shadow",
                    "hover:bg-accent-cyan hover:text-foreground",
                    "data-[state=open]:bg-accent-purple data-[state=open]:text-card data-[state=open]:brutal-shadow-purple",
                  ]
            )}
            aria-label={t("header.accountMenu", { defaultValue: "Account menu" })}
          >
            <User className={cn("shrink-0", isSidebar ? "w-5 h-5" : "hidden")} />
            <span
              className={cn(
                "font-black uppercase",
                isSidebar ? "text-[10px] mt-0.5" : "text-sm"
              )}
            >
              {avatarLabel}
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          side={isSidebar ? "right" : isTopbar ? "bottom" : "top"}
          align={isSidebar || isTopbar ? "end" : "start"}
          sideOffset={isSidebar ? 8 : 12}
          className="w-[min(18rem,calc(100vw-2.5rem))] border-brutal border-foreground bg-card p-0 brutal-shadow rounded-none shadow-none"
        >
          <div id="onboarding-user-menu-panel" className="flex flex-col">
            {/* Brand */}
            <button
              type="button"
              onClick={closeAnd(() => navigate("/"))}
              className="flex items-center gap-3 border-b-brutal border-foreground px-4 py-3 text-left hover:bg-accent-yellow transition-none"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border-brutal border-foreground bg-accent-cyan font-black text-sm brutal-shadow-cyan">
                N
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest">NEOSPARK</p>
                {userInfo?.email ? (
                  <p className="truncate text-[10px] text-muted-foreground font-mono">
                    {userInfo.email}
                  </p>
                ) : null}
              </div>
            </button>

            {/* Navigation */}
            <nav
              id="onboarding-user-menu-nav"
              className="flex flex-col border-b-brutal border-foreground p-2 gap-1"
            >
              <MenuNavItem
                to="/canvas"
                active={isActive("/canvas")}
                icon={<Sparkles className="h-4 w-4" />}
                onNavigate={() => setOpen(false)}
              >
                {t("header.workspace", { defaultValue: "Workspace" })}
              </MenuNavItem>
              <MenuNavItem
                to="/pricing"
                active={isActive("/pricing")}
                icon={<CreditCard className="h-4 w-4" />}
                onNavigate={() => setOpen(false)}
                openInNewTab
              >
                {t("header.pricing", { defaultValue: "Pricing" })}
              </MenuNavItem>
              {showVideoGuide ? (
                <button
                  type="button"
                  onClick={closeAnd(() => dispatchOpenVideoGuide())}
                  className="flex w-full items-center gap-2.5 border-brutal border-foreground bg-card px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider brutal-press hover:bg-accent-yellow"
                >
                  <CirclePlay className="h-4 w-4 shrink-0" />
                  <span className="flex-1">
                    {t("header.tutorial", { defaultValue: "Tutorial" })}
                  </span>
                </button>
              ) : null}
            </nav>

            {/* Account & settings */}
            <div
              id="onboarding-user-menu-actions"
              className="flex flex-col gap-1 p-2"
            >
              {userInfo?.is_admin ? (
                <MenuNavItem
                  to="/admin"
                  active={isActive("/admin")}
                  icon={<Shield className="h-4 w-4" />}
                  onNavigate={() => setOpen(false)}
                  accent="green"
                  openInNewTab
                >
                  {t("header.admin", { defaultValue: "Admin" })}
                </MenuNavItem>
              ) : null}

              <Link
                to="/user"
                onClick={() => setOpen(false)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div
                  className={cn(
                    "flex w-full items-center gap-2.5 border-brutal border-foreground px-3 py-2.5 text-xs font-bold uppercase tracking-wider brutal-press",
                    isActive("/user")
                      ? "bg-accent-purple text-card brutal-shadow-purple"
                      : "bg-card hover:bg-secondary"
                  )}
                >
                  <User className="h-4 w-4 shrink-0" />
                  <span className="flex-1">
                    {t("header.profile", { defaultValue: "Profile" })}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                </div>
              </Link>

              <div className="grid grid-cols-2 gap-1 pt-1">
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="flex items-center justify-center gap-1.5 border-brutal border-foreground bg-card px-2 py-2 text-[10px] font-bold uppercase brutal-press hover:bg-secondary"
                  title={
                    langBase === "en"
                      ? t("header.switchToChinese", { defaultValue: "Switch to Chinese" })
                      : t("header.switchToEnglish", { defaultValue: "Switch to English" })
                  }
                >
                  <Globe className="h-3.5 w-3.5" />
                  {langBase === "en"
                    ? t("language.zh", { defaultValue: "中文" })
                    : t("language.en", { defaultValue: "EN" })}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDark(!isDark)}
                  className="flex items-center justify-center gap-1.5 border-brutal border-foreground bg-card px-2 py-2 text-[10px] font-bold uppercase brutal-press hover:bg-secondary"
                  title={
                    isDark
                      ? t("header.lightMode", { defaultValue: "Light mode" })
                      : t("header.darkMode", { defaultValue: "Dark mode" })
                  }
                >
                  {isDark ? (
                    <Sun className="h-3.5 w-3.5" />
                  ) : (
                    <Moon className="h-3.5 w-3.5" />
                  )}
                  {isDark
                    ? t("header.light", { defaultValue: "Light" })
                    : t("header.dark", { defaultValue: "Dark" })}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setLogoutOpen(true);
                }}
                className="mt-1 flex w-full items-center gap-2.5 border-brutal border-foreground bg-card px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-accent-red brutal-press hover:bg-accent-red hover:text-card"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {t("login.logout")}
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="border-brutal border-foreground brutal-shadow bg-card max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold uppercase tracking-wider text-base">
              {t("login.logout")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {t("login.logoutConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider h-9">
              {t("login.logoutCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              className="bg-accent-red text-card border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider hover:brightness-110 h-9"
            >
              {t("login.logoutConfirmBtn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const MenuNavItem: React.FC<{
  to: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onNavigate: () => void;
  accent?: "green";
  openInNewTab?: boolean;
}> = ({ to, active, icon, children, onNavigate, accent, openInNewTab }) => (
  <Link
    to={to}
    onClick={onNavigate}
    target={openInNewTab ? "_blank" : undefined}
    rel={openInNewTab ? "noopener noreferrer" : undefined}
  >
    <div
      className={cn(
        "flex w-full items-center gap-2.5 border-brutal border-foreground px-3 py-2.5 text-xs font-bold uppercase tracking-wider brutal-press",
        active
          ? accent === "green"
            ? "bg-accent-green text-foreground brutal-shadow-green"
            : "bg-foreground text-card"
          : "bg-card hover:bg-accent-yellow"
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
    </div>
  </Link>
);

export { UserMenuDock };
