import React from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, Shield, User, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SkillMeta } from "@/types/skills";

interface SkillMarketCardProps {
  skill: SkillMeta;
}

/** 由 skill_id 哈希得出稳定的强调色，保证同一卡片颜色不变 */
const ACCENTS = [
  { bg: "bg-accent-pink", text: "text-accent-pink" },
  { bg: "bg-accent-cyan", text: "text-accent-cyan" },
  { bg: "bg-accent-yellow", text: "text-accent-yellow" },
  { bg: "bg-green-500", text: "text-green-600" },
] as const;

function accentOf(skillId: string) {
  let hash = 0;
  for (let i = 0; i < skillId.length; i += 1) {
    hash = (hash * 31 + skillId.charCodeAt(i)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
}

const SkillMarketCard: React.FC<SkillMarketCardProps> = ({ skill }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const accent = accentOf(skill.skill_id);
  const isSubprocess = skill.execution_mode === "subprocess";

  return (
    <div
      className="group bg-card border-brutal border-foreground brutal-shadow brutal-press hover:brightness-105 cursor-pointer flex flex-col"
      onClick={() => navigate(`/skills/${skill.skill_id}`)}
    >
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 shrink-0 ${accent.bg} flex items-center justify-center border-brutal border-foreground`}
            >
              <Wrench className="w-5 h-5 text-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm uppercase tracking-wide truncate">
                {skill.name}
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="font-mono">v{skill.version}</span>
                <span>·</span>
                <span className="truncate">{skill.author}</span>
              </div>
            </div>
          </div>
          {skill.skill_type === "system" ? (
            <div className="flex items-center gap-1 text-[10px] text-accent-cyan shrink-0">
              <Shield className="w-3 h-3" />
              {t("skill.system")}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-accent-yellow shrink-0">
              <User className="w-3 h-3" />
              {t("skill.custom")}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3 flex-1">
          {skill.description}
        </p>

        {skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skill.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] font-bold uppercase border border-foreground/30 bg-background"
              >
                {tag}
              </span>
            ))}
            {skill.tags.length > 4 && (
              <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
                +{skill.tags.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-foreground/10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono text-muted-foreground truncate">
              {skill.credit_cost_per_call > 0
                ? t("skill.costPoints", { count: skill.credit_cost_per_call })
                : t("skill.free")}
            </span>
            {skill.execution_mode && (
              <span
                className={`px-1 py-0.5 text-[9px] font-mono font-bold uppercase border ${
                  isSubprocess
                    ? "border-accent-cyan/60 text-accent-cyan"
                    : "border-foreground/30 text-muted-foreground"
                }`}
              >
                {isSubprocess ? t("skill.mode.subprocess") : t("skill.mode.inline")}
              </span>
            )}
          </div>
          <span
            className={`flex items-center gap-1 text-[10px] font-bold shrink-0 ${accent.text} group-hover:gap-2 transition-all`}
          >
            {t("skill.viewDetails")}
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default SkillMarketCard;
