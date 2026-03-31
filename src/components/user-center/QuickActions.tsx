import React from "react";
import { useNavigate } from "react-router-dom";
import { BrutalCard, BrutalCardHeader, BrutalCardTitle, BrutalCardContent } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import { Key, SlidersHorizontal, BookOpen, ExternalLink, LogOut, Bolt } from "lucide-react";
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

export const QuickActions: React.FC = () => {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { icon: <Key className="w-3.5 h-3.5" />, label: t("uc.apiKeys"), color: "bg-accent-cyan/80" },
    { icon: <SlidersHorizontal className="w-3.5 h-3.5" />, label: t("uc.preferences"), color: "bg-accent-purple/80" },
    { icon: <BookOpen className="w-3.5 h-3.5" />, label: t("uc.docs"), color: "bg-accent-orange/80" },
  ];

  return (
    <BrutalCard shadow="default" className="h-full overflow-hidden flex flex-col">
      <BrutalCardHeader className="bg-card pb-3 pt-4 px-4">
        <BrutalCardTitle className="flex items-center gap-2 text-sm">
          <div className="p-1.5 bg-accent-purple/80 border border-foreground/30">
            <Bolt className="w-3.5 h-3.5 text-card" />
          </div>
          {t("uc.quickActions")}
        </BrutalCardTitle>
      </BrutalCardHeader>
      <BrutalCardContent className="flex-1 flex flex-col gap-2 px-4 pb-4">
        {links.map((item) => (
          <button
            key={item.label}
            className="w-full text-left px-3 py-2.5 bg-card border-brutal border-foreground font-mono text-xs hover:bg-secondary brutal-shadow brutal-press transition-none flex items-center gap-3 group"
          >
            <div className={`w-6 h-6 ${item.color} border border-foreground/30 flex items-center justify-center text-card`}>
              {item.icon}
            </div>
            <span className="flex-1 font-bold text-xs uppercase tracking-wider">{item.label}</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
          </button>
        ))}

        <div className="mt-auto pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <BrutalButton variant="red" size="sm" className="w-full gap-1.5">
                <LogOut className="w-3.5 h-3.5" />
                {t("uc.logout")}
              </BrutalButton>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-brutal border-foreground brutal-shadow bg-card">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-bold uppercase tracking-wider">{t("login.logout")}</AlertDialogTitle>
                <AlertDialogDescription>{t("login.logoutConfirm")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider">
                  {t("login.logoutCancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => { await logout(); navigate("/login"); }}
                  className="bg-accent-red text-card border-brutal border-foreground brutal-press font-bold uppercase text-xs tracking-wider hover:brightness-110"
                >
                  {t("login.logoutConfirmBtn")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </BrutalCardContent>
    </BrutalCard>
  );
};
