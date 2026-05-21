import React from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { SkillMeta } from "@/types/skills";

interface SkillMarketCardProps {
  skill: SkillMeta;
}

const SkillMarketCard: React.FC<SkillMarketCardProps> = ({ skill }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div
      className="bg-card border-brutal border-foreground brutal-shadow brutal-press hover:brightness-105 cursor-pointer transition-none"
      onClick={() => navigate(`/skills/${skill.skill_id}`)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-pink/10 flex items-center justify-center border-brutal border-foreground">
              <Wrench className="w-5 h-5 text-accent-pink" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">{skill.name}</h3>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>v{skill.version}</span>
                <span>·</span>
                <span>{skill.author}</span>
              </div>
            </div>
          </div>
          {skill.skill_type === "system" ? (
            <div className="flex items-center gap-1 text-[10px] text-accent-cyan">
              <Shield className="w-3 h-3" />
              {t("skill.system")}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-accent-yellow">
              <User className="w-3 h-3" />
              {t("skill.custom")}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
          {skill.description}
        </p>

        {skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] font-bold uppercase border border-foreground/30 bg-background"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
          <span className="text-[10px] font-mono text-muted-foreground">
            {skill.credit_cost_per_call > 0
              ? `${skill.credit_cost_per_call} pts/次`
              : t("skill.free")}
          </span>
          <span className="text-[10px] text-accent-pink font-bold">
            {t("skill.viewDetails")} →
          </span>
        </div>
      </div>
    </div>
  );
};

export default SkillMarketCard;
