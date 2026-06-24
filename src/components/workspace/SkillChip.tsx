import React from "react";
import { X, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
interface SkillChipProps {
  skill: { name: string };
  isActive: boolean;
  onToggle: () => void;
}

const SkillChip: React.FC<SkillChipProps> = ({ skill, isActive, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider border transition-none",
        isActive
          ? "bg-accent-pink/15 border-accent-pink text-foreground"
          : "bg-card border-foreground/30 text-muted-foreground hover:border-foreground/60"
      )}
    >
      <Wrench className={cn("w-3 h-3", isActive && "text-accent-pink")} />
      <span className="truncate max-w-[100px]">{skill.name}</span>
      {isActive && <X className="w-3 h-3" />}
    </button>
  );
};

export default SkillChip;
