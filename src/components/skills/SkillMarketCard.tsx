import React from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, Shield, User, ArrowRight, Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SkillMeta } from "@/types/skills";
import SkillManageMenu from "@/components/skills/SkillManageMenu";
import McpBundleDialog from "@/components/skills/McpBundleDialog";
import { useMcpBundleDownload } from "@/hooks/useMcpBundleDownload";

interface SkillMarketCardProps {
  skill: SkillMeta;
}

/** 由 skill_id 哈希得出稳定的标题栏配色，保证同一卡片颜色不变 */
const BAND_COLORS = ["bg-accent-pink", "bg-accent-cyan", "bg-accent-yellow", "bg-green-500"] as const;

function bandColorOf(skillId: string): string {
  let hash = 0;
  for (let i = 0; i < skillId.length; i += 1) {
    hash = (hash * 31 + skillId.charCodeAt(i)) >>> 0;
  }
  return BAND_COLORS[hash % BAND_COLORS.length];
}

const SkillMarketCard: React.FC<SkillMarketCardProps> = ({ skill }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { downloading, download, bundle, closeBundle } = useMcpBundleDownload();
  const pricePoints = skill.price_points ?? 0;
  const isSubprocess = skill.execution_mode === "subprocess";

  // 停用的技能用灰底标题栏，一眼能从一屏卡片里挑出来
  const bandClass = skill.is_active ? bandColorOf(skill.skill_id) : "bg-muted";

  return (
    <div className="bg-card border-brutal border-foreground brutal-shadow flex flex-col">
      {skill.preview && (
        <div className="border-b-brutal border-foreground bg-secondary/40 overflow-hidden">
          <img
            src={skill.preview}
            alt={skill.name}
            loading="lazy"
            className="w-full aspect-[4/3] object-cover object-top"
          />
        </div>
      )}
      {/* 标题栏：技能名是这张卡片的主角 */}
      <div className={`flex items-center gap-3 px-5 py-3.5 ${bandClass} border-b-brutal border-foreground`}>
        <div className="w-10 h-10 shrink-0 bg-card flex items-center justify-center border-brutal border-foreground">
          <Wrench className="w-5 h-5 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[15px] leading-snug truncate">{skill.name}</h3>
          <div className="mt-0.5 text-[10px] font-mono text-foreground/70 truncate">
            v{skill.version} · {skill.author}
          </div>
        </div>
        <SkillManageMenu skill={skill} />
      </div>

      <div className="px-5 py-4 flex flex-col flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {!skill.is_active && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold border border-accent-red/60 text-accent-red">
              {t("skill.inactive")}
            </span>
          )}
          <span
            className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold border shrink-0 ${
              skill.skill_type === "system"
                ? "border-accent-cyan/50 text-accent-cyan"
                : "border-accent-yellow/60 text-accent-yellow"
            }`}
          >
            {skill.skill_type === "system" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
            {skill.skill_type === "system" ? t("skill.system") : t("skill.custom")}
          </span>
          {skill.execution_mode && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono border border-foreground/25 text-muted-foreground shrink-0">
              {isSubprocess ? t("skill.mode.subprocess") : t("skill.mode.inline")}
            </span>
          )}
        </div>

        <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
          {skill.description}
        </p>

        {skill.tags.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {skill.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] font-bold tracking-wide border border-foreground/25 bg-secondary/60 text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {skill.tags.length > 4 && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                +{skill.tags.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 pt-3.5 border-t border-foreground/15 flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono font-bold truncate">
            {pricePoints > 0 ? t("skill.costPoints", { count: pricePoints }) : t("skill.metered")}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => void download(skill.skill_id)}
              disabled={downloading}
              title={t("skill.downloadMcpBundleHint")}
              aria-label={t("skill.downloadMcpBundle")}
              className={`h-8 w-8 flex items-center justify-center border-brutal border-foreground transition-none ${
                downloading
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-card brutal-press hover:bg-secondary"
              }`}
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigate(`/skills/${skill.skill_id}`)}
              className="h-8 px-3 flex items-center gap-1.5 border-brutal border-foreground brutal-press bg-foreground text-background text-[11px] font-bold uppercase tracking-wider transition-none hover:bg-foreground/90"
            >
              {t("skill.viewDetails")}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <McpBundleDialog
        bundle={bundle}
        skillName={skill.name}
        onOpenChange={(open) => {
          if (!open) closeBundle();
        }}
      />
    </div>
  );
};

export default SkillMarketCard;