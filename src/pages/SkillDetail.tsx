import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Wrench,
  ArrowLeft,
  Shield,
  User,
  Tag,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import skillsApi from "@/api/skills";
const SkillDetail: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { skillId } = useParams<{ skillId: string }>();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: skill, isLoading } = useQuery({
    queryKey: ["skill", skillId],
    queryFn: () => skillsApi.getSkill(skillId!),
    enabled: !!skillId,
  });

  const handleDelete = async () => {
    if (!skillId) return;
    if (!window.confirm(t("skill.deleteConfirm"))) return;

    setIsDeleting(true);
    try {
      await skillsApi.deleteSkill(skillId);
      toast.success(t("skill.deleteSuccess"));
      navigate("/skills");
    } catch {
      toast.error(t("skill.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent-pink" />
        </div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6 text-center py-20 text-muted-foreground">
          <Wrench className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-mono">{t("skill.notFound")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => navigate("/skills")}
          className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground hover:text-foreground mb-4 transition-none"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("skill.backToMarket")}
        </button>

        <div className="border-brutal border-foreground bg-card brutal-shadow"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-accent-pink/10 flex items-center justify-center border-brutal border-foreground"
                >
                  <Wrench className="w-7 h-7 text-accent-pink" />
                </div>
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-wider"
                  >
                    {skill.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1"
                  >
                    {skill.skill_type === "system" ? (
                      <span className="flex items-center gap-1 text-[10px] text-accent-cyan"
                      >
                        <Shield className="w-3 h-3" />
                        {t("skill.system")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-accent-yellow"
                      >
                        <User className="w-3 h-3" />
                        {t("skill.custom")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground"
                    >
                      v{skill.version} · {skill.author}
                    </span>
                  </div>
                </div>
              </div>
              {skill.skill_type === "user" && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={cn(
                    "h-8 px-3 flex items-center gap-1.5 border-brutal border-foreground text-xs font-bold uppercase transition-none",
                    isDeleting
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-accent-red/10 text-accent-red hover:bg-accent-red/20"
                  )}
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {t("skill.delete")}
                </button>
              )}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-4"
            >
              {skill.description}
            </p>

            {skill.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6"
              >
                {skill.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-[10px] font-bold uppercase border border-foreground/30 bg-background flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 border-t border-foreground/10 pt-4"
            >
              <div
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1"
                >
                  {t("skill.cost")}
                </div>
                <div className="text-sm font-mono"
                >
                  {skill.credit_cost_per_call > 0
                    ? `${skill.credit_cost_per_call} pts`
                    : t("skill.free")}
                </div>
              </div>
              <div
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1"
                >
                  {t("skill.status")}
                </div>
                <div className="text-sm font-mono"
                >
                  {skill.is_active ? (
                    <span className="text-accent-green"
                    >{t("skill.active")}</span>
                  ) : (
                    <span className="text-muted-foreground"
                    >{t("skill.inactive")}</span>
                  )}
                </div>
              </div>
              <div
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1"
                >
                  {t("skill.skillId")}
                </div>
                <div className="text-sm font-mono text-muted-foreground truncate"
                >
                  {skill.skill_id}
                </div>
              </div>
            </div>
          </div>

          {skill.instructions && (
            <div className="border-t border-foreground/10"
            >
              <div className="px-6 py-2 border-b border-foreground/10 bg-secondary/20"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {t("skill.instructions")}
                </span>
              </div>
              <div className="p-6"
              >
                <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground/80"
                >
                  {skill.instructions}
                </pre>
              </div>
            </div>
          )}

          {skill.scripts && skill.scripts.length > 0 && (
            <div className="border-t border-foreground/10"
            >
              <div className="px-6 py-2 border-b border-foreground/10 bg-secondary/20"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {t("skill.scripts")}
                </span>
              </div>
              <div className="p-6 space-y-2"
              >
                {skill.scripts.map((script) => (
                  <div
                    key={script}
                    className="flex items-center gap-2 px-3 py-2 border border-foreground/20 bg-background font-mono text-xs"
                  >
                    <Wrench className="w-3 h-3 text-muted-foreground" />
                    {script}
                  </div>
                ))}
              </div>
            </div>
          )}

          {skill.references && skill.references.length > 0 && (
            <div className="border-t border-foreground/10"
            >
              <div className="px-6 py-2 border-b border-foreground/10 bg-secondary/20"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {t("skill.references")}
                </span>
              </div>
              <div className="p-6 space-y-2"
              >
                {skill.references.map((ref) => (
                  <div
                    key={ref}
                    className="flex items-center gap-2 px-3 py-2 border border-foreground/20 bg-background font-mono text-xs"
                  >
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    {ref}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillDetail;
