import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Wrench, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import skillsApi from "@/api/skills";
import { Header } from "@/components/layout/Header";
import SkillMarketCard from "@/components/skills/SkillMarketCard";
import UploadSkillButton from "@/components/skills/UploadSkillButton";
import type { SkillMeta } from "@/types/skills";

const SkillMarket: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "system" | "user">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: skills, isLoading, refetch } = useQuery({
    queryKey: ["skills"],
    queryFn: () => skillsApi.listSkills(),
  });

  const filteredSkills = useMemo(() => {
    if (!skills) return [];
    return skills.filter((skill: SkillMeta) => {
      if (filter !== "all" && skill.skill_type !== filter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          skill.name.toLowerCase().includes(q) ||
          skill.description.toLowerCase().includes(q) ||
          skill.tags?.some((tag) => tag.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [skills, filter, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-pink flex items-center justify-center border-brutal border-foreground">
              <Wrench className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wider">
                {t("skill.marketTitle")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t("skill.marketSubtitle")}
              </p>
            </div>
          </div>
          <UploadSkillButton onUploaded={() => refetch()} />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("skill.searchPlaceholder")}
              className="w-full pl-9 pr-3 py-2 bg-background border-brutal border-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
            />
          </div>
          <div className="flex border-brutal border-foreground">
            {(["all", "system", "user"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-2 text-xs font-bold uppercase tracking-wider transition-none",
                  filter === f
                    ? "bg-foreground text-card"
                    : "bg-card text-foreground hover:bg-secondary"
                )}
              >
                {t(`skill.filter.${f}`)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-pink" />
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Wrench className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm font-mono">{t("skill.noResults")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map((skill) => (
              <SkillMarketCard key={skill.skill_id} skill={skill} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillMarket;
