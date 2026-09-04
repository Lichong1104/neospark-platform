import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Wrench, Loader2, PackageOpen, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import skillsApi from "@/api/skills";
import SkillMarketCard from "@/components/skills/SkillMarketCard";
import UploadSkillButton from "@/components/skills/UploadSkillButton";
import MySubmissions from "@/components/skills/MySubmissions";
import SkillAuthoringGuide from "@/components/skills/SkillAuthoringGuide";
import type { SkillMeta } from "@/types/skills";

type TypeFilter = "all" | "system" | "user";
type TabKey = "market" | "mine";

const SkillMarket: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("market");
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: skills, isLoading, refetch } = useQuery({
    queryKey: ["skills"],
    queryFn: () => skillsApi.listSkills(),
  });

  const { data: submissions } = useQuery({
    queryKey: ["mySkillSubmissions"],
    queryFn: () => skillsApi.listMySubmissions(),
  });

  const counts = useMemo(() => {
    const all = skills?.length ?? 0;
    const system = skills?.filter((s: SkillMeta) => s.skill_type === "system").length ?? 0;
    return { all, system, user: all - system };
  }, [skills]);

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

  const onUploaded = () => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ["mySkillSubmissions"] });
    setTab("mine");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* 页头 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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
          <div className="flex items-center gap-2">
            <SkillAuthoringGuide />
            <UploadSkillButton onUploaded={onUploaded} />
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex border-b-brutal border-foreground mb-6">
          {(["market", "mine"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "px-5 py-3 font-mono font-bold text-sm uppercase tracking-widest transition-none border-r-brutal border-foreground last:border-r-0 flex items-center gap-2",
                tab === key
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground hover:bg-secondary"
              )}
            >
              {t(`skill.tabs.${key}`)}
              {key === "market" ? (
                <span className="text-[10px] px-1 bg-accent-pink text-foreground">
                  {counts.all}
                </span>
              ) : (
                <span className="text-[10px] px-1 bg-accent-yellow text-foreground">
                  {submissions?.length ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "market" ? (
          <>
            {/* 工具栏：搜索 + 类型过滤 */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
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
                      "px-3 py-2 text-xs font-bold uppercase tracking-wider transition-none flex items-center gap-1.5",
                      filter === f
                        ? "bg-foreground text-card"
                        : "bg-card text-foreground hover:bg-secondary"
                    )}
                  >
                    {t(`skill.filter.${f}`)}
                    <span className="font-mono text-[10px] opacity-70">
                      {counts[f === "all" ? "all" : f]}
                    </span>
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
          </>
        ) : (
          <div className="space-y-4">
            {submissions && submissions.length > 0 ? (
              <MySubmissions />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 border-brutal border-foreground border-dashed bg-card/50">
                <PackageOpen className="w-12 h-12 mb-4 text-muted-foreground opacity-40" />
                <p className="text-sm font-bold uppercase tracking-wider mb-1">
                  {t("skill.emptyMineTitle")}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {t("skill.emptyMineDesc")}
                </p>
                <UploadSkillButton
                  onUploaded={onUploaded}
                  trigger={
                    <button className="h-9 px-3 flex items-center gap-2 border-brutal border-foreground brutal-press bg-accent-pink text-foreground text-xs font-bold uppercase hover:brightness-110 transition-none">
                      <Upload className="w-4 h-4" />
                      {t("skill.emptyMineAction")}
                    </button>
                  }
                />
              </div>
            )}
            {submissions && submissions.length > 0 && <SkillAuthoringGuide />}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillMarket;
